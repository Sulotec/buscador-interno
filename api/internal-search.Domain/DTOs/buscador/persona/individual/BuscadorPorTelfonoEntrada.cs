using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace internal_search.Domain.DTOs.buscador.persona.individual
{
    public class BuscadorPorTelfonoEntrada
    {

        [Required(ErrorMessage = "El teléfono es obligatorio.")]
        [RegularExpression(@"^9[0-9]{8}$", ErrorMessage = "El celular debe tener 9 dígitos y comenzar con 9.")]
        public string Telefono { get; set; } = string.Empty;
    }
}
