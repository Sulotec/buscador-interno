using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{
    [Table("Calificacion", Schema = "RRCC")]
    public class Calificacion
    {
        [Column("PERIODO")]
        public string? Periodo { get; set; }

        [Column("CODIGOSBS")]
        public string? CodigoSbs { get; set; }

        [Column("DOCUMENTO")]
        public string? Documento { get; set; }

        [Column("NOR", TypeName = "decimal(18,2)")]
        public decimal? Nor { get; set; }

        [Column("CPP", TypeName = "decimal(18,2)")]
        public decimal? Cpp { get; set; }

        [Column("DEF", TypeName = "decimal(18,2)")]
        public decimal? Def { get; set; }

        [Column("DUD", TypeName = "decimal(18,2)")]
        public decimal? Dud { get; set; }

        [Column("PER", TypeName = "decimal(18,2)")]
        public decimal? Per { get; set; }

        [Column("REPORTAN")]
        public string? Reportan { get; set; }

        [Column("APE_PAT")]
        public string? ApePat { get; set; }

        [Column("APE_MAT")]
        public string? ApeMat { get; set; }

        [Column("PRI_NOMBRE")]
        public string? PriNombre { get; set; }

        [Column("SEG_NOMBRE")]
        public string? SegNombre { get; set; }

        //[Column("FECHA_CARGA")]
        //public DateTime FechaCarga { get; set; }
    }
}
