using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Buscador.personas.individual;
using Microsoft.EntityFrameworkCore;
using System.Transactions;

namespace internal_search_backend.Infraestructure.Repositories.Buscador.personas.individual
{
    public class FallecidosRepository : IFallecidosRepository
    {
        private readonly AppDbContext _context;

        public FallecidosRepository(AppDbContext context) => _context = context;

        public async Task<List<Fallecidos>> BuscarAsync(
            BuscarFallecidosRequestDto filtro,
            int limite,
            CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            IQueryable<Fallecidos> consulta = _context.Fallecidos
                .AsNoTracking()
                .Where(x => x.FechaFallecimiento != null);

            if (!string.IsNullOrWhiteSpace(filtro.Dni))
                consulta = consulta.Where(x => x.Dni == filtro.Dni);

            if (!string.IsNullOrWhiteSpace(filtro.ApePat))
                consulta = consulta.Where(x => x.ApePat != null && x.ApePat.StartsWith(filtro.ApePat));

            if (!string.IsNullOrWhiteSpace(filtro.ApeMat))
                consulta = consulta.Where(x => x.ApeMat != null && x.ApeMat.StartsWith(filtro.ApeMat));

            if (!string.IsNullOrWhiteSpace(filtro.Prenombres))
                consulta = consulta.Where(x => x.Prenombres != null && x.Prenombres.StartsWith(filtro.Prenombres));

            var filas = await consulta
                .OrderBy(x => x.ApePat)
                .ThenBy(x => x.ApeMat)
                .ThenBy(x => x.Prenombres)
                .Take(limite)
                .ToListAsync(ct);

            scope.Complete();
            return filas;
        }
    }
}
