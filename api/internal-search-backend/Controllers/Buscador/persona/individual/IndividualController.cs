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
        private readonly IPersonaPdfService _personaPdfService;
        private readonly IFallecidosService _fallecidosService;
        private readonly ITokenService _tokens;
        private readonly IReniecService _reniec;

        public BuscadorController(
            IIndividualService buscadorService,
            IPersonaPdfService personaPdfService,
            IFallecidosService fallecidosService,
            ITokenService tokens,
            IReniecService reniec)
        {
            _buscadorService = buscadorService;
            _personaPdfService = personaPdfService;
            _fallecidosService = fallecidosService;
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

        [HttpPost("exportar-pdf")]
        [Produces("application/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ExportarPdf(
            [FromBody] BuscadorHistorialResponse resultado,
            CancellationToken ct)
        {
            var pdf = _personaPdfService.Generar(resultado);

            return File(pdf, "application/pdf", $"ficha-{resultado.Documento}.pdf");
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

        /// <summary>Busca personas por apellidos y nombres. Devuelve hasta 100 coincidencias.</summary>
        [HttpPost("buscar-nombres")]
        [ProducesResponseType(typeof(List<BuscadorNombresResultado>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status402PaymentRequired)]
        public async Task<IActionResult> BuscarPorNombres(
            [FromBody] BuscadorNombresEntrada entrada, CancellationToken ct)
        {
            var detalle = string.Join(" ", new[] { entrada.ApePat, entrada.ApeMat, entrada.Nombres }
                .Where(x => !string.IsNullOrWhiteSpace(x)));
            var resultado = await _tokens.EjecutarAsync(
                this.Contexto(), CostoConsulta, "BUSQUEDA_PERSONA_NOMBRES", detalle,
                () => _buscadorService.BuscarPorNombresAsync(entrada, ct));

            return Ok(resultado);
        }

        /// <summary>Busca registros de fallecidos por DNI exacto o por apellidos y prenombres.</summary>
        [HttpPost("buscar-fallecidos")]
        [ProducesResponseType(typeof(BusquedaPersonasResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status402PaymentRequired)]
        public async Task<IActionResult> BuscarFallecidos(
            [FromBody] BuscarFallecidosRequestDto entrada,
            CancellationToken ct)
        {
            var detalle = !string.IsNullOrWhiteSpace(entrada.Dni)
                ? $"DNI {entrada.Dni.Trim()}"
                : string.Join(" ", new[] { entrada.ApePat, entrada.ApeMat, entrada.Prenombres }
                    .Where(x => !string.IsNullOrWhiteSpace(x)));

            var resultado = await _tokens.EjecutarAsync(
                this.Contexto(), CostoConsulta, "BUSQUEDA_FALLECIDOS", detalle,
                () => _fallecidosService.BuscarPersonasAsync(entrada, ct));

            return Ok(resultado);
        }
    }
}
