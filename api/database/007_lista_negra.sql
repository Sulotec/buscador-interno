-- Lista negra: DNI que nadie puede consultar en el Buscador (ni por DNI, ficha personal, PDF, teléfono,
-- nombres, fallecidos ni carga masiva). Solo ADMIN GENERAL la administra desde "Administración > Lista negra".
-- Al quitar un DNI se borra la fila; el historial (quién lo bloqueó, quitó y por qué) queda en RRCC.Auditoria.
-- Es seguro ejecutarlo más de una vez.
USE Buscador;
GO

IF OBJECT_ID(N'RRCC.ListaNegra', N'U') IS NULL
BEGIN
    CREATE TABLE RRCC.ListaNegra
    (
        DOCUMENTO   CHAR(8)       NOT NULL,
        MOTIVO      NVARCHAR(250) NOT NULL,
        COD_USUARIO INT           NULL,
        USUARIO     NVARCHAR(50)  NOT NULL,
        FECHA_UTC   DATETIME2(0)  NOT NULL
            CONSTRAINT DF_RRCC_ListaNegra_FECHA_UTC DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_RRCC_ListaNegra PRIMARY KEY (DOCUMENTO)
    );
END;
GO
