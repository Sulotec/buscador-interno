using internal_search.Domain.DTOs.buscador.empresa.masivo;
using System.IO;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace internal_search_backend.Business.Services.Buscador.empresa.masivo
{
    public interface IBuscadorEmpresaMasivoService
    {
        // Únicamente la lógica de búsqueda masiva
        Task<BuscadorEmpresaMasivoResponseDto> BuscarMasivoAsync(
            Stream archivoStream,
            HashSet<string> secciones,
            CancellationToken ct);
    }
}