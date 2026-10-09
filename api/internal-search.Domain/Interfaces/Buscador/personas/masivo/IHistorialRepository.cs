using internal_search.Domain.Entities;

namespace internal_search.Domain.Interfaces.Buscador.personas.masivo
{
    public interface IHistorialRepository
    {
        Task AgregarAsync(HistorialDescarga item);
        Task<List<HistorialDescarga>> ObtenerPorUsuarioAsync(int codUsuario);
        Task EliminarAsync(IEnumerable<HistorialDescarga> items);
    }
}