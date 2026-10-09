using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Buscador.personas.individual;
using Microsoft.EntityFrameworkCore;
using System.Transactions;

namespace internal_search_backend.Infraestructure.Repositories.Buscador.personas.individual
{
    public class IndividualRepository : IBuscadorRepository
    {
        private readonly AppDbContext _context;

        public IndividualRepository(AppDbContext context)
        {
            _context = context;
        }

        // ---------- RRCC: documento + periodo (Filtrado por Año Actual) ----------

        public async Task<List<Deuda>> BuscarDeudasAsync(
            string documento,
            CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            string anioActual = DateTime.Now.Year.ToString();

            var resultado = await _context.Deudas
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
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

            string anioActual = DateTime.Now.Year.ToString();

            var resultado = await _context.LineaCreditos
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
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

            string anioActual = DateTime.Now.Year.ToString();

            var resultado = await _context.Calificaciones
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
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

            string anioActual = DateTime.Now.Year.ToString();

            var resultado = await _context.Sueldos
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
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

            string anioActual = DateTime.Now.Year.ToString();

            var resultado = await _context.Movil
                .AsNoTracking()
                .Where(x => x.Documento == documento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
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

            string anioActual = DateTime.Now.Year.ToString();

            var resultado = await _context.Movil
                .AsNoTracking()
                .Where(x => x.Telefono == telefono && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                .OrderByDescending(x => x.Periodo)
                .ToListAsync(ct);

            scope.Complete();
            return resultado;
        }
    }
}