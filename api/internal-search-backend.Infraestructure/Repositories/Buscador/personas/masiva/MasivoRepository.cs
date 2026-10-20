using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search.Domain.Interfaces.Buscador.personas.masivo;
using Microsoft.EntityFrameworkCore;

namespace internal_search_backend.Infraestructure.Repositories.Buscador.personas.masiva
{
    public class BuscadorMasivoRepository : IBuscadorMasivoRepository
    {
        private readonly AppDbContext _db;

        public BuscadorMasivoRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<BuscadorMasivoResponse> BuscarMasivoAsync(
            List<string> validos, HashSet<string> secciones, CancellationToken ct)
        {
            var result = new BuscadorMasivoResponse();

            var pideMoviles = secciones.Contains(SeccionesMasivo.Moviles);
            var pideSueldos = secciones.Contains(SeccionesMasivo.Sueldos);
            var pideCalificacion = secciones.Contains(SeccionesMasivo.Calificacion);
            var pideDeuda = secciones.Contains(SeccionesMasivo.Deuda);
            var pideLineasCredito = secciones.Contains(SeccionesMasivo.LineasCredito);

            var periodosMoviles = pideMoviles ? await ObtenerUltimosPeriodosAsync(_db.Movil.Select(x => x.Periodo)) : new List<string>();
            var periodosSueldos = pideSueldos ? await ObtenerUltimosPeriodosAsync(_db.Sueldos.Select(x => x.Periodo)) : new List<string>();
            var periodosCalificacion = pideCalificacion ? await ObtenerUltimosPeriodosAsync(_db.Calificaciones.Select(x => x.Periodo)) : new List<string>();
            var periodosDeuda = pideDeuda ? await ObtenerUltimosPeriodosAsync(_db.Deudas.Select(x => x.Periodo)) : new List<string>();
            var periodosLineas = pideLineasCredito ? await ObtenerUltimosPeriodosAsync(_db.LineaCreditos.Select(x => x.Periodo)) : new List<string>();

            foreach (var lote in validos.Chunk(1000))
            {
                var batch = lote.ToList();

                if (pideMoviles)
                    result.Moviles.AddRange(await _db.Movil.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && periodosMoviles.Contains(x.Periodo))
                        .ToListAsync(ct));

                if (pideSueldos)
                    result.Sueldos.AddRange(await _db.Sueldos.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && periodosSueldos.Contains(x.Periodo))
                        .ToListAsync(ct));

                if (pideCalificacion)
                    result.Calificaciones.AddRange(await _db.Calificaciones.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && periodosCalificacion.Contains(x.Periodo))
                        .ToListAsync(ct));

                if (pideDeuda)
                    result.Deudas.AddRange(await _db.Deudas.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && periodosDeuda.Contains(x.Periodo))
                        .ToListAsync(ct));

                if (pideLineasCredito)
                    result.LineasCredito.AddRange(await _db.LineaCreditos.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && periodosLineas.Contains(x.Periodo))
                        .ToListAsync(ct));
            }

            return result;
        }

        private static async Task<List<string>> ObtenerUltimosPeriodosAsync(IQueryable<string?> periodos)
        {
            var disponibles = await periodos.Where(periodo => periodo != null).Distinct().ToListAsync();
            if (disponibles.Count == 0) return new List<string>();
            var ultimo = disponibles.Max(periodo => periodo!);
            return disponibles.Where(periodo => periodo == ultimo).Select(periodo => periodo!).ToList();
        }
    }
}
