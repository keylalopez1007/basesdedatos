# animal_hospital_anomaly

Aplicación full stack para autenticar jugadores y preparar el flujo de pago de
un turno en un hospital animal. El flujo de negocio previsto recibe un
`turno_id`, busca el turno, el jugador, los pacientes y sus especies, compara
las decisiones, calcula aciertos, errores y bono, suma el bono a las monedas
del jugador y presenta el resumen final del pago.

## Integrantes del equipo

- Keyla Ailen

## Stack técnico

- Backend: Node.js, Express, mysql2, bcrypt, JSON Web Token, dotenv y CORS.
- Base de datos: MySQL 8+.
- Frontend: HTML, CSS y JavaScript nativo usando `fetch`.

## Requisitos previos

- Node.js 20 o posterior y npm.
- MySQL 8 o posterior, con permisos para crear una base de datos y tablas.
- Un puerto disponible para el backend (por defecto, `3307`) y para el
  frontend (por defecto, `5173`).

## Instalación y configuración

Desde la raíz del proyecto ejecute:

```bash
npm install
copy .env.example .env
```

En macOS o Linux use `cp .env.example .env`. Edite `.env` y complete las
variables de MySQL y `JWT_SECRET`. No suba ese archivo al repositorio.

## Creación de la base de datos

Con MySQL en ejecución, cree la base y la tabla inicial:

```bash
mysql -u TU_USUARIO -p < backend/sql/init.sql
```

El script crea la base `animal_hospital_anomaly`, la selecciona y crea la tabla
`Usuario`. También puede importar el archivo desde MySQL Workbench.

## Ejecutar el backend y el frontend

En una terminal, inicie el backend:

```bash
npm run dev:backend
```

En otra terminal, sirva el frontend:

```bash
npm run dev:frontend
```

Abra `http://localhost:5173`. El frontend apunta por defecto a
`http://localhost:3307/api`; si el backend usa otra URL, actualice
`frontend/config.js` con el valor correspondiente de `FRONTEND_API_URL`.

Para ejecución sin recarga automática puede usar `npm run start:backend` y
`npm run start:frontend`.

## Endpoints y pruebas rápidas

Compruebe que la API y MySQL se comuniquen:

```bash
curl http://localhost:3307/api/health
```

Respuesta esperada:

```json
{"status":"ok","db":"connected"}
```

Registre un usuario:

```bash
curl -X POST http://localhost:3307/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"jugador@example.com\",\"password\":\"clave-segura-123\"}"
```

Inicie sesión y copie el `token` de la respuesta:

```bash
curl -X POST http://localhost:3307/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"jugador@example.com\",\"password\":\"clave-segura-123\"}"
```

Consulte el usuario autenticado:

```bash
curl http://localhost:3307/api/auth/me -H "Authorization: Bearer TU_TOKEN"
```

## Finalizar un turno y pagar el bono

El endpoint protegido `POST /api/turnos/:turno_id/finalizar` compara la decisión
guardada en cada paciente: admitir pacientes normales y rechazar anomalías.
Cuenta aciertos y errores, calcula 10 monedas por acierto, registra el pago en
`PagosTurno` una sola vez y suma el bono al jugador.

Ejecuta el `CREATE TABLE PagosTurno` de `backend/sql/init.sql` en Navicat y
después usa el token obtenido en el login:

```bash
curl -X POST http://localhost:3307/api/turnos/1/finalizar -H "Authorization: Bearer TU_TOKEN"
```

## Historial de partidas

Ejecuta `backend/sql/history_init.sql` en Navicat una vez. Crea la tabla
normalizada `HistorialPartida` y los contadores de la partida. Una salida manual
o una partida que llega a cordura cero se guarda automáticamente. El reporte se
puede consultar con:

```sql
SELECT * FROM HistorialPartida WHERE usuario_id = 1 ORDER BY finalizada_en DESC;
SELECT usuario_id, MAX(turno_alcanzado) AS mejor_turno FROM HistorialPartida GROUP BY usuario_id;
SELECT AVG(monedas_ganadas) AS promedio_monedas, AVG(errores_cometidos) AS promedio_errores FROM HistorialPartida;
```
