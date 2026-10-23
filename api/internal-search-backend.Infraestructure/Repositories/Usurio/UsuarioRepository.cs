using Microsoft.EntityFrameworkCore;
using internal_search.Domain.Constants;
using internal_search.Domain.DTOs.Common;
using internal_search.Domain.DTOs.Usuario;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Usuario;

namespace internal_search_backend.Infraestructure.Repositories.Usurio
{
    public class UsuarioRepository : IUsuarioRepository
    {
        private readonly AppDbContext _context;

        public UsuarioRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Usuarios?> ObtenerPorUsuarioAsync(string usuarioLogin)
        {
            return await _context.Usuarios
                .Include(u => u.UsuarioRoles.Where(ur => ur.Estado == 1))
                    .ThenInclude(ur => ur.Rol)
                .FirstOrDefaultAsync(u => u.UsuarioLogin == usuarioLogin);
        }

        public async Task<Usuarios?> ObtenerActivoPorLoginOCorreoAsync(string identificador)
        {
            var porLogin = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.UsuarioLogin == identificador && u.Estado == 1);

            if (porLogin != null)
                return porLogin;

            var porCorreo = await _context.Usuarios
                .Where(u => u.Correo == identificador && u.Estado == 1)
                .Take(2)
                .ToListAsync();

            // Si el correo lo comparten varias cuentas no se puede saber a cuál enviar
            return porCorreo.Count == 1 ? porCorreo[0] : null;
        }

        public Task<bool> ExisteLoginAsync(string login) =>
            _context.Usuarios.AnyAsync(u => u.UsuarioLogin == login);

        public Task<bool> ExisteCorreoAsync(string correo) =>
            _context.Usuarios.AnyAsync(u => u.Correo == correo);

        public Task<List<int>> ObtenerRolesActivosAsync(IEnumerable<int> codRoles)
        {
            var ids = codRoles.Distinct().ToList();
            return _context.Roles
                .Where(r => ids.Contains(r.CodRol) && r.Estado == 1)
                .Select(r => r.CodRol)
                .ToListAsync();
        }

        public async Task<int> CrearAsync(Usuarios usuario, IEnumerable<int> codRoles)
        {
            foreach (var codRol in codRoles.Distinct())
            {
                usuario.UsuarioRoles.Add(new UsuarioRol
                {
                    CodRol = codRol,
                    Estado = 1,
                    UsuCreo = usuario.UsuCreo,
                    FechaCreo = usuario.FechaCreo
                });
            }

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();
            return usuario.CodUsuario;
        }

        public async Task<ContextoSesionDto?> ObtenerContextoSesionAsync(int codUsuario)
        {
            var u = await _context.Usuarios
                .Where(x => x.CodUsuario == codUsuario)
                .Select(x => new
                {
                    x.Estado,
                    Roles = x.UsuarioRoles
                        .Where(ur => ur.Estado == 1 && ur.Rol.Estado == 1)
                        .Select(ur => ur.Rol.NomRol)
                        .ToList(),
                    Revocado = _context.SesionesRevocadas
                        .Where(s => s.CodUsuario == x.CodUsuario)
                        .Select(s => (DateTime?)s.FechaRevocacion)
                        .FirstOrDefault()
                })
                .FirstOrDefaultAsync();

            return u == null
                ? null
                : new ContextoSesionDto { Activo = u.Estado == 1, Roles = u.Roles, RevocadoDesdeUtc = u.Revocado };
        }

        public Task RevocarSesionesAsync(int codUsuario) =>
            SesionSql.RevocarAsync(_context, codUsuario, DateTime.UtcNow);

        public async Task<List<RolListadoDto>> ListarRolesActivosAsync()
        {
            return await _context.Roles
                .Where(r => r.Estado == 1)
                .OrderBy(r => r.NomRol)
                .Select(r => new RolListadoDto
                {
                    CodigoRol = r.CodRol,
                    Rol = r.NomRol,
                    Descripcion = r.Descripcion
                })
                .ToListAsync();
        }

        public async Task<int?> ObtenerCodRolAsync(string nombreRol)
        {
            return await _context.Roles
                .Where(r => r.NomRol == nombreRol && r.Estado == 1)
                .Select(r => (int?)r.CodRol)
                .FirstOrDefaultAsync();
        }

        public async Task<PaginaDto<UsuarioListadoDto>> ListarAsync(string? texto, int pagina, int tamano)
        {
            pagina = Math.Max(1, pagina);
            tamano = Math.Clamp(tamano, 1, 100);

            var q = _context.Usuarios.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(u => u.UsuarioLogin.Contains(t)
                              || u.Nombres.Contains(t)
                              || u.ApePat.Contains(t)
                              || (u.Correo != null && u.Correo.Contains(t)));
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(u => u.UsuarioLogin)
                .Skip((pagina - 1) * tamano)
                .Take(tamano)
                .Select(u => new UsuarioListadoDto
                {
                    Id = u.CodUsuario,
                    Usuario = u.UsuarioLogin,
                    NombreCompleto = u.Nombres + " " + u.ApePat + " " + u.ApeMat,
                    Correo = u.Correo,
                    Estado = u.Estado,
                    Roles = u.UsuarioRoles
                        .Where(ur => ur.Estado == 1)
                        .Select(ur => ur.Rol.NomRol)
                        .ToList(),
                    SaldoTokens = _context.TokenSaldos
                        .Where(s => s.CodUsuario == u.CodUsuario)
                        .Select(s => (int?)s.Saldo)
                        .FirstOrDefault() ?? 0
                })
                .ToListAsync();

            return new PaginaDto<UsuarioListadoDto>
            {
                Items = items,
                Total = total,
                Pagina = pagina,
                Tamano = tamano
            };
        }

        public async Task<bool> CambiarEstadoAsync(int codUsuario, bool activo, string usuarioActu)
        {
            var filas = await _context.Usuarios
                .Where(u => u.CodUsuario == codUsuario)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.Estado, activo ? 1 : 0)
                    .SetProperty(u => u.UsuActu, usuarioActu)
                    .SetProperty(u => u.FechaActu, DateTime.Now));

            return filas > 0;
        }

        public async Task<bool> ActualizarClaveAsync(int codUsuario, string hashClave, string usuarioActu)
        {
            var filas = await _context.Usuarios
                .Where(u => u.CodUsuario == codUsuario)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.Clave, hashClave)
                    .SetProperty(u => u.UsuActu, usuarioActu)
                    .SetProperty(u => u.FechaActu, DateTime.Now));
            return filas > 0;
        }

        public async Task ReemplazarRolesAsync(int codUsuario, IEnumerable<int> codRoles, string usuarioActu)
        {
            var nuevos = codRoles.Distinct().ToHashSet();
            var existentes = await _context.UsuarioRoles
                .Where(ur => ur.CodUsuario == codUsuario)
                .ToListAsync();

            foreach (var ur in existentes)
            {
                var debeEstar = nuevos.Contains(ur.CodRol);
                var nuevoEstado = debeEstar ? 1 : 0;
                if (ur.Estado != nuevoEstado)
                {
                    ur.Estado = nuevoEstado;
                    ur.UsuActu = usuarioActu;
                    ur.FechaActu = DateTime.Now;
                }
            }

            var yaExisten = existentes.Select(ur => ur.CodRol).ToHashSet();
            foreach (var codRol in nuevos.Where(c => !yaExisten.Contains(c)))
            {
                _context.UsuarioRoles.Add(new UsuarioRol
                {
                    CodUsuario = codUsuario,
                    CodRol = codRol,
                    Estado = 1,
                    UsuCreo = usuarioActu,
                    FechaCreo = DateTime.Now
                });
            }

            await _context.SaveChangesAsync();
        }

        public Task<int> ContarAdminsGeneralesActivosAsync(int? excluyendoCodUsuario)
        {
            return _context.Usuarios
                .Where(u => u.Estado == 1
                         && (excluyendoCodUsuario == null || u.CodUsuario != excluyendoCodUsuario)
                         && u.UsuarioRoles.Any(ur => ur.Estado == 1
                                                  && ur.Rol.Estado == 1
                                                  && ur.Rol.NomRol == RolesSistema.AdminGeneral))
                .CountAsync();
        }

        public async Task<Usuarios?> ObtenerPorIdAsync(int codUsuario)
        {
            return await _context.Usuarios
                .Include(u => u.UsuarioRoles.Where(ur => ur.Estado == 1))
                .ThenInclude(ur => ur.Rol)
                .FirstOrDefaultAsync(u => u.CodUsuario == codUsuario);
        }
    }
}