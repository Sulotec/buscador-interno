using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace internal_search.Domain.DTOs.buscador.persona.masivos
{
    public class BuscadorHistorialEntrada : IValidatableObject
    {
        [Required(ErrorMessage = "El documento es obligatorio.")]
        public string Documento { get; set; }

        [Required(ErrorMessage = "El tipo de documento es obligatorio.")]
        public string TipoDocumento { get; set; }

        private static readonly Dictionary<string, (Regex Patron, string Formato)> Reglas = new()
        {
            ["DNI"] = (new(@"^[0-9]{8}\z", RegexOptions.Compiled), "8 dígitos"),
            ["CE"] = (new(@"^[0-9]{9}\z", RegexOptions.Compiled), "9 dígitos"),
            ["RUC"] = (new(@"^[0-9]{11}\z", RegexOptions.Compiled), "11 dígitos"),
            ["PASAPORTE"] = (new(@"^[A-Za-z0-9]{6,12}\z", RegexOptions.Compiled), "entre 6 y 12 caracteres alfanuméricos"),
        };

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var tipo = TipoDocumento?.Trim().ToUpperInvariant() ?? "";

            if (!Reglas.TryGetValue(tipo, out var regla))
            {
                yield return new ValidationResult(
                    $"Tipo de documento '{TipoDocumento}' no soportado.",
                    new[] { nameof(TipoDocumento) });
                yield break;
            }

            if (!regla.Patron.IsMatch(Documento ?? ""))
            {
                yield return new ValidationResult(
                    $"El {tipo} debe tener {regla.Formato}.",
                    new[] { nameof(Documento) });
            }
        }
    }
}