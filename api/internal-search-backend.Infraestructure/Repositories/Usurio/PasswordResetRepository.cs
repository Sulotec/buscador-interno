using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Usuario;
using Microsoft.EntityFrameworkCore;

namespace internal_search_backend.Infraestructure.Repositories.Usurio
{
    public class PasswordResetRepository : IPasswordResetRepository
    {
        private readonly AppDbContext _context;

        public PasswordResetRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task InvalidarPendientesAsync(int codUsuario)
        {
            await _context.PasswordResetTokens
                .Where(t => t.CodUsuario == codUsuario && !t.Usado)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.Usado, true)
                    .SetProperty(t => t.FechaUso, DateTime.UtcNow));
        }

        public async Task CrearAsync(PasswordResetToken token)
        {
            _context.PasswordResetTokens.Add(token);
            await _context.SaveChangesAsync();
        }

        public async Task<int?> RestablecerAsync(string tokenHash, string nuevaClaveHash, DateTime ahoraUtc)
        {
            await using var tx = await _context.Database.BeginTransactionAsync();

            // El UPDATE condicional hace que solo una petición pueda consumir el token
            var consumidos = await _context.PasswordResetTokens
                .Where(t => t.TokenHash == tokenHash && !t.Usado && t.FechaExpira > ahoraUtc)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.Usado, true)
                    .SetProperty(t => t.FechaUso, ahoraUtc));

            if (consumidos == 0)
                return null;

            var codUsuario = await _context.PasswordResetTokens
                .Where(t => t.TokenHash == tokenHash)
                .Select(t => t.CodUsuario)
                .FirstAsync();

            var actualizados = await _context.Usuarios
                .Where(u => u.CodUsuario == codUsuario && u.Estado == 1)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.Clave, nuevaClaveHash)
                    .SetProperty(u => u.UsuActu, "RECUPERACION")
                    .SetProperty(u => u.FechaActu, DateTime.Now));

            if (actualizados == 0)
            {
                await tx.RollbackAsync();
                return null;
            }

            // Cualquier otro enlace pendiente del usuario queda sin efecto
            await _context.PasswordResetTokens
                .Where(t => t.CodUsuario == codUsuario && !t.Usado)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.Usado, true)
                    .SetProperty(t => t.FechaUso, ahoraUtc));

            // Con la clave nueva, las sesiones abiertas con la anterior dejan de valer
            await SesionSql.RevocarAsync(_context, codUsuario, ahoraUtc);

            await tx.CommitAsync();
            return codUsuario;
        }
    }
}
