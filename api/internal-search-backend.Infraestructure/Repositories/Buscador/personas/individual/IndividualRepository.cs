using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Buscador.personas.individual;
using Microsoft.EntityFrameworkCore;
using System.Transactions;

using internal_search.Domain.DTOs.buscador.persona.individual;

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

        public async Task<List<BuscadorNombresResultado>> BuscarPorNombresAsync(
            string apePat, string? apeMat, string? nombres, CancellationToken ct)
        {
            using var scope = new TransactionScope(
                TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.ReadUncommitted },
                TransactionScopeAsyncFlowOption.Enabled);

            var patron = apePat.Trim() + "%"
                + (string.IsNullOrWhiteSpace(apeMat) ? string.Empty : apeMat.Trim() + "%")
                + (string.IsNullOrWhiteSpace(nombres) ? string.Empty : nombres.Trim() + "%");

            // Cada fuente se busca usando únicamente su último período disponible (formato YYYYMM).
            var periodosDeuda = await ObtenerUltimosPeriodosAsync(_context.Deudas.Select(x => x.Periodo));
            var periodosLineas = await ObtenerUltimosPeriodosAsync(_context.LineaCreditos.Select(x => x.Periodo));
            var periodosCalificacion = await ObtenerUltimosPeriodosAsync(_context.Calificaciones.Select(x => x.Periodo));
            var periodosSueldos = await ObtenerUltimosPeriodosAsync(_context.Sueldos.Select(x => (string?)x.Periodo));
            var periodosMoviles = await ObtenerUltimosPeriodosAsync(_context.Movil.Select(x => x.Periodo));

            var desdeCalificaciones = await _context.Calificaciones.AsNoTracking()
                .Where(x => x.Documento != null && x.ApePat != null && x.Periodo != null && periodosCalificacion.Contains(x.Periodo)
                    && EF.Functions.Like(x.ApePat + " " + (x.ApeMat ?? "") + " " + (x.PriNombre ?? "") + " " + (x.SegNombre ?? ""), patron))
                .Select(x => new BuscadorNombresResultado
                {
                    Documento = x.Documento!,
                    NombreCompleto = ((x.ApePat ?? "") + " " + (x.ApeMat ?? "") + " " + (x.PriNombre ?? "") + " " + (x.SegNombre ?? "")).Trim()
                })
                .OrderBy(x => x.NombreCompleto)
                .Take(100)
                .ToListAsync(ct);

            var desdeMoviles = await _context.Movil.AsNoTracking()
                .Where(x => x.Documento != null && x.ApePat != null && x.Periodo != null && periodosMoviles.Contains(x.Periodo)
                    && EF.Functions.Like(x.ApePat + " " + (x.ApeMat ?? "") + " " + (x.Prenombres ?? ""), patron))
                .Select(x => new BuscadorNombresResultado
                {
                    Documento = x.Documento!,
                    NombreCompleto = ((x.ApePat ?? "") + " " + (x.ApeMat ?? "") + " " + (x.Prenombres ?? "")).Trim()
                })
                .OrderBy(x => x.NombreCompleto)
                .Take(100)
                .ToListAsync(ct);

            var desdeSueldos = await _context.Sueldos.AsNoTracking()
                .Where(x => x.Documento != null && x.ApeNom != null && periodosSueldos.Contains(x.Periodo)
                    && EF.Functions.Like(x.ApeNom, patron))
                .Select(x => new BuscadorNombresResultado
                {
                    Documento = x.Documento!,
                    NombreCompleto = x.ApeNom!
                })
                .OrderBy(x => x.NombreCompleto)
                .Take(100)
                .ToListAsync(ct);

            var resultado = desdeCalificaciones
                .Concat(desdeMoviles)
                .Concat(desdeSueldos)
                .GroupBy(x => x.Documento)
                .Select(g => g.OrderBy(x => x.NombreCompleto).First())
                .OrderBy(x => x.NombreCompleto)
                .Take(100)
                .ToList();

            var documentos = resultado.Select(x => x.Documento).Distinct().ToList();
            if (documentos.Count > 0)
            {
                var deudas = await _context.Deudas.AsNoTracking()
                    .Where(x => documentos.Contains(x.Documento!) && x.Periodo != null && periodosDeuda.Contains(x.Periodo))
                    .OrderByDescending(x => x.Periodo).ToListAsync(ct);
                var lineas = await _context.LineaCreditos.AsNoTracking()
                    .Where(x => documentos.Contains(x.Documento!) && x.Periodo != null && periodosLineas.Contains(x.Periodo))
                    .OrderByDescending(x => x.Periodo).ToListAsync(ct);
                var calificaciones = await _context.Calificaciones.AsNoTracking()
                    .Where(x => documentos.Contains(x.Documento!) && x.Periodo != null && periodosCalificacion.Contains(x.Periodo))
                    .OrderByDescending(x => x.Periodo).ToListAsync(ct);
                var sueldos = await _context.Sueldos.AsNoTracking()
                    .Where(x => documentos.Contains(x.Documento!) && periodosSueldos.Contains(x.Periodo))
                    .OrderByDescending(x => x.Periodo).ToListAsync(ct);
                var moviles = await _context.Movil.AsNoTracking()
                    .Where(x => documentos.Contains(x.Documento!) && x.Periodo != null && periodosMoviles.Contains(x.Periodo))
                    .OrderByDescending(x => x.Periodo).ToListAsync(ct);

                var deudasPorDocumento = deudas.GroupBy(x => x.Documento).ToDictionary(g => g.Key!, g => g.ToList());
                var lineasPorDocumento = lineas.GroupBy(x => x.Documento).ToDictionary(g => g.Key!, g => g.ToList());
                var calificacionesPorDocumento = calificaciones.GroupBy(x => x.Documento).ToDictionary(g => g.Key!, g => g.ToList());
                var sueldosPorDocumento = sueldos.GroupBy(x => x.Documento).ToDictionary(g => g.Key!, g => g.ToList());
                var movilesPorDocumento = moviles.GroupBy(x => x.Documento).ToDictionary(g => g.Key!, g => g.ToList());

                foreach (var persona in resultado)
                {
                    if (deudasPorDocumento.TryGetValue(persona.Documento, out var deudasPersona)) persona.Deudas = deudasPersona;
                    if (lineasPorDocumento.TryGetValue(persona.Documento, out var lineasPersona)) persona.LineasCredito = lineasPersona;
                    if (calificacionesPorDocumento.TryGetValue(persona.Documento, out var calificacionesPersona)) persona.Calificaciones = calificacionesPersona;
                    if (sueldosPorDocumento.TryGetValue(persona.Documento, out var sueldosPersona)) persona.Sueldos = sueldosPersona;
                    if (movilesPorDocumento.TryGetValue(persona.Documento, out var movilesPersona)) persona.Moviles = movilesPersona;
                }
            }

            scope.Complete();
            return resultado;
        }
    }
}
