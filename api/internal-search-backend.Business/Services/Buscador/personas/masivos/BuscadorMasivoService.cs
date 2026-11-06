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
        public const int MaxDocumentos = 5000;
        private readonly IBuscadorMasivoRepository _repo;               // ✅

        public BuscadorMasivoService(IBuscadorMasivoRepository repo)    // ✅
        {
            _repo = repo;
        }


        public async Task<BuscadorMasivoResponse> BuscarMasivoAsync(
            Stream archivo, HashSet<string> secciones, IReadOnlySet<string> excluidos, CancellationToken ct)
        {
            var (todos, invalidos) = DocumentoFileParser.Parse(archivo);

            // Lista negra: esos documentos no se consultan; se informan en el Excel como "No disponible"
            var noDisponibles = todos.Where(d => excluidos.Contains(d.Trim())).ToList();
            var validos = todos.Where(d => !excluidos.Contains(d.Trim())).ToList();

            if (validos.Count == 0)
                throw new ArgumentException(noDisponibles.Count > 0
                    ? "Todos los documentos del archivo están en la lista negra y no se pueden consultar."
                    : "El archivo no contiene documentos válidos. Se aceptan DNI, RUC, CE y pasaporte.");

            if (validos.Count > MaxDocumentos)
                throw new ArgumentException($"El máximo por carga es {MaxDocumentos} documentos.");

            var result = await _repo.BuscarMasivoAsync(validos, secciones, ct);   // cambio

            result.TotalSolicitados = validos.Count;
            result.DocumentosInvalidos = invalidos;
            result.DocumentosNoDisponibles = noDisponibles;

            // Solo cuentan las secciones consultadas: las no seleccionadas quedan vacías
            var encontrados = result.Personas.Select(x => x.Dni)
                .Concat(result.Moviles.Select(x => x.Documento))
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

