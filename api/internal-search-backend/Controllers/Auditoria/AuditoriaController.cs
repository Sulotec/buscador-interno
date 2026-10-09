using internal_search.Domain.DTOs.Auditoria;
using internal_search_backend.Business.Services.Auditoria;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace internal_search_backend.Controllers.Auditoria
{
    // Bitácora de accesos, consultas, altas de cuentas y movimientos de tokens
    [Route("system/auditoria")]
    [ApiController]
    [Authorize(Policy = "AdminGeneral")]
    public class AuditoriaController : ControllerBase
    {
        private readonly IAuditoriaService _auditoriaService;

        public AuditoriaController(IAuditoriaService auditoriaService)
        {
            _auditoriaService = auditoriaService;
        }

        [HttpGet]
        public async Task<IActionResult> Listar([FromQuery] AuditoriaFiltroDto filtro) =>
            Ok(await _auditoriaService.ListarAsync(filtro));
    }
}
