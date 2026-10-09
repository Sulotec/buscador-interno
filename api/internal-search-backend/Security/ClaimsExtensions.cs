using internal_search.Domain.Constants;
using internal_search.Domain.DTOs.Auditoria;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace internal_search_backend.Security
{
    public static class ClaimsExtensions
    {
        public static bool TieneRol(this ClaimsPrincipal user, string rol) =>
            user.Claims.Any(c =>
                (c.Type == ClaimTypes.Role || c.Type == "role") &&
                string.Equals(c.Value, rol, StringComparison.OrdinalIgnoreCase));

        public static bool EsAdminGeneral(this ClaimsPrincipal user) =>
            user.TieneRol(RolesSistema.AdminGeneral);

        public static int CodUsuario(this ClaimsPrincipal user) =>
            int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var cod)
                ? cod
                : throw new UnauthorizedAccessException("El token no contiene un código de usuario válido.");

        // Quién hace la petición, para tokens y auditoría
        public static ContextoAccion Contexto(this ControllerBase controller) =>
            new(controller.User.CodUsuario(),
                controller.User.FindFirstValue("UsuarioLogin") ?? string.Empty,
                controller.HttpContext.Connection.RemoteIpAddress?.ToString(),
                controller.User.EsAdminGeneral());
    }
}
