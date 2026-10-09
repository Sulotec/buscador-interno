using internal_search.Domain.DTOs.buscador.empresa.individual;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.Interfaces.Buscador.empresas.individual
{
    public interface IEmpresaIndividualRepository
    {
        Task<BuscadorEmpresaResponseDto> ObtenerTodasLasTablasPorRucAsync(string numeroDocumento);

        Task<BuscadorEmpresaResponseDto> ObtenerTodasLasTablasPorRazonSocialAsync(string razonSocial);
    }
}
