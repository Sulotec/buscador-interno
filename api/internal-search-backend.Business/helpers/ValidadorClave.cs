namespace internal_search_backend.Business.helpers
{
    public static class ValidadorClave
    {
        // BCrypt solo considera los primeros 72 bytes, por eso ese es el máximo
        public static string? Validar(string? clave)
        {
            if (string.IsNullOrEmpty(clave) || clave.Length < 8)
                return "La contraseña debe tener al menos 8 caracteres.";

            if (System.Text.Encoding.UTF8.GetByteCount(clave) > 72)
                return "La contraseña es demasiado larga (máximo 72 bytes).";

            if (!clave.Any(char.IsUpper) || !clave.Any(char.IsLower) || !clave.Any(char.IsDigit))
                return "La contraseña debe incluir mayúsculas, minúsculas y números.";

            return null;
        }
    }
}
