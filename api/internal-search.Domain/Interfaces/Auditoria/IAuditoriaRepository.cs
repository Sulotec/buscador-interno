using internal_search.Domain.DTOs.Auditoria;
using internal_search.Domain.DTOs.Common;
using internal_search.Domain.Entities;

namespace internal_search.Domain.Interfaces.Auditoria
{
    public interface IAuditoriaRepository
    {
        Task RegistrarAsync(AuditoriaRegistro registro);
        Task<PaginaDto<AuditoriaRegistro>> ListarAsync(AuditoriaFiltroDto filtro);
    }
}
