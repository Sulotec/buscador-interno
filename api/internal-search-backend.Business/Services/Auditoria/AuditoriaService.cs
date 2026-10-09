using internal_search.Domain.DTOs.Auditoria;
using internal_search.Domain.DTOs.Common;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Auditoria;
using Microsoft.Extensions.Logging;

namespace internal_search_backend.Business.Services.Auditoria
{
    public interface IAuditoriaService
    {
        Task RegistrarAsync(ContextoAccion ctx, string accion, string? entidad = null,
            string? entidadId = null, string? detalle = null, bool exito = true);

        // Para eventos sin sesión (login fallido, recuperación de clave)
        Task RegistrarEventoAsync(int? codUsuario, string usuario, string? ip, string accion,
            string? entidad = null, string? entidadId = null, string? detalle = null, bool exito = true);

        Task<PaginaDto<AuditoriaRegistro>> ListarAsync(AuditoriaFiltroDto filtro);
    }

    public class AuditoriaService : IAuditoriaService
    {
        private readonly IAuditoriaRepository _repository;
        private readonly ILogger<AuditoriaService> _logger;

        public AuditoriaService(IAuditoriaRepository repository, ILogger<AuditoriaService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public Task RegistrarAsync(ContextoAccion ctx, string accion, string? entidad = null,
            string? entidadId = null, string? detalle = null, bool exito = true) =>
            RegistrarEventoAsync(ctx.CodUsuario, ctx.Login, ctx.Ip, accion, entidad, entidadId, detalle, exito);

        // Un fallo al auditar no debe tumbar la operación de negocio, pero sí queda en el log
        public async Task RegistrarEventoAsync(int? codUsuario, string usuario, string? ip, string accion,
            string? entidad = null, string? entidadId = null, string? detalle = null, bool exito = true)
        {
            try
            {
                await _repository.RegistrarAsync(new AuditoriaRegistro
                {
                    Fecha = DateTime.UtcNow,
                    CodUsuario = codUsuario,
                    Usuario = Cortar(usuario, 50) ?? string.Empty,
                    Accion = Cortar(accion, 60) ?? string.Empty,
                    Entidad = Cortar(entidad, 60),
                    EntidadId = Cortar(entidadId, 60),
                    Detalle = Cortar(detalle, 500),
                    Ip = Cortar(ip, 45),
                    Exito = exito
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudo registrar la auditoría de {Accion} para {Usuario}.", accion, usuario);
            }
        }

        public Task<PaginaDto<AuditoriaRegistro>> ListarAsync(AuditoriaFiltroDto filtro) =>
            _repository.ListarAsync(filtro);

        private static string? Cortar(string? valor, int max) =>
            valor is null ? null : valor.Length <= max ? valor : valor[..max];
    }
}
