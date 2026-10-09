using internal_search.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.DTOs.buscador.persona.individual
{
    public class BuscadorTelefonoResponse
    {
        public string Telefono { get; set; } = string.Empty;
        public int DocumentosAsociados { get; set; }
        public List<Movil> Registros { get; set; } = new();
    }
}
