using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace internal_search.Domain.Entities
{
    [Table("PasswordResetTokens", Schema = "RRCC")]
    public class PasswordResetToken
    {
        public const byte TipoRecuperacion = 1;
        public const byte TipoInvitacion = 2;

        [Key]
        [Column("COD_TOKEN")]
        public int CodToken { get; set; }

        [Column("COD_USUARIO")]
        public int CodUsuario { get; set; }

        // SHA-256 (hex) del token enviado por correo; el token en claro nunca se guarda
        [Required]
        [MaxLength(64)]
        [Column("TOKEN_HASH")]
        public string TokenHash { get; set; } = string.Empty;

        [Column("TIPO")]
        public byte Tipo { get; set; } = TipoRecuperacion;

        [Column("FECHA_CREO")]
        public DateTime FechaCreo { get; set; }

        [Column("FECHA_EXPIRA")]
        public DateTime FechaExpira { get; set; }

        [Column("USADO")]
        public bool Usado { get; set; }

        [Column("FECHA_USO")]
        public DateTime? FechaUso { get; set; }

        [MaxLength(45)]
        [Column("IP_SOLICITUD")]
        public string? IpSolicitud { get; set; }
    }
}
