using System.ComponentModel.DataAnnotations;
using internal_search.Domain.Entities;

namespace internal_search.Domain.DTOs.buscador.persona.individual
{
    public class BuscadorNombresEntrada
    {
        [Required, StringLength(50, MinimumLength = 2)]
        [RegularExpression(@"^[\p{L}\p{M}][\p{L}\p{M}'’ -]*$", ErrorMessage = "Usa solo letras, espacios, apóstrofes o guiones.")]
        public string ApePat { get; set; } = string.Empty;
        [StringLength(50)]
        [RegularExpression(@"^[\p{L}\p{M}][\p{L}\p{M}'’ -]*$", ErrorMessage = "Usa solo letras, espacios, apóstrofes o guiones.")]
        public string? ApeMat { get; set; }
        [StringLength(100)]
        [RegularExpression(@"^[\p{L}\p{M}][\p{L}\p{M}'’ -]*$", ErrorMessage = "Usa solo letras, espacios, apóstrofes o guiones.")]
        public string? Nombres { get; set; }
    }

    public class BuscadorNombresResultado
    {
        public string Documento { get; set; } = string.Empty;
        public string NombreCompleto { get; set; } = string.Empty;
        public List<Deuda> Deudas { get; set; } = new();
        public List<LineaCredito> LineasCredito { get; set; } = new();
        public List<Calificacion> Calificaciones { get; set; } = new();
        public List<Sueldo> Sueldos { get; set; } = new();
        public List<Movil> Moviles { get; set; } = new();
    }
}
