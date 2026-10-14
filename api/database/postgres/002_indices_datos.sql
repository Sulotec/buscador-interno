-- Indices de las 5 tablas grandes. Ejecutar DESPUES de cargar los datos (con los indices ya creados la carga es mucho mas lenta).
-- Son solo los que usa la API: busqueda por documento (+ periodo), por telefono y por prefijo de razon social.
-- Los indices por nombres, apellidos, codigo SBS, sueldo y periodo suelto que existian en SQL Server no los usa el
-- codigo actual; si algun dia hacen falta se agregan aparte.
-- Cada CREATE INDEX puede tardar varios minutos en las tablas de decenas de millones de filas.

SET maintenance_work_mem = '2GB';
SET max_parallel_maintenance_workers = 3;

CREATE INDEX IF NOT EXISTS ix_deuda_documento_periodo           ON rrcc.deuda (documento, periodo);
CREATE INDEX IF NOT EXISTS ix_calificacion_documento_periodo    ON rrcc.calificacion (documento, periodo);
CREATE INDEX IF NOT EXISTS ix_lineascredito_documento_periodo   ON rrcc.lineascredito (documento, periodo);
CREATE INDEX IF NOT EXISTS ix_moviles_documento_periodo         ON operador.moviles (documento, periodo);
CREATE INDEX IF NOT EXISTS ix_sueldos_documento_periodo         ON operador.sueldos (documento, periodo);

CREATE INDEX IF NOT EXISTS ix_moviles_telefono ON operador.moviles (telefono);

-- Busqueda por prefijo de razon social sin distinguir mayusculas: la API consulta lower(razonsocial) LIKE 'texto%'
CREATE INDEX IF NOT EXISTS ix_deuda_razonsocial_lower        ON rrcc.deuda (lower(razonsocial) text_pattern_ops);
CREATE INDEX IF NOT EXISTS ix_lineascredito_razonsocial_lower ON rrcc.lineascredito (lower(razonsocial) text_pattern_ops);

ANALYZE rrcc.deuda;
ANALYZE rrcc.calificacion;
ANALYZE rrcc.lineascredito;
ANALYZE operador.moviles;
ANALYZE operador.sueldos;
