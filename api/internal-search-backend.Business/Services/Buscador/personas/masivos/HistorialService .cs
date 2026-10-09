using internal_search.Domain.DTOs.buscador.persona.individual;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Buscador.personas.masivo;
using Microsoft.Extensions.Configuration;

public class HistorialService : IHistorialService
{
    private const int MaxHistorial = 5;
    private readonly IHistorialRepository _repo;
    private readonly string _carpeta;

    public HistorialService(IHistorialRepository repo, IConfiguration config)
    {
        _repo = repo;
        _carpeta = config["Historial:Carpeta"]
                   ?? Path.Combine(AppContext.BaseDirectory, "historial");
        // La carpeta se crea solo al guardar un archivo (GuardarAsync). Antes se creaba aquí, en cada petición,
        // y si no era escribible hasta el simple listado del historial respondía 500.
    }

    public async Task GuardarAsync(int codUsuario, byte[] contenido, string nombreArchivo,
                                   IEnumerable<string> secciones, int totalDnis)
    {
        Directory.CreateDirectory(_carpeta);

        // Nombre físico único; el nombre "bonito" queda en BD
        var ruta = Path.Combine(_carpeta, $"{codUsuario}_{Guid.NewGuid():N}.xlsx");
        await File.WriteAllBytesAsync(ruta, contenido);

        try
        {
            await _repo.AgregarAsync(new HistorialDescarga
            {
                CodUsuario = codUsuario,
                NombreArchivo = nombreArchivo,
                RutaArchivo = ruta,
                Secciones = string.Join(",", secciones),
                TotalDnis = totalDnis,
                TamanoBytes = contenido.LongLength
            });
        }
        catch
        {
            if (File.Exists(ruta)) File.Delete(ruta); // no dejar huérfanos si falla el insert
            throw;
        }

        // Conservar solo los últimos 5 del usuario
        var todos = await _repo.ObtenerPorUsuarioAsync(codUsuario);
        var sobrantes = todos.Skip(MaxHistorial).ToList();
        if (sobrantes.Count > 0)
        {
            foreach (var s in sobrantes)
                if (File.Exists(s.RutaArchivo)) File.Delete(s.RutaArchivo);
            await _repo.EliminarAsync(sobrantes);
        }
    }

    public async Task<List<HistorialDescargaDto>> ListarAsync(int codUsuario)
    {
        var items = await _repo.ObtenerPorUsuarioAsync(codUsuario);
        return items.Take(MaxHistorial).Select(h => new HistorialDescargaDto(
            h.CodHistorial,
            h.NombreArchivo,
            h.FechaCreo,
            h.TamanoBytes,
            h.TotalDnis,
            h.Secciones.Split(',', StringSplitOptions.RemoveEmptyEntries))).ToList();
    }

    public async Task<(byte[] Contenido, string NombreArchivo)?> ObtenerArchivoAsync(int codHistorial, int codUsuario)
    {
        // La lista ya viene filtrada por COD_USUARIO, así que nadie accede a archivos ajenos
        var items = await _repo.ObtenerPorUsuarioAsync(codUsuario);
        var item = items.FirstOrDefault(h => h.CodHistorial == codHistorial);

        if (item is null || !File.Exists(item.RutaArchivo)) return null;
        return (await File.ReadAllBytesAsync(item.RutaArchivo), item.NombreArchivo);
    }



}