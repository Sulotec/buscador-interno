namespace internal_search_backend.Infraestructure.Reniec
{
    public class ReniecOptions
    {
        public string BaseUrl { get; set; } = "https://intexa.org/api-services/v1/reniec";

        // Secreto: user-secrets en desarrollo, variable Reniec__Token en producción
        public string Token { get; set; } = string.Empty;

        // Las imágenes de huellas (hDerecha/hIzquierda) son datos biométricos y pesan ~70 KB.
        // appsettings.json las activa para mostrarlas en la ficha; sin configuración no se envían.
        public bool IncluirHuellas { get; set; } = false;
    }
}
