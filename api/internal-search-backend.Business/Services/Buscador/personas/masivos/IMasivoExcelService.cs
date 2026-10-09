using internal_search.Domain.DTOs.buscador.persona.masivos;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace internal_search_backend.Business.Services.Buscador.personas.masivos
{
    public interface IMasivoExcelService
    {
        Task<BuscadorMasivoResponse> BuscarMasivoAsync(
            Stream archivo, HashSet<string> secciones, CancellationToken ct);
    }
}
