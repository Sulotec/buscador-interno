using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.DTOs.buscador.persona.individual
{
    public class RecibirHistorialEntrada
    {
        public IFormFile ArchivoExcel { get; set; } = null!;
        public string[] Secciones { get; set; } = Array.Empty<string>();
        public int TotalDnis { get; set; }
    }
}
