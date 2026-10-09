using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{
    [Table("Deuda", Schema = "RRCC")]
    public class Deuda
    {
        [Column("PERIODO")]
        public string? Periodo { get; set; }

        [Column("CODIGOSBS")]
        public string? CodigoSbs { get; set; }

        [Column("DOCUMENTO")]
        public string? Documento { get; set; }

        [Column("RAZONSOCIAL")]
        public string? RazonSocial { get; set; }

        //[Column("CODIGOEMPRESA")]
        //public string? CodigoEmpresa { get; set; }

        [Column("ENTIDAD")]
        public string? Entidad { get; set; }

        [Column("TIPO_DEUDA")]
        public string? TipoDeuda { get; set; }

        [Column("DIAS")]
        public int? Dias { get; set; }

        [Column("CALIFICACION")]
        public string? Calificacion { get; set; }

        [Column("SALDO", TypeName = "decimal(20,2)")]
        public decimal? Saldo { get; set; }

        //[Column("FECHA_CARGA")]
        //public DateTime FechaCarga { get; set; }
    }
}
