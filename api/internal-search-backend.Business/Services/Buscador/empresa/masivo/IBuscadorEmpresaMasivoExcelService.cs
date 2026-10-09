using internal_search.Domain.DTOs.buscador.empresa.masivo;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Buscador.empresa.masivo
{
    public interface IBuscadorEmpresaMasivoExcelService
    {
        byte[] GenerarExcel(BuscadorEmpresaMasivoResponseDto resultado, HashSet<string> secciones);
    }
}
