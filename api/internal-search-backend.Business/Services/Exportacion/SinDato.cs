using ClosedXML.Excel;

namespace internal_search_backend.Business.Services.Exportacion
{
    // Texto único para "no hay dato" en todo lo que se exporta (PDF y Excel). En la web es SIN_DATO (lib/formato.ts).
    public static class SinDato
    {
        public const string Texto = "-";

        // Un valor vacío, solo espacios o el texto "null" que llega de algunas fuentes cuenta como sin dato.
        public static bool EsVacio(string? valor) =>
            string.IsNullOrWhiteSpace(valor) || valor.Trim().Equals("null", StringComparison.OrdinalIgnoreCase);

        public static string Mostrar(string? valor) => EsVacio(valor) ? Texto : valor!.Trim();

        // Pone "-" en las celdas vacías de los datos (debajo del encabezado) de una hoja.
        public static void RellenarHoja(IXLWorksheet hoja, int columnas)
        {
            var ultimaFila = hoja.LastRowUsed()?.RowNumber() ?? 1;
            for (var fila = 2; fila <= ultimaFila; fila++)
            {
                for (var columna = 1; columna <= columnas; columna++)
                {
                    var celda = hoja.Cell(fila, columna);
                    if (celda.IsEmpty() || (celda.DataType == XLDataType.Text && EsVacio(celda.GetString())))
                        celda.Value = Texto;
                }
            }
        }
    }
}
