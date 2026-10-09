using internal_search.Domain.DTOs.Tokens;
using internal_search_backend.Business.Services.Tokens;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace internal_search_backend.Controllers.Tokens
{
    [Route("system/tokens")]
    [ApiController]
    [Authorize]
    public class TokensController : ControllerBase
    {
        private readonly ITokenService _tokenService;

        public TokensController(ITokenService tokenService)
        {
            _tokenService = tokenService;
        }

        // Saldo propio (ADMIN GENERAL aparece como ilimitado)
        [HttpGet("mi-saldo")]
        public async Task<IActionResult> MiSaldo() =>
            Ok(await _tokenService.ObtenerSaldoAsync(this.Contexto()));

        [Authorize(Policy = "AdminGeneral")]
        [HttpGet("{codUsuario:int}")]
        public async Task<IActionResult> Saldo(int codUsuario)
        {
            try
            {
                return Ok(await _tokenService.ObtenerSaldoDeAsync(codUsuario));
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [Authorize(Policy = "AdminGeneral")]
        [HttpGet("{codUsuario:int}/movimientos")]
        public async Task<IActionResult> Movimientos(int codUsuario, [FromQuery] int top = 50) =>
            Ok(await _tokenService.ListarMovimientosAsync(codUsuario, top));

        // Asigna (cantidad > 0) o retira (cantidad < 0) tokens de un usuario
        [Authorize(Policy = "AdminGeneral")]
        [HttpPost("asignar")]
        public async Task<IActionResult> Asignar(AsignarTokensDto request)
        {
            try
            {
                return Ok(await _tokenService.AsignarAsync(this.Contexto(), request));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
