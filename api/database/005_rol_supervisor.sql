-- Rol SUPERVISOR: solo consultas (decision del 2026-10-22).
-- Puede: consultar personas y empresas (individual y masiva), ver su historial de cargas y su propio saldo de tokens.
-- No puede: crear ni editar usuarios, asignar tokens, ni ver la auditoria. Eso lo exige la API (politica "AdminGeneral"
-- en system/usuarios, system/auditoria y system/tokens salvo mi-saldo) y la web lo corta antes en su intermediario.
-- Este script solo deja la descripcion al dia en la base (se ve al asignar roles). Es seguro ejecutarlo mas de una vez.
-- Antes: selecciona la base Buscador en SSMS.
UPDATE RRCC.Roles
SET DESCRIPCION = 'Solo consultas de personas y empresas; sin acceso a usuarios, tokens ni auditoria'
WHERE NOM_ROL = 'SUPERVISOR';

UPDATE RRCC.Roles
SET DESCRIPCION = 'Reservado: hoy tiene los mismos permisos que SUPERVISOR (solo consultas)'
WHERE NOM_ROL = 'GERENCIA';
