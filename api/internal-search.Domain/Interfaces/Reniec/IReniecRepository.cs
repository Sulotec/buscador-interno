using internal_search.Domain.Entities;

namespace internal_search.Domain.Interfaces.Reniec
{
    public interface IReniecRepository
    {
        Task GuardarUltimaConsultaAsync(ConsultaReniec consulta, CancellationToken ct);
    }
}
