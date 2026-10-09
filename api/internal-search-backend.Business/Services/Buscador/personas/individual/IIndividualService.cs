using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Buscador.personas.individual
{
    public interface IIndividualService
    {
        Task<BuscadorHistorialResponse> BuscarAsync(BuscadorHistorialEntrada entrada, CancellationToken ct);

        Task<BuscadorTelefonoResponse> BuscarPorTelefonoAsync(string telefono, CancellationToken ct);
    }
}
