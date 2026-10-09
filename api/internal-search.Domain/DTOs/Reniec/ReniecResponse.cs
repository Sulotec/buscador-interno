using System.Text.Json;

namespace internal_search.Domain.DTOs.Reniec
{
    public class ReniecResponse
    {
        public string Dni { get; set; } = string.Empty;
        public bool Encontrado { get; set; }

        // Datos tal como los entrega el proveedor, sin su bloque _meta (cupo del plan) ni success
        public JsonElement? Datos { get; set; }
    }
}
