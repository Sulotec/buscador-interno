using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace internal_search.Domain.Entities
{
    // Todo token emitido antes de FECHA_REVOCACION deja de ser válido para ese usuario.
    // Se escribe al restablecer la contraseña y cuando un ADMIN GENERAL cierra sus sesiones.
    [Table("SesionesRevocadas", Schema = "RRCC")]
    public class SesionRevocada
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Column("COD_USUARIO")]
        public int CodUsuario { get; set; }

        [Column("FECHA_REVOCACION")]
        public DateTime FechaRevocacion { get; set; }
    }
}
