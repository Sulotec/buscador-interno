using internal_search.Domain.DTOs.buscador.empresa.individual;
using internal_search_backend.Business.Services.Buscador.empresa.individual;
using internal_search_backend.Business.Services.Tokens;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace internal_search_backend.Controllers.Buscador.empresa.individual
{
    [Authorize]
    [Route("api/empresa")]
    [ApiController]
    public class IndividualController : ControllerBase
    {
        private const int CostoConsulta = 1;

        private readonly IIndividualService _buscadorEmpresaService;
        private readonly ITokenService _tokens;

        public IndividualController(IIndividualService buscadorEmpresaService, ITokenService tokens)
        {
            _buscadorEmpresaService = buscadorEmpresaService;
            _tokens = tokens;
        }

        /// <summary>
        /// Busca la información consolidada de una empresa jurídica por su RUC (11 dígitos, empieza con 20)
        /// en todas las tablas operativas y de riesgo.
        /// </summary>
        /// <param name="ruc">Número de RUC de 11 dígitos</param>
        [HttpGet("individual/{ruc}")]
        [ProducesResponseType(typeof(BuscadorEmpresaResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ObtenerPorRuc(string ruc)
        {
            try
            {
                // Llamada al servicio de aplicación
                var resultado = await _tokens.EjecutarAsync(
                    this.Contexto(), CostoConsulta, "BUSQUEDA_EMPRESA_RUC", ruc,
                    () => _buscadorEmpresaService.BuscarEmpresaPorRucAsync(ruc));

                return Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                // Captura las validaciones de negocio/formato (ej: RUC inválido o longitud incorrecta)
                return BadRequest(new { mensaje = ex.Message });
            }
            // Cualquier otro error lo resuelve el manejador global: 500 sin detalles internos
            // (antes se devolvía ex.Message al cliente)
        }


        /// <summary>
        /// Busca la información consolidada de empresas por coincidencia de Razón Social (mínimo 3 caracteres)
        /// </summary>
        [HttpGet("razon-social/{razonSocial}")]
        [ProducesResponseType(typeof(BuscadorEmpresaResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ObtenerPorRazonSocial(string razonSocial)
        {
            try
            {
                // Llamada al método correspondiente del servicio
                var resultado = await _tokens.EjecutarAsync(
                    this.Contexto(), CostoConsulta, "BUSQUEDA_EMPRESA_RAZON", razonSocial,
                    () => _buscadorEmpresaService.BuscarEmpresaPorRazonSocialAsync(razonSocial));
                return Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                // Atrapa la validación de los menos de 3 caracteres
                return BadRequest(new { mensaje = ex.Message });
            }
            // Cualquier otro error lo resuelve el manejador global: 500 sin detalles internos
        }


    }
}
