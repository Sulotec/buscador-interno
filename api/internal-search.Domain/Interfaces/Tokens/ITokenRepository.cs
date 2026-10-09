using internal_search.Domain.Entities;

namespace internal_search.Domain.Interfaces.Tokens
{
    public interface ITokenRepository
    {
        Task<int> ObtenerSaldoAsync(int codUsuario);

        // Descuenta de forma atómica. Devuelve el saldo resultante o null si no alcanza.
        Task<int?> ConsumirAsync(int codUsuario, int cantidad, string accion, string? detalle);

        // Suma (o resta si delta < 0). Devuelve el saldo resultante o null si quedaría negativo.
        Task<int?> AjustarAsync(int codUsuario, int delta, byte tipo, string accion, string? detalle, int? codUsuarioAccion);

        Task<List<TokenMovimiento>> ListarMovimientosAsync(int codUsuario, int top);
    }
}
