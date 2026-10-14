using internal_search.Domain.Interfaces.Notificaciones;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace internal_search_backend.Infraestructure.Notificaciones
{
    public class SmtpEmailSender : IEmailSender
    {
        private readonly EmailOptions _options;

        public SmtpEmailSender(EmailOptions options)
        {
            _options = options;
        }

        // MailKit y no System.Net.Mail.SmtpClient: este no sabe autenticarse con AUTH PLAIN, el unico metodo que ofrece OCI Email Delivery.
        public async Task EnviarAsync(string destinatario, string asunto, string cuerpoHtml)
        {
            var mensaje = new MimeMessage();
            mensaje.From.Add(MailboxAddress.Parse(_options.From));
            mensaje.To.Add(MailboxAddress.Parse(destinatario));
            mensaje.Subject = asunto;
            mensaje.Body = new BodyBuilder { HtmlBody = cuerpoHtml }.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(_options.Host, _options.Port,
                _options.EnableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None);

            if (!string.IsNullOrEmpty(_options.User))
                await client.AuthenticateAsync(_options.User, _options.Password);

            await client.SendAsync(mensaje);
            await client.DisconnectAsync(true);
        }
    }
}
