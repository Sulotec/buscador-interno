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
        private const int MaxDocumentos = 5000;
        private readonly IBuscadorMasivoRepository _repo;               // ✅

        public BuscadorMasivoService(IBuscadorMasivoRepository repo)    // ✅
        {
            _repo = repo;
        }


        public async Task<BuscadorMasivoResponse> BuscarMasivoAsync(
            Stream archivo, HashSet<string> secciones, CancellationToken ct)
        {
            var (validos, invalidos) = DocumentoFileParser.Parse(archivo);

            if (validos.Count == 0)
                throw new ArgumentException("El archivo no contiene documentos válidos. Se aceptan DNI, RUC, CE y pasaporte.");

            if (validos.Count > MaxDocumentos)
                throw new ArgumentException($"El máximo por carga es {MaxDocumentos} documentos.");

            var result = await _repo.BuscarMasivoAsync(validos, secciones, ct);   // cambio

            result.TotalSolicitados = validos.Count;
            result.DocumentosInvalidos = invalidos;

            // Solo cuentan las secciones consultadas: las no seleccionadas quedan vacías
            var encontrados = result.Moviles.Select(x => x.Documento)
                .Concat(result.Sueldos.Select(x => x.Documento))
                .Concat(result.Calificaciones.Select(x => x.Documento))
                .Concat(result.Deudas.Select(x => x.Documento))
                .Concat(result.LineasCredito.Select(x => x.Documento))
                .Concat(result.Fallecidos.Select(x => x.Dni))
                .ToHashSet();

            result.DocumentosSinResultados = validos.Where(d => !encontrados.Contains(d)).ToList();

            return result;
        }
    }
}

