using internal_search.Domain.Entities;

namespace internal_search.Domain.DTOs.buscador.persona.masivos
{
    /// <summary>
    /// Respuesta consolidada: resultados de las 5 tablas para el documento buscado.
    /// </summary>
    public class BuscadorHistorialResponse
    {
        public bool EsDniValido { get; set; }
        public string Documento { get; set; } = string.Empty;
        public string TipoDocumento { get; set; } = string.Empty;
        public string? NombreCompleto { get; set; }

        public List<Deuda> Deudas { get; set; } = new();
        public List<LineaCredito> LineasCredito { get; set; } = new();
        public List<Calificacion> Calificaciones { get; set; } = new();
        public List<Sueldo> Sueldos { get; set; } = new();
        public List<Movil> Moviles { get; set; } = new();
    }

    // Proyecciones ligeras (DTO) en vez de devolver la entidad completa del DbContext.
    // Ajusta las propiedades a las columnas reales que necesites exponer.

}
