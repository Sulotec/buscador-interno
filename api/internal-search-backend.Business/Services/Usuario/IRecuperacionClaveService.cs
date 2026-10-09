using internal_search.Domain.Entities;

namespace internal_search_backend.Business.Services.Usuario
{
    public interface IRecuperacionClaveService
    {
        // Nunca revela si el usuario existe: no lanza error ni devuelve nada distinto
        Task SolicitarRecuperacionAsync(string identificador, string? ip);

        // True si el correo de invitación salió
        Task<bool> EnviarInvitacionAsync(Usuarios usuario, string? ip);

        // Devuelve el código del usuario. Lanza ArgumentException si la clave no cumple la política o el enlace no es válido
        Task<int> RestablecerAsync(string token, string nuevaClave);
    }
}
