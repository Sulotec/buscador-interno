using internal_search.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.DTOs.buscador.persona.masivos
{
    public class BuscadorMasivoResponse
    {
        public int TotalSolicitados { get; set; }
        public List<string> DnisInvalidos { get; set; } = new();
        public List<string> DnisSinResultados { get; set; } = new();

        // Una lista por pestaña
        public List<Movil> Moviles { get; set; } = new();
        public List<Sueldo> Sueldos { get; set; } = new();
        public List<Calificacion> Calificaciones { get; set; } = new();
        public List<Deuda> Deudas { get; set; } = new();
        public List<LineaCredito> LineasCredito { get; set; } = new();
    }
}
