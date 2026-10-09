using internal_search.Domain.DTOs.buscador.empresa.individual;
using internal_search.Domain.DTOs.buscador.empresa.masivo;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.Interfaces.Buscador.empresas.masivo
{
    public interface IBuscadorEmpresaMasivoRepository
    {
        Task<BuscadorEmpresaMasivoResponseDto> BuscarMasivoPorRucAsync(
            List<string> rucsValidos,
            HashSet<string> secciones,
            CancellationToken ct);
    }
}
