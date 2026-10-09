using internal_search.Domain.DTOs.Auditoria;
using internal_search.Domain.DTOs.Tokens;
using internal_search.Domain.Entities;
using internal_search.Domain.Exceptions;
using internal_search.Domain.Interfaces.Tokens;
using internal_search.Domain.Interfaces.Usuario;
using internal_search_backend.Business.Services.Auditoria;

namespace internal_search_backend.Business.Services.Tokens
{
    public interface ITokenService
    {
        // Descuenta el costo, ejecuta la consulta y lo devuelve si falla. ADMIN GENERAL no descuenta.
        // Lanza TokensInsuficientesException si el saldo no alcanza.
        Task<T> EjecutarAsync<T>(ContextoAccion ctx, int costo, string accion, string detalle, Func<Task<T>> operacion);

        Task<SaldoTokensDto> ObtenerSaldoAsync(ContextoAccion ctx);
        Task<SaldoTokensDto> ObtenerSaldoDeAsync(int codUsuario);

        // ArgumentException si el usuario no existe, está inactivo, es ilimitado o la cantidad no es válida
        Task<SaldoTokensDto> AsignarAsync(ContextoAccion admin, AsignarTokensDto dto);

        Task<List<TokenMovimiento>> ListarMovimientosAsync(int codUsuario, int top);
    }

    public class TokenService : ITokenService
    {
        private readonly ITokenRepository _tokens;
        private readonly IUsuarioRepository _usuarios;
        private readonly IAuditoriaService _auditoria;

        public TokenService(ITokenRepository tokens, IUsuarioRepository usuarios, IAuditoriaService auditoria)
        {
            _tokens = tokens;
            _usuarios = usuarios;
            _auditoria = auditoria;
        }

        public async Task<T> EjecutarAsync<T>(
            ContextoAccion ctx, int costo, string accion, string detalle, Func<Task<T>> operacion)
        {
            if (!ctx.EsAdminGeneral)
            {
                var saldo = await _tokens.ConsumirAsync(ctx.CodUsuario, costo, accion, detalle);
                if (saldo == null)
                {
                    await _auditoria.RegistrarAsync(ctx, accion, detalle: $"Rechazada por tokens insuficientes (costo {costo}). {detalle}", exito: false);
                    throw new TokensInsuficientesException(await _tokens.ObtenerSaldoAsync(ctx.CodUsuario), costo);
                }
            }

            try
            {
                var resultado = await operacion();
                await _auditoria.RegistrarAsync(ctx, accion, detalle: $"{detalle} (costo {(ctx.EsAdminGeneral ? 0 : costo)})");
                return resultado;
            }
            catch (Exception ex)
            {
                // Si la consulta no se pudo completar, el usuario no paga
                if (!ctx.EsAdminGeneral)
                {
                    await _tokens.AjustarAsync(ctx.CodUsuario, costo, TokenMovimiento.TipoDevolucion,
                        accion, $"Devolución: {detalle}", ctx.CodUsuario);
                }

                // Solo los errores propios del dominio llevan su mensaje a la auditoría (son seguros y explican
                // la causa); de los demás, p. ej. de base de datos, solo el tipo para no registrar detalles internos.
                var motivo = ex is ReniecNoDisponibleException or ArgumentException
                    ? $"{ex.GetType().Name}: {ex.Message}"
                    : ex.GetType().Name;

                await _auditoria.RegistrarAsync(ctx, accion, detalle: $"{detalle} - falló: {motivo}", exito: false);
                throw;
            }
        }

        public async Task<SaldoTokensDto> ObtenerSaldoAsync(ContextoAccion ctx)
        {
            if (ctx.EsAdminGeneral)
                return new SaldoTokensDto { CodUsuario = ctx.CodUsuario, Ilimitado = true };

            return await ObtenerSaldoDeAsync(ctx.CodUsuario);
        }

        public async Task<SaldoTokensDto> ObtenerSaldoDeAsync(int codUsuario)
        {
            var contexto = await _usuarios.ObtenerContextoSesionAsync(codUsuario)
                ?? throw new ArgumentException("El usuario no existe.");

            var ilimitado = contexto.Roles.Contains(
                internal_search.Domain.Constants.RolesSistema.AdminGeneral, StringComparer.OrdinalIgnoreCase);

            return new SaldoTokensDto
            {
                CodUsuario = codUsuario,
                Ilimitado = ilimitado,
                Saldo = ilimitado ? 0 : await _tokens.ObtenerSaldoAsync(codUsuario)
            };
        }

        public async Task<SaldoTokensDto> AsignarAsync(ContextoAccion admin, AsignarTokensDto dto)
        {
            if (dto.Cantidad == 0)
                throw new ArgumentException("La cantidad no puede ser cero.");

            var destino = await ObtenerSaldoDeAsync(dto.CodUsuario);
            var contexto = await _usuarios.ObtenerContextoSesionAsync(dto.CodUsuario);

            if (contexto is { Activo: false })
                throw new ArgumentException("El usuario está inactivo.");

            if (destino.Ilimitado)
                throw new ArgumentException("ADMIN GENERAL tiene tokens ilimitados; no necesita asignación.");

            var tipo = dto.Cantidad > 0 ? TokenMovimiento.TipoAsignacion : TokenMovimiento.TipoAjuste;
            var saldo = await _tokens.AjustarAsync(dto.CodUsuario, dto.Cantidad, tipo,
                dto.Cantidad > 0 ? "ASIGNACION" : "RETIRO", dto.Motivo, admin.CodUsuario);

            if (saldo == null)
            {
                await _auditoria.RegistrarAsync(admin, "TOKENS_AJUSTE", "Usuario", dto.CodUsuario.ToString(),
                    $"Rechazado: el retiro de {-dto.Cantidad} supera el saldo. {dto.Motivo}", exito: false);
                throw new ArgumentException("El retiro supera el saldo disponible del usuario.");
            }

            await _auditoria.RegistrarAsync(admin, "TOKENS_AJUSTE", "Usuario", dto.CodUsuario.ToString(),
                $"{(dto.Cantidad > 0 ? "+" : "")}{dto.Cantidad} tokens; saldo {saldo}. {dto.Motivo}");

            return new SaldoTokensDto { CodUsuario = dto.CodUsuario, Saldo = saldo.Value };
        }

        public Task<List<TokenMovimiento>> ListarMovimientosAsync(int codUsuario, int top) =>
            _tokens.ListarMovimientosAsync(codUsuario, Math.Clamp(top, 1, 200));
    }
}
