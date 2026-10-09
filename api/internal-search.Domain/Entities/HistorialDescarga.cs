using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace internal_search.Domain.Entities
{
    [Table("HistorialDescarga", Schema = "RRCC")]
    public class HistorialDescarga
    {
        [Key]
        [Column("COD_HISTORIAL")]
        public int CodHistorial { get; set; }

        [Column("COD_USUARIO")]
        public int CodUsuario { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("NOMBRE_ARCHIVO")]
        public string NombreArchivo { get; set; } = string.Empty;

        [Required]
        [MaxLength(400)]
        [Column("RUTA_ARCHIVO")]
        public string RutaArchivo { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        [Column("SECCIONES")]
        public string Secciones { get; set; } = string.Empty;

        [Column("TOTAL_DNIS")]
        public int TotalDnis { get; set; }

        [Column("TAMANO_BYTES")]
        public long TamanoBytes { get; set; }

        [Column("FECHA_CREO")]
        public DateTime FechaCreo { get; set; }
    }
}