-- Roles base de una instalacion nueva. Es seguro ejecutarlo mas de una vez.
-- Si se migra la base real, estos roles ya vienen con los datos y este script no inserta nada repetido.
INSERT INTO rrcc.roles (nom_rol, descripcion, estado, usu_creo, fecha_creo)
SELECT v.nom_rol, v.descripcion, 1, 'SCRIPT', now()
FROM (VALUES
    ('ADMIN GENERAL', 'Administra cuentas, roles y tokens; consultas ilimitadas'),
    ('SUPERVISOR',    'Nivel reservado, sin funciones por ahora'),
    ('GERENCIA',      'Nivel reservado, sin funciones por ahora')
) AS v (nom_rol, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM rrcc.roles r WHERE r.nom_rol = v.nom_rol);

-- PRIMER ADMIN GENERAL: sin al menos uno nadie podra crear cuentas ni asignar tokens.
-- Crea el usuario (con la clave en hash BCrypt) y luego asignale el rol:
--
-- INSERT INTO rrcc.usuariorol (cod_usuario, cod_rol, estado, usu_creo, fecha_creo)
-- SELECT u.cod_usuario, r.cod_rol, 1, 'SCRIPT', now()
-- FROM rrcc.usuarios u CROSS JOIN rrcc.roles r
-- WHERE u.usuario = 'TU_USUARIO' AND r.nom_rol = 'ADMIN GENERAL';
