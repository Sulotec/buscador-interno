namespace internal_search.Domain.Constants
{
    // Nombres de rol tal como existen en RRCC.Roles (database/002_tokens_auditoria_roles.sql los crea)
    public static class RolesSistema
    {
        public const string AdminGeneral = "ADMIN GENERAL";
        public const string Supervisor = "SUPERVISOR";
        public const string Gerencia = "GERENCIA";

        // Roles que por ahora ven todos los menús con todos los permisos. SUPERVISOR y GERENCIA
        // quedan así hasta que se definan sus funciones: entonces se quitan de esta lista y se
        // configuran por RolMenu. La administración (usuarios, tokens, auditoría) sigue siendo
        // exclusiva de ADMIN GENERAL, que se valida aparte.
        public static readonly string[] ConAccesoTotal = { AdminGeneral, Supervisor, Gerencia };
    }
}
