using internal_search.Domain.DTOs.buscador.empresa.masivo; // Asegúrate de usar el namespace del masivo
using internal_search.Domain.Interfaces.Buscador.empresas.masivo;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace internal_search_backend.Infraestructure.Repositories.Buscador.empresas.masiva
{
    public class BuscadorEmpresaMasivoRepository : IBuscadorEmpresaMasivoRepository
    {
        private readonly AppDbContext _db;

        public BuscadorEmpresaMasivoRepository(AppDbContext db)
        {
            _db = db;
        }

        // 1. Cambiado a BuscadorEmpresaMasivoResponseDto
        public async Task<BuscadorEmpresaMasivoResponseDto> BuscarMasivoPorRucAsync(
                    List<string> rucsValidos, HashSet<string> secciones, CancellationToken ct)
        {
            // 2. Instanciado el DTO masivo correcto
            var result = new BuscadorEmpresaMasivoResponseDto();

            var pideMoviles = secciones.Contains(SeccionesMasivoEmpresa.Moviles);
            var pideSueldos = secciones.Contains(SeccionesMasivoEmpresa.Sueldos);
            var pideCalificacion = secciones.Contains(SeccionesMasivoEmpresa.Calificacion);
            var pideDeuda = secciones.Contains(SeccionesMasivoEmpresa.Deuda);
            var pideLineasCredito = secciones.Contains(SeccionesMasivoEmpresa.LineasCredito);

            var periodosMoviles = pideMoviles ? await ObtenerUltimosPeriodosAsync(_db.Movil.Select(x => x.Periodo)) : new List<string>();
            var periodosSueldos = pideSueldos ? await ObtenerUltimosPeriodosAsync(_db.Sueldos.Select(x => x.Periodo)) : new List<string>();
            var periodosCalificacion = pideCalificacion ? await ObtenerUltimosPeriodosAsync(_db.Calificaciones.Select(x => x.Periodo)) : new List<string>();
            var periodosDeuda = pideDeuda ? await ObtenerUltimosPeriodosAsync(_db.Deudas.Select(x => x.Periodo)) : new List<string>();
            var periodosLineas = pideLineasCredito ? await ObtenerUltimosPeriodosAsync(_db.LineaCreditos.Select(x => x.Periodo)) : new List<string>();

            foreach (var lote in rucsValidos.Chunk(1000))
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
