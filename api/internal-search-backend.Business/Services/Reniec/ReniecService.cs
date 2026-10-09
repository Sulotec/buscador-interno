using internal_search.Domain.DTOs.Reniec;
using internal_search.Domain.Interfaces.Reniec;
using System.Text.RegularExpressions;

namespace internal_search_backend.Business.Services.Reniec
{
    public interface IReniecService
    {
        // ArgumentException si el DNI no tiene 8 dígitos; ReniecNoDisponibleException si el proveedor falla
        Task<ReniecResponse> ConsultarAsync(string dni, CancellationToken ct);
    }

    public partial class ReniecService : IReniecService
    {
        private readonly IReniecClient _client;

        public ReniecService(IReniecClient client)
        {
            _client = client;
        }

        public Task<ReniecResponse> ConsultarAsync(string dni, CancellationToken ct)
        {
            dni = (dni ?? string.Empty).Trim();

            if (!DniRegex().IsMatch(dni))
                throw new ArgumentException("El DNI debe contener exactamente 8 dígitos.");

            return _client.ConsultarAsync(dni, ct);
        }

        [GeneratedRegex(@"^\d{8}$")]
        private static partial Regex DniRegex();
    }
}
