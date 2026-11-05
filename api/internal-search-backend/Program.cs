using internal_search.Domain.Interfaces.Auth;
using internal_search.Domain.Interfaces.Buscador.empresas.individual;
using internal_search.Domain.Interfaces.Buscador.empresas.masivo;
using internal_search.Domain.Interfaces.Buscador.personas.individual;
using internal_search.Domain.Interfaces.Buscador.personas.masivo;
using internal_search.Domain.Interfaces.Menu;
using internal_search.Domain.Interfaces.Usuario;
using internal_search_backend.Business.Services.Buscador.empresa.individual;
using internal_search_backend.Business.Services.Buscador.empresa.masivo;
using internal_search_backend.Business.Services.Buscador.empresas.masivo;
using internal_search_backend.Business.Services.Buscador.personas.individual;
using internal_search_backend.Business.Services.Buscador.personas.masivos;
using internal_search_backend.Business.Services.Menu;
using internal_search_backend.Business.Services.Usuario;
using internal_search_backend.Infraestructure.Repositories.Buscador.empresas.individual;
using internal_search_backend.Infraestructure.Repositories.Buscador.empresas.masiva;
using internal_search_backend.Infraestructure.Repositories.Buscador.personas.individual;
using internal_search_backend.Infraestructure.Repositories.Buscador.personas.masiva;
using internal_search_backend.Infraestructure.Repositories.Menu;
using internal_search_backend.Infraestructure.Repositories.Usurio;
using internal_search_backend.Infraestructure.Security;
using internal_search_backend.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using internal_search.Domain.Interfaces.Auditoria;
using internal_search.Domain.Interfaces.Tokens;
using internal_search_backend.Business.Services.Auditoria;
using internal_search_backend.Business.Services.Tokens;
using internal_search_backend.Infraestructure.Repositories.Auditoria;
using internal_search_backend.Infraestructure.Repositories.Tokens;
using internal_search_backend.Security;
using Microsoft.AspNetCore.Builder;
using internal_search.Domain.Interfaces.Reniec;
using internal_search_backend.Business.Services.Reniec;
using internal_search_backend.Infraestructure.Reniec;
using internal_search_backend.Infraestructure.Repositories.Reniec;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using internal_search_backend.Redis;
using RedisRateLimiting;
using RedisRateLimiting.AspNetCore;
using internal_search.Domain.Configuration;
using internal_search.Domain.Interfaces.Notificaciones;
using internal_search_backend.Infraestructure.Notificaciones;
using internal_search_backend.Health;
using Microsoft.Extensions.Hosting.WindowsServices;



var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    // Como servicio de Windows la carpeta actual es C:\Windows\System32: se usa la de la aplicación para que
    // encuentre appsettings.json. Fuera de un servicio (consola, Docker, desarrollo) queda el valor por defecto.
    ContentRootPath = WindowsServiceHelpers.IsWindowsService() ? AppContext.BaseDirectory : default
});


// Servidor de la oficina: la API corre como servicio de Windows, arranca con el equipo sin necesidad de iniciar
// sesión y se reinicia sola si falla. Fuera de un servicio (consola, Docker, desarrollo) esta línea no hace nada.
builder.Host.UseWindowsService(options => options.ServiceName = "BuscadorApi");

// Los secretos ya no viven en appsettings.json: user-secrets en desarrollo, variables de entorno en producción
if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
    throw new InvalidOperationException(
        "No se configuró ConnectionStrings:DefaultConnection (user-secrets o variable ConnectionStrings__DefaultConnection). Ver appsettings.example.json.");

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException(
        "Jwt:Key no configurada o demasiado corta (mínimo 32 caracteres). Ver appsettings.example.json.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
              ?? throw new InvalidOperationException(
                    "No se configuró Jwt:Issuer");

var jwtAudience = builder.Configuration["Jwt:Audience"]
                  ?? throw new InvalidOperationException(
                      "No se configuró Jwt:Audience");

// Authentication JWT
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            ),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var principal = context.Principal;
                var identity = principal?.Identity as ClaimsIdentity;

                if (identity == null ||
                    !int.TryParse(principal!.FindFirstValue(ClaimTypes.NameIdentifier), out var codUsuario))
                {
                    context.Fail("Token sin usuario.");
                    return;
                }

                var repo = context.HttpContext.RequestServices.GetRequiredService<IUsuarioRepository>();
                var sesion = await repo.ObtenerContextoSesionAsync(codUsuario);

                if (sesion is not { Activo: true })
                {
                    context.Fail("Usuario inactivo o inexistente.");
                    return;
                }

                if (sesion.RevocadoDesdeUtc is { } revocado)
                {
                    var revocadoSeg = new DateTimeOffset(DateTime.SpecifyKind(revocado, DateTimeKind.Utc))
                        .ToUnixTimeSeconds();

                    if (!long.TryParse(principal!.FindFirstValue("iat"), out var iat) || iat < revocadoSeg)
                    {
                        context.Fail("Sesión cerrada.");
                        return;
                    }
                }

                foreach (var claim in identity.Claims
                    .Where(c => c.Type == ClaimTypes.Role || c.Type == "role").ToList())
                {
                    identity.RemoveClaim(claim);
                }

                foreach (var rol in sesion.Roles)
                    identity.AddClaim(new Claim(ClaimTypes.Role, rol));
            }
        };
    });

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Dependency Injection
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IContrasenaRepository, ContrasenaService>();
builder.Services.AddScoped<IJwtRepository, JwtRepository>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();

builder.Services.AddScoped<IPasswordResetRepository, PasswordResetRepository>();
builder.Services.AddScoped<IRecuperacionClaveService, RecuperacionClaveService>();
builder.Services.AddScoped<IUsuarioAdminService, UsuarioAdminService>();

builder.Services.AddScoped<ITokenRepository, TokenRepository>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuditoriaRepository, AuditoriaRepository>();
builder.Services.AddScoped<IAuditoriaService, AuditoriaService>();

builder.Services.AddSingleton(
    builder.Configuration.GetSection("Recuperacion").Get<RecuperacionClaveOptions>()
    ?? new RecuperacionClaveOptions());

var emailOptions = builder.Configuration.GetSection("Email").Get<EmailOptions>() ?? new EmailOptions();
if (!string.IsNullOrWhiteSpace(emailOptions.Host))
{
    builder.Services.AddSingleton(emailOptions);
    builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
}
else
{
    var esDesarrollo = builder.Environment.IsDevelopment();
    builder.Services.AddScoped<IEmailSender>(sp =>
        new LogEmailSender(sp.GetRequiredService<ILogger<LogEmailSender>>(), esDesarrollo));
}

builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<IMenuRepository, MenuRepository>();

builder.Services.AddScoped<IBuscadorRepository, IndividualRepository>();
builder.Services.AddScoped<IFallecidosRepository, FallecidosRepository>();
builder.Services.AddScoped<IFallecidosService, FallecidosService>();

builder.Services.AddScoped<
    internal_search_backend.Business.Services.Buscador.personas.individual.IIndividualService,
    internal_search_backend.Business.Services.Buscador.personas.individual.IndividualService>();
builder.Services.AddScoped<
    internal_search_backend.Business.Services.Buscador.personas.individual.IPersonaPdfService,
    internal_search_backend.Business.Services.Buscador.personas.individual.PersonaPdfService>();

builder.Services.AddSingleton(
    builder.Configuration.GetSection("Reniec").Get<ReniecOptions>() ?? new ReniecOptions());
builder.Services.AddHttpClient<IReniecClient, ReniecClient>(c => c.Timeout = TimeSpan.FromSeconds(20));
builder.Services.AddScoped<IReniecRepository, ReniecRepository>();
builder.Services.AddScoped<IReniecService, ReniecService>();

builder.Services.AddScoped<IBuscadorMasivoRepository, BuscadorMasivoRepository>();
builder.Services.AddScoped<IMasivoExcelService, BuscadorMasivoService>();

builder.Services.AddScoped<IBuscadorMasivoExcelService, BuscadorMasivoExcelService>();

builder.Services.AddScoped<IHistorialRepository, HistorialRepository>();
builder.Services.AddScoped<IHistorialService, HistorialService>();

builder.Services.AddScoped<IEmpresaIndividualRepository, BuscadorIndividualRepository>();

builder.Services.AddScoped<
    internal_search_backend.Business.Services.Buscador.empresa.individual.IIndividualService,
    internal_search_backend.Business.Services.Buscador.empresa.individual.IndividualService>();

builder.Services.AddScoped<
    internal_search_backend.Business.Services.Buscador.personas.individual.IIndividualService,
    internal_search_backend.Business.Services.Buscador.personas.individual.IndividualService>();

builder.Services.AddScoped<IBuscadorEmpresaMasivoRepository, BuscadorEmpresaMasivoRepository>();
builder.Services.AddScoped<IBuscadorEmpresaMasivoService, BuscadorEmpresaMasivoService>();

builder.Services.AddScoped<IBuscadorEmpresaMasivoExcelService, BuscadorEmpresaMasivoExcelService>();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminGeneral", policy =>
        policy.RequireAssertion(ctx => ctx.User.EsAdminGeneral()));
});

// --- Redis (opcional), límites y caché de consultas ---
// Con Redis configurado, los límites se comparten entre todas las instancias de la API y las consultas
// individuales se guardan en caché. Sin Redis, o si se cae, todo sigue funcionando con límites en memoria.
var redis = builder.AgregarRedis();
var limites = builder.Configuration.GetSection("Limites").Get<LimitesOptions>() ?? new LimitesOptions();
builder.Services.AddSingleton(builder.Configuration.GetSection("Cache").Get<CacheOptions>() ?? new CacheOptions());
builder.Services.AddSingleton<ICacheConsultas, CacheConsultas>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Usuario autenticado (o IP si no lo hay) para que el límite sea por persona y no por oficina.
    static string ClaveUsuario(HttpContext ctx) =>
        ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? $"ip:{ctx.Connection.RemoteIpAddress?.ToString() ?? "desconocida"}";

    static bool EsCargaMasiva(HttpContext ctx) =>
        ctx.Request.Path.Value?.EndsWith("/masivo/exportar", StringComparison.OrdinalIgnoreCase) == true;

    // Redis si está conectado; si no, en memoria. Las claves llevan prefijo distinto para que
    // el limitador guardado para cada una sea siempre del mismo tipo.
    bool UsarRedis() => redis is { IsConnected: true };

    RateLimitPartition<string> VentanaFija(string clave, int permitidos, TimeSpan ventana) =>
        UsarRedis()
            ? RedisRateLimitPartition.GetFixedWindowRateLimiter($"r:{clave}", _ => new RedisFixedWindowRateLimiterOptions
            {
                ConnectionMultiplexerFactory = () => redis!,
                PermitLimit = permitidos,
                Window = ventana
            })
            : RateLimitPartition.GetFixedWindowLimiter($"m:{clave}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitidos,
                Window = ventana,
                QueueLimit = 0
            });

    RateLimitPartition<string> Simultaneos(string clave, int permitidos, int enFila) =>
        UsarRedis()
            ? RedisRateLimitPartition.GetConcurrencyRateLimiter($"r:{clave}", _ => new RedisConcurrencyRateLimiterOptions
            {
                ConnectionMultiplexerFactory = () => redis!,
                PermitLimit = permitidos,
                QueueLimit = enFila
            })
            : RateLimitPartition.GetConcurrencyLimiter($"m:{clave}", _ => new ConcurrencyLimiterOptions
            {
                PermitLimit = permitidos,
                QueueLimit = enFila,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });

    // Login y recuperación de clave: 10 intentos por minuto por IP.
    options.AddPolicy("auth", httpContext =>
        VentanaFija($"auth:{httpContext.Connection.RemoteIpAddress?.ToString() ?? "desconocida"}", 10, TimeSpan.FromMinutes(1)));

    // Consultas individuales por usuario y por minuto. Un uso normal no llega; corta scripts o bucles.
    options.AddPolicy("consultas", httpContext =>
        VentanaFija($"consultas:{ClaveUsuario(httpContext)}", limites.ConsultasPorMinuto, TimeSpan.FromMinutes(1)));

    // Cargas masivas por usuario: si ya tiene las permitidas en proceso, la nueva se rechaza.
    options.AddPolicy("masivo", httpContext =>
        Simultaneos($"masivo-usuario:{ClaveUsuario(httpContext)}", limites.MasivoPorUsuario, 0));

    // Cargas masivas en todo el sistema (personas + empresas): N a la vez y el resto esperando turno.
    // Se suma a la política "masivo" de arriba; el resto de peticiones no tiene límite global.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        EsCargaMasiva(httpContext)
            ? Simultaneos("masivo-servidor", limites.MasivoSimultaneos, limites.MasivoEnFila)
            : RateLimitPartition.GetNoLimiter("sin-limite"));

    // Mensaje en el formato que lee la web ({ message }).
    options.OnRejected = async (contexto, ct) =>
    {
        var http = contexto.HttpContext;
        var mensaje = EsCargaMasiva(http)
            ? "Ya tienes una carga masiva en proceso o hay muchas cargas en cola. Intenta de nuevo en unos minutos."
            : http.Request.Path.StartsWithSegments("/system/auth", StringComparison.OrdinalIgnoreCase)
                ? "Demasiados intentos. Espera un momento y vuelve a intentar."
                : "Hiciste muchas consultas en poco tiempo. Espera un momento antes de volver a consultar.";

        if (contexto.Lease.TryGetMetadata(MetadataName.RetryAfter, out var reintentar))
            http.Response.Headers.RetryAfter = ((int)Math.Ceiling(reintentar.TotalSeconds)).ToString();

        await http.Response.WriteAsJsonAsync(new { message = mensaje }, ct);
    };
});

builder.Services.AddControllers(options =>
    options.Filters.Add<ManejadorExcepcionesFilter>())
    .AddControllersAsServices();
builder.Services.AddProblemDetails();

// Estado para monitoreo: GET /health responde 200 si la API alcanza la base de datos y 503 si no
builder.Services.AddSingleton<BaseDatosHealthCheck>();
builder.Services.AddHealthChecks().AddCheck<BaseDatosHealthCheck>("base_datos");

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Internal Search API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Ingresa el token JWT así: Bearer {tu token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
    });
});

// Configuración robusta de CORS incluyendo el dominio de producción en Render
var corsOriginsConfig = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();
var defaultOrigins = new[]
{
    "http://localhost:4200",
    "https://localhost:4200",
    "https://internal-search-frontend-1.onrender.com"
};

var corsOrigins = corsOriginsConfig is { Length: > 0 }
    ? corsOriginsConfig.Union(defaultOrigins).ToArray()
    : defaultOrigins;

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler();
    app.UseHsts();
}

var cabecerasReenviadas = new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                     | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
};

if (app.Configuration.GetValue<bool>("Proxy:ConfiarEnCabeceras"))
{
#pragma warning disable ASPDEPR005
    cabecerasReenviadas.KnownNetworks.Clear();
#pragma warning restore ASPDEPR005
    cabecerasReenviadas.KnownProxies.Clear();
    cabecerasReenviadas.ForwardLimit = 1;
}

app.UseForwardedHeaders(cabecerasReenviadas);

app.UseCors("Frontend");

app.UseAuthentication();

app.UseAuthorization();

// Después de la autenticación para que los límites por usuario sepan quién hace la petición.
app.UseRateLimiter();

app.MapControllers();

// Anónimo a propósito (lo consultan Docker y el monitor externo); solo dice Healthy/Unhealthy, sin detalles
app.MapHealthChecks("/health");

app.Run();
