namespace internal_search.Domain.Entities
{
    // Registro de la lista negra (tabla RRCC.ListaNegra). Nunca se borra: al desbloquear pasa a Activo = false
    // con quién, cuándo y por qué. Un DNI puede tener varios registros, pero solo uno activo a la vez.
    public class ListaNegra
    {
        public int Id { get; set; }
        public string Documento { get; set; } = string.Empty;
        public string Motivo { get; set; } = string.Empty;
        public int? CodUsuario { get; set; }
        public string Usuario { get; set; } = string.Empty;
        public DateTime FechaUtc { get; set; }

        public bool Activo { get; set; } = true;
        public int? CodUsuarioQuito { get; set; }
        public string? UsuarioQuito { get; set; }
        public string? MotivoQuito { get; set; }
        public DateTime? FechaQuitoUtc { get; set; }
    }
}
