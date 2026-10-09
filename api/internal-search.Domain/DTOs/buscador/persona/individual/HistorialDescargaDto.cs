using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.DTOs.buscador.persona.individual
{
    public record HistorialDescargaDto(
        int Id,
        string Archivo,
        DateTime Fecha,
        long TamanoBytes,
        int TotalDnis,
        string[] Secciones);
}
