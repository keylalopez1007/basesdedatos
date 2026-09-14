# Informe 5 - Presentación final del proyecto

## 1. Presentación de la empresa/proyecto

**Animal Hospital Anomaly** es una aplicación web de simulación veterinaria y detección de anomalías. Pertenece al rubro de entretenimiento interactivo y formación práctica en toma de decisiones.

El problema que resuelve es convertir una atención veterinaria en un flujo de observación verificable: el jugador recibe un animal, compara su identidad con una solicitud y los archivos del edificio, decide admitirlo o bloquearlo y, si corresponde, selecciona el tratamiento según los síntomas. El sistema registra el resultado para conservar el historial del turno.

El usuario ideal es una persona que disfruta experiencias cortas de investigación y gestión, o que necesita practicar relaciones entre datos, validaciones y transacciones en una aplicación web.

## 2. Inspiración de marca

El concepto combina la recepción de un hospital animal con la tensión de detectar visitantes anómalos. La interfaz toma como referencia los juegos de inspección de documentos: una pantalla de recepción, carpetas por piso, identificación, solicitud, teléfono, fotografía, interrogatorio y decisiones de bloquear/admitir.

La paleta usa fondos oscuros con verde menta y turquesa para comunicar tecnología, salud y calma. El amarillo se reserva para documentos y pistas; rojo/rosado indica anomalías, bloqueo y errores. El símbolo de cruz médica y huella animal conecta inmediatamente el hospital con los pacientes.

## 3. Diagrama de la base de datos

El esquema real se encuentra en `docs/diagrama-er.md`. `Usuario` se relaciona con muchas `Partida`; cada partida contiene `PacienteJuego`, `Anomalia` y `EventoJuego`. Los medicamentos se separan en `Medicamento` y se relacionan con pacientes mediante `PacienteMedicamento`. Las clases comprables usan la tabla puente `PartidaClase`. `HistorialPartida` conserva el resultado final sin mezclarlo con el estado mutable de la partida activa.

Las llaves foráneas protegen la integridad y los `ON DELETE CASCADE` limpian pacientes, anomalías y eventos cuando se elimina una partida. Los correos, medicamentos y clases tienen restricciones `UNIQUE`; las tablas puente usan claves primarias compuestas.

La vista `vista_historial_partidas` une el historial con el correo del jugador. Además, `backend/sql/reporting_routines.sql` define el procedimiento `sp_resumen_partida(p_partida_id)`, que resume una partida, sus pacientes y sus eventos. La vista sirve para consultas reutilizables; el procedimiento evita repetir la misma consulta de reporte en herramientas como Navicat.

## 4. Diagrama de flujo del proceso

1. El usuario abre el frontend y elige iniciar sesión o crear cuenta.
2. `POST /api/auth/register` crea el usuario con un hash bcrypt; `POST /api/auth/login` compara la contraseña y devuelve un JWT.
3. El frontend guarda el token y solicita `GET /api/auth/me`. Todas las rutas de juego pasan por `requireAuth`.
4. El tutorial explica recepción, documentos, lista, teléfono, decisión y curación. Al comenzar se crea una partida nueva y se carga el primer paciente.
5. El jugador observa, toma/oculta la fotografía, interroga, abre identificación, solicitud, teléfono y archivo del piso en cualquier orden.
6. El backend valida admitir o bloquear, actualiza monedas, cordura, contadores y eventos dentro de la operación correspondiente.
7. Si el paciente es admitido, la sala de tratamiento compara el medicamento elegido con `PacienteMedicamento`.
8. Al terminar la partida se inserta `HistorialPartida` y se muestra el reporte final.

## 5. Consideraciones técnicas

### Arquitectura e integración

El frontend es HTML, CSS y JavaScript nativo. Se comunica con un backend Express mediante `fetch` y JSON. El backend usa `mysql2/promise` con pool de conexiones. La base de datos es MySQL y las operaciones usan consultas parametrizadas.

### Autenticación y seguridad

Las contraseñas se procesan con bcrypt y nunca se almacenan en texto plano. El login crea un JWT con vencimiento; `requireAuth` extrae `Authorization: Bearer <token>`, valida la firma y coloca el usuario en `req.user`. Sin token o con token inválido, la API devuelve 401. `.env` contiene credenciales y `JWT_SECRET`; no debe publicarse en GitHub.

### Endpoints principales

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/auth/register` | Crear una cuenta nueva |
| POST | `/api/auth/login` | Validar credenciales y emitir JWT |
| GET | `/api/auth/me` | Obtener el usuario autenticado |
| POST | `/api/partida/iniciar` | Crear una nueva partida |
| GET | `/api/partida/estado` | Obtener estado y paciente actual |
| POST | `/api/partida/accion/escanear-paciente` | Registrar la fotografía |
| POST | `/api/partida/accion/admitir-paciente` | Admitir y pasar a tratamiento |
| POST | `/api/partida/accion/rechazar-paciente` | Bloquear y cargar el siguiente caso |
| POST | `/api/partida/accion/aplicar-tratamiento` | Aplicar medicamento y resolver caso |
| GET | `/api/partida/historial` | Consultar reportes del usuario |

### Decisiones de diseño y manejo de errores

El backend vuelve a validar las decisiones aunque el frontend habilite o deshabilite botones, porque el cliente puede ser manipulado. Las respuestas de error se muestran en la interfaz para no dejar al usuario esperando. Las migraciones verifican `information_schema` antes de crear columnas nuevas. Las monedas se limitan a cero como mínimo y la cortina se reinicia al comenzar una partida para no bloquear el tablero.

## Matriz de cumplimiento de la rúbrica

| Categoría | Evidencia en el proyecto | Estado |
|---|---|---|
| A. Diseño de BD (30 pts) | ER real, FK, cascadas, índices, vista y procedimiento | Cumple |
| B. Backend + autenticación (20 pts) | Express, bcrypt, JWT, middleware `requireAuth` | Cumple |
| C. Frontend + integración (15 pts) | Login/registro, fetch, tablero, tratamiento, errores | Cumple |
| E. Comprensión cruzada (35 pts) | Flujo completo BD ↔ API ↔ interfaz y validación duplicada | Cumple |

## Diez respuestas preparadas para la defensa

1. **¿Por qué separar tablas?** Para que cada entidad tenga una responsabilidad y no se repitan datos. Las relaciones se expresan con FK y tablas puente.
2. **¿Qué pasa al borrar una partida?** Pacientes, anomalías y eventos se eliminan por cascada; el historial permanece porque representa el reporte final.
3. **¿Qué ocurre si se guarda un paciente inexistente?** La FK de `PacienteMedicamento` o `Anomalia` bloquea la operación; la base protege aunque se manipule el frontend.
4. **¿Dónde se calcula el resumen?** El backend actualiza contadores durante la partida y `HistorialPartida` conserva el resultado; la vista y `sp_resumen_partida` lo consultan.
5. **¿Qué hace un índice?** Reduce el trabajo de búsqueda. En este proyecto se indexan estado/usuario de partidas, fecha de eventos e historial por usuario y fecha.
6. **¿Cómo funciona el login?** El formulario llama `/auth/login`; el backend consulta `Usuario`, compara bcrypt y devuelve JWT. El frontend guarda el token y pide `/auth/me`.
7. **¿Se puede leer la contraseña?** No. Solo existe `password_hash`; bcrypt no permite recuperar la contraseña original.
8. **¿Qué pasa sin autenticación?** `requireAuth` rechaza la ruta con 401 antes de llegar al controlador del juego.
9. **¿Cómo se comunican frontend y backend?** Con `fetch`, JSON y el encabezado Bearer. El frontend presenta estados, pero el backend decide monedas, cordura, tratamiento y resultado.
10. **¿Qué no debe publicarse?** `.env`, contraseñas, JWT secret, tokens y credenciales MySQL. Si se filtran, se revocan/cambian y se limpian del historial de Git.
