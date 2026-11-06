using internal_search.Domain.DTOs.Auditoria;
using internal_search.Domain.DTOs.Common;
using internal_search.Domain.DTOs.ListaNegra;
using internal_search.Domain.Exceptions;
using internal_search.Domain.Interfaces.ListaNegra;
using internal_search_backend.Business.Services.Auditoria;
using Entidad = internal_search.Domain.Entities.ListaNegra;

namespace internal_search_backend.Business.Services.ListaNegra
{
    public interface IListaNegraService
    {
        // Lanza DocumentoBloqueadoException (y lo audita) si el documento está en la lista negra.
        // Se llama ANTES de cobrar tokens: un DNI bloqueado no cuesta nada.
        Task VerificarAsync(ContextoAccion ctx, string accion, string? documento, CancellationToken ct = default);

        // De los documentos dados, los que están bloqueados (para ocultarlos de resultados o excluirlos del masivo)
        Task<HashSet<string>> FiltrarBloqueadosAsync(IEnumerable<string?> documentos, CancellationToken ct = default);

        Task<PaginaDto<Entidad>> ListarAsync(ListaNegraFiltroDto filtro, CancellationToken ct = default);
        Task<ResultadoAgregarListaNegraDto> AgregarAsync(ContextoAccion admin, AgregarListaNegraDto dto, CancellationToken ct = default);
        // Baja lógica: el registro queda en el historial con quién, cuándo y por qué se desbloqueó
        Task QuitarAsync(ContextoAccion admin, string documento, string motivo, CancellationToken ct = default);
    }

    public class ListaNegraService : IListaNegraService
    {
        private readonly IListaNegraRepository _repo;
        private readonly IAuditoriaService _auditoria;

        public ListaNegraService(IListaNegraRepository repo, IAuditoriaService auditoria)
        {
            _repo = repo;
            _auditoria = auditoria;
        }

        public static string Normalizar(string? documento) => (documento ?? string.Empty).Trim();

        public static bool EsDni(string documento) => documento is { Length: 8 } && documento.All(char.IsDigit);

        // DNI de la persona detrás del documento: el propio DNI, o el que va dentro de un RUC de persona natural
        // (10 + DNI + dígito verificador). Para otros documentos (RUC 20, CE, pasaporte) devuelve null.
        public static string? DniDe(string? documento)
        {
            var doc = Normalizar(documento);
            if (EsDni(doc)) return doc;
            if (doc.Length == 11 && doc.StartsWith("10") && doc.All(char.IsDigit)) return doc.Substring(2, 8);
            return null;
        }

        public async Task VerificarAsync(ContextoAccion ctx, string accion, string? documento, CancellationToken ct = default)
        {
            var dni = DniDe(documento);
            if (dni is null)
                return;

            var bloqueo = await _repo.ObtenerAsync(dni, ct);
            if (bloqueo is null)
                return;

            var doc = Normalizar(documento);
            await _auditoria.RegistrarAsync(ctx, accion, "ListaNegra", dni,
                $"Rechazada: {(doc == dni ? $"el DNI {dni}" : $"el documento {doc} (DNI {dni})")} está en la lista negra (sin costo).", exito: false);
            throw new DocumentoBloqueadoException(bloqueo);
        }

        // Devuelve los documentos (tal como vienen, sin espacios) cuyo DNI está bloqueado
        public async Task<HashSet<string>> FiltrarBloqueadosAsync(IEnumerable<string?> documentos, CancellationToken ct = default)
        {
            var porDni = documentos.Select(Normalizar).Distinct()
                .Select(d => (Documento: d, Dni: DniDe(d)))
                .Where(x => x.Dni is not null).ToList();
            if (porDni.Count == 0)
                return new HashSet<string>();

            var dnisBloqueados = await _repo.FiltrarBloqueadosAsync(porDni.Select(x => x.Dni!), ct);
            return porDni.Where(x => dnisBloqueados.Contains(x.Dni!)).Select(x => x.Documento).ToHashSet();
        }

        public Task<PaginaDto<Entidad>> ListarAsync(ListaNegraFiltroDto filtro, CancellationToken ct = default) =>
            _repo.ListarAsync(filtro.Texto,
                soloVigentes: !string.Equals(filtro.Vista, "historial", StringComparison.OrdinalIgnoreCase),
                Math.Max(1, filtro.Pagina), Math.Clamp(filtro.Tamano, 1, 100), ct);

        public async Task<ResultadoAgregarListaNegraDto> AgregarAsync(ContextoAccion admin, AgregarListaNegraDto dto, CancellationToken ct = default)
        {
            var motivo = (dto.Motivo ?? string.Empty).Trim();
            if (motivo.Length < 3)
                throw new ArgumentException("Escribe el motivo del bloqueo (mínimo 3 caracteres).");
            if (motivo.Length > 250)
                throw new ArgumentException("El motivo admite como máximo 250 caracteres.");

            var documentos = dto.Documentos.Select(Normalizar).Where(d => d.Length > 0).Distinct().ToList();
            var resultado = new ResultadoAgregarListaNegraDto
            {
                Invalidos = documentos.Where(d => !EsDni(d)).ToList()
            };
            var validos = documentos.Where(EsDni).ToList();
            if (validos.Count == 0)
                throw new ArgumentException("Ingresa al menos un DNI válido (8 dígitos).");

            resultado.Agregados = await _repo.AgregarAsync(validos, motivo, admin.CodUsuario, admin.Login, ct);
            var agregados = resultado.Agregados.ToHashSet();
            resultado.YaBloqueados = validos.Where(d => !agregados.Contains(d)).ToList();

            foreach (var doc in resultado.Agregados)
                await _auditoria.RegistrarAsync(admin, "LISTA_NEGRA_AGREGAR", "ListaNegra", doc, $"Motivo: {motivo}");

            return resultado;
        }

        public async Task QuitarAsync(ContextoAccion admin, string documento, string motivo, CancellationToken ct = default)
        {
            var doc = Normalizar(documento);
            if (!EsDni(doc))
                throw new ArgumentException("El DNI debe contener exactamente 8 dígitos.");

            var motivoQuito = (motivo ?? string.Empty).Trim();
            if (motivoQuito.Length < 3)
                throw new ArgumentException("Escribe el motivo del desbloqueo (mínimo 3 caracteres).");
            if (motivoQuito.Length > 250)
                throw new ArgumentException("El motivo admite como máximo 250 caracteres.");

            var quitado = await _repo.QuitarAsync(doc, motivoQuito, admin.CodUsuario, admin.Login, ct)
                ?? throw new ArgumentException("Ese DNI no está bloqueado.");

            await _auditoria.RegistrarAsync(admin, "LISTA_NEGRA_QUITAR", "ListaNegra", doc,
                $"Motivo del desbloqueo: {motivoQuito}. Estaba bloqueado por {quitado.Usuario} desde el {quitado.FechaUtc:yyyy-MM-dd} (motivo: {quitado.Motivo}).");
        }
    }
}
