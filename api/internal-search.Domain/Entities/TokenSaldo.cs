using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace internal_search.Domain.Entities
{
    // Saldo de tokens (consultas disponibles) por usuario. ADMIN GENERAL no consume: es ilimitado.
    [Table("TokenSaldo", Schema = "RRCC")]
    public class TokenSaldo
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Column("COD_USUARIO")]
        public int CodUsuario { get; set; }

        [Column("SALDO")]
        public int Saldo { get; set; }

        [Column("FECHA_ACTU")]
        public DateTime FechaActu { get; set; }
    }

    [Table("TokenMovimientos", Schema = "RRCC")]
    public class TokenMovimiento
    {
        public const byte TipoAsignacion = 1;
        public const byte TipoConsumo = 2;
        public const byte TipoDevolucion = 3;
        public const byte TipoAjuste = 4;

        [Key]
        [Column("COD_MOVIMIENTO")]
        public long CodMovimiento { get; set; }

        [Column("COD_USUARIO")]
        public int CodUsuario { get; set; }

        [Column("TIPO")]
        public byte Tipo { get; set; }

        // Positivo suma, negativo resta
        [Column("CANTIDAD")]
        public int Cantidad { get; set; }

        [Column("SALDO_RESULTANTE")]
        public int SaldoResultante { get; set; }

        [MaxLength(50)]
        [Column("ACCION")]
        public string Accion { get; set; } = string.Empty;

        [MaxLength(300)]
        [Column("DETALLE")]
        public string? Detalle { get; set; }

        // Quién hizo el movimiento (el admin que asignó, o el propio usuario al consumir)
        [Column("COD_USUARIO_ACCION")]
        public int? CodUsuarioAccion { get; set; }

        [Column("FECHA")]
        public DateTime Fecha { get; set; }
    }
}
