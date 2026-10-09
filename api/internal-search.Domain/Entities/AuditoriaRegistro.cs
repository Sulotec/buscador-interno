using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace internal_search.Domain.Entities
{
    [Table("Auditoria", Schema = "RRCC")]
    public class AuditoriaRegistro
    {
        [Key]
        [Column("COD_AUDITORIA")]
        public long CodAuditoria { get; set; }

        [Column("FECHA")]
        public DateTime Fecha { get; set; }

        [Column("COD_USUARIO")]
        public int? CodUsuario { get; set; }

        [MaxLength(50)]
        [Column("USUARIO")]
        public string Usuario { get; set; } = string.Empty;

        [MaxLength(60)]
        [Column("ACCION")]
        public string Accion { get; set; } = string.Empty;

        [MaxLength(60)]
        [Column("ENTIDAD")]
        public string? Entidad { get; set; }

        [MaxLength(60)]
        [Column("ENTIDAD_ID")]
        public string? EntidadId { get; set; }

        [MaxLength(500)]
        [Column("DETALLE")]
        public string? Detalle { get; set; }

        [MaxLength(45)]
        [Column("IP")]
        public string? Ip { get; set; }

        [Column("EXITO")]
        public bool Exito { get; set; }
    }
}
