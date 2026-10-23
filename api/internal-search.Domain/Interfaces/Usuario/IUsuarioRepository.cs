using internal_search.Domain.DTOs.Common;
using internal_search.Domain.DTOs.Usuario;
using internal_search.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.Interfaces.Usuario
{
    public interface IUsuarioRepository
    {
        Task<Usuarios?> ObtenerPorUsuarioAsync(string usuario);
        Task<Usuarios?> ObtenerPorIdAsync(int codUsuario);

        // Usuario activo por login o, si no hay, por correo (solo si el correo es inequívoco)
        Task<Usuarios?> ObtenerActivoPorLoginOCorreoAsync(string identificador);
        Task<bool> ExisteLoginAsync(string login);
        Task<bool> ExisteCorreoAsync(string correo);

        // Devuelve los códigos que existen y están activos
        Task<List<int>> ObtenerRolesActivosAsync(IEnumerable<int> codRoles);
        Task<int> CrearAsync(Usuarios usuario, IEnumerable<int> codRoles);

        // Estado y roles vigentes en base de datos (null si el usuario no existe)
        Task<ContextoSesionDto?> ObtenerContextoSesionAsync(int codUsuario);
        Task<List<RolListadoDto>> ListarRolesActivosAsync();
        Task<int?> ObtenerCodRolAsync(string nombreRol);
        Task<PaginaDto<UsuarioListadoDto>> ListarAsync(string? texto, int pagina, int tamano);
        Task<bool> CambiarEstadoAsync(int codUsuario, bool activo, string usuarioActu);
        Task ReemplazarRolesAsync(int codUsuario, IEnumerable<int> codRoles, string usuarioActu);
        Task<int> ContarAdminsGeneralesActivosAsync(int? excluyendoCodUsuario);

        // Invalida todos los tokens ya emitidos para el usuario
        Task RevocarSesionesAsync(int codUsuario);
        // Guarda un hash de contraseña nuevo (restablecimiento hecho por un ADMIN GENERAL)
        Task<bool> ActualizarClaveAsync(int codUsuario, string hashClave, string usuarioActu);
    }
}
