using internal_search.Domain.DTOs.ListaNegra;
using internal_search_backend.Business.Services.ListaNegra;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace internal_search_backend.Controllers.ListaNegra
{
    // Lista negra de DNI que nadie puede consultar. Solo ADMIN GENERAL la ve y la modifica.
    [Route("system/lista-negra")]
    [ApiController]
    [Authorize(Policy = "AdminGeneral")]
    public class ListaNegraController : ControllerBase
    {
        private readonly IListaNegraService _listaNegra;

        public ListaNegraController(IListaNegraService listaNegra) => _listaNegra = listaNegra;

        [HttpGet]
        public async Task<IActionResult> Listar([FromQuery] ListaNegraFiltroDto filtro, CancellationToken ct) =>
            Ok(await _listaNegra.ListarAsync(filtro, ct));

        [HttpPost]
        public async Task<IActionResult> Agregar([FromBody] AgregarListaNegraDto dto, CancellationToken ct)
        {
            try
            {
                return Ok(await _listaNegra.AgregarAsync(this.Contexto(), dto, ct));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Desbloquear (baja lógica): pide el motivo; el registro queda en el historial
        [HttpPost("{dni}/quitar")]
        public async Task<IActionResult> Quitar(string dni, [FromBody] QuitarListaNegraDto dto, CancellationToken ct)
        {
            try
            {
                await _listaNegra.QuitarAsync(this.Contexto(), dni, dto.Motivo, ct);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
