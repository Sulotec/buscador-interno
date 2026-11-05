namespace internal_search.Domain.Entities
{
    public class ConsultaReniec
    {
        public string Dni { get; set; } = string.Empty;
        public string? PreNombres { get; set; }
        public string? ApePaterno { get; set; }
        public string? ApeMaterno { get; set; }
        public string? FechaNacimiento { get; set; }
        public string? Sexo { get; set; }
        public string? EstadoCivil { get; set; }
        public string? GradoInstruccion { get; set; }
        public string? Restriccion { get; set; }
        public string? Direccion { get; set; }
        public string? Distrito { get; set; }
        public string? Provincia { get; set; }
        public string? Departamento { get; set; }
        public string? NombrePadre { get; set; }
        public string? NombreMadre { get; set; }
        public string? FechaEmision { get; set; }
        public string? FechaCaducidad { get; set; }
        public string? FechaFallecimiento { get; set; }
        public byte[]? Foto { get; set; }
        public DateTime FechaConsultaUtc { get; set; }
    }
}
