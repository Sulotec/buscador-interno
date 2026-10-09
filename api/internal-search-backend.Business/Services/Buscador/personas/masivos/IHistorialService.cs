using internal_search.Domain.DTOs.buscador.persona.individual;

public interface IHistorialService
{
    Task GuardarAsync(int codUsuario, byte[] contenido, string nombreArchivo, IEnumerable<string> secciones, int totalDnis);
    Task<List<HistorialDescargaDto>> ListarAsync(int codUsuario);

    // La firma exacta con los nombres de la tupla:
    Task<(byte[] Contenido, string NombreArchivo)?> ObtenerArchivoAsync(int codHistorial, int codUsuario);
}