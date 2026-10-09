using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace internal_search_backend.Controllers.Buscador.persona.masivo
{
    [Authorize]
    [Route("api/historial")]
    [ApiController]
    public class HistorialController : ControllerBase
    {
        private const string ExcelMime =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        private readonly IHistorialService _historialService;

        public HistorialController(IHistorialService historialService)
        {
            _historialService = historialService;
        }

        private int CodUsuario =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/historial -> historial del COD_USUARIO logueado (máx. 5)
        [HttpGet]
        public async Task<IActionResult> Historial() =>
            Ok(await _historialService.ListarAsync(CodUsuario));

        // GET api/historial/5/descargar -> archivo del historial (solo si es de ese COD_USUARIO)

        // Antes cualquier usuario autenticado podía leer el historial de otro
        [HttpGet("usuario/{codUsuario:int}")]
        public async Task<IActionResult> HistorialPorUsuario(int codUsuario)
        {
            if (codUsuario != CodUsuario && !User.EsAdminGeneral())
                return Forbid();

            return Ok(await _historialService.ListarAsync(codUsuario));
        }

        // GET api/historial/15/descargar

        [HttpGet("{codHistorial:int}/descargar")]
        public async Task<IActionResult> Descargar(int codHistorial)
        {
            var archivo = await _historialService.ObtenerArchivoAsync(codHistorial, CodUsuario);
            if (archivo is null)
                return NotFound(new { mensaje = "El archivo no existe o ya no está disponible." });

            return File(archivo.Value.Contenido, ExcelMime, archivo.Value.NombreArchivo);
        }


        [HttpPost("masivo/historial")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> RecibirHistorial([FromForm] RecibirHistorialEntrada request)
        {
            if (request.ArchivoExcel == null || request.ArchivoExcel.Length == 0)
                return BadRequest("Debes enviar el archivo Excel.");

            if (request.Secciones == null || request.Secciones.Length == 0)
                return BadRequest("Debes enviar las secciones seleccionadas.");

            if (request.TotalDnis <= 0)
                return BadRequest("El total de DNI debe ser mayor a cero.");

            var usuarioId =
                User.FindFirstValue("COD_USUARIO")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(usuarioId, out var codUsuario))
                return Unauthorized("El token no contiene un código de usuario válido.");

            using var ms = new MemoryStream();
            await request.ArchivoExcel.CopyToAsync(ms);

            var nombreArchivo = Path.GetFileName(request.ArchivoExcel.FileName);

            await _historialService.GuardarAsync(
                codUsuario, ms.ToArray(), nombreArchivo, request.Secciones, request.TotalDnis);

            return Ok(new { mensaje = "Historial guardado correctamente." });
        }
    }
}