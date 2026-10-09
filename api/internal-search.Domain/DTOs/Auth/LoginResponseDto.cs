using internal_search.Domain.DTOs.Usuario;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.DTOs.Auth
{
    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;

        public string TipoToken { get; set; } = "Bearer";

        public int Expira { get; set; }
        public int Estado { get; set; }
        public UsuarioLoginDto Usuario { get; set; } = null!;
    }
}
