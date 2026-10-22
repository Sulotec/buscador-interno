using internal_search.Domain.DTOs.buscador.persona.masivos;

namespace internal_search_backend.Business.Services.Buscador.personas.individual
{
    public interface IPersonaPdfService
    {
        byte[] Generar(BuscadorHistorialResponse resultado);
    }
}
