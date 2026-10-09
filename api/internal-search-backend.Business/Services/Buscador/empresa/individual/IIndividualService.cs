using internal_search.Domain.DTOs.buscador.empresa.individual;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Buscador.empresa.individual
{
    public interface IIndividualService
    {
        Task<BuscadorEmpresaResponseDto> BuscarEmpresaPorRucAsync(string numeroDocumento);

        Task<BuscadorEmpresaResponseDto> BuscarEmpresaPorRazonSocialAsync(string razonSocial);



    }
}
