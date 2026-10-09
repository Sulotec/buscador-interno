using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{
    [Table("Moviles", Schema = "Operador")]
    public class Movil
    {
        [Column("PERIODO")]
        public string? Periodo { get; set; }

        [Column("DOCUMENTO")]
        public string? Documento { get; set; }

        [Column("APE_PAT")]
        public string? ApePat { get; set; }

        [Column("APE_MAT")]
        public string? ApeMat { get; set; }

        [Column("PRENOMBRES")]
        public string? Prenombres { get; set; }

        [Column("TELEFONO")]
        public string? Telefono { get; set; }

        [Column("FECHA_ALTA")]
        public DateTime? FechaAlta { get; set; }

        [Column("PLAN_MOVIL")]
        public string? PlanMovil { get; set; }

        [Column("MODALIDAD")]
        public string? Modalidad { get; set; }

        [Column("EMPRESA_OPERADORA")]
        public string? EmpresaOperadora { get; set; }

        [Column("FECHA_CARGA")]
        public DateTime FechaCarga { get; set; }
    }
}
