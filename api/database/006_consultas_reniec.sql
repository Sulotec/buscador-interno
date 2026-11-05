-- Último resultado RENIEC por DNI. La foto se conserva hasta que se reemplace o elimine manualmente; la firma no se almacena.
IF SCHEMA_ID(N'RNC') IS NULL
    EXEC(N'CREATE SCHEMA RNC');
GO

IF OBJECT_ID(N'RNC.Consultas', N'U') IS NULL
BEGIN
    CREATE TABLE RNC.Consultas
    (
        DNI                 CHAR(8)       NOT NULL,
        PRENOMBRES          NVARCHAR(250) NULL,
        APE_PATERNO         NVARCHAR(150) NULL,
        APE_MATERNO         NVARCHAR(150) NULL,
        FECHA_NACIMIENTO    NVARCHAR(30)  NULL,
        SEXO                NVARCHAR(30)  NULL,
        ESTADO_CIVIL        NVARCHAR(100) NULL,
        GRADO_INSTRUCCION   NVARCHAR(150) NULL,
        RESTRICCION         NVARCHAR(200) NULL,
        DIRECCION           NVARCHAR(500) NULL,
        DISTRITO            NVARCHAR(150) NULL,
        PROVINCIA           NVARCHAR(150) NULL,
        DEPARTAMENTO        NVARCHAR(150) NULL,
        NOMBRE_PADRE        NVARCHAR(200) NULL,
        NOMBRE_MADRE        NVARCHAR(200) NULL,
        FECHA_EMISION       NVARCHAR(30)  NULL,
        FECHA_CADUCIDAD     NVARCHAR(30)  NULL,
        FECHA_FALLECIMIENTO NVARCHAR(30)  NULL,
        FOTO                VARBINARY(MAX) NULL,
        FECHA_CONSULTA_UTC  DATETIME2(0)  NOT NULL
            CONSTRAINT DF_RNC_Consultas_FECHA_CONSULTA_UTC DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_RNC_Consultas PRIMARY KEY (DNI)
    );
END;
GO

IF COL_LENGTH(N'RNC.Consultas', N'FOTO') IS NULL
    ALTER TABLE RNC.Consultas ADD FOTO VARBINARY(MAX) NULL;
GO
