using internal_search.Domain.Entities;
using internal_search.Domain.DTOs.buscador.persona.individual;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.Interfaces.Buscador.personas.individual
{
    public interface IBuscadorRepository
    {
        // RRCC: filtran por documento + periodo
        // RRCC: filtran por documento + periodo
        Task<List<Deuda>> BuscarDeudasAsync(string documento, CancellationToken ct);
        Task<List<LineaCredito>> BuscarLineasCreditoAsync(string documento, CancellationToken ct);
        Task<List<Calificacion>> BuscarCalificacionesAsync(string documento, CancellationToken ct);

        // Operador: filtran solo por documento (no manejan periodo)
        Task<List<Sueldo>> BuscarSueldosAsync(string documento, CancellationToken ct);
        Task<List<Movil>> BuscarMovilesAsync(string documento, CancellationToken ct);

        Task<List<Movil>> BuscarPorTelefonoAsync(string telefono, CancellationToken ct);
        Task<List<BuscadorNombresResultado>> BuscarPorNombresAsync(string apePat, string? apeMat, string? nombres, CancellationToken ct);
    }
}
