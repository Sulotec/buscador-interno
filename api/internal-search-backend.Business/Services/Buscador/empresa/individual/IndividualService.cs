using internal_search.Domain.DTOs.buscador.empresa.individual;
using internal_search.Domain.Interfaces.Buscador.empresas.individual;
using internal_search.Domain.Interfaces.Buscador.personas.individual;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Buscador.empresa.individual
{
    public class IndividualService : IIndividualService
    {
        private readonly IEmpresaIndividualRepository _buscadorRepository;

        public IndividualService(IEmpresaIndividualRepository buscadorRepository)
        {
            _buscadorRepository = buscadorRepository;
        }
        public async Task<BuscadorEmpresaResponseDto> BuscarEmpresaPorRucAsync(string numeroDocumento)
        {
            // Opcional: Aquí puedes agregar reglas de negocio adicionales si lo requieres antes de ir a infraestructura.
            // Por ejemplo, limpiar espacios o validar formato general.
            if (string.IsNullOrWhiteSpace(numeroDocumento))
            {
                throw new ArgumentException("El número de documento no puede estar vacío.");
            }

            // Llamada al repositorio de infraestructura
            return await _buscadorRepository.ObtenerTodasLasTablasPorRucAsync(numeroDocumento.Trim());
        }

        public async Task<BuscadorEmpresaResponseDto> BuscarEmpresaPorRazonSocialAsync(string razonSocial)
        {
            // Opcional: Aquí puedes agregar reglas de negocio adicionales si lo requieres antes de ir a infraestructura.
            // Por ejemplo, limpiar espacios o validar formato general.
            if (string.IsNullOrWhiteSpace(razonSocial))
            {
                throw new ArgumentException("La razón social no puede estar vacía.");
            }

            // Llamada al repositorio de infraestructura
            return await _buscadorRepository.ObtenerTodasLasTablasPorRazonSocialAsync(razonSocial.Trim());
        }
    }
}
