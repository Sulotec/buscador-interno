using internal_search.Domain.DTOs.buscador.persona.masivos;

namespace internal_search.Domain.Interfaces.Buscador.personas.masivo
{
    public interface IBuscadorMasivoRepository
    {
        Task<BuscadorMasivoResponse> BuscarMasivoAsync(
            List<string> documentos,          // el tipo que ya uses para "validos"
            HashSet<string> secciones,
            CancellationToken ct);
    }
}