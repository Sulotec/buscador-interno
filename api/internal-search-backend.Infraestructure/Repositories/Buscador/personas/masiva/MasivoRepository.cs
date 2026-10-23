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

        // Carga masiva: cada seccion trae todos los periodos del año en curso (igual que la consulta individual).
        // No se filtra por el ultimo periodo de la tabla: a quien le reportaron telefonos en julio y deudas en agosto
        // le desaparecian los telefonos (corregido el 2026-10-22). Fallecidos no tiene periodo: trae el registro si existe.
        public async Task<BuscadorMasivoResponse> BuscarMasivoAsync(
            List<string> validos, HashSet<string> secciones, CancellationToken ct)
        {
            var result = new BuscadorMasivoResponse();

            var pideMoviles = secciones.Contains(SeccionesMasivo.Moviles);
            var pideSueldos = secciones.Contains(SeccionesMasivo.Sueldos);
            var pideCalificacion = secciones.Contains(SeccionesMasivo.Calificacion);
            var pideDeuda = secciones.Contains(SeccionesMasivo.Deuda);
            var pideLineasCredito = secciones.Contains(SeccionesMasivo.LineasCredito);
            var pideFallecidos = secciones.Contains(SeccionesMasivo.Fallecidos);

            string anioActual = DateTime.Now.Year.ToString();

            foreach (var lote in validos.Chunk(1000))
            {
                var batch = lote.ToList();

                if (pideMoviles)
                    result.Moviles.AddRange(await _db.Movil.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                        .ToListAsync(ct));

                if (pideSueldos)
                    result.Sueldos.AddRange(await _db.Sueldos.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                        .ToListAsync(ct));

                if (pideCalificacion)
                    result.Calificaciones.AddRange(await _db.Calificaciones.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                        .ToListAsync(ct));

                if (pideDeuda)
                    result.Deudas.AddRange(await _db.Deudas.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                        .ToListAsync(ct));

                if (pideLineasCredito)
                    result.LineasCredito.AddRange(await _db.LineaCreditos.AsNoTracking()
                        .Where(x => batch.Contains(x.Documento) && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                        .ToListAsync(ct));

                if (pideFallecidos)
                    result.Fallecidos.AddRange(await _db.Fallecidos.AsNoTracking()
                        .Where(x => batch.Contains(x.Dni) && x.FechaFallecimiento != null)
                        .OrderBy(x => x.ApePat).ThenBy(x => x.ApeMat).ThenBy(x => x.Prenombres)
                        .ToListAsync(ct));
            }

            return result;
        }
    }
}
