using System.ComponentModel.DataAnnotations;

namespace internal_search.Domain.DTOs.Tokens
{
    public class AsignarTokensDto
    {
        [Required]
        public int CodUsuario { get; set; }

        // Positivo asigna; negativo retira (no puede dejar el saldo bajo cero)
        [Range(-1_000_000, 1_000_000)]
        public int Cantidad { get; set; }

        [Required, MaxLength(250)]
        public string Motivo { get; set; } = string.Empty;
    }

    public class SaldoTokensDto
    {
        public int CodUsuario { get; set; }
        public bool Ilimitado { get; set; }
        public int Saldo { get; set; }
    }
}
