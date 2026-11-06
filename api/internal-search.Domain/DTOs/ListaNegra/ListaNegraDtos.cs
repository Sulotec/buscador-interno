using System.ComponentModel.DataAnnotations;

namespace internal_search.Domain.DTOs.ListaNegra
{
    public class AgregarListaNegraDto
    {
        // Uno o varios DNI (8 dígitos). Los no válidos se informan y no se agregan.
        [Required, MinLength(1), MaxLength(1000)]
        public List<string> Documentos { get; set; } = new();

        [Required, StringLength(250, MinimumLength = 3)]
        public string Motivo { get; set; } = string.Empty;
    }

    public class ResultadoAgregarListaNegraDto
    {
        public List<string> Agregados { get; set; } = new();
        public List<string> YaBloqueados { get; set; } = new();
        public List<string> Invalidos { get; set; } = new();
    }

    public class QuitarListaNegraDto
    {
        // Por qué se desbloquea: queda en el historial y en la auditoría
        [Required, StringLength(250, MinimumLength = 3)]
        public string Motivo { get; set; } = string.Empty;
    }

    public class ListaNegraFiltroDto
    {
        public string? Texto { get; set; }
        // "bloqueados" (solo vigentes, por defecto) o "historial" (todos los registros, vigentes y desbloqueados)
        public string? Vista { get; set; }
        public int Pagina { get; set; } = 1;
        public int Tamano { get; set; } = 25;
    }
}
