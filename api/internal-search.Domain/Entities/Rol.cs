using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{

    [Table("Roles", Schema = "RRCC")]
    public class Rol
    {
        [Key]
        [Column("COD_ROL")]
        public int CodRol { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("NOM_ROL")]
        public string NomRol { get; set; } = string.Empty;

        [MaxLength(250)]
        [Column("DESCRIPCION")]
        public string? Descripcion { get; set; }

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

        // Relación con UsuarioRol
        public ICollection<UsuarioRol> UsuarioRoles { get; set; }
            = new List<UsuarioRol>();
    }
}

