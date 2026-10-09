using internal_search.Domain.Interfaces.Notificaciones;
using System.Net;
using System.Net.Mail;

namespace internal_search_backend.Infraestructure.Notificaciones
{
    public class SmtpEmailSender : IEmailSender
    {
        private readonly EmailOptions _options;

        public SmtpEmailSender(EmailOptions options)
        {
            _options = options;
        }

        public async Task EnviarAsync(string destinatario, string asunto, string cuerpoHtml)
        {
            using var client = new SmtpClient(_options.Host, _options.Port)
            {
                EnableSsl = _options.EnableSsl,
                Credentials = string.IsNullOrEmpty(_options.User)
                    ? null
                    : new NetworkCredential(_options.User, _options.Password)
            };

            using var mensaje = new MailMessage(_options.From, destinatario, asunto, cuerpoHtml)
            {
                IsBodyHtml = true
            };

            await client.SendMailAsync(mensaje);
        }
    }
}
