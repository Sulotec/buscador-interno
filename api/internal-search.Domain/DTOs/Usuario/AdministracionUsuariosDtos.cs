using internal_search.Domain.DTOs.Auth;
using System.ComponentModel.DataAnnotations;

namespace internal_search.Domain.DTOs.Usuario
{
    public class UsuarioListadoDto
    {
        public int Id { get; set; }
        public string Usuario { get; set; } = string.Empty;
        public string NombreCompleto { get; set; } = string.Empty;
        public string? Correo { get; set; }
        public int Estado { get; set; }
        public List<string> Roles { get; set; } = new();
        public int SaldoTokens { get; set; }
    }

    public class CambiarEstadoDto
    {
        public bool Activo { get; set; }
    }

    public class CambiarRolesDto
    {
        [Required, MinLength(1)]
        public List<int> CodRoles { get; set; } = new();
    }

    // Rol y estado vigente de un usuario, usado para validar cada petición
    public class ContextoSesionDto
    {
        public bool Activo { get; set; }
        public List<string> Roles { get; set; } = new();

        // Tokens emitidos antes de esta fecha (UTC) ya no son válidos
        public DateTime? RevocadoDesdeUtc { get; set; }
    }

    public class RolListadoDto : RolDto
    {
        public string? Descripcion { get; set; }
    }
}
