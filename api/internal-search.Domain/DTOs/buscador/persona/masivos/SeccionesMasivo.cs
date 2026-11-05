namespace internal_search.Domain.DTOs.buscador.persona.masivos;

public static class SeccionesMasivo
{
    // Solo personas (DNI): datos de identificación de Operador.Personas
    public const string Personas = "personas";
    public const string Moviles = "moviles";
    public const string Sueldos = "sueldos";
    public const string Calificacion = "calificacion";
    public const string Deuda = "deuda";
    public const string LineasCredito = "lineas-credito";
    public const string Fallecidos = "fallecidos";

    public static readonly HashSet<string> Todas = new()
    {
        Personas, Moviles, Sueldos, Calificacion, Deuda, LineasCredito, Fallecidos
    };
}
