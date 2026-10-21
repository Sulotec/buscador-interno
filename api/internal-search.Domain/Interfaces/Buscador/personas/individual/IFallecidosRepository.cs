using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.Entities;

namespace internal_search.Domain.Interfaces.Buscador.personas.individual
{
    public interface IFallecidosRepository
    {
        Task<List<Fallecidos>> BuscarAsync(
            BuscarFallecidosRequestDto filtro,
            int limite,
            CancellationToken ct);
    }
}
