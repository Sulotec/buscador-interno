using System;
using System.Collections.Generic;

namespace internal_search.Domain.DTOs.buscador.empresa.masivo
{
    public static class SeccionesMasivoEmpresa
    {
        public const string Moviles = "moviles";
        public const string Sueldos = "sueldos";
        public const string Calificacion = "calificacion";
        public const string Deuda = "deuda";
        public const string LineasCredito = "lineas-credito"; // mismo nombre que manda la web y que usa personas

        public static readonly HashSet<string> Todas = new(StringComparer.OrdinalIgnoreCase)
        {
            Moviles,
            Sueldos,
            Calificacion,
            Deuda,
            LineasCredito
        };
    }
}