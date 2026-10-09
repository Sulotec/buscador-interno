using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{
    [Table("RolMenu", Schema = "RRCC")]
    public class RolMenu
    {
        [Key]
        [Column("COD_ROL_MENU")]
        public int CodRolMenu { get; set; }

        [Column("COD_ROL")]
        public int CodRol { get; set; }

        [Column("COD_MENU")]
        public int CodMenu { get; set; }

        [Column("PUEDE_VER")]
        public int PuedeVer { get; set; } = 1;

        [Column("PUEDE_CREAR")]
        public int PuedeCrear { get; set; } = 0;

        [Column("PUEDE_EDITAR")]
        public int PuedeEditar { get; set; } = 0;

        [Column("PUEDE_ELIMINAR")]
        public int PuedeEliminar { get; set; } = 0;

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


        // FK -> Rol
        [ForeignKey(nameof(CodRol))]
        public Rol Rol { get; set; } = null!;

        // FK -> Menu
        [ForeignKey(nameof(CodMenu))]
        public Menu Menu { get; set; } = null!;
    }
}
