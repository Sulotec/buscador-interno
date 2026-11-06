using internal_search.Domain.DTOs.buscador.empresa.masivo;
using internal_search_backend.Business.Services.Buscador.empresa.masivo;
using internal_search_backend.Business.Services.ListaNegra;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace internal_search_backend.Controllers.Buscador.empresa.masivo
{
    [Route("api/empresa")]
    [ApiController]
    [Authorize]
    public class MasivoController : ControllerBase
    {
        private readonly IBuscadorEmpresaMasivoService _masivoService;
        private readonly IBuscadorEmpresaMasivoExcelService _excelService; // <--- Cambiado al de empresa
        private readonly IListaNegraService _listaNegra;

        public MasivoController(
            IBuscadorEmpresaMasivoService masivoService,
            IBuscadorEmpresaMasivoExcelService excelService, // <--- Cambiado al de empresa
            IListaNegraService listaNegra)
        {
            _listaNegra = listaNegra;
            _masivoService = masivoService;
            _excelService = excelService;
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

            var seleccionadas = secciones
                .Select(s => s.Trim().ToLowerInvariant())
                .Distinct()
                .ToHashSet();

            // Usando SeccionesMasivoEmpresa correctamente
            var invalidas = seleccionadas
                .Where(s => !SeccionesMasivoEmpresa.Todas.Contains(s))
                .ToList();
                
            if (invalidas.Count > 0)
                return BadRequest($"Secciones no válidas: {string.Join(", ", invalidas)}");

            try
            {
                // Lista negra: se quitan del archivo los RUC 10 cuyo DNI está bloqueado (no se consultan)
                List<string> lineas;
                using (var lector = new StreamReader(archivo.OpenReadStream()))
                    lineas = (await lector.ReadToEndAsync(ct)).Split('\n').Select(l => l.Trim()).ToList();
                var bloqueados = await _listaNegra.FiltrarBloqueadosAsync(lineas, ct);
                var permitidas = lineas.Where(l => !bloqueados.Contains(l)).ToList();
                if (bloqueados.Count > 0 && permitidas.All(string.IsNullOrWhiteSpace))
                    return BadRequest("Todos los RUC del archivo pertenecen a DNI de la lista negra y no se pueden consultar.");

                using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(string.Join('\n', permitidas)));

                var resultado = await _masivoService.BuscarMasivoAsync(
                    stream,
                    seleccionadas,
                    ct);

                var excel = _excelService.GenerarExcel(
                    resultado,
                    seleccionadas);

                return File(
                    excel,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"Resultado_Empresa_Masivo_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx"
                );
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}