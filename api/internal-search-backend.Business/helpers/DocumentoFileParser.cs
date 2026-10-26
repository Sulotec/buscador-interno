using System.Text.RegularExpressions;

namespace internal_search_backend.Business.helpers
{
    public static class DocumentoFileParser
    {
        private static readonly Regex DocumentoValido = new(
            @"^(?:[0-9]{8}|(?:10|15|16|17|20)[0-9]{9}|[0-9]{9}|[A-Z0-9]{6,12})$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private static readonly HashSet<string> Encabezados = new(StringComparer.OrdinalIgnoreCase)
        {
            "DNI", "RUC", "CE", "CARNET", "CARNET DE EXTRANJERIA", "PASAPORTE",
            "DOCUMENTO", "DOCUMENTOS", "NRO", "NUMERO", "TIPO", "PERSONA NATURAL"
        };

        public static (List<string> validos, List<string> invalidos) Parse(Stream stream)
        {
            var validos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var invalidos = new List<string>();

            using var reader = new StreamReader(stream);
            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                var value = line.Trim().Trim('\uFEFF').Split(',', ';', '\t', '/', '|')[0].Trim().Trim('"', '\'');
                if (string.IsNullOrWhiteSpace(value) || Encabezados.Contains(value)) continue;

                if (DocumentoValido.IsMatch(value))
                    validos.Add(value.ToUpperInvariant());
                else
                    invalidos.Add(value);
            }

            return (validos.ToList(), invalidos);
        }
    }
}
