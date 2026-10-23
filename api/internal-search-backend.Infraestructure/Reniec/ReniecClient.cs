using internal_search.Domain.DTOs.Reniec;
using internal_search.Domain.Exceptions;
using internal_search.Domain.Interfaces.Reniec;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace internal_search_backend.Infraestructure.Reniec
{
    // Cliente del proveedor de RENIEC (GET {BaseUrl}?dni=..., autenticación Bearer).
    // El proveedor tiene un cupo diario compartido por toda la clave; el control por usuario
    // lo hace el sistema de tokens, no este cliente.
    public class ReniecClient : IReniecClient
    {
        private const int AvisoCupoBajo = 100;

        private readonly HttpClient _http;
        private readonly ReniecOptions _options;
        private readonly ILogger<ReniecClient> _logger;

        public ReniecClient(HttpClient http, ReniecOptions options, ILogger<ReniecClient> logger)
        {
            _http = http;
            _options = options;
            _logger = logger;
        }

        public async Task<ReniecResponse> ConsultarAsync(string dni, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(_options.Token))
                throw new ReniecNoDisponibleException("La consulta RENIEC no está configurada.");

            using var request = new HttpRequestMessage(
                HttpMethod.Get, $"{_options.BaseUrl}?dni={Uri.EscapeDataString(dni)}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.Token);

            HttpResponseMessage response;
            string cuerpo;
            try
            {
                response = await _http.SendAsync(request, ct);
                cuerpo = await response.Content.ReadAsStringAsync(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                _logger.LogError(ex, "No se pudo contactar al proveedor de RENIEC.");
                throw new ReniecNoDisponibleException("No se pudo contactar al servicio de RENIEC.", ex);
            }

            using (response)
            {
                JsonObject? json = null;
                try { json = JsonNode.Parse(cuerpo)?.AsObject(); } catch (JsonException) { }

                AvisarSiQuedaPocoCupo(json);

                var codigo = json?["code"]?.GetValue<string>();

                if (response.StatusCode == HttpStatusCode.NotFound || codigo == "data_not_found")
                    return new ReniecResponse { Dni = dni, Encontrado = false };

                // Cupo diario del plan agotado (el proveedor responde 429 / daily_limit_reached): se dice claro,
                // porque no es una falla del Buscador y se renueva solo al dia siguiente.
                if (response.StatusCode == HttpStatusCode.TooManyRequests || codigo == "daily_limit_reached")
                {
                    _logger.LogWarning("RENIEC: cupo diario del plan agotado (status {Status}, code {Code}).", (int)response.StatusCode, codigo);
                    throw new ReniecNoDisponibleException("Se agotó el cupo diario de consultas RENIEC del plan del proveedor; se renueva cada día. Vuelve a intentarlo mañana.");
                }

                if (!response.IsSuccessStatusCode || json is null || json["success"]?.GetValue<bool>() == false)
                {
                    // No se registra el cuerpo completo: puede contener datos personales
                    _logger.LogError("RENIEC respondió {Status} (code {Code}).", (int)response.StatusCode, codigo);
                    throw new ReniecNoDisponibleException("El servicio de RENIEC respondió con un error.");
                }

                // El cupo del plan y el estado interno del proveedor no se exponen a los usuarios
                json.Remove("_meta");
                json.Remove("success");

                JsonNode datos = json.Count == 1 && json.ContainsKey("data") && json["data"] is not null
                    ? json["data"]!.DeepClone()
                    : json;

                if (!_options.IncluirHuellas && datos is JsonObject objeto)
                {
                    objeto.Remove("hDerecha");
                    objeto.Remove("hIzquierda");
                }

                return new ReniecResponse
                {
                    Dni = dni,
                    Encontrado = true,
                    Datos = JsonSerializer.SerializeToElement(datos)
                };
            }
        }

        private void AvisarSiQuedaPocoCupo(JsonObject? json)
        {
            try
            {
                var restantes = json?["_meta"]?["consultas_restantes"]?.GetValue<int>();
                if (restantes is < AvisoCupoBajo)
                    _logger.LogWarning("Cupo diario de RENIEC casi agotado: quedan {Restantes} consultas.", restantes);
            }
            catch (Exception)
            {
                // El formato de _meta lo controla el proveedor; un cambio ahí no debe romper la consulta
            }
        }
    }
}
