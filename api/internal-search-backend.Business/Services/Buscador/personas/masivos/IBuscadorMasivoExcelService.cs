using internal_search.Domain.DTOs.buscador.persona.masivos;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Buscador.personas.masivos
{
    public interface IBuscadorMasivoExcelService
    {
        byte[] GenerarExcel(BuscadorMasivoResponse resultado, HashSet<string> secciones);
    }
}
