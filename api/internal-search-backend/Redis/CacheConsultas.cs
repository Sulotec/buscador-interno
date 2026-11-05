using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace internal_search_backend.Redis
{
    public interface ICacheConsultas
    {
        // Devuelve el resultado guardado para la clave o ejecuta la consulta y lo guarda.
        // Si Redis no está configurado o no responde, simplemente ejecuta la consulta.
        Task<T> ObtenerOCrearAsync<T>(string clave, Func<Task<T>> consulta, CancellationToken ct = default);
    }

    public class CacheConsultas : ICacheConsultas
    {
        // Cambiar la versión invalida todo lo guardado (p. ej. si cambia la forma de las respuestas).
        // v2: las personas incluyen la descripción del ubigeo
        private const string Prefijo = "consulta:v2:";

        private readonly IDistributedCache? _cache;
        private readonly IConnectionMultiplexer? _redis;
        private readonly TimeSpan _duracion;
        private readonly ILogger<CacheConsultas> _logger;

        public CacheConsultas(CacheOptions opciones, ILogger<CacheConsultas> logger,
            IConnectionMultiplexer? redis = null, IDistributedCache? cache = null)
        {
            _redis = redis;
            _cache = redis is null ? null : cache;
            _duracion = TimeSpan.FromMinutes(opciones.MinutosConsultas);
            _logger = logger;
        }

        private bool Disponible => _cache is not null && _duracion > TimeSpan.Zero && _redis is { IsConnected: true };

        public async Task<T> ObtenerOCrearAsync<T>(string clave, Func<Task<T>> consulta, CancellationToken ct = default)
        {
            if (!Disponible)
                return await consulta();

            var claveCompleta = Prefijo + clave;

            try
            {
                var guardado = await _cache!.GetAsync(claveCompleta, ct);
                if (guardado is not null)
                {
                    var valor = JsonSerializer.Deserialize<T>(guardado);
                    if (valor is not null)
                        return valor;
                }
            }
            catch (Exception ex) when (ex is RedisException or JsonException or TimeoutException)
            {
                // Un fallo del caché nunca debe impedir la consulta
                _logger.LogWarning("Caché no disponible al leer: {Tipo}", ex.GetType().Name);
            }

            var resultado = await consulta();

            try
            {
                await _cache!.SetAsync(claveCompleta, JsonSerializer.SerializeToUtf8Bytes(resultado),
                    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = _duracion }, ct);
            }
            catch (Exception ex) when (ex is RedisException or TimeoutException)
            {
                _logger.LogWarning("Caché no disponible al guardar: {Tipo}", ex.GetType().Name);
            }

            return resultado;
        }
    }
}
