using AutoMapper;
using internal_search.Domain.DTOs.Auth;
using internal_search.Domain.DTOs.Usuario;
using internal_search.Domain.Interfaces.Auth;
using internal_search.Domain.Interfaces.Usuario;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Usuario
{
    public class UsuarioService : IUsuarioService
    {
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IContrasenaRepository _passwordService;
        private readonly IJwtRepository _jwtRepository;

        public UsuarioService(IUsuarioRepository usuarioRepository, IContrasenaRepository passwordService, IJwtRepository jwtRepository)
        {
            _usuarioRepository = usuarioRepository;
            _passwordService = passwordService;
            _jwtRepository = jwtRepository;
        }

        public async Task<LoginResponseDto> IniciarSesionAsync(IniciarSessionDto request)
        {
            var usuario = await _usuarioRepository
                .ObtenerPorUsuarioAsync(request.UsuarioLogin);

            if (usuario == null || usuario.Estado != 1)
            {
                throw new UnauthorizedAccessException(
                    "Usuario o contraseña incorrectos");
            }

            var passwordValida = _passwordService.Verificar(
                request.Clave,
                usuario.Clave
            );

            if (!passwordValida)
            {
                throw new UnauthorizedAccessException(
                    "Usuario o contraseña incorrectos");
            }

            var token = _jwtRepository.GenerarToken(usuario);

            return new LoginResponseDto
            {
                Token = token,
                TipoToken = "Bearer",
                Expira = _jwtRepository.DuracionSegundos,
                Estado = 1,
                Usuario = new UsuarioLoginDto
                {
                    Id = usuario.CodUsuario,
                    Usuario = usuario.UsuarioLogin,
                    NombreCompleto =
                        usuario.Nombres + " " +
                        usuario.ApePat + " " +
                        usuario.ApeMat,

                    Roles = usuario.UsuarioRoles
                        .Select(ur => new RolDto
                        {
                            CodigoRol = ur.Rol.CodRol,
                            Rol = ur.Rol.NomRol
                        })
                        .ToList()
                }
            };
        }




        public async Task<UsuarioLoginDto?> ObtenerUsuarioSesionAsync(int codUsuario)
        {
            var usuario = await _usuarioRepository.ObtenerPorIdAsync(codUsuario);

            if (usuario == null)
                return null;

            return new UsuarioLoginDto
            {
                Id = usuario.CodUsuario,
                Usuario = usuario.UsuarioLogin,
                NombreCompleto =
                    usuario.Nombres + " " +
                    usuario.ApePat + " " +
                    usuario.ApeMat,

                Roles = usuario.UsuarioRoles
                    .Select(ur => new RolDto
                    {
                        CodigoRol = ur.Rol.CodRol,
                        Rol = ur.Rol.NomRol
                    })
                    .ToList()
            };
        }
    }

}