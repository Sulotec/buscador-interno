using StackExchange.Redis;

namespace internal_search_backend.Redis
{
    // Opciones de los límites de peticiones (sección "Limites" de appsettings / variables Limites__*).
    public class LimitesOptions
    {
        // Cargas masivas procesándose a la vez en todo el sistema (personas + empresas)
        public int MasivoSimultaneos { get; set; } = 3;
        // Cargas masivas que pueden esperar turno; más allá se rechazan con 429
        public int MasivoEnFila { get; set; } = 10;
        // Cargas masivas a la vez por usuario
        public int MasivoPorUsuario { get; set; } = 1;
        // Consultas individuales por usuario y por minuto
        public int ConsultasPorMinuto { get; set; } = 60;
    }

    // Opciones del caché de consultas (sección "Cache").
    public class CacheOptions
    {
        // Minutos que una consulta individual queda en caché. 0 desactiva el caché.
        public int MinutosConsultas { get; set; } = 60;
    }

    public static class RedisConfiguracion
    {
        // Redis es opcional: sin "Redis:ConnectionString" la API funciona como antes (límites en memoria,
        // sin caché). Con varias instancias de la API, Redis es necesario para que compartan los límites.
        public static IConnectionMultiplexer? AgregarRedis(this WebApplicationBuilder builder)
        {
            var cadena = builder.Configuration["Redis:ConnectionString"];
            if (string.IsNullOrWhiteSpace(cadena))
                return null;

            var opciones = ConfigurationOptions.Parse(cadena);
            // No bloquea el arranque si Redis aún no está disponible; se reconecta solo en segundo plano.
            opciones.AbortOnConnectFail = false;
            opciones.ConnectTimeout = 3000;
            opciones.SyncTimeout = 2000;
            opciones.AsyncTimeout = 2000;
            opciones.ClientName = "buscador-api";

            var conexion = ConnectionMultiplexer.Connect(opciones);
            builder.Services.AddSingleton<IConnectionMultiplexer>(conexion);
            builder.Services.AddStackExchangeRedisCache(o =>
            {
                o.ConnectionMultiplexerFactory = () => Task.FromResult<IConnectionMultiplexer>(conexion);
                o.InstanceName = "buscador:";
            });
            return conexion;
        }
    }
}
