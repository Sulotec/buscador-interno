-- El rol Operador no tiene filas en RRCC.RolMenu: un usuario Operador entra y ve el menú vacío.
-- (Solo Administrador tenía menús; ADMIN GENERAL, GERENCIA y Supervisor ven todo por regla del sistema.)
-- Este script copia los menús de Administrador al rol Operador SOLO DE LECTURA (sin crear/editar/eliminar).
-- Es seguro ejecutarlo más de una vez. Si COD_ROL_MENU no es IDENTITY, agrega el código manualmente.
INSERT INTO RRCC.RolMenu (COD_ROL, COD_MENU, PUEDE_VER, PUEDE_CREAR, PUEDE_EDITAR, PUEDE_ELIMINAR, ESTADO, USU_CREO, FECHA_CREO)
SELECT op.COD_ROL, rm.COD_MENU, 1, 0, 0, 0, 1, 'SCRIPT', GETDATE()
FROM RRCC.Roles op
JOIN RRCC.RolMenu rm
     ON rm.COD_ROL = (SELECT COD_ROL FROM RRCC.Roles WHERE NOM_ROL = 'Administrador')
    AND rm.ESTADO = 1
WHERE op.NOM_ROL = 'Operador'
  AND NOT EXISTS (SELECT 1 FROM RRCC.RolMenu x WHERE x.COD_ROL = op.COD_ROL AND x.COD_MENU = rm.COD_MENU);
