-- Instala todo lo necesario en la base Buscador (001 + 002 + 003). Es seguro ejecutarlo más de una vez.
-- Antes: selecciona la base Buscador en SSMS. Después: crea el primer ADMIN GENERAL (ver README del 002, paso 5).

USE Buscador;
GO

-- ===== 001_password_reset_tokens.sql =====
-- Tokens de recuperación de clave e invitación de usuarios nuevos.
-- Ejecutar una vez sobre la base Buscador.
IF OBJECT_ID('RRCC.PasswordResetTokens', 'U') IS NULL
BEGIN
    CREATE TABLE RRCC.PasswordResetTokens (
        COD_TOKEN    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PasswordResetTokens PRIMARY KEY,
        COD_USUARIO  INT           NOT NULL,
        TOKEN_HASH   CHAR(64)      NOT NULL,
        TIPO         TINYINT       NOT NULL CONSTRAINT DF_PRT_TIPO DEFAULT 1, -- 1 = recuperación, 2 = invitación
        FECHA_CREO   DATETIME2     NOT NULL CONSTRAINT DF_PRT_CREO DEFAULT SYSUTCDATETIME(),
        FECHA_EXPIRA DATETIME2     NOT NULL,
        USADO        BIT           NOT NULL CONSTRAINT DF_PRT_USADO DEFAULT 0,
        FECHA_USO    DATETIME2     NULL,
        IP_SOLICITUD VARCHAR(45)   NULL,
        CONSTRAINT FK_PRT_Usuarios FOREIGN KEY (COD_USUARIO) REFERENCES RRCC.Usuarios (COD_USUARIO)
    );

    CREATE UNIQUE INDEX UX_PRT_TOKEN_HASH ON RRCC.PasswordResetTokens (TOKEN_HASH);
    CREATE INDEX IX_PRT_USUARIO ON RRCC.PasswordResetTokens (COD_USUARIO, USADO);
END

GO

-- ===== 002_tokens_auditoria_roles.sql =====
-- Tokens de consulta, auditoría y roles base. Ejecutar una vez sobre la base Buscador,
-- después de 001_password_reset_tokens.sql.

-- 1) Saldo de tokens por usuario (ADMIN GENERAL es ilimitado y no usa esta tabla)
IF OBJECT_ID('RRCC.TokenSaldo', 'U') IS NULL
BEGIN
    CREATE TABLE RRCC.TokenSaldo (
        COD_USUARIO INT       NOT NULL CONSTRAINT PK_TokenSaldo PRIMARY KEY,
        SALDO       INT       NOT NULL CONSTRAINT DF_TokenSaldo_Saldo DEFAULT 0,
        FECHA_ACTU  DATETIME2 NOT NULL CONSTRAINT DF_TokenSaldo_Fecha DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_TokenSaldo_NoNegativo CHECK (SALDO >= 0),
        CONSTRAINT FK_TokenSaldo_Usuarios FOREIGN KEY (COD_USUARIO) REFERENCES RRCC.Usuarios (COD_USUARIO)
    );
END

-- 2) Libro de movimientos: asignaciones, consumos, devoluciones y ajustes
IF OBJECT_ID('RRCC.TokenMovimientos', 'U') IS NULL
BEGIN
    CREATE TABLE RRCC.TokenMovimientos (
        COD_MOVIMIENTO     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TokenMovimientos PRIMARY KEY,
        COD_USUARIO        INT           NOT NULL,
        TIPO               TINYINT       NOT NULL, -- 1 asignación, 2 consumo, 3 devolución, 4 ajuste/retiro
        CANTIDAD           INT           NOT NULL, -- positivo suma, negativo resta
        SALDO_RESULTANTE   INT           NOT NULL,
        ACCION             VARCHAR(50)   NOT NULL,
        DETALLE            NVARCHAR(300) NULL,
        COD_USUARIO_ACCION INT           NULL,
        FECHA              DATETIME2     NOT NULL CONSTRAINT DF_TokenMov_Fecha DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_TokenMov_Usuarios FOREIGN KEY (COD_USUARIO) REFERENCES RRCC.Usuarios (COD_USUARIO)
    );

    CREATE INDEX IX_TokenMov_Usuario ON RRCC.TokenMovimientos (COD_USUARIO, COD_MOVIMIENTO DESC);
END

-- 3) Bitácora de auditoría (fechas en UTC)
IF OBJECT_ID('RRCC.Auditoria', 'U') IS NULL
BEGIN
    CREATE TABLE RRCC.Auditoria (
        COD_AUDITORIA BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Auditoria PRIMARY KEY,
        FECHA         DATETIME2     NOT NULL CONSTRAINT DF_Auditoria_Fecha DEFAULT SYSUTCDATETIME(),
        COD_USUARIO   INT           NULL,
        USUARIO       VARCHAR(50)   NOT NULL,
        ACCION        VARCHAR(60)   NOT NULL,
        ENTIDAD       VARCHAR(60)   NULL,
        ENTIDAD_ID    VARCHAR(60)   NULL,
        DETALLE       NVARCHAR(500) NULL,
        IP            VARCHAR(45)   NULL,
        EXITO         BIT           NOT NULL CONSTRAINT DF_Auditoria_Exito DEFAULT 1
    );

    CREATE INDEX IX_Auditoria_Fecha   ON RRCC.Auditoria (FECHA DESC);
    CREATE INDEX IX_Auditoria_Usuario ON RRCC.Auditoria (USUARIO, FECHA DESC);
    CREATE INDEX IX_Auditoria_Accion  ON RRCC.Auditoria (ACCION, FECHA DESC);
END

-- 4) Roles base. SUPERVISOR y GERENCIA existen pero todavía no tienen funciones.
--    Si COD_ROL no es IDENTITY en tu tabla, agrega el código manualmente.
INSERT INTO RRCC.Roles (NOM_ROL, DESCRIPCION, ESTADO, USU_CREO, FECHA_CREO)
SELECT v.NOM_ROL, v.DESCRIPCION, 1, 'SCRIPT', GETDATE()
FROM (VALUES
    ('ADMIN GENERAL', 'Administra cuentas, roles y tokens; consultas ilimitadas'),
    ('SUPERVISOR',    'Nivel reservado, sin funciones por ahora'),
    ('GERENCIA',      'Nivel reservado, sin funciones por ahora')
) AS v (NOM_ROL, DESCRIPCION)
WHERE NOT EXISTS (SELECT 1 FROM RRCC.Roles r WHERE r.NOM_ROL = v.NOM_ROL);

-- 5) PRIMER ADMIN GENERAL: sin al menos uno nadie podrá crear cuentas ni asignar tokens.
--    Reemplaza el usuario y ejecuta:
--
-- INSERT INTO RRCC.UsuarioRol (COD_USUARIO, COD_ROL, ESTADO, USU_CREO, FECHA_CREO)
-- SELECT u.COD_USUARIO, r.COD_ROL, 1, 'SCRIPT', GETDATE()
-- FROM RRCC.Usuarios u CROSS JOIN RRCC.Roles r
-- WHERE u.USUARIO = 'TU_USUARIO' AND r.NOM_ROL = 'ADMIN GENERAL';

-- 6) Los usuarios que ya existen arrancan con 0 tokens y no podrán consultar hasta que un
--    ADMIN GENERAL les asigne. Si prefieres darles un saldo inicial a todos de una vez:
--
-- INSERT INTO RRCC.TokenSaldo (COD_USUARIO, SALDO)
-- SELECT COD_USUARIO, 100 FROM RRCC.Usuarios u
-- WHERE NOT EXISTS (SELECT 1 FROM RRCC.TokenSaldo s WHERE s.COD_USUARIO = u.COD_USUARIO);

GO

-- ===== 003_sesiones_revocadas.sql =====
-- Revocación de sesiones: al restablecer la contraseña, o cuando un ADMIN GENERAL cierra las
-- sesiones de un usuario, todo token emitido antes de FECHA_REVOCACION deja de ser válido.
-- Ejecutar una vez sobre la base Buscador. Es obligatoria: el backend la consulta en cada petición.
IF OBJECT_ID('RRCC.SesionesRevocadas', 'U') IS NULL
BEGIN
    CREATE TABLE RRCC.SesionesRevocadas (
        COD_USUARIO      INT       NOT NULL CONSTRAINT PK_SesionesRevocadas PRIMARY KEY,
        FECHA_REVOCACION DATETIME2 NOT NULL,
        CONSTRAINT FK_SesionesRevocadas_Usuarios FOREIGN KEY (COD_USUARIO) REFERENCES RRCC.Usuarios (COD_USUARIO)
    );
END

GO
