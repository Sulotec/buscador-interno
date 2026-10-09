using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace internal_search_backend.Health
{
    // Estado para monitoreo (GET /health): la API responde y alcanza la base de datos.
    // El endpoint es anónimo, así que la respuesta solo dice Healthy/Unhealthy; el detalle del fallo va al log.
    // El resultado se reutiliza unos segundos para que un monitor que consulte seguido (Docker, un servicio
    // externo de uptime) no sature la base con un "SELECT 1" por cada petición.
    public class BaseDatosHealthCheck : IHealthCheck
    {
        private static readonly TimeSpan Vigencia = TimeSpan.FromSeconds(10);
        private static readonly TimeSpan EsperaMaxima = TimeSpan.FromSeconds(5);

        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<BaseDatosHealthCheck> _logger;
        private readonly SemaphoreSlim _consultando = new(1, 1);
        private volatile Medicion? _ultima;

        public BaseDatosHealthCheck(IServiceScopeFactory scopes, ILogger<BaseDatosHealthCheck> logger)
        {
            _scopes = scopes;
            _logger = logger;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            if (Vigente(_ultima) is { } reciente) return Resultado(reciente);

            // Una sola consulta a la vez: las demás esperan y aprovechan su resultado
            await _consultando.WaitAsync(cancellationToken);
            try
            {
                if (Vigente(_ultima) is { } renovada) return Resultado(renovada);

                var medicion = new Medicion(DateTime.UtcNow + Vigencia, await ConsultarAsync(cancellationToken));
                _ultima = medicion;
                return Resultado(medicion);
            }
            finally
            {
                _consultando.Release();
            }
        }

        private async Task<bool> ConsultarAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                using var limite = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                limite.CancelAfter(EsperaMaxima);

                // Una consulta real (no solo abrir conexión): una conexión vieja del pool puede estar rota sin saberlo
                await db.Database.ExecuteSqlRawAsync("SELECT 1", limite.Token);
                return true;
            }
            catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("Health: la base de datos no respondió. {Motivo}", ex.Message);
                return false;
            }
        }

        private static Medicion? Vigente(Medicion? medicion) =>
            medicion is not null && DateTime.UtcNow < medicion.VenceUtc ? medicion : null;

        private static HealthCheckResult Resultado(Medicion medicion) =>
            medicion.BaseDatosOk
                ? HealthCheckResult.Healthy("Base de datos disponible.")
                : HealthCheckResult.Unhealthy("Sin conexión con la base de datos.");

        // Referencia inmutable: se reemplaza completa, así que leerla sin bloqueo nunca devuelve una mezcla a medias
        private sealed record Medicion(DateTime VenceUtc, bool BaseDatosOk);
    }
}
