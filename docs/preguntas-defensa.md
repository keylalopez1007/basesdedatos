# Guía de defensa individual

## Diseño de base de datos

**¿Por qué separar la información en tablas?** Porque cada entidad tiene una responsabilidad: un usuario puede tener muchas partidas, una partida muchos pacientes y un paciente varios medicamentos. Separarlas evita duplicación y permite aplicar integridad referencial.

**¿Qué ocurre si se elimina una partida?** Sus pacientes, anomalías y eventos se eliminan mediante `ON DELETE CASCADE`; el historial queda separado para conservar el reporte final.

**¿Cómo se evitan duplicados?** `Usuario.email`, `Medicamento.nombre` y `ClaseJuego.nombre` tienen restricciones `UNIQUE`; las relaciones puente usan llaves primarias compuestas.

## Datos y consultas

**¿Dónde se calcula el resumen?** El backend actualiza contadores durante la partida y al finalizar inserta un resumen en `HistorialPartida`. La vista `vista_historial_partidas` une ese resultado con el correo del usuario.

**¿Qué ocurre si no hay historial?** `GET /api/partida/historial` devuelve una lista vacía, no un error de aplicación.

**¿Por qué hay índices?** Las consultas filtran partidas por usuario y estado, eventos por partida y fecha, y el historial por usuario y fecha. Los índices evitan recorrer toda la tabla.

## Seguridad e integración

**¿Cómo se protege una ruta?** `requireAuth` extrae el Bearer token, lo valida con `JWT_SECRET` y coloca el usuario autenticado en `req.user`. Sin token la ruta responde 401.

**¿Se pueden leer las contraseñas?** No. Solo se almacena el hash bcrypt y el backend nunca lo devuelve en sus respuestas.

**¿Por qué validar en frontend y backend?** El frontend deshabilita acciones inválidas para orientar al jugador, pero el backend vuelve a validar porque el cliente puede ser manipulado.

**¿Qué nunca debe publicarse en GitHub?** `.env`, contraseñas, secretos JWT, tokens y credenciales de MySQL. El repositorio solo contiene `.env.example`.
