using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Buscador.personas.individual;

namespace internal_search_backend.Business.Services.Buscador.personas.individual
{
    public class IndividualService : IIndividualService
    {
        private readonly IBuscadorRepository _repository;

        public IndividualService(IBuscadorRepository repository)
        {
            _repository = repository;
        }

        public async Task<BuscadorHistorialResponse> BuscarAsync(
            BuscadorHistorialEntrada entrada,
            CancellationToken ct)
        {
            // La validación de longitud/tipo de documento ya la hizo
            // BuscadorHistorialEntrada mediante IValidatableObject.

            var documento = entrada.Documento.Trim();
            //var periodo = entrada.Periodo.Trim();

            var respuesta = new BuscadorHistorialResponse
            {
                Documento = documento
            };

            // Ejecutamos las consultas de forma SECUENCIAL
            // porque utilizan el mismo AppDbContext.

            var deudas = await _repository
                .BuscarDeudasAsync(documento, ct);

            var lineasCredito = await _repository
                .BuscarLineasCreditoAsync(documento, ct);

            var calificaciones = await _repository
                .BuscarCalificacionesAsync(documento, ct);

            var sueldos = await _repository
                .BuscarSueldosAsync(documento, ct);

            var moviles = await _repository
                .BuscarMovilesAsync(documento, ct);

            respuesta.Deudas = deudas;
            respuesta.LineasCredito = lineasCredito;
            respuesta.Calificaciones = calificaciones;
            respuesta.Sueldos = sueldos;
            respuesta.Moviles = moviles;

            return respuesta;
        }

        public async Task<BuscadorTelefonoResponse> BuscarPorTelefonoAsync(string telefono, CancellationToken ct)
        {
            var registros = await _repository.BuscarPorTelefonoAsync(telefono, ct);

            return new BuscadorTelefonoResponse
            {
                Telefono = telefono,
                DocumentosAsociados = registros.Select(x => x.Documento).Distinct().Count(),
                Registros = registros
            };
        }

        public Task<List<BuscadorNombresResultado>> BuscarPorNombresAsync(
            BuscadorNombresEntrada entrada, CancellationToken ct) =>
            _repository.BuscarPorNombresAsync(entrada.ApePat.Trim(), entrada.ApeMat?.Trim(), entrada.Nombres?.Trim(), ct);
    }
}
