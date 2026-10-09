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
