namespace internal_search.Domain.Interfaces.Notificaciones
{
    public interface IEmailSender
    {
        Task EnviarAsync(string destinatario, string asunto, string cuerpoHtml);
    }
}
