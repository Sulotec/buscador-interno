using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{

    [Table("Sueldos", Schema = "Operador")]
    public class Sueldo
    {
        //[Key]
        //[Column("ID")]
        //public long Id { get; set; }

        [Required]
        [MaxLength(6)]
        [Column("PERIODO", TypeName = "char(6)")]
        public string Periodo { get; set; } = string.Empty;

        //[MaxLength(10)]
        //[Column("TIPODOC")]
        //public string? TipoDoc { get; set; }

        [MaxLength(30)]
        [Column("DOCUMENTO")]
        public string? Documento { get; set; }

        [MaxLength(250)]
        [Column("APENOM")]
        public string? ApeNom { get; set; }

        [MaxLength(20)]
        [Column("RUC")]
        public string? Ruc { get; set; }

        [MaxLength(250)]
        [Column("EMPRESA")]
        public string? Empresa { get; set; }

        //[MaxLength(20)]
        //[Column("GENERO")]
        //public string? Genero { get; set; }

        //[Column("SUELDO", TypeName = "decimal(18,2)")]
        //public decimal? MontoSueldo { get; set; }

        //[Column("GRATIF_BONO", TypeName = "decimal(18,2)")]
        //public decimal? GratifBono { get; set; }

        //[Column("INGRESO_ESTIMADO_ANUAL", TypeName = "decimal(18,2)")]
        //public decimal? IngresoEstimadoAnual { get; set; }

        //[MaxLength(5)]
        //[Column("COD_RANGO_SUELDO")]
        //public string? CodRangoSueldo { get; set; }

        [MaxLength(50)]
        [Column("RANGO_SUELDO")]
        public string? RangoSueldo { get; set; }

        //[MaxLength(50)]
        //[Column("SEGMENTO_SUELDO")]
        //public string? SegmentoSueldo { get; set; }

        [MaxLength(30)]
        [Column("NIVEL_INGRESO")]
        public string? NivelIngreso { get; set; }

        //[Required]
        //[Column("FECHA_CARGA")]
        //public DateTime FechaCarga { get; set; }
    }
}
