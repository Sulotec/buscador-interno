using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search.Domain.Interfaces.Buscador.personas.masivo;
using internal_search_backend.Business.helpers;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Buscador.personas.masivos
{

    public class BuscadorMasivoService : IMasivoExcelService
    {
        private const int MaxDnis = 5000;
        private readonly IBuscadorMasivoRepository _repo;               // ✅

        public BuscadorMasivoService(IBuscadorMasivoRepository repo)    // ✅
        {
            _repo = repo;
        }


        public async Task<BuscadorMasivoResponse> BuscarMasivoAsync(
            Stream archivo, HashSet<string> secciones, CancellationToken ct)
        {
            var (validos, invalidos) = DniFileParser.Parse(archivo);

            if (validos.Count == 0)
                throw new ArgumentException("El archivo no contiene DNIs válidos.");

            if (validos.Count > MaxDnis)
                throw new ArgumentException($"El máximo por carga es {MaxDnis} DNIs.");

            var result = await _repo.BuscarMasivoAsync(validos, secciones, ct);   // cambio

            result.TotalSolicitados = validos.Count;
            result.DnisInvalidos = invalidos;

            // Solo cuentan las secciones consultadas: las no seleccionadas quedan vacías
            var encontrados = result.Moviles.Select(x => x.Documento)
                .Concat(result.Sueldos.Select(x => x.Documento))
                .Concat(result.Calificaciones.Select(x => x.Documento))
                .Concat(result.Deudas.Select(x => x.Documento))
                .Concat(result.LineasCredito.Select(x => x.Documento))
                .Concat(result.Fallecidos.Select(x => x.Dni))
                .ToHashSet();

            result.DnisSinResultados = validos.Where(d => !encontrados.Contains(d)).ToList();

            return result;
        }
    }
}

