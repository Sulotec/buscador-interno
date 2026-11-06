using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search.Domain.Entities;
using internal_search_backend.Business.Services.Buscador.personas.individual;
using internal_search_backend.Business.Services.Auditoria;
using internal_search_backend.Business.Services.Reniec;
using internal_search_backend.Business.Services.ListaNegra;
using internal_search_backend.Business.Services.Tokens;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using internal_search_backend.Redis;

namespace internal_search_backend.Controllers.Buscador.persona.individual
{
    [ApiController]
    [Route("api/buscador")]
    [Authorize]
    [EnableRateLimiting("consultas")]
    public class BuscadorController : ControllerBase
    {
        private const int CostoConsulta = 1;

        private readonly IIndividualService _buscadorService;
        private readonly IPersonaPdfService _personaPdfService;
        private readonly IFallecidosService _fallecidosService;
        private readonly ITokenService _tokens;
        private readonly IReniecService _reniec;
        private readonly IAuditoriaService _auditoria;
        private readonly ICacheConsultas _cache;
        private readonly IListaNegraService _listaNegra;

        public BuscadorController(
            IIndividualService buscadorService,
            IPersonaPdfService personaPdfService,
            IFallecidosService fallecidosService,
            ITokenService tokens,
            IReniecService reniec,
            IAuditoriaService auditoria,
            ICacheConsultas cache,
            IListaNegraService listaNegra)
        {
            _buscadorService = buscadorService;
            _personaPdfService = personaPdfService;
            _fallecidosService = fallecidosService;
            _tokens = tokens;
            _reniec = reniec;
            _auditoria = auditoria;
            _cache = cache;
            _listaNegra = listaNegra;
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

            // Lista negra: se revisa antes de cobrar; si está bloqueado responde 423 sin costo
            await _listaNegra.VerificarAsync(this.Contexto(), "BUSQUEDA_RENIEC", dni, ct);

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
            var contexto = this.Contexto();
            await _listaNegra.VerificarAsync(contexto, "DESCARGA_PDF_PERSONA", resultado.Documento, ct);
            var pdf = _personaPdfService.Generar(resultado, contexto.Login);
            await _auditoria.RegistrarAsync(
                contexto,
                "DESCARGA_PDF_PERSONA",
                "Archivo",
                $"ficha-{resultado.Documento}.pdf",
                $"PDF de consulta descargado para el documento {resultado.Documento}.");

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
            await _listaNegra.VerificarAsync(this.Contexto(), "BUSQUEDA_PERSONA", entrada.Documento, ct);

            var resultado = await _tokens.EjecutarAsync(
                this.Contexto(), CostoConsulta, "BUSQUEDA_PERSONA",
                $"{entrada.TipoDocumento} {entrada.Documento}",
                () => _cache.ObtenerOCrearAsync(
                    $"persona:{entrada.TipoDocumento.Trim().ToUpperInvariant()}:{entrada.Documento.Trim().ToUpperInvariant()}",
                    () => _buscadorService.BuscarAsync(entrada, ct), ct));
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
                () => _cache.ObtenerOCrearAsync(
                    $"telefono:{entrada.Telefono.Trim()}",
                    () => _buscadorService.BuscarPorTelefonoAsync(entrada.Telefono, ct), ct));

            // Lista negra: se ocultan los registros de titulares bloqueados (fuera del caché, para que aplique siempre)
            var bloqueados = await _listaNegra.FiltrarBloqueadosAsync(resultado.Registros.Select(x => x.Documento), ct);
            if (bloqueados.Count > 0)
            {
                resultado.Registros = resultado.Registros
                    .Where(x => !bloqueados.Contains(ListaNegraService.Normalizar(x.Documento))).ToList();
                resultado.DocumentosAsociados = resultado.Registros
                    .Select(x => ListaNegraService.Normalizar(x.Documento)).Where(x => x.Length > 0).Distinct().Count();
            }
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

            // Lista negra: se ocultan las personas con DNI bloqueado
            var bloqueados = await _listaNegra.FiltrarBloqueadosAsync(resultado.Select(x => x.Documento), ct);
            if (bloqueados.Count > 0)
                resultado = resultado.Where(x => !bloqueados.Contains(ListaNegraService.Normalizar(x.Documento))).ToList();

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

            if (!string.IsNullOrWhiteSpace(entrada.Dni))
                await _listaNegra.VerificarAsync(this.Contexto(), "BUSQUEDA_FALLECIDOS", entrada.Dni, ct);

            var resultado = await _tokens.EjecutarAsync(
                this.Contexto(), CostoConsulta, "BUSQUEDA_FALLECIDOS", detalle,
                () => _fallecidosService.BuscarPersonasAsync(entrada, ct));

            // Lista negra: en la búsqueda por apellidos se ocultan los DNI bloqueados
            var bloqueados = await _listaNegra.FiltrarBloqueadosAsync(resultado.Fallecidos.Select(x => x.Dni), ct);
            if (bloqueados.Count > 0)
                resultado.Fallecidos = resultado.Fallecidos
                    .Where(x => !bloqueados.Contains(ListaNegraService.Normalizar(x.Dni))).ToList();

            return Ok(resultado);
        }

    }
}
