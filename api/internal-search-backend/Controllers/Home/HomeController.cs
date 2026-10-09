using internal_search_backend.Business.Services.Menu;
using internal_search.Domain.Constants;
using internal_search_backend.Business.Services.Usuario;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace internal_search_backend.Controllers.Home
{
    [Route("system/home")]
    [ApiController]
    public class HomeController : ControllerBase
    {

        private readonly IMenuService _menuService;
        private readonly IUsuarioService _usuarioService;

        public HomeController(IMenuService menuService, IUsuarioService usuarioService)
        {
            _menuService = menuService;
            _usuarioService = usuarioService;
        }

        [Authorize]
        [HttpGet("get-routes")]
        public async Task<IActionResult> GetRoutes([FromQuery] int? cod_role = null)
        {
            // cod_role se ignora: antes se confiaba en el rol que mandaba el cliente (y el frontend
            // enviaba el id del usuario). El menú sale de los roles activos del usuario del token.
            var usuario = await _usuarioService.ObtenerUsuarioSesionAsync(User.CodUsuario());
            if (usuario == null)
                return Unauthorized();

            var accesoTotal = usuario.Roles.Any(r =>
                RolesSistema.ConAccesoTotal.Contains(r.Rol, StringComparer.OrdinalIgnoreCase));

            var menus = accesoTotal
                ? await _menuService.ObtenerTodosLosMenusAsync()
                : await _menuService.ObtenerMenusPorRolesAsync(usuario.Roles.Select(r => r.CodigoRol));

            return Ok(menus);
        }
    }
}
