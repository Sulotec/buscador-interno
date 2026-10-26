using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search_backend.Business.Services.Buscador.personas.masivos;
using internal_search_backend.Business.helpers;
using internal_search_backend.Business.Services.Tokens;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public MasivoController(
            IMasivoExcelService masivoService,
            IBuscadorMasivoExcelService excelService,
            ITokenService tokens)
        {
            _masivoService = masivoService;
            _excelService = excelService;
            _tokens = tokens;

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


        [HttpPost("masivo/exportar")]
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
                var costo = DocumentoFileParser.Parse(new MemoryStream(contenido)).validos.Count;
                if (costo == 0)
                    return BadRequest("El archivo no contiene documentos válidos.");

                var resultado = await _tokens.EjecutarAsync(
                    this.Contexto(), costo, "BUSQUEDA_MASIVA",
                    $"{costo} documento(s); secciones: {string.Join(",", seleccionadas)}",
                    () => _masivoService.BuscarMasivoAsync(new MemoryStream(contenido), seleccionadas, ct));

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
