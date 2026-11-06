using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace internal_search_backend.Security
{
    // Respuesta 400 cuando los datos enviados no pasan la validación automática de ASP.NET.
    // Por defecto ASP.NET responde en inglés ("One or more validation errors occurred.", "The X field is required.");
    // aquí se responde { message, errors } en español, en el formato que lee la web.
    // Los mensajes propios (ErrorMessage = "...") se respetan tal cual.
    public static partial class RespuestaValidacion
    {
        public static IActionResult Crear(ActionContext contexto)
        {
            var errores = contexto.ModelState
                .Where(e => e.Value is { Errors.Count: > 0 })
                .ToDictionary(
                    e => e.Key,
                    e => e.Value!.Errors.Select(error => Traducir(e.Key, error)).Distinct().ToArray());

            var primero = errores.Values.SelectMany(m => m).FirstOrDefault();
            var mensaje = errores.Values.Sum(m => m.Length) > 1 && primero is not null
                ? $"{primero} Revisa también los demás datos."
                : primero ?? "Revisa los datos ingresados.";

            return new BadRequestObjectResult(new { message = mensaje, errors = errores });
        }

        private static string Traducir(string clave, ModelError error)
        {
            var mensaje = error.ErrorMessage;
            var campo = NombreCampo(clave);

            // Cuerpo vacío o JSON mal formado / de tipo incorrecto (llega como excepción o con mensaje del lector JSON)
            if (string.IsNullOrWhiteSpace(mensaje) || mensaje.StartsWith("The JSON value", StringComparison.Ordinal)
                || mensaje.Contains("could not be converted", StringComparison.Ordinal) || error.Exception is not null)
                return campo is null ? "Los datos enviados no tienen el formato correcto." : $"El dato «{campo}» no tiene el formato correcto.";
            if (mensaje.StartsWith("A non-empty request body is required", StringComparison.Ordinal))
                return "Faltan los datos de la solicitud.";

            Match m;
            if ((m = Requerido().Match(mensaje)).Success)
                return $"Completa el dato «{NombreCampo(m.Groups[1].Value) ?? campo}».";
            if ((m = EntreLargos().Match(mensaje)).Success)
                return $"«{NombreCampo(m.Groups[1].Value) ?? campo}» debe tener entre {m.Groups[2].Value} y {m.Groups[3].Value} caracteres.";
            if ((m = LargoMinimo().Match(mensaje)).Success)
                return $"«{NombreCampo(m.Groups[1].Value) ?? campo}» debe tener al menos {m.Groups[2].Value} caracteres.";
            if ((m = LargoMaximo().Match(mensaje)).Success)
                return $"«{NombreCampo(m.Groups[1].Value) ?? campo}» admite como máximo {m.Groups[2].Value} caracteres.";
            if ((m = Rango().Match(mensaje)).Success)
                return $"«{NombreCampo(m.Groups[1].Value) ?? campo}» debe estar entre {m.Groups[2].Value} y {m.Groups[3].Value}.";
            if ((m = Patron().Match(mensaje)).Success)
                return $"«{NombreCampo(m.Groups[1].Value) ?? campo}» tiene caracteres no permitidos.";
            if ((m = NoValido().Match(mensaje)).Success)
                return $"El valor de «{NombreCampo(m.Groups[1].Value) ?? campo}» no es válido.";

            // Mensaje propio en español (ErrorMessage) u otro no reconocido: si parece inglés, uno genérico
            return PareceIngles().IsMatch(mensaje)
                ? (campo is null ? "Revisa los datos ingresados." : $"Revisa el dato «{campo}».")
                : mensaje;
        }

        // "$.apePaterno" / "dto.ApePaterno" / "Secciones[0]" -> "ape paterno" / "secciones"
        private static string? NombreCampo(string? clave)
        {
            if (string.IsNullOrWhiteSpace(clave)) return null;
            var ultimo = clave.Split('.', StringSplitOptions.RemoveEmptyEntries).LastOrDefault()?.TrimStart('$');
            if (string.IsNullOrWhiteSpace(ultimo)) return null;
            ultimo = Indice().Replace(ultimo, string.Empty);
            return Palabras().Replace(ultimo, " $1").Trim().ToLowerInvariant();
        }

        [GeneratedRegex(@"^The (\S+) field is required\.?$")] private static partial Regex Requerido();
        [GeneratedRegex(@"^The field (\S+) must be a string with a minimum length of (\d+) and a maximum length of (\d+)\.?$")] private static partial Regex EntreLargos();
        [GeneratedRegex(@"^The field (\S+) must be a (?:string or array type|string) with a minimum length of '?(\d+)'?\.?$")] private static partial Regex LargoMinimo();
        [GeneratedRegex(@"^The field (\S+) must be a (?:string or array type|string) with a maximum length of '?(\d+)'?\.?$")] private static partial Regex LargoMaximo();
        [GeneratedRegex(@"^The field (\S+) must be between (\S+) and (\S+)\.?$")] private static partial Regex Rango();
        [GeneratedRegex(@"^The field (\S+) must match the regular expression")] private static partial Regex Patron();
        [GeneratedRegex(@"^The value '.*' is not valid for (\S+)\.?$")] private static partial Regex NoValido();
        [GeneratedRegex(@"\b(The|field|must|is|valid|required|value|request)\b")] private static partial Regex PareceIngles();
        [GeneratedRegex(@"\[\d+\]")] private static partial Regex Indice();
        [GeneratedRegex(@"(?<=[a-záéíóúñ])([A-ZÁÉÍÓÚÑ])")] private static partial Regex Palabras();
    }
}
