using DocumentFormat.OpenXml.InkML;
using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Buscador.personas.masivo;
using Microsoft.EntityFrameworkCore;

namespace internal_search_backend.Infraestructure.Repositories.Buscador.personas.masiva
{
    public class HistorialRepository : IHistorialRepository
    {
        private readonly AppDbContext _db;
        public HistorialRepository(AppDbContext db) => _db = db;

        public async Task AgregarAsync(HistorialDescarga item)
        {
            _db.HistorialDescargas.Add(item);
            await _db.SaveChangesAsync();
        }

        // Todos los registros del COD_USUARIO, más reciente primero
        public Task<List<HistorialDescarga>> ObtenerPorUsuarioAsync(int codUsuario) =>
            _db.HistorialDescargas
               .AsNoTracking()
               .Where(h => h.CodUsuario == codUsuario)
               .OrderByDescending(h => h.FechaCreo)
               .ThenByDescending(h => h.CodHistorial)
               .ToListAsync();

        public async Task EliminarAsync(IEnumerable<HistorialDescarga> items)
        {
            _db.HistorialDescargas.RemoveRange(items);
            await _db.SaveChangesAsync();
        }

        public async Task<ArchivoDescargaDto?> ObtenerArchivoAsync(int codHistorial, int codUsuario)
        {
            // 1. Buscar el registro asegurando que pertenezca al usuario
            var registro = await _db.HistorialDescargas
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CodHistorial == codHistorial && x.CodUsuario == codUsuario);

            if (registro is null)
                return null;

            // 2. Verificar que el archivo existe físicamente en el servidor
            if (!File.Exists(registro.RutaArchivo))
                return null;

            // 3. Leer los bytes del disco y empaquetar DTO
            var bytes = await File.ReadAllBytesAsync(registro.RutaArchivo);

            return new ArchivoDescargaDto
            {
                Contenido = bytes,
                NombreArchivo = registro.NombreArchivo
            };
        }
    }
}