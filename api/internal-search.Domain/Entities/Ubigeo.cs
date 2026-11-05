namespace internal_search.Domain.Entities
{
    // Catálogo de ubigeos (RNC.Ubigeos). Se usa para mostrar la descripción del UBIGEO_RENIEC de Operador.Personas.
    public class Ubigeo
    {
        public int Id { get; set; }
        public string? Codigo { get; set; }
        public string? Descripcion { get; set; }
    }
}
