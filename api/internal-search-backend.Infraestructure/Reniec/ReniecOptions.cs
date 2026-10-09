namespace internal_search_backend.Infraestructure.Reniec
{
    public class ReniecOptions
    {
        public string BaseUrl { get; set; } = "https://intexa.org/api-services/v1/reniec";

        // Secreto: user-secrets en desarrollo, variable Reniec__Token en producción
        public string Token { get; set; } = string.Empty;

        // Las imágenes de huellas (hDerecha/hIzquierda) son datos biométricos y pesan ~90 KB:
        // no se envían a los usuarios salvo que se active expresamente.
        public bool IncluirHuellas { get; set; } = false;
    }
}
