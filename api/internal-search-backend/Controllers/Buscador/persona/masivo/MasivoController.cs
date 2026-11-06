using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search_backend.Business.Services.Buscador.personas.masivos;
using internal_search_backend.Business.helpers;
using internal_search_backend.Business.Services.Tokens;
using internal_search_backend.Business.Services.ListaNegra;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using System.Text.RegularExpressions;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace internal_search_backend.Controllers.Buscador.persona.masivo
{


    [ApiController]
    [Route("api/buscador")]
    [Authorize]
    public class MasivoController : ControllerBase
    {
        private readonly IMasivoExcelService _masivoService;
        private readonly IBuscadorMasivoExcelService _excelService;
        private readonly ITokenService _tokens;
        private readonly IListaNegraService _listaNegra;

        public MasivoController(
            IMasivoExcelService masivoService,
            IBuscadorMasivoExcelService excelService,
            ITokenService tokens,
            IListaNegraService listaNegra)
        {
            _masivoService = masivoService;
            _excelService = excelService;
            _tokens = tokens;
            _listaNegra = listaNegra;

        }

        //[HttpPost("masivo")]
        //[Consumes("multipart/form-data")]
        //[RequestSizeLimit(5_000_000)]
        //public async Task<IActionResult> BuscarMasivo(
        //    IFormFile archivo, [FromForm] string? periodo, CancellationToken ct)
        //{
        //    if (archivo == null || archivo.Length == 0)
        //        return BadRequest("Sube un archivo .txt o .csv.");

        //    var ext = Path.GetExtension(archivo.FileName).ToLowerInvariant();
        //    if (ext is not (".txt" or ".csv"))
        //        return BadRequest("Solo se permiten archivos .txt o .csv.");

        //    if (!string.IsNullOrEmpty(periodo) && !Regex.IsMatch(periodo, @"^\d{6}$"))
        //        return BadRequest("El periodo debe tener formato YYYYMM.");

        //    try
        //    {
        //        using var stream = archivo.OpenReadStream();
        //        return Ok(await _masivoService.BuscarMasivoAsync(stream, ct));
        //    }
        //    catch (ArgumentException ex)
        //    {
        //        return BadRequest(ex.Message);
        //    }
        //}


        public class VerificarListaNegraEntrada
        {
            public List<string> Documentos { get; set; } = new();
        }

        /// <summary>
        /// De una lista de documentos, devuelve los que están en la lista negra, para marcarlos en la pantalla de
        /// carga masiva antes de enviar. No cobra tokens. Sirve para personas (DNI, RUC 10) y empresas (RUC 10).
        /// </summary>
        [HttpPost("masivo/lista-negra")]
        [EnableRateLimiting("consultas")]
        public async Task<IActionResult> VerificarListaNegra([FromBody] VerificarListaNegraEntrada entrada, CancellationToken ct)
        {
            // Tope generoso: una lista pegada puede traer más de 5000 (el resto queda para la carga siguiente)
            if (entrada.Documentos.Count > 20_000)
                return BadRequest(new { message = "Se pueden revisar como máximo 20.000 documentos a la vez." });

            var bloqueados = await _listaNegra.FiltrarBloqueadosAsync(entrada.Documentos, ct);
            return Ok(new { bloqueados });
        }

        [HttpPost("masivo/exportar")]
        [EnableRateLimiting("masivo")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(5_000_000)]
        public async Task<IActionResult> ExportarMasivo(
            IFormFile archivo,
            [FromForm] string[] secciones,
            CancellationToken ct)
        {
            if (archivo == null || archivo.Length == 0)
                return BadRequest("Sube un archivo .txt o .csv.");

            var ext = Path.GetExtension(archivo.FileName).ToLowerInvariant();

            if (ext is not (".txt" or ".csv"))
                return BadRequest("Solo se permiten archivos .txt o .csv.");

            if (secciones == null || secciones.Length == 0)
                return BadRequest("Selecciona al menos una sección.");

            // Normaliza y valida contra la lista permitida
            var seleccionadas = secciones
                .Select(s => s.Trim().ToLowerInvariant())
                .Distinct()
                .ToHashSet();

            var invalidas = seleccionadas
                .Where(s => !SeccionesMasivo.Todas.Contains(s))
                .ToList();

            if (invalidas.Count > 0)
                return BadRequest($"Secciones no válidas: {string.Join(", ", invalidas)}");

            try
            {
                // El parser cierra el stream que recibe, así que cada lectura usa su propia copia.
                byte[] contenido;
                using (var ms = new MemoryStream())
                {
                    await archivo.CopyToAsync(ms, ct);
                    contenido = ms.ToArray();
                }

                // Cada documento válido cuesta 1 token; se cuenta antes de consultar.
                // Los de la lista negra no se consultan ni se cobran.
                var validos = DocumentoFileParser.Parse(new MemoryStream(contenido)).validos;
                var bloqueados = await _listaNegra.FiltrarBloqueadosAsync(validos, ct);
                var costo = validos.Count(d => !bloqueados.Contains(d.Trim()));
                if (costo == 0)
                    return BadRequest(bloqueados.Count > 0
                        ? $"Los {bloqueados.Count} documento(s) de la lista están en la lista negra y no se pueden consultar: " +
                          $"{string.Join(", ", bloqueados.Take(10))}{(bloqueados.Count > 10 ? "…" : "")}. Quítalos de la lista para continuar."
                        : "El archivo no contiene documentos válidos.");

                // Se valida antes de cobrar para no descontar y devolver tokens sin necesidad.
                if (costo > BuscadorMasivoService.MaxDocumentos)
                    return BadRequest($"El máximo por carga es {BuscadorMasivoService.MaxDocumentos} documentos.");

                var resultado = await _tokens.EjecutarAsync(
                    this.Contexto(), costo, "BUSQUEDA_MASIVA",
                    $"{costo} documento(s); secciones: {string.Join(",", seleccionadas)}{(bloqueados.Count > 0 ? $"; {bloqueados.Count} en lista negra (excluidos)" : "")}",
                    () => _masivoService.BuscarMasivoAsync(new MemoryStream(contenido), seleccionadas, bloqueados, ct));

                var excel = _excelService.GenerarExcel(
                    resultado,
                    seleccionadas);  // nuevo

                return File(
                    excel,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"Resultado_Masivo_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx"
                );
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
