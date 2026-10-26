using internal_search.Domain.DTOs.buscador.empresa.masivo;
using internal_search.Domain.Interfaces.Buscador.empresas.masivo;
using internal_search_backend.Business.Services.Buscador.empresa.masivo;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace internal_search_backend.Business.Services.Buscador.empresas.masivo
{
    public class BuscadorEmpresaMasivoService : IBuscadorEmpresaMasivoService
    {
        private readonly IBuscadorEmpresaMasivoRepository _repository;

        public BuscadorEmpresaMasivoService(IBuscadorEmpresaMasivoRepository repository)
        {
            _repository = repository;
        }

        public async Task<BuscadorEmpresaMasivoResponseDto> BuscarMasivoAsync(
            Stream archivoStream,
            HashSet<string> secciones,
            CancellationToken ct)
        {
            var rucsCrudos = new List<string>();

            // 1. Leer el archivo línea por línea de manera eficiente
            using (var reader = new StreamReader(archivoStream))
            {
                string linea;
                while ((linea = await reader.ReadLineAsync()) != null)
                {
                    var rucLimpio = linea.Trim();
                    if (!string.IsNullOrEmpty(rucLimpio))
                    {
                        rucsCrudos.Add(rucLimpio);
                    }
                }
            }

            if (rucsCrudos.Count == 0)
            {
                throw new ArgumentException("El archivo subido está vacío o no contiene registros.");
            }

            // Se aceptan RUC de persona natural y jurídica (11 dígitos, prefijos tributarios válidos).
            var rucsValidos = rucsCrudos
                .Where(ruc => ruc.Length == 11
                    && (ruc.StartsWith("10") || ruc.StartsWith("15") || ruc.StartsWith("16") || ruc.StartsWith("17") || ruc.StartsWith("20"))
                    && ruc.All(char.IsDigit))
                .Distinct()
                .ToList();

            if (rucsValidos.Count == 0)
            {
                throw new ArgumentException("No se encontraron RUC válidos en el archivo. Deben tener 11 dígitos y empezar con 10, 15, 16, 17 o 20.");
            }

            // 3. Delegar la consulta masiva optimizada al repositorio
            return await _repository.BuscarMasivoPorRucAsync(rucsValidos, secciones, ct);
        }
    }
}
