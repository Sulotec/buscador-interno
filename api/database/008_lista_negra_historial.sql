-- Lista negra con historial (baja lógica). Ejecutar DESPUÉS del 007. Es seguro ejecutarlo más de una vez.
--
-- Antes: "Quitar" borraba la fila. Ahora la fila se conserva: pasa a ACTIVO = 0 con quién la desbloqueó, cuándo
-- y por qué. Un mismo DNI puede tener varios registros (bloqueado, desbloqueado, bloqueado otra vez...), pero
-- solo UNO activo a la vez (índice único filtrado). Los DNI que ya estaban bloqueados quedan activos.
USE Buscador;
GO

-- 1. Nuevas columnas (los registros existentes quedan como bloqueados vigentes)
IF COL_LENGTH(N'RRCC.ListaNegra', N'ID') IS NULL
    ALTER TABLE RRCC.ListaNegra ADD ID INT IDENTITY(1, 1) NOT NULL;
GO
IF COL_LENGTH(N'RRCC.ListaNegra', N'ACTIVO') IS NULL
    ALTER TABLE RRCC.ListaNegra ADD ACTIVO BIT NOT NULL
        CONSTRAINT DF_RRCC_ListaNegra_ACTIVO DEFAULT (1);
GO
IF COL_LENGTH(N'RRCC.ListaNegra', N'COD_USUARIO_QUITO') IS NULL
    ALTER TABLE RRCC.ListaNegra ADD
        COD_USUARIO_QUITO INT           NULL,
        USUARIO_QUITO     NVARCHAR(50)  NULL,
        MOTIVO_QUITO      NVARCHAR(250) NULL,
        FECHA_QUITO_UTC   DATETIME2(0)  NULL;
GO

-- 2. La clave deja de ser el DNI (un DNI puede tener varios registros en su historial) y pasa a ser el ID
IF EXISTS (SELECT 1 FROM sys.key_constraints
           WHERE name = N'PK_RRCC_ListaNegra' AND parent_object_id = OBJECT_ID(N'RRCC.ListaNegra'))
   AND NOT EXISTS (SELECT 1 FROM sys.index_columns ic
                   JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                   JOIN sys.key_constraints k ON k.parent_object_id = ic.object_id AND k.unique_index_id = ic.index_id
                   WHERE k.name = N'PK_RRCC_ListaNegra' AND c.name = N'ID')
BEGIN
    ALTER TABLE RRCC.ListaNegra DROP CONSTRAINT PK_RRCC_ListaNegra;
    ALTER TABLE RRCC.ListaNegra ADD CONSTRAINT PK_RRCC_ListaNegra PRIMARY KEY (ID);
END;
GO

-- 3. Un DNI solo puede estar bloqueado una vez a la vez; sirve además para buscar rápido los activos
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_RRCC_ListaNegra_DOCUMENTO_ACTIVO'
               AND object_id = OBJECT_ID(N'RRCC.ListaNegra'))
    CREATE UNIQUE INDEX UX_RRCC_ListaNegra_DOCUMENTO_ACTIVO
        ON RRCC.ListaNegra (DOCUMENTO) WHERE ACTIVO = 1;
GO

-- 4. Para el historial de un DNI
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RRCC_ListaNegra_DOCUMENTO'
               AND object_id = OBJECT_ID(N'RRCC.ListaNegra'))
    CREATE INDEX IX_RRCC_ListaNegra_DOCUMENTO ON RRCC.ListaNegra (DOCUMENTO, FECHA_UTC DESC);
GO
