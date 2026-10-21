
using internal_search.Domain.Entities;

namespace internal_search.Domain.DTOs.buscador.persona.individual
{
    public class BusquedaPersonasResponseDto
    {
        public List<Fallecidos> Fallecidos { get; set; } = new();
        public bool HayMasResultados { get; set; }
    }
}
