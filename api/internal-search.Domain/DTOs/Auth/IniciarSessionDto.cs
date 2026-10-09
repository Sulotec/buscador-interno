using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.DTOs.Auth
{   

    //esto es para las respuesta del que ira al frontend
    public class IniciarSessionDto
    {
        public string UsuarioLogin { get; set; } = string.Empty;

        public string Clave { get; set; } = string.Empty;

    }
}
