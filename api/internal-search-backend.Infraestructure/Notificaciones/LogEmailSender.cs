using internal_search.Domain.Interfaces.Notificaciones;
using Microsoft.Extensions.Logging;

namespace internal_search_backend.Infraestructure.Notificaciones
{
    // Sustituto cuando no hay SMTP configurado. Solo en desarrollo vuelca el contenido
    // (que incluye el enlace con el token); fuera de él avisa y no escribe el token en logs.
    public class LogEmailSender : IEmailSender
    {
        private readonly ILogger<LogEmailSender> _logger;
        private readonly bool _mostrarContenido;

        public LogEmailSender(ILogger<LogEmailSender> logger, bool mostrarContenido)
        {
            _logger = logger;
            _mostrarContenido = mostrarContenido;
        }

        public Task EnviarAsync(string destinatario, string asunto, string cuerpoHtml)
        {
            if (_mostrarContenido)
                _logger.LogWarning("EMAIL (SMTP no configurado) a {Destinatario}: {Asunto}\n{Cuerpo}", destinatario, asunto, cuerpoHtml);
            else
                _logger.LogError("No se envió el correo {Asunto} a {Destinatario}: configure la sección Email.", asunto, destinatario);

            return Task.CompletedTask;
        }
    }
}
