# Diagrama entidad-relación

Este diagrama corresponde al esquema implementado por los scripts SQL del proyecto. Puede pegarse en cualquier visor compatible con Mermaid.

```mermaid
erDiagram
  Usuario ||--o{ Partida : inicia
  Usuario ||--o{ HistorialPartida : obtiene
  Partida ||--o{ PacienteJuego : contiene
  Partida ||--o{ Anomalia : registra
  Partida ||--o{ EventoJuego : genera
  Partida ||--o{ PartidaClase : compra
  ClaseJuego ||--o{ PartidaClase : pertenece
  PacienteJuego ||--o{ Anomalia : asociado
  PacienteJuego ||--o{ PacienteMedicamento : requiere
  Medicamento ||--o{ PacienteMedicamento : indicado

  Usuario {
    BIGINT id PK
    VARCHAR email UK
    VARCHAR password_hash
    TIMESTAMP created_at
  }
  Partida {
    INT id PK
    BIGINT usuario_id FK
    INT turno_actual
    ENUM estado
    INT monedas
    INT cordura
  }
  PacienteJuego {
    INT id PK
    INT partida_id FK
    VARCHAR nombre
    VARCHAR condicion
    ENUM estado
    BOOLEAN es_anomalia
    BOOLEAN detectado
  }
  Anomalia {
    INT id PK
    INT partida_id FK
    INT paciente_asociado_id FK
    VARCHAR tipo
    ENUM estado
  }
  EventoJuego {
    BIGINT id PK
    INT partida_id FK
    VARCHAR tipo
    INT turno
    DATETIME ocurrido_en
    JSON data
  }
  Medicamento {
    INT id PK
    VARCHAR nombre UK
    VARCHAR icono
  }
  PacienteMedicamento {
    INT paciente_id PK, FK
    INT medicamento_id PK, FK
  }
  ClaseJuego {
    INT id PK
    VARCHAR nombre UK
    INT costo_monedas
    JSON stats_base
  }
  PartidaClase {
    INT partida_id PK, FK
    INT clase_id PK, FK
  }
  HistorialPartida {
    BIGINT id PK
    BIGINT usuario_id FK
    INT turno_alcanzado
    INT pacientes_curados
    INT errores_cometidos
    INT monedas_ganadas
    INT cordura_final
  }
```

Las tablas puente `PacienteMedicamento` y `PartidaClase` representan relaciones muchos a muchos. `HistorialPartida` conserva el resultado final sin mezclarlo con el estado mutable de una partida activa.
