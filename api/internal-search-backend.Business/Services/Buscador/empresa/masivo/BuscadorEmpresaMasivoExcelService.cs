using ClosedXML.Excel;
using internal_search.Domain.DTOs.buscador.empresa.masivo;
using internal_search.Domain.Entities;

namespace internal_search_backend.Business.Services.Buscador.empresa.masivo
{
    public class BuscadorEmpresaMasivoExcelService : IBuscadorEmpresaMasivoExcelService
    {
        public byte[] GenerarExcel(BuscadorEmpresaMasivoResponseDto resultado, HashSet<string> secciones)
        {
            using var workbook = new XLWorkbook();
            var resumen = workbook.Worksheets.Add("Resumen");
            resumen.Cell(1, 1).Value = "RESUMEN DE BÚSQUEDA MASIVA DE EMPRESAS";
            resumen.Cell(1, 1).Style.Font.Bold = true;
            resumen.Cell(1, 1).Style.Font.FontSize = 16;
            resumen.Cell(3, 1).Value = "Sección";
            resumen.Cell(3, 2).Value = "Registros";

            var filaResumen = 4;
            void AgregarConteo(string clave, string titulo, int cantidad)
            {
                if (!secciones.Contains(clave)) return;
                resumen.Cell(filaResumen, 1).Value = titulo;
                resumen.Cell(filaResumen, 2).Value = cantidad;
                filaResumen++;
            }

            AgregarConteo(SeccionesMasivoEmpresa.Moviles, "Teléfonos", resultado.Moviles.Count);
            AgregarConteo(SeccionesMasivoEmpresa.Sueldos, "Información laboral", resultado.Sueldos.Count);
            AgregarConteo(SeccionesMasivoEmpresa.Calificacion, "Calificaciones", resultado.Calificaciones.Count);
            AgregarConteo(SeccionesMasivoEmpresa.Deuda, "Deudas", resultado.Deudas.Count);
            AgregarConteo(SeccionesMasivoEmpresa.LineasCredito, "Líneas de crédito", resultado.LineasCredito.Count);
            FormatearHoja(resumen, 2);

            if (secciones.Contains(SeccionesMasivoEmpresa.Moviles))
                CrearHoja(workbook, "Teléfonos", new[] { "Periodo", "Documento", "Apellido paterno", "Apellido materno", "Prenombres", "Teléfono", "Fecha de alta", "Plan móvil", "Modalidad", "Operadora" }, resultado.Moviles,
                    x => x.Periodo, x => x.Documento, x => x.ApePat, x => x.ApeMat, x => x.Prenombres, x => x.Telefono, x => x.FechaAlta, x => x.PlanMovil, x => x.Modalidad, x => x.EmpresaOperadora);

            if (secciones.Contains(SeccionesMasivoEmpresa.Sueldos))
                CrearHoja(workbook, "Información laboral", new[] { "Periodo", "Documento", "Nombre", "RUC", "Empresa", "Rango de sueldo", "Nivel de ingreso" }, resultado.Sueldos,
                    x => x.Periodo, x => x.Documento, x => x.ApeNom, x => x.Ruc, x => x.Empresa, x => x.RangoSueldo, x => x.NivelIngreso);

            if (secciones.Contains(SeccionesMasivoEmpresa.Calificacion))
                CrearHoja(workbook, "Calificaciones", new[] { "Periodo", "Código SBS", "Documento", "Normal", "CPP", "Deficiente", "Dudoso", "Pérdida", "Entidades", "Apellido paterno", "Apellido materno", "Primer nombre", "Segundo nombre" }, resultado.Calificaciones,
                    x => x.Periodo, x => x.CodigoSbs, x => x.Documento, x => x.Nor, x => x.Cpp, x => x.Def, x => x.Dud, x => x.Per, x => x.Reportan, x => x.ApePat, x => x.ApeMat, x => x.PriNombre, x => x.SegNombre);

            if (secciones.Contains(SeccionesMasivoEmpresa.Deuda))
                CrearHoja(workbook, "Deudas", new[] { "Periodo", "Código SBS", "Documento", "Razón social", "Entidad", "Tipo de deuda", "Días", "Calificación", "Saldo" }, resultado.Deudas,
                    x => x.Periodo, x => x.CodigoSbs, x => x.Documento, x => x.RazonSocial, x => x.Entidad, x => x.TipoDeuda, x => x.Dias, x => x.Calificacion, x => x.Saldo);

            if (secciones.Contains(SeccionesMasivoEmpresa.LineasCredito))
                CrearHoja(workbook, "Lineas de crédito", new[] { "Periodo", "Código SBS", "Documento", "Razón social", "Entidad", "Tipo", "Línea de crédito", "No utilizada", "Utilizada" }, resultado.LineasCredito,
                    x => x.Periodo, x => x.CodigoSbs, x => x.Documento, x => x.RazonSocial, x => x.Entidad, x => x.Tipo, x => x.LineaCreditoMonto, x => x.LineaNoUtilizada, x => x.LineaUtilizada);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        private static void CrearHoja<T>(XLWorkbook workbook, string nombre, string[] encabezados, IReadOnlyList<T> datos, params Func<T, object?>[] obtenerValores)
        {
            var hoja = workbook.Worksheets.Add(nombre);
            for (var columna = 0; columna < encabezados.Length; columna++)
                hoja.Cell(1, columna + 1).Value = encabezados[columna];

            for (var indice = 0; indice < datos.Count; indice++)
            {
                for (var columna = 0; columna < obtenerValores.Length; columna++)
                    AsignarValor(hoja.Cell(indice + 2, columna + 1), obtenerValores[columna](datos[indice]));
            }

            FormatearHoja(hoja, encabezados.Length);
        }

        private static void AsignarValor(IXLCell celda, object? valor)
        {
            switch (valor)
            {
                case null: celda.Value = string.Empty; break;
                case string texto: celda.Value = texto; break;
                case DateTime fecha: celda.Value = fecha; break;
                case decimal numeroDecimal: celda.Value = numeroDecimal; break;
                case double numeroDouble: celda.Value = numeroDouble; break;
                case int numeroEntero: celda.Value = numeroEntero; break;
                case long numeroLargo: celda.Value = numeroLargo; break;
                case bool booleano: celda.Value = booleano; break;
                default: celda.Value = valor.ToString(); break;
            }
        }

        private static void FormatearHoja(IXLWorksheet hoja, int columnas)
        {
            var encabezado = hoja.Range(1, 1, 1, columnas);
            encabezado.Style.Font.Bold = true;
            encabezado.Style.Font.FontColor = XLColor.White;
            encabezado.Style.Fill.BackgroundColor = XLColor.FromHtml("#1B4589");
            encabezado.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            encabezado.Style.Alignment.WrapText = true;
            hoja.SheetView.FreezeRows(1);
            hoja.RangeUsed()?.SetAutoFilter();
            hoja.Columns(1, columnas).AdjustToContents(1, 50);
            foreach (var columna in hoja.Columns(1, columnas))
                if (columna.Width > 45) columna.Width = 45;
        }
    }
}
