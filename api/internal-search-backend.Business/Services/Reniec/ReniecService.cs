using internal_search.Domain.DTOs.Reniec;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Reniec;
using System.Text.Json;
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
        private const int MaximoBytesFoto = 5 * 1024 * 1024;

        private readonly IReniecClient _client;
        private readonly IReniecRepository _repository;

        public ReniecService(IReniecClient client, IReniecRepository repository)
        {
            _client = client;
            _repository = repository;
        }

        public async Task<ReniecResponse> ConsultarAsync(string dni, CancellationToken ct)
        {
            dni = (dni ?? string.Empty).Trim();

            if (!DniRegex().IsMatch(dni))
                throw new ArgumentException("El DNI debe contener exactamente 8 dígitos.");

            var respuesta = await _client.ConsultarAsync(dni, ct);
            if (respuesta.Encontrado && respuesta.Datos is { ValueKind: JsonValueKind.Object } datos)
            {
                var consulta = MapearConsulta(dni, datos);
                await _repository.GuardarUltimaConsultaAsync(consulta, ct);
            }

            return respuesta;
        }

        private static ConsultaReniec MapearConsulta(string dni, JsonElement datos)
        {
            var persona = ObtenerPersona(datos);

            return new ConsultaReniec
            {
                Dni = dni,
                PreNombres = Leer(persona, "preNombres"),
                ApePaterno = Leer(persona, "apePaterno"),
                ApeMaterno = Leer(persona, "apeMaterno"),
                FechaNacimiento = Leer(persona, "feNacimiento"),
                Sexo = Leer(persona, "sexo"),
                EstadoCivil = Leer(persona, "estadoCivil"),
                GradoInstruccion = Leer(persona, "gradoInstruccion"),
                Restriccion = Leer(persona, "deRestriccion"),
                Direccion = Leer(persona, "desDireccion"),
                Distrito = Leer(persona, "distDireccion", "distrito"),
                Provincia = Leer(persona, "provDireccion", "provincia"),
                Departamento = Leer(persona, "depaDireccion", "departamento"),
                NombrePadre = Leer(persona, "nomPadre"),
                NombreMadre = Leer(persona, "nomMadre"),
                FechaEmision = Leer(persona, "feEmision"),
                FechaCaducidad = Leer(persona, "feCaducidad"),
                FechaFallecimiento = Leer(persona, "feFallecimiento"),
                Foto = LeerFoto(datos),
                FechaConsultaUtc = DateTime.UtcNow
            };
        }

        private static byte[]? LeerFoto(JsonElement datos)
        {
            foreach (var propiedad in datos.EnumerateObject())
            {
                if (!propiedad.Name.Equals("foto", StringComparison.OrdinalIgnoreCase))
                    continue;

                if (propiedad.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
                    return null;
                if (propiedad.Value.ValueKind != JsonValueKind.String)
                    throw new InvalidDataException("La foto de RENIEC tiene un formato no válido.");

                var contenido = propiedad.Value.GetString();
                if (string.IsNullOrWhiteSpace(contenido))
                    return null;

                if (contenido.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                {
                    var separador = contenido.IndexOf(',');
                    if (separador < 0 ||
                        !contenido[..separador].EndsWith(";base64", StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException("La foto de RENIEC tiene un formato no válido.");
                    contenido = contenido[(separador + 1)..];
                }

                var foto = Convert.FromBase64String(contenido);
                if (foto.Length > MaximoBytesFoto)
                    throw new InvalidDataException("La foto de RENIEC supera el tamaño permitido.");

                return foto;
            }

            return null;
        }

        private static JsonElement ObtenerPersona(JsonElement datos)
        {
            foreach (var propiedad in datos.EnumerateObject())
            {
                if (!propiedad.Name.Equals("listaAni", StringComparison.OrdinalIgnoreCase))
                    continue;

                if (propiedad.Value.ValueKind == JsonValueKind.Array &&
                    propiedad.Value.GetArrayLength() > 0 &&
                    propiedad.Value[0].ValueKind == JsonValueKind.Object)
                    return propiedad.Value[0];
            }

            return datos;
        }

        private static string? Leer(JsonElement objeto, params string[] nombres)
        {
            foreach (var propiedad in objeto.EnumerateObject())
            {
                if (!nombres.Any(nombre => propiedad.Name.Equals(nombre, StringComparison.OrdinalIgnoreCase)))
                    continue;

                return propiedad.Value.ValueKind switch
                {
                    JsonValueKind.String => propiedad.Value.GetString(),
                    JsonValueKind.Number => propiedad.Value.GetRawText(),
                    JsonValueKind.True => bool.TrueString,
                    JsonValueKind.False => bool.FalseString,
                    _ => null
                };
            }

            return null;
        }

        [GeneratedRegex(@"^\d{8}$")]
        private static partial Regex DniRegex();
    }
}
