using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Buscador.personas.individual;
using Microsoft.EntityFrameworkCore;
using System.Transactions;

namespace internal_search_backend.Infraestructure.Repositories.Buscador.personas.individual
{
    public class IndividualRepository : IBuscadorRepository
    {
        private readonly AppDbContext _context;

        private static async Task<List<string>> ObtenerUltimosPeriodosAsync(IQueryable<string?> periodos)
        {
            var disponibles = await periodos
                .Where(periodo => periodo != null)
                .Distinct()
                .ToListAsync();

            if (disponibles.Count == 0)
                return new List<string>();

            var ultimo = disponibles.Max(periodo => periodo!);
            return disponibles.Where(periodo => periodo == ultimo).Select(periodo => periodo!).ToList();
        }

        public IndividualRepository(AppDbContext context)
        {
            _context = context;
        }

        // ---------- Búsquedas por documento usando el último periodo disponible ----------

        public async Task<List<Deuda>> BuscarDeudasAsync(
            string documento,
            CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            var periodos = await ObtenerUltimosPeriodosAsync(_context.Deudas.Select(x => x.Periodo));

            var resultado = await _context.Deudas
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && periodos.Contains(x.Periodo))
                .OrderByDescending(x => x.Periodo)
                .ToListAsync(ct);

            scope.Complete();
            return resultado;
        }

        public async Task<List<LineaCredito>> BuscarLineasCreditoAsync(
            string documento,
            CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            var periodos = await ObtenerUltimosPeriodosAsync(_context.LineaCreditos.Select(x => x.Periodo));

            var resultado = await _context.LineaCreditos
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && periodos.Contains(x.Periodo))
                .OrderByDescending(x => x.Periodo)
                .ToListAsync(ct);

            scope.Complete();
            return resultado;
        }

        public async Task<List<Calificacion>> BuscarCalificacionesAsync(
            string documento,
            CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            var periodos = await ObtenerUltimosPeriodosAsync(_context.Calificaciones.Select(x => x.Periodo));

            var resultado = await _context.Calificaciones
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && periodos.Contains(x.Periodo))
                .OrderByDescending(x => x.Periodo)
                .ToListAsync(ct);

            scope.Complete();
            return resultado;
        }

        // ---------- Operador: solo documento ----------

        public async Task<List<Sueldo>> BuscarSueldosAsync(
            string documento,
            CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            var periodos = await ObtenerUltimosPeriodosAsync(_context.Sueldos.Select(x => x.Periodo));

            var resultado = await _context.Sueldos
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && periodos.Contains(x.Periodo))
                .OrderByDescending(x => x.Periodo)
                .ToListAsync(ct);

            scope.Complete();
            return resultado;
        }

        public async Task<List<Movil>> BuscarMovilesAsync(
            string documento,
            CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            var periodos = await ObtenerUltimosPeriodosAsync(_context.Movil.Select(x => x.Periodo));

            var resultado = await _context.Movil
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && periodos.Contains(x.Periodo))
                .OrderByDescending(x => x.Periodo)
                .ToListAsync(ct);

            scope.Complete();
            return resultado;
        }

        public async Task<List<Movil>> BuscarPorTelefonoAsync(
            string telefono,
            CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            var resultado = await _context.Movil
                .AsNoTracking()
                .Where(x => x.Telefono == telefono)
                .OrderByDescending(x => x.Periodo)
                .ToListAsync(ct);

            scope.Complete();
            return resultado;
        }
    }
}
