using internal_search.Domain.DTOs.Auth;
using internal_search_backend.Business.Services.Auditoria;
using internal_search_backend.Business.Services.Usuario;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace internal_search_backend.Controllers.Auth
{
    [Route("system/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUsuarioService _usuarioService;
        private readonly IRecuperacionClaveService _recuperacionService;
        private readonly IAuditoriaService _auditoria;

        public AuthController(
            IUsuarioService usuarioService,
            IRecuperacionClaveService recuperacionService,
            IAuditoriaService auditoria)
        {
            _usuarioService = usuarioService;
            _recuperacionService = recuperacionService;
            _auditoria = auditoria;
        }

        private string? Ip => HttpContext.Connection.RemoteIpAddress?.ToString();

        // Siempre responde igual, exista o no la cuenta, para no revelar usuarios
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(OlvideClaveDto request)
        {
            await _recuperacionService.SolicitarRecuperacionAsync(request.Identificador, Ip);

            await _auditoria.RegistrarEventoAsync(null, request.Identificador, Ip,
                "CLAVE_RECUPERACION_SOLICITADA");

            return Ok(new
            {
                message = "Si los datos son correctos, enviaremos las instrucciones al correo registrado."
            });
        }

        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(RestablecerClaveDto request)
        {
            try
            {
                var codUsuario = await _recuperacionService.RestablecerAsync(
                    request.Token, request.NuevaClave);

                // El auditor debe ver quién fue, no solo un código
                var usuario = await _usuarioService.ObtenerUsuarioSesionAsync(codUsuario);
                await _auditoria.RegistrarEventoAsync(codUsuario, usuario?.Usuario ?? string.Empty, Ip,
                    "CLAVE_RESTABLECIDA", "Usuario", codUsuario.ToString());

                return Ok(new { message = "Contraseña actualizada. Ya puedes iniciar sesión." });
            }
            catch (ArgumentException ex)
            {
                await _auditoria.RegistrarEventoAsync(null, string.Empty, Ip,
                    "CLAVE_RESTABLECER_FALLIDO", exito: false);

                return BadRequest(new { message = ex.Message });
            }
        }

        [EnableRateLimiting("auth")]
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login(
            IniciarSessionDto request)
        {
            try
            {
                var response = await _usuarioService
                    .IniciarSesionAsync(request);

                await _auditoria.RegistrarEventoAsync(response.Usuario.Id, request.UsuarioLogin, Ip, "LOGIN");

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                await _auditoria.RegistrarEventoAsync(null, request.UsuarioLogin, Ip, "LOGIN_FALLIDO", exito: false);

                return Unauthorized(new
                {
                    message = ex.Message
                });
            }
        }

        [Authorize]
        [HttpGet("check-status")]
        public async Task<IActionResult> CheckStatus()
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(idClaim, out var codUsuario))
                return Unauthorized(new { message = "Token inválido" });

            var usuario = await _usuarioService
                .ObtenerUsuarioSesionAsync(codUsuario);

            if (usuario == null)
                return Unauthorized(new { message = "Usuario no encontrado" });

            var authorization = Request.Headers["Authorization"].ToString();

            if (!authorization.StartsWith(
                "Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return Unauthorized(new { message = "Token no encontrado" });
            }

            var token = authorization["Bearer ".Length..].Trim();

            if (string.IsNullOrEmpty(token))
                return Unauthorized(new { message = "Token no encontrado" });

            if (!long.TryParse(User.FindFirstValue("exp"), out var exp))
                return Unauthorized(new { message = "Vencimiento inválido" });

            var segundosRestantes =
                exp - DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            if (segundosRestantes <= 0)
                return Unauthorized(new { message = "Sesión expirada" });

            return Ok(new
            {
                estado = 1,
                token,
                tipoToken = "Bearer",
                expira = segundosRestantes,
                usuario
            });
        }
    }
}
