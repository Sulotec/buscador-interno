using System.ComponentModel.DataAnnotations;

namespace internal_search.Domain.DTOs.Usuario
{
    public class CrearUsuarioDto
    {
        [Required, MaxLength(100)]
        public string Nombres { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string ApePat { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ApeMat { get; set; }

        [Required, MinLength(4), MaxLength(50)]
        [RegularExpression(@"^[A-Za-z0-9._-]+$", ErrorMessage = "El usuario solo admite letras, números, punto, guion y guion bajo.")]
        public string UsuarioLogin { get; set; } = string.Empty;

        // Obligatorio: es el canal de invitación y recuperación
        [Required, EmailAddress, MaxLength(150)]
        public string Correo { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Dni { get; set; }

        [MaxLength(150)]
        public string? Telefono { get; set; }

        [Required, MinLength(1)]
        public List<int> CodRoles { get; set; } = new();

        // Tokens (consultas) con los que arranca la cuenta; no aplica a ADMIN GENERAL, que es ilimitado
        [Range(0, 1_000_000)]
        public int TokensIniciales { get; set; }

        // Opcional. Si se omite, el usuario recibe un correo para definir su propia clave.
        public string? Clave { get; set; }
    }

    public class CrearUsuarioResponseDto
    {
        public int CodUsuario { get; set; }
        public string UsuarioLogin { get; set; } = string.Empty;
        public bool InvitacionEnviada { get; set; }
    }
}
