# Flujo funcional de la aplicación

```mermaid
flowchart TD
  A[Abrir frontend] --> B{¿Token guardado?}
  B -- No --> C[Login o registro]
  C --> D[POST /api/auth/login]
  D --> E[Backend consulta Usuario y compara bcrypt]
  E --> F[JWT con vencimiento]
  F --> G[Guardar token en localStorage]
  B -- Sí --> G
  G --> H[GET /api/auth/me]
  H --> I[POST /api/partida/iniciar]
  I --> J[GET /api/partida/estado]
  J --> K[Mostrar paciente, síntomas, guía y cordura]
  K --> L{Decisión del jugador}
  L --> M[Escanear paciente]
  L --> N[Confirmar tratamiento]
  L --> O[Rechazar paciente/anomalía]
  M --> J
  N --> P[Backend compara medicamento con PacienteMedicamento]
  O --> Q[Backend valida es_anomalia]
  P --> R[Actualizar monedas, cordura, contadores y evento]
  Q --> R
  R --> S{¿Cordura = 0 o salida manual?}
  S -- No --> J
  S -- Sí --> T[POST /api/partida/finalizar]
  T --> U[INSERT HistorialPartida]
  U --> V[Mostrar reporte final]
```

El frontend presenta el estado y envía acciones. La decisión final y los cálculos importantes ocurren en el backend para que un usuario no pueda alterar monedas, cordura o resultados desde el navegador.
