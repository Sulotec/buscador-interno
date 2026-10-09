using internal_search.Domain.Entities;

namespace internal_search.Domain.Interfaces.Usuario
{
    public interface IPasswordResetRepository
    {
        Task InvalidarPendientesAsync(int codUsuario);
        Task CrearAsync(PasswordResetToken token);

        // Consume el token y cambia la clave de forma atómica.
        // Devuelve el código del usuario, o null si el token no es válido, ya se usó o expiró.
        Task<int?> RestablecerAsync(string tokenHash, string nuevaClaveHash, DateTime ahoraUtc);
    }
}
