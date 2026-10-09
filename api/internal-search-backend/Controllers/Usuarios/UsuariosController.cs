using internal_search.Domain.DTOs.Usuario;
using internal_search_backend.Business.Services.Usuario;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace internal_search_backend.Controllers.Usuarios
{
    // Levantamiento y administración de cuentas: solo ADMIN GENERAL
    [Route("system/usuarios")]
    [ApiController]
    [Authorize(Policy = "AdminGeneral")]
    public class UsuariosController : ControllerBase
    {
        private readonly IUsuarioAdminService _usuarioAdminService;

        public UsuariosController(IUsuarioAdminService usuarioAdminService)
        {
            _usuarioAdminService = usuarioAdminService;
        }

        [HttpGet]
        public async Task<IActionResult> Listar(
            [FromQuery] string? texto, [FromQuery] int pagina = 1, [FromQuery] int tamano = 25) =>
            Ok(await _usuarioAdminService.ListarAsync(texto, pagina, tamano));

        // Roles disponibles para asignar (ADMIN GENERAL, SUPERVISOR, GERENCIA, ...)
        [HttpGet("roles")]
        public async Task<IActionResult> Roles() =>
            Ok(await _usuarioAdminService.ListarRolesAsync());

        // Alta de usuario. Sin "clave" se envía una invitación al correo para que defina la suya.
        [HttpPost]
        public Task<IActionResult> Crear(CrearUsuarioDto request) =>
            Ejecutar(async () =>
            {
                var respuesta = await _usuarioAdminService.CrearAsync(request, this.Contexto());
                return StatusCode(StatusCodes.Status201Created, respuesta);
            });

        [HttpPut("{codUsuario:int}/estado")]
        public Task<IActionResult> CambiarEstado(int codUsuario, CambiarEstadoDto request) =>
            Ejecutar(async () =>
            {
                await _usuarioAdminService.CambiarEstadoAsync(codUsuario, request.Activo, this.Contexto());
                return NoContent();
            });

        // Invalida de inmediato todas las sesiones abiertas del usuario
        [HttpPost("{codUsuario:int}/cerrar-sesiones")]
        public Task<IActionResult> CerrarSesiones(int codUsuario) =>
            Ejecutar(async () =>
            {
                await _usuarioAdminService.CerrarSesionesAsync(codUsuario, this.Contexto());
                return NoContent();
            });

        [HttpPut("{codUsuario:int}/roles")]
        public Task<IActionResult> CambiarRoles(int codUsuario, CambiarRolesDto request) =>
            Ejecutar(async () =>
            {
                await _usuarioAdminService.CambiarRolesAsync(codUsuario, request.CodRoles, this.Contexto());
                return NoContent();
            });

        private async Task<IActionResult> Ejecutar(Func<Task<IActionResult>> accion)
        {
            try
            {
                return await accion();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}
