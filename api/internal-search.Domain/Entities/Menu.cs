using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{
    [Table("Menus", Schema = "RRCC")]
    public class Menu
    {
        [Key]
        [Column("COD_MENU")]
        public int CodMenu { get; set; }

        [Column("COD_MENU_PADRE")]
        public int? CodMenuPadre { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("NOM_MENU")]
        public string NomMenu { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        [Column("RUTA")]
        public string Ruta { get; set; } = string.Empty;

        [MaxLength(100)]
        [Column("ICONO")]
        public string? Icono { get; set; }

        [Column("ORDEN")]
        public int Orden { get; set; } = 0;

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


        // ==========================================
        // RELACIÓN JERÁRQUICA
        // ==========================================

        // Menú padre
        [ForeignKey(nameof(CodMenuPadre))]
        public Menu? MenuPadre { get; set; }

        // Submenús
        public ICollection<Menu> SubMenus { get; set; }
            = new List<Menu>();


        // ==========================================
        // RELACIÓN CON ROLES
        // ==========================================

        public ICollection<RolMenu> RolMenus { get; set; }
            = new List<RolMenu>();
    }
}
