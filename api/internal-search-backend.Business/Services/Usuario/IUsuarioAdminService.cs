using internal_search.Domain.DTOs.Auditoria;
using internal_search.Domain.DTOs.Common;
using internal_search.Domain.DTOs.Usuario;

namespace internal_search_backend.Business.Services.Usuario
{
    public interface IUsuarioAdminService
    {
        // ArgumentException: datos inválidos (400). InvalidOperationException: duplicado o regla de negocio (409).
        Task<CrearUsuarioResponseDto> CrearAsync(CrearUsuarioDto dto, ContextoAccion admin);
        Task<PaginaDto<UsuarioListadoDto>> ListarAsync(string? texto, int pagina, int tamano);
        Task<List<RolListadoDto>> ListarRolesAsync();
        Task CambiarEstadoAsync(int codUsuario, bool activo, ContextoAccion admin);
        Task CerrarSesionesAsync(int codUsuario, ContextoAccion admin);
        Task CambiarRolesAsync(int codUsuario, IEnumerable<int> codRoles, ContextoAccion admin);
    }
}
