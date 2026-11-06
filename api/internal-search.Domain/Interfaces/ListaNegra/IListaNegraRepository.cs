using internal_search.Domain.DTOs.Common;

namespace internal_search.Domain.Interfaces.ListaNegra
{
    public interface IListaNegraRepository
    {
        // Bloqueo vigente del documento, o null si no está bloqueado
        Task<Entities.ListaNegra?> ObtenerAsync(string documento, CancellationToken ct = default);

        // De los documentos dados, devuelve los que están bloqueados (vigentes)
        Task<HashSet<string>> FiltrarBloqueadosAsync(IEnumerable<string> documentos, CancellationToken ct = default);

        // soloVigentes = true: los bloqueados hoy; false: todo el historial (vigentes y desbloqueados)
        Task<PaginaDto<Entities.ListaNegra>> ListarAsync(string? texto, bool soloVigentes, int pagina, int tamano, CancellationToken ct = default);

        // Agrega los que no estaban bloqueados; devuelve los documentos que sí se agregaron
        Task<List<string>> AgregarAsync(IReadOnlyCollection<string> documentos, string motivo, int codUsuario, string usuario, CancellationToken ct = default);

        // Baja lógica: marca el bloqueo vigente como desbloqueado. Devuelve el registro, o null si no estaba bloqueado.
        Task<Entities.ListaNegra?> QuitarAsync(string documento, string motivo, int codUsuario, string usuario, CancellationToken ct = default);
    }
}
