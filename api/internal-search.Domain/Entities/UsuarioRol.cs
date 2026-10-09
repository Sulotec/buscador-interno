using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{
    [Table("UsuarioRol", Schema = "RRCC")]
    public class UsuarioRol
    {
        [Key]
        [Column("COD_USUARIO_ROL")]
        public int CodUsuarioRol { get; set; }

        [Column("COD_USUARIO")]
        public int CodUsuario { get; set; }

        [Column("COD_ROL")]
        public int CodRol { get; set; }

        [Column("ESTADO")]
        public int Estado { get; set; } = 1;

        [MaxLength(20)]
        [Column("USU_CREO")]
        public string? UsuCreo { get; set; }

        [Column("FECHA_CREO")]
        public DateTime? FechaCreo { get; set; }

        [MaxLength(20)]
        [Column("USU_ACTU")]
        public string? UsuActu { get; set; }

        [Column("FECHA_ACTU")]
        public DateTime? FechaActu { get; set; }

        // Navegación hacia Usuario
        [ForeignKey(nameof(CodUsuario))]
        public Usuarios Usuario { get; set; } = null!;
            
        // Navegación hacia Rol
        [ForeignKey(nameof(CodRol))]
        public Rol Rol { get; set; } = null!;
    }
}
