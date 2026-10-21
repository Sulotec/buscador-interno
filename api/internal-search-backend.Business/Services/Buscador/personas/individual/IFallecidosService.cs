using internal_search.Domain.DTOs.buscador.persona.individual;

namespace internal_search_backend.Business.Services.Buscador.personas.individual
{
    public interface IFallecidosService
    {
        Task<BusquedaPersonasResponseDto> BuscarPersonasAsync(
            BuscarFallecidosRequestDto filtro,
            CancellationToken ct);
    }
}
