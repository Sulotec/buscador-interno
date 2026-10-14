using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Tokens;
using Microsoft.EntityFrameworkCore;

namespace internal_search_backend.Infraestructure.Repositories.Tokens
{
    public class TokenRepository : ITokenRepository
    {
        private readonly AppDbContext _context;

        public TokenRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<int> ObtenerSaldoAsync(int codUsuario)
        {
            return await _context.TokenSaldos
                .Where(s => s.CodUsuario == codUsuario)
                .Select(s => s.Saldo)
                .FirstOrDefaultAsync();
        }

        public Task<int?> ConsumirAsync(int codUsuario, int cantidad, string accion, string? detalle) =>
            AplicarAsync(codUsuario, -cantidad, TokenMovimiento.TipoConsumo, accion, detalle, codUsuario);

        public Task<int?> AjustarAsync(int codUsuario, int delta, byte tipo, string accion, string? detalle, int? codUsuarioAccion) =>
            AplicarAsync(codUsuario, delta, tipo, accion, detalle, codUsuarioAccion);

        public async Task<List<TokenMovimiento>> ListarMovimientosAsync(int codUsuario, int top)
        {
            return await _context.TokenMovimientos
                .Where(m => m.CodUsuario == codUsuario)
                .OrderByDescending(m => m.CodMovimiento)
                .Take(top)
                .ToListAsync();
        }

        // Saldo y movimiento se escriben en una sola transacción. El UPDATE condicional
        // (saldo + delta >= 0) evita saldos negativos aunque lleguen consultas en paralelo.
        private async Task<int?> AplicarAsync(
            int codUsuario, int delta, byte tipo, string accion, string? detalle, int? codUsuarioAccion)
        {
            await using var tx = await _context.Database.BeginTransactionAsync();

            if (delta > 0)
            {
                if (_context.Database.IsNpgsql())
                {
                    await _context.Database.ExecuteSqlInterpolatedAsync($@"
                        INSERT INTO rrcc.tokensaldo (cod_usuario, saldo, fecha_actu)
                        VALUES ({codUsuario}, 0, now() AT TIME ZONE 'utc')
                        ON CONFLICT (cod_usuario) DO NOTHING");
                }
                else
                {
                    await _context.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO RRCC.TokenSaldo (COD_USUARIO, SALDO, FECHA_ACTU)
                    SELECT {codUsuario}, 0, SYSUTCDATETIME()
                    WHERE NOT EXISTS (
                        SELECT 1 FROM RRCC.TokenSaldo WITH (UPDLOCK, HOLDLOCK)
                        WHERE COD_USUARIO = {codUsuario})");
                }
            }

            var ahora = DateTime.UtcNow;
            var filas = await _context.TokenSaldos
                .Where(s => s.CodUsuario == codUsuario && s.Saldo + delta >= 0)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.Saldo, x => x.Saldo + delta)
                    .SetProperty(x => x.FechaActu, ahora));

            if (filas == 0)
            {
                await tx.RollbackAsync();
                return null;
            }

            var saldo = await _context.TokenSaldos
                .Where(s => s.CodUsuario == codUsuario)
                .Select(s => s.Saldo)
                .FirstAsync();

            _context.TokenMovimientos.Add(new TokenMovimiento
            {
                CodUsuario = codUsuario,
                Tipo = tipo,
                Cantidad = delta,
                SaldoResultante = saldo,
                Accion = accion,
                Detalle = detalle is { Length: > 300 } ? detalle[..300] : detalle,
                CodUsuarioAccion = codUsuarioAccion,
                Fecha = ahora
            });
            await _context.SaveChangesAsync();

            await tx.CommitAsync();
            return saldo;
        }
    }
}
