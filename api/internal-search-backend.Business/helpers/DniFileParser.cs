using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.helpers
{
    public class DniFileParser
    {

        public static (List<string> validos, List<string> invalidos) Parse(Stream stream)
        {
            var validos = new HashSet<string>();
            var invalidos = new List<string>();

            using var reader = new StreamReader(stream);
            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                var value = line.Split(',', ';', '\t')[0].Trim().Trim('"');
                if (string.IsNullOrWhiteSpace(value)) continue;

                if (value.Length == 8 && value.All(char.IsDigit))
                    validos.Add(value);
                else if (!value.Equals("dni", StringComparison.OrdinalIgnoreCase)
                      && !value.Equals("documento", StringComparison.OrdinalIgnoreCase))
                    invalidos.Add(value);
            }

            return (validos.ToList(), invalidos);
        }
    }
}
