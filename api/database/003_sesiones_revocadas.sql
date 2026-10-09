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
