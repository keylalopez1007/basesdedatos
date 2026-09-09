# Informe de presentación - Animal Hospital Anomaly

## 1. Presentación del proyecto

Animal Hospital Anomaly es una aplicación web de simulación veterinaria y detección de anomalías. El jugador recibe pacientes, observa síntomas, elige un tratamiento o identifica una anomalía y administra sus recursos. El sistema registra el desempeño de cada partida para permitir consultas posteriores.

El usuario ideal es una persona que quiere jugar una experiencia corta de decisiones y practicar observación, manejo de recursos y resolución de problemas.

## 2. Inspiración de marca

El nombre combina el entorno reconocible de un hospital animal con el misterio de las anomalías. La identidad visual utiliza verdes y turquesas porque comunican salud, calma y limpieza; los colores de alerta se reservan para anomalías y errores. El logo puede representarse con una huella animal y un símbolo de alerta.

## 3. Diagrama entidad-relación

El esquema real está documentado en [diagrama-er.md](./diagrama-er.md). Las tablas separan usuarios, partidas, pacientes, anomalías, medicamentos, eventos e historial. Las relaciones se implementan con llaves foráneas y las búsquedas frecuentes tienen índices.

## 4. Flujo del proceso

El flujo funcional está documentado en [flujo-aplicacion.md](./flujo-aplicacion.md): login, emisión del JWT, inicio de partida, escaneo, decisión, validación en backend, actualización transaccional y guardado del historial.

## 5. Consideraciones técnicas

- El backend usa Express y `mysql2` con un pool de conexiones.
- Las contraseñas se guardan como hashes bcrypt; nunca se devuelve el hash.
- El login entrega un JWT con vencimiento y las rutas del juego exigen `Authorization: Bearer <token>`.
- La validación se hace en el servidor, aunque el frontend deshabilite botones inválidos.
- `HistorialPartida` es una tabla de reportes. La vista `vista_historial_partidas` combina el historial con el correo del usuario y puede consultarse desde Navicat o desde `GET /api/partida/historial`.
- Las operaciones que cambian monedas, cordura y contadores usan consultas parametrizadas y transacciones cuando corresponde.
- Las migraciones verifican `information_schema` para evitar la sintaxis incompatible `ADD COLUMN IF NOT EXISTS`.

## Evidencia para la defensa

1. Ejecutar `SELECT * FROM vista_historial_partidas;` en Navicat.
2. Mostrar `backend/src/middleware/auth.js` y explicar la verificación del JWT.
3. Mostrar `backend/sql/history_init.sql` y explicar la vista y sus índices.
4. En el navegador, iniciar sesión, comenzar partida, escanear y confirmar un tratamiento; luego consultar `/api/partida/historial`.
5. Intentar llamar a `/api/partida/estado` sin token para demostrar el bloqueo.

## Preguntas de defensa

Las preguntas y respuestas sugeridas están en [preguntas-defensa.md](./preguntas-defensa.md).
