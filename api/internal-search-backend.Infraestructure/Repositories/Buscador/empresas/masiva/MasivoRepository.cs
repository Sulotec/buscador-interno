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

            string anioActual = DateTime.Now.Year.ToString();

            foreach (var lote in rucsValidos.Chunk(1000))
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
            }

            return result;
        }
    }
}