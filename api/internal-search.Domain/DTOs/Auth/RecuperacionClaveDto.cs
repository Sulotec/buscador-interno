using System.ComponentModel.DataAnnotations;

namespace internal_search.Domain.DTOs.Auth
{
    public class OlvideClaveDto
    {
        // Usuario o correo
        [Required, MaxLength(150)]
        public string Identificador { get; set; } = string.Empty;
    }

    public class RestablecerClaveDto
    {
        [Required, MaxLength(200)]
        public string Token { get; set; } = string.Empty;

        [Required]
        public string NuevaClave { get; set; } = string.Empty;
    }
}
