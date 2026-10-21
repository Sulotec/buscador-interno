using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.Interfaces.Buscador.personas.individual;

namespace internal_search_backend.Business.Services.Buscador.personas.individual
{
    public class FallecidosService : IFallecidosService
    {
        private const int TopeResultados = 200;
        private readonly IFallecidosRepository _repositorio;

        public FallecidosService(IFallecidosRepository repositorio)
        {
            _repositorio = repositorio;
        }

        public async Task<BusquedaPersonasResponseDto> BuscarPersonasAsync(
            BuscarFallecidosRequestDto filtro,
            CancellationToken ct)
        {
            var limpio = new BuscarFallecidosRequestDto
            {
                Dni = string.IsNullOrWhiteSpace(filtro.Dni) ? null : filtro.Dni.Trim(),
                ApePat = Normalizar(filtro.ApePat),
                ApeMat = Normalizar(filtro.ApeMat),
                Prenombres = Normalizar(filtro.Prenombres)
            };

            if (limpio.Dni is not null && (limpio.Dni.Length != 8 || !limpio.Dni.All(char.IsDigit)))
                throw new ArgumentException("El DNI debe tener exactamente 8 dígitos.");

            if (limpio.Dni is null
                && (limpio.ApePat is null || (limpio.ApeMat is null && limpio.Prenombres is null)))
                throw new ArgumentException(
                    "Ingresa un DNI o el apellido paterno junto con el apellido materno o los prenombres.");

            var filas = await _repositorio.BuscarAsync(limpio, TopeResultados + 1, ct);
            return new BusquedaPersonasResponseDto
            {
                HayMasResultados = filas.Count > TopeResultados,
                Fallecidos = filas.Take(TopeResultados).ToList()
            };
        }

        private static string? Normalizar(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor)) return null;
            return string.Join(" ", valor.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries))
                .ToUpperInvariant();
        }
    }
}
