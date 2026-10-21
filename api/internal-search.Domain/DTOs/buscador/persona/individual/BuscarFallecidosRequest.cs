
using System.ComponentModel.DataAnnotations;

namespace internal_search.Domain.DTOs.buscador.persona.individual
{
    public class BuscarFallecidosRequestDto : IValidatableObject
    {
        [StringLength(8)]
        public string? Dni { get; set; }

        [StringLength(50)]
        public string? ApePat { get; set; }

        [StringLength(50)]
        public string? ApeMat { get; set; }

        [StringLength(100)]
        public string? Prenombres { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (!string.IsNullOrWhiteSpace(Dni) && (Dni.Trim().Length != 8 || !Dni.Trim().All(char.IsDigit)))
                yield return new ValidationResult("El DNI debe tener exactamente 8 dígitos.", new[] { nameof(Dni) });

            if (string.IsNullOrWhiteSpace(Dni)
                && (string.IsNullOrWhiteSpace(ApePat)
                    || (string.IsNullOrWhiteSpace(ApeMat) && string.IsNullOrWhiteSpace(Prenombres))))
                yield return new ValidationResult(
                    "Ingresa un DNI o el apellido paterno junto con el apellido materno o los prenombres.",
                    new[] { nameof(Dni), nameof(ApePat), nameof(ApeMat), nameof(Prenombres) });
        }
    }
}
