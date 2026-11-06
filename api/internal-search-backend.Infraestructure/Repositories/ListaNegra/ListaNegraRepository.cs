using internal_search.Domain.DTOs.Common;
using internal_search.Domain.Interfaces.ListaNegra;
using Microsoft.EntityFrameworkCore;
using Entidad = internal_search.Domain.Entities.ListaNegra;

namespace internal_search_backend.Infraestructure.Repositories.ListaNegra
{
    // Los registros nunca se borran: desbloquear es una baja lógica (ACTIVO = 0). Ver scripts 007 y 008.
    public class ListaNegraRepository : IListaNegraRepository
    {
        // SQL Server admite ~2100 parámetros por consulta: los IN se arman por lotes
        private const int Lote = 1000;

        private readonly AppDbContext _db;

        public ListaNegraRepository(AppDbContext db) => _db = db;

        private IQueryable<Entidad> Vigentes => _db.ListaNegra.AsNoTracking().Where(x => x.Activo);

        public Task<Entidad?> ObtenerAsync(string documento, CancellationToken ct = default) =>
            Vigentes.FirstOrDefaultAsync(x => x.Documento == documento, ct);

        public async Task<HashSet<string>> FiltrarBloqueadosAsync(IEnumerable<string> documentos, CancellationToken ct = default)
        {
            var bloqueados = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            // Solo pueden estar bloqueados los DNI (8 dígitos); el resto ni se consulta
            var candidatos = documentos.Where(d => d is { Length: 8 } && d.All(char.IsDigit)).Distinct().ToList();

            foreach (var lote in candidatos.Chunk(Lote))
            {
                var encontrados = await Vigentes
                    .Where(x => lote.Contains(x.Documento))
                    .Select(x => x.Documento)
                    .ToListAsync(ct);
                bloqueados.UnionWith(encontrados);
            }

            return bloqueados;
        }

        public async Task<PaginaDto<Entidad>> ListarAsync(string? texto, bool soloVigentes, int pagina, int tamano, CancellationToken ct = default)
        {
            var consulta = soloVigentes ? Vigentes : _db.ListaNegra.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                consulta = consulta.Where(x => x.Documento.Contains(t) || x.Motivo.Contains(t) || x.Usuario.Contains(t)
                    || (x.MotivoQuito != null && x.MotivoQuito.Contains(t)) || (x.UsuarioQuito != null && x.UsuarioQuito.Contains(t)));
            }

            // Tabla única: primero los bloqueados (del más reciente al más antiguo) y debajo los desbloqueados
            // (el desbloqueo más reciente primero)
            var ordenada = consulta
                .OrderByDescending(x => x.Activo)
                .ThenByDescending(x => x.Activo ? x.FechaUtc : (x.FechaQuitoUtc ?? x.FechaUtc))
                .ThenByDescending(x => x.Id);

            return new PaginaDto<Entidad>
            {
                Total = await consulta.CountAsync(ct),
                Items = await ordenada.Skip((pagina - 1) * tamano).Take(tamano).ToListAsync(ct),
                Pagina = pagina,
                Tamano = tamano
            };
        }

        public async Task<List<string>> AgregarAsync(IReadOnlyCollection<string> documentos, string motivo, int codUsuario, string usuario, CancellationToken ct = default)
        {
            var existentes = await FiltrarBloqueadosAsync(documentos, ct);
            var nuevos = documentos.Where(d => !existentes.Contains(d)).Distinct().ToList();
            if (nuevos.Count == 0)
                return nuevos;

            var ahora = DateTime.UtcNow;
            Entidad Nuevo(string d) => new()
            {
                Documento = d, Motivo = motivo, CodUsuario = codUsuario, Usuario = usuario, FechaUtc = ahora, Activo = true
            };

            _db.ListaNegra.AddRange(nuevos.Select(Nuevo));
            try
            {
                await _db.SaveChangesAsync(ct);
                return nuevos;
            }
            catch (DbUpdateException)
            {
                // Otro administrador bloqueó alguno al mismo tiempo (índice único de activos): se reintenta con los que faltan
                _db.ChangeTracker.Clear();
                var yaEstan = await FiltrarBloqueadosAsync(nuevos, ct);
                var faltan = nuevos.Where(d => !yaEstan.Contains(d)).ToList();
                if (faltan.Count == 0) return faltan;
                _db.ListaNegra.AddRange(faltan.Select(Nuevo));
                await _db.SaveChangesAsync(ct);
                return faltan;
            }
        }

        public async Task<Entidad?> QuitarAsync(string documento, string motivo, int codUsuario, string usuario, CancellationToken ct = default)
        {
            var vigente = await _db.ListaNegra.FirstOrDefaultAsync(x => x.Documento == documento && x.Activo, ct);
            if (vigente is null)
                return null;

            vigente.Activo = false;
            vigente.CodUsuarioQuito = codUsuario;
            vigente.UsuarioQuito = usuario;
            vigente.MotivoQuito = motivo;
            vigente.FechaQuitoUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return vigente;
        }
    }
}
