using ClosedXML.Excel;
using internal_search.Domain.DTOs.buscador.persona.masivos;
using internal_search.Domain.Entities;

namespace internal_search_backend.Business.Services.Buscador.personas.masivos
{
    public class BuscadorMasivoExcelService : IBuscadorMasivoExcelService
    {
        public byte[] GenerarExcel(BuscadorMasivoResponse resultado, HashSet<string> secciones)
        {
            using var workbook = new XLWorkbook();

            CrearResumen(workbook, resultado, secciones);

            if (secciones.Contains(SeccionesMasivo.Moviles))
                CrearMoviles(workbook, resultado.Moviles);

            if (secciones.Contains(SeccionesMasivo.Sueldos))
                CrearSueldos(workbook, resultado.Sueldos);

            if (secciones.Contains(SeccionesMasivo.Calificacion))
                CrearCalificaciones(workbook, resultado.Calificaciones);

            if (secciones.Contains(SeccionesMasivo.Deuda))
                CrearDeudas(workbook, resultado.Deudas);

            if (secciones.Contains(SeccionesMasivo.LineasCredito))
                CrearLineasCredito(workbook, resultado.LineasCredito);

            if (secciones.Contains(SeccionesMasivo.Fallecidos))
                CrearFallecidos(workbook, resultado.Fallecidos);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        private void CrearResumen(
            XLWorkbook workbook,
            BuscadorMasivoResponse resultado,
            HashSet<string> secciones)
        {
            var hoja = workbook.Worksheets.Add("Resumen");

            hoja.Cell(1, 1).Value = "RESUMEN DE BÚSQUEDA MASIVA";
            hoja.Cell(1, 1).Style.Font.Bold = true;
            hoja.Cell(1, 1).Style.Font.FontSize = 16;

            hoja.Cell(3, 1).Value = "Total solicitados";
            hoja.Cell(3, 2).Value = resultado.TotalSolicitados;

            hoja.Cell(4, 1).Value = "DNIs inválidos";
            hoja.Cell(4, 2).Value = resultado.DnisInvalidos.Count;

            hoja.Cell(5, 1).Value = "DNIs sin resultados (en las secciones elegidas)";
            hoja.Cell(5, 2).Value = resultado.DnisSinResultados.Count;

            // Solo se listan las secciones que el usuario eligió
            var fila = 6;

            void AgregarConteo(string clave, string etiqueta, int cantidad)
            {
                if (!secciones.Contains(clave)) return;
                hoja.Cell(fila, 1).Value = etiqueta;
                hoja.Cell(fila, 2).Value = cantidad;
                fila++;
            }

            AgregarConteo(SeccionesMasivo.Moviles, "Registros móviles", resultado.Moviles.Count);
            AgregarConteo(SeccionesMasivo.Sueldos, "Registros de sueldos", resultado.Sueldos.Count);
            AgregarConteo(SeccionesMasivo.Calificacion, "Registros de calificaciones", resultado.Calificaciones.Count);
            AgregarConteo(SeccionesMasivo.Deuda, "Registros de deudas", resultado.Deudas.Count);
            AgregarConteo(SeccionesMasivo.LineasCredito, "Registros de líneas de crédito", resultado.LineasCredito.Count);
            AgregarConteo(SeccionesMasivo.Fallecidos, "Documentos con fallecimiento registrado", resultado.Fallecidos.Count);

            hoja.Columns().AdjustToContents();
        }
        private void CrearMoviles(
            XLWorkbook workbook,
            List<Movil> datos)
        {
            var hoja = workbook.Worksheets.Add("Moviles");

            var headers = new[]
            {
                "Periodo",
                "Documento",
                "Apellido Paterno",
                "Apellido Materno",
                "Prenombres",
                "Teléfono",
                "Fecha Alta",
                "Plan Móvil",
                "Modalidad",
                "Empresa Operadora",
                //"Fecha Carga"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                hoja.Cell(1, i + 1).Value = headers[i];
            }

            for (int i = 0; i < datos.Count; i++)
            {
                var fila = i + 2;
                var movil = datos[i];

                hoja.Cell(fila, 1).Value = movil.Periodo;
                hoja.Cell(fila, 2).Value = movil.Documento;
                hoja.Cell(fila, 3).Value = movil.ApePat;
                hoja.Cell(fila, 4).Value = movil.ApeMat;
                hoja.Cell(fila, 5).Value = movil.Prenombres;
                hoja.Cell(fila, 6).Value = movil.Telefono;
                hoja.Cell(fila, 7).Value = movil.FechaAlta;
                hoja.Cell(fila, 8).Value = movil.PlanMovil;
                hoja.Cell(fila, 9).Value = movil.Modalidad;
                hoja.Cell(fila, 10).Value = movil.EmpresaOperadora;
                //hoja.Cell(fila, 11).Value = movil.FechaCarga;
            }

            FormatearHoja(hoja, headers.Length);
        }

        private void CrearSueldos(
            XLWorkbook workbook,
            List<Sueldo> datos)
        {
            var hoja = workbook.Worksheets.Add("Sueldos");

            var headers = new[]
            {
                //"ID",
                "Periodo",
                //"Tipo Documento",
                "Documento",
                "Apellido Nombre",
                "RUC",
                "Empresa",
                //"Género",
                //"Sueldo",
                //"Gratificación / Bono",
                //"Ingreso Estimado Anual",
                //"Código Rango Sueldo",
                "Rango Sueldo",
                //"Segmento Sueldo",
                "Nivel Ingreso",
                //"Fecha Carga"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                hoja.Cell(1, i + 1).Value = headers[i];
            }

            for (int i = 0; i < datos.Count; i++)
            {
                var fila = i + 2;
                var sueldo = datos[i];

                //hoja.Cell(fila, 1).Value = sueldo.Id;
                hoja.Cell(fila, 1).Value = sueldo.Periodo;
                //hoja.Cell(fila, 3).Value = sueldo.TipoDoc;
                hoja.Cell(fila, 2).Value = sueldo.Documento;
                hoja.Cell(fila, 3).Value = sueldo.ApeNom;
                hoja.Cell(fila, 4).Value = sueldo.Ruc;
                hoja.Cell(fila, 5).Value = sueldo.Empresa;
                //hoja.Cell(fila, 8).Value = sueldo.Genero;
                //hoja.Cell(fila, 9).Value = sueldo.MontoSueldo;
                //hoja.Cell(fila, 10).Value = sueldo.GratifBono;
                //hoja.Cell(fila, 11).Value = sueldo.IngresoEstimadoAnual;
                //hoja.Cell(fila, 12).Value = sueldo.CodRangoSueldo;
                hoja.Cell(fila, 6).Value = sueldo.RangoSueldo;
                //hoja.Cell(fila, 14).Value = sueldo.SegmentoSueldo;
                hoja.Cell(fila, 7).Value = sueldo.NivelIngreso;
                //hoja.Cell(fila, 16).Value = sueldo.FechaCarga;
            }

            FormatearHoja(hoja, headers.Length);
        }

        private void CrearCalificaciones(
            XLWorkbook workbook,
            List<Calificacion> datos)
        {
            var hoja = workbook.Worksheets.Add("Calificaciones");

            var headers = new[]
            {
                "Periodo",
                "Código SBS",
                "Documento",
                "NOR",
                "CPP",
                "DEF",
                "DUD",
                "PER",
                "Reportan",
                "Apellido Paterno",
                "Apellido Materno",
                "Primer Nombre",
                "Segundo Nombre",
                //"Fecha Carga"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                hoja.Cell(1, i + 1).Value = headers[i];
            }

            for (int i = 0; i < datos.Count; i++)
            {
                var fila = i + 2;
                var calificacion = datos[i];

                hoja.Cell(fila, 1).Value = calificacion.Periodo;
                hoja.Cell(fila, 2).Value = calificacion.CodigoSbs;
                hoja.Cell(fila, 3).Value = calificacion.Documento;
                hoja.Cell(fila, 4).Value = calificacion.Nor;
                hoja.Cell(fila, 5).Value = calificacion.Cpp;
                hoja.Cell(fila, 6).Value = calificacion.Def;
                hoja.Cell(fila, 7).Value = calificacion.Dud;
                hoja.Cell(fila, 8).Value = calificacion.Per;
                hoja.Cell(fila, 9).Value = calificacion.Reportan;
                hoja.Cell(fila, 10).Value = calificacion.ApePat;
                hoja.Cell(fila, 11).Value = calificacion.ApeMat;
                hoja.Cell(fila, 12).Value = calificacion.PriNombre;
                hoja.Cell(fila, 13).Value = calificacion.SegNombre;
                //hoja.Cell(fila, 14).Value = calificacion.FechaCarga;
            }

            FormatearHoja(hoja, headers.Length);
        }

        private void CrearDeudas(
            XLWorkbook workbook,
            List<Deuda> datos)
        {
            var hoja = workbook.Worksheets.Add("Deudas");

            var headers = new[]
            {
                "Periodo",
                "Código SBS",
                "Documento",
                "Razón Social",
                //"Código Empresa",
                "Entidad",
                "Tipo Deuda",
                "Días",
                "Calificación",
                "Saldo",
                //"Fecha Carga"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                hoja.Cell(1, i + 1).Value = headers[i];
            }

            for (int i = 0; i < datos.Count; i++)
            {
                var fila = i + 2;
                var deuda = datos[i];

                hoja.Cell(fila, 1).Value = deuda.Periodo;
                hoja.Cell(fila, 2).Value = deuda.CodigoSbs;
                hoja.Cell(fila, 3).Value = deuda.Documento;
                hoja.Cell(fila, 4).Value = deuda.RazonSocial;
                //hoja.Cell(fila, 5).Value = deuda.CodigoEmpresa;
                hoja.Cell(fila, 5).Value = deuda.Entidad;
                hoja.Cell(fila, 6).Value = deuda.TipoDeuda;
                hoja.Cell(fila, 7).Value = deuda.Dias;
                hoja.Cell(fila, 8).Value = deuda.Calificacion;
                hoja.Cell(fila, 9).Value = deuda.Saldo;
                //hoja.Cell(fila, 11).Value = deuda.FechaCarga;
            }

            FormatearHoja(hoja, headers.Length);
        }

        private void CrearLineasCredito(
            XLWorkbook workbook,
            List<LineaCredito> datos)
        {
            var hoja = workbook.Worksheets.Add("LineasCredito");

            var headers = new[]
            {
                "Periodo",
                "Código SBS",
                "Documento",
                "Razón Social",
                //"Código Empresa",
                "Entidad",
                "Tipo",
                "Línea de Crédito",
                "Línea No Utilizada",
                "Línea Utilizada",
                //"Fecha Carga"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                hoja.Cell(1, i + 1).Value = headers[i];
            }

            for (int i = 0; i < datos.Count; i++)
            {
                var fila = i + 2;
                var linea = datos[i];

                hoja.Cell(fila, 1).Value = linea.Periodo;
                hoja.Cell(fila, 2).Value = linea.CodigoSbs;
                hoja.Cell(fila, 3).Value = linea.Documento;
                hoja.Cell(fila, 4).Value = linea.RazonSocial;
                //hoja.Cell(fila, 5).Value = linea.CodigoEmpresa;
                hoja.Cell(fila, 5).Value = linea.Entidad;
                hoja.Cell(fila, 6).Value = linea.Tipo;
                hoja.Cell(fila, 7).Value = linea.LineaCreditoMonto;
                hoja.Cell(fila, 8).Value = linea.LineaNoUtilizada;
                hoja.Cell(fila, 9).Value = linea.LineaUtilizada;
                //hoja.Cell(fila, 11).Value = linea.FechaCarga;
            }

            FormatearHoja(hoja, headers.Length);
        }

        private void CrearFallecidos(
            XLWorkbook workbook,
            List<Fallecidos> datos)
        {
            var hoja = workbook.Worksheets.Add("Fallecidos");

            var headers = new[]
            {
                "DNI",
                "Apellido Paterno",
                "Apellido Materno",
                "Prenombres",
                "Restricción",
                "Fecha Nacimiento",
                "Fecha Fallecimiento",
            };

            for (int i = 0; i < headers.Length; i++)
            {
                hoja.Cell(1, i + 1).Value = headers[i];
            }

            for (int i = 0; i < datos.Count; i++)
            {
                var fila = i + 2;
                var f = datos[i];

                hoja.Cell(fila, 1).Value = f.Dni;
                hoja.Cell(fila, 2).Value = f.ApePat;
                hoja.Cell(fila, 3).Value = f.ApeMat;
                hoja.Cell(fila, 4).Value = f.Prenombres;
                hoja.Cell(fila, 5).Value = f.DeRestriccion;
                hoja.Cell(fila, 6).Value = f.FechaNacimiento;
                hoja.Cell(fila, 7).Value = f.FechaFallecimiento;
            }

            hoja.Column(6).Style.DateFormat.Format = "dd/MM/yyyy";
            hoja.Column(7).Style.DateFormat.Format = "dd/MM/yyyy";

            FormatearHoja(hoja, headers.Length);
        }

        private void FormatearHoja(
            IXLWorksheet hoja,
            int cantidadColumnas)
        {
            var encabezado = hoja.Range(
                1,
                1,
                1,
                cantidadColumnas);

            encabezado.Style.Font.Bold = true;

            hoja.SheetView.FreezeRows(1);

            hoja.Columns().AdjustToContents();
        }
    }
}