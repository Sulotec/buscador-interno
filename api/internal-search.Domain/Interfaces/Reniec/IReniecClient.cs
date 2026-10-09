using internal_search.Domain.DTOs.Reniec;

namespace internal_search.Domain.Interfaces.Reniec
{
    public interface IReniecClient
    {
        // ReniecNoDisponibleException si el proveedor falla, no responde o no está configurado
        Task<ReniecResponse> ConsultarAsync(string dni, CancellationToken ct);
    }
}
