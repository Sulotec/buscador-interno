using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace internal_search.Domain.Entities
{
    [Table("Fallecidos", Schema = "Operador")]
    public class Fallecidos
    {
        [Key]
        [Column("DNI")]
        [StringLength(8)]
        public string Dni { get; set; } = null!;

        [Column("APE_PAT")]
        public string? ApePat { get; set; }

        [Column("APE_MAT")]
        public string? ApeMat { get; set; }

        [Column("PRENOMBRES")]
        public string? Prenombres { get; set; }

        [Column("DERESTRICCION")]
        public string? DeRestriccion { get; set; }

        [Column("FECHA_NACIMIENTO")]
        public DateTime? FechaNacimiento { get; set; }

        [Column("FECHA_FALLECIMIENTO")]
        public DateTime? FechaFallecimiento { get; set; }

        // Calculadas (no existen en la tabla)
        // [NotMapped]
        // public bool Fallecido => FechaFallecimiento.HasValue;

        // [NotMapped]
        // public string NombreCompleto =>
        //     string.Join(" ", new[] { ApePat, ApeMat, Prenombres }
        //         .Where(x => !string.IsNullOrWhiteSpace(x)));
    }
}
