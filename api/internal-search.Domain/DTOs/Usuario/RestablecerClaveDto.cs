using System.ComponentModel.DataAnnotations;

namespace internal_search.Domain.DTOs.Usuario
{
    // Un ADMIN GENERAL define una contraseña nueva a una cuenta (por ejemplo, cuentas sin correo que no pueden
    // usar "¿Olvidaste tu contraseña?"). Al aplicarla se cierran las sesiones abiertas de esa cuenta.
    public class RestablecerClaveDto
    {
        [Required]
        public string Clave { get; set; } = string.Empty;
    }
}
