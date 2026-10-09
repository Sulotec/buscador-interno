using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search.Domain.Entities;
using internal_search_backend.Business.Services.Buscador.personas.individual;
using internal_search_backend.Business.Services.Reniec;
using internal_search_backend.Business.Services.Tokens;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace internal_search_backend.Controllers.Buscador.persona.individual
{
    [ApiController]
    [Route("api/buscador")]
    [Authorize]
    public class BuscadorController : ControllerBase
    {
        private const int CostoConsulta = 1;

        private readonly IIndividualService _buscadorService;
        private readonly ITokenService _tokens;
        private readonly IReniecService _reniec;

        public BuscadorController(IIndividualService buscadorService, ITokenService tokens, IReniecService reniec)
        {
            _buscadorService = buscadorService;
            _tokens = tokens;
            _reniec = reniec;
        }

        /// <summary>
        /// Consulta de identidad en RENIEC por DNI. Solo individual (no hay versión masiva).
        /// Cuesta 1 token; si el proveedor falla, el token se devuelve.
        /// </summary>
        [HttpGet("reniec/{dni}")]
        [ProducesResponseType(typeof(internal_search.Domain.DTOs.Reniec.ReniecResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status402PaymentRequired)]
        [ProducesResponseType(StatusCodes.Status502BadGateway)]
        public async Task<IActionResult> BuscarReniec(string dni, CancellationToken ct)
        {
            // Se valida antes de descontar: un DNI mal escrito no debe costar un token
            if (dni is not { Length: 8 } || !dni.All(char.IsDigit))
                return BadRequest(new { message = "El DNI debe contener exactamente 8 dígitos." });

            var resultado = await _tokens.EjecutarAsync(
                this.Contexto(), CostoConsulta, "BUSQUEDA_RENIEC", dni,
                () => _reniec.ConsultarAsync(dni, ct));

            return Ok(resultado);
        }

        /// <summary>
        /// Busca por Documento + TipoDocumento (DNI/RUC) + Periodo (YYYYMM).
        /// La validación de formato la hace BuscadorHistorialEntrada vía IValidatableObject;
        /// con [ApiController], ASP.NET Core devuelve 400 automáticamente si el ModelState
        /// es inválido, así que si este método se ejecuta, la entrada ya es válida.
        /// </summary>
        [HttpPost("buscar")]
        [ProducesResponseType(typeof(BuscadorHistorialResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Buscar([FromBody] BuscadorHistorialEntrada entrada, CancellationToken ct)
        {
            var resultado = await _tokens.EjecutarAsync(
                this.Contexto(), CostoConsulta, "BUSQUEDA_PERSONA",
                $"{entrada.TipoDocumento} {entrada.Documento}",
                () => _buscadorService.BuscarAsync(entrada, ct));
            return Ok(resultado);
        }

        [HttpPost("buscar-telefono")]
        [ProducesResponseType(typeof(BuscadorTelefonoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> BuscarPorTelefono(
        [FromBody] BuscadorPorTelfonoEntrada entrada, CancellationToken ct)
        {
            var resultado = await _tokens.EjecutarAsync(
                this.Contexto(), CostoConsulta, "BUSQUEDA_TELEFONO",
                entrada.Telefono,
                () => _buscadorService.BuscarPorTelefonoAsync(entrada.Telefono, ct));
            return Ok(resultado);
        }
    }
}
