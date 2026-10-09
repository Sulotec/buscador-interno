using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace internal_search.Domain.Entities
{
    [Table("LineasCredito", Schema = "RRCC")]
    public class LineaCredito
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

        [Column("TIPO")]
        public string? Tipo { get; set; }

        [Column("LINEA_CREDITO", TypeName = "decimal(18,2)")]
        public decimal? LineaCreditoMonto { get; set; }

        [Column("LINEA_NO_UTILIZADA", TypeName = "decimal(18,2)")]
        public decimal? LineaNoUtilizada { get; set; }

        [Column("LINEA_UTILIZADA", TypeName = "decimal(18,2)")]
        public decimal? LineaUtilizada { get; set; }

        //[Column("FECHA_CARGA")]
        //public DateTime FechaCarga { get; set; }
    }
}
