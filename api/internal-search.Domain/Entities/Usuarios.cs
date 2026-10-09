using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{

    [Table("Usuarios", Schema = "RRCC")]
    public class Usuarios
    {
        [Key]
        [Column("COD_USUARIO")]
        public int CodUsuario { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("NOMBRES")]
        public string Nombres { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("APE_PAT")]
        public string ApePat { get; set; } = string.Empty;

        [MaxLength(100)]
        [Column("APE_MAT")]
        public string? ApeMat { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("USUARIO")]
        public string UsuarioLogin { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("CLAVE")]
        public string Clave { get; set; } = string.Empty;

        [MaxLength(150)]
        [Column("CORREO")]
        public string? Correo { get; set; }

        [MaxLength(150)]
        [Column("DEPARTAMENTO")]
        public string? Departamento { get; set; }

        [MaxLength(150)]
        [Column("PROVINCIA")]
        public string? Provincia { get; set; }

        [MaxLength(150)]
        [Column("DISTRITO")]
        public string? Distrito { get; set; }

        [MaxLength(150)]
        [Column("DIRECCION")]
        public string? Direccion { get; set; }

        [MaxLength(150)]
        [Column("TELEFONO")]
        public string? Telefono { get; set; }

        [MaxLength(150)]
        [Column("DNI")]
        public string? Dni { get; set; }

        [MaxLength(150)]
        [Column("FOTO")]
        public string? Foto { get; set; }

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

        public ICollection<UsuarioRol> UsuarioRoles { get; set; } = new List<UsuarioRol>();

    }
}

