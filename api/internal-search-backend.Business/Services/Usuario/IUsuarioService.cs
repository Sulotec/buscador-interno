using internal_search.Domain.DTOs.Auth;
using internal_search.Domain.DTOs.Usuario;
using internal_search.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Usuario
{
    //conecta con domain
    public interface IUsuarioService
    {
        Task<LoginResponseDto> IniciarSesionAsync(IniciarSessionDto request);

        Task<UsuarioLoginDto?> ObtenerUsuarioSesionAsync(int codUsuario);
    }
}
