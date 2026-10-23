namespace internal_search.Domain.Constants
{
    // Nombres de rol tal como existen en RRCC.Roles (database/002_tokens_auditoria_roles.sql los crea)
    public static class RolesSistema
    {
        public const string AdminGeneral = "ADMIN GENERAL";
        public const string Supervisor = "SUPERVISOR";
        public const string Gerencia = "GERENCIA";

        // SUPERVISOR (decisión del usuario, 2026-10-22): SOLO consultas de personas y empresas (individuales y masivas)
        // y su propio saldo. Nada de administración: crear o editar usuarios, asignar tokens ni ver la auditoría están
        // prohibidos; lo garantiza la política "AdminGeneral" en system/usuarios, system/auditoria y system/tokens
        // (salvo mi-saldo), y la web ademas corta esas rutas en su intermediario. GERENCIA queda igual que SUPERVISOR
        // hasta que se definan sus funciones. Esta lista solo decide qué menús de consulta ven (todos).
        public static readonly string[] ConAccesoTotal = { AdminGeneral, Supervisor, Gerencia };
    }
}
