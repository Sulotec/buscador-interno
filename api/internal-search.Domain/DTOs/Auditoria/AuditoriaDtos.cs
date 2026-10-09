namespace internal_search.Domain.DTOs.Auditoria
{
    // Quién ejecuta una acción y desde dónde; lo arma el controlador a partir del token y la petición
    public record ContextoAccion(int CodUsuario, string Login, string? Ip, bool EsAdminGeneral);

    public class AuditoriaFiltroDto
    {
        public DateTime? Desde { get; set; }
        public DateTime? Hasta { get; set; }
        public string? Usuario { get; set; }
        public string? Accion { get; set; }
        public int Pagina { get; set; } = 1;
        public int Tamano { get; set; } = 50;
    }
}
