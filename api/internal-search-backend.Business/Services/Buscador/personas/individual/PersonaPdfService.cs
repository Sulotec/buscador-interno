using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using internal_search.Domain.DTOs.buscador.persona.masivos;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace internal_search_backend.Business.Services.Buscador.personas.individual
{
    public class PersonaPdfService : IPersonaPdfService
    {
        private static readonly CultureInfo Cultura = CultureInfo.GetCultureInfo("es-PE");
        
        // Colores de la marca Informa Perú
        private const string ColorPrimario = "#174EA6";
        private const string ColorTexto = "#202B3C";
        private const string ColorGrisSuave = "#F4F7FB";
        private const string ColorBorde = "#D7E0EE";

        static PersonaPdfService()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public byte[] Generar(BuscadorHistorialResponse resultado)
        {
            resultado ??= new BuscadorHistorialResponse();
            resultado.Deudas ??= new();
            resultado.LineasCredito ??= new();
            resultado.Calificaciones ??= new();
            resultado.Sueldos ??= new();
            resultado.Moviles ??= new();

            return Document.Create(document =>
            {
                document.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.MarginHorizontal(28);
                    page.MarginVertical(24);
                    page.DefaultTextStyle(style => style.FontFamily("Lato").FontSize(8).FontColor(ColorTexto));

                    // Header con Logo
                    page.Header().Element(contenedor => AgregarCabecera(contenedor, resultado));

                    // Contenido Principal
                    page.Content().PaddingTop(12).Column(column =>
                    {
                        AgregarAvisoDni(column, resultado);
                        AgregarPanelCalificaciones(column, resultado);
                        AgregarTablaCalificaciones(column, resultado);
                        AgregarDeudasVista(column, resultado);
                        AgregarLineasCreditoVista(column, resultado);
                        AgregarPeriodoReporte(column, resultado);
                        AgregarSueldos(column, resultado);
                        AgregarMoviles(column, resultado);
                    });

                    // Footer
                    page.Footer().PaddingTop(10).Row(row =>
                    {
                        row.RelativeItem().Text("Informa Perú · Ficha de consulta")
                            .FontSize(7.5f).FontColor("#64748B");

                        row.RelativeItem().AlignRight().Text(text =>
                        {
                            text.Span("Generado el ").FontColor("#64748B");
                            text.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm", Cultura)).FontColor("#64748B");
                            text.Span("   ·   Página ").FontColor("#64748B");
                            text.CurrentPageNumber().FontColor("#64748B");
                        });
                    });
                });
            }).GeneratePdf();
        }

        private static void AgregarCabecera(IContainer contenedor, BuscadorHistorialResponse resultado)
        {
            var tipo = string.IsNullOrWhiteSpace(resultado.TipoDocumento) ? "DOCUMENTO" : resultado.TipoDocumento.Trim().ToUpperInvariant();
            var logoPath = Path.Combine(AppContext.BaseDirectory, "assets", "logo-informaPeru.png");
            var fechaConsulta = DateTime.Now.ToString("dd/MM/yyyy, hh:mm tt", Cultura).ToLowerInvariant();

            contenedor.Column(header =>
            {
                header.Item().PaddingBottom(8).BorderBottom(1).BorderColor(ColorBorde).Row(row =>
                {
                    row.ConstantItem(118).AlignLeft().AlignMiddle().Element(logo =>
                    {
                        if (File.Exists(logoPath))
                            logo.Image(logoPath).FitArea();
                        else
                            logo.Text("Informa Perú").FontSize(13).Bold().FontColor(ColorPrimario);
                    });
                    row.RelativeItem().AlignCenter().AlignMiddle().Text("Reporte de información crediticia")
                        .FontSize(17).Bold().FontColor("#111827");
                    row.ConstantItem(118);
                });

                header.Item().PaddingTop(5).Row(row =>
                {
                    TarjetaDato(row.RelativeItem(), "DOCUMENTO", $"{tipo} {Mostrar(resultado.Documento)}");
                    row.ConstantItem(6);
                    TarjetaDato(row.RelativeItem(2.2f), "NOMBRE", Mostrar(resultado.NombreCompleto));
                    row.ConstantItem(6);
                    TarjetaDato(row.RelativeItem(1.6f), "CONSULTA", fechaConsulta);
                });
            });
        }

        private static void TarjetaDato(IContainer contenedor, string titulo, string valor)
        {
            contenedor.Background("#F6F8FB").Border(1).BorderColor(ColorBorde).CornerRadius(5).Padding(7).Column(card =>
            {
                card.Item().Text(titulo).FontSize(6.5f).Bold().FontColor("#60748F");
                card.Item().PaddingTop(2).Text(valor).FontSize(8).Bold().FontColor(ColorTexto).ClampLines(1);
            });
        }
        private static void AgregarAvisoDni(ColumnDescriptor column, BuscadorHistorialResponse resultado)
        {
            if (!string.Equals(resultado.TipoDocumento, "DNI", StringComparison.OrdinalIgnoreCase)
                || resultado.EsDniValido)
                return;

            // column.Item().PaddingBottom(8).Background("#FFF4DF").Border(1).BorderColor("#F5D08A")
            //     // .Padding(8).Text("El DNI no figura como válido en las fuentes consultadas.")
            //     .FontSize(7.5f).FontColor("#8A5200");
        }
        private static void AgregarResumen(ColumnDescriptor column, BuscadorHistorialResponse resultado)
        {
            var ultimoPeriodo = resultado.Deudas.Select(deuda => deuda.Periodo ?? string.Empty)
                .OrderByDescending(periodo => periodo).FirstOrDefault() ?? string.Empty;
            var deudasRecientes = resultado.Deudas.Where(deuda => (deuda.Periodo ?? string.Empty) == ultimoPeriodo).ToList();
            var deudaTotal = deudasRecientes.Sum(deuda => deuda.Saldo ?? 0m);
            var entidades = deudasRecientes.Select(deuda => deuda.Entidad)
                .Where(entidad => !string.IsNullOrWhiteSpace(entidad))
                .Distinct(StringComparer.OrdinalIgnoreCase).Count();
            var peorCalificacion = ObtenerPeorCalificacion(resultado.Deudas);

            column.Item().PaddingTop(3).PaddingBottom(2).Row(row =>
            {
                TarjetaResumen(row.RelativeItem(), "Deuda total", ultimoPeriodo.Length == 6 ? FormatearPeriodo(ultimoPeriodo) : "Sin deudas reportadas",
                    ultimoPeriodo.Length == 6 ? FormatearMoneda(deudaTotal) : "—", "#534AB7", "#EEEDFE");
                row.ConstantItem(7);
                TarjetaResumen(row.RelativeItem(), "Entidades", "En el último periodo", entidades.ToString(Cultura), "#0F6E56", "#E1F5EE");
                row.ConstantItem(7);
                TarjetaResumen(row.RelativeItem(), "Peor calificación", "En el historial", peorCalificacion, "#A32D2D", "#FCEBEB");
                row.ConstantItem(7);
                TarjetaResumen(row.RelativeItem(), "Sueldo reportado", "Último registro", "—", "#854F0B", "#FAEEDA");
            });
        }

        private static void TarjetaResumen(IContainer contenedor, string titulo, string nota, string valor, string color, string fondo)
        {
            contenedor.Background(fondo).Border(1).BorderColor(color).Padding(8).Column(card =>
            {
                card.Item().Text(titulo).FontSize(7).Bold().FontColor(color);
                card.Item().PaddingTop(5).Text(valor).FontSize(12).Bold().FontColor(ColorTexto).ClampLines(1);
                card.Item().PaddingTop(2).Text(nota).FontSize(6.5f).FontColor("#64748B").ClampLines(1);
            });
        }
        private static void AgregarPanelCalificaciones(ColumnDescriptor column, BuscadorHistorialResponse resultado)
        {
            var datos = resultado.Calificaciones.OrderByDescending(item => item.Periodo).FirstOrDefault();
            column.Item().PaddingTop(10).Border(1).BorderColor(ColorBorde).CornerRadius(5).Column(card =>
            {
                card.Item().Background("#F6F8FB").BorderBottom(1).BorderColor(ColorBorde)
                    .PaddingHorizontal(10).PaddingVertical(7).Text("Calificación crediticia")
                    .FontSize(9).Bold().FontColor("#60748F");
                card.Item().Row(barra =>
                {
                    var valores = datos is null ? Array.Empty<decimal?>()
                        : new[] { datos.Nor, datos.Cpp, datos.Def, datos.Dud, datos.Per };
                    var colores = new[] { "#00A878", "#F3B323", "#F28C28", "#E64545", "#E3222B" };
                    var pesoTotal = valores.Sum(valor => Math.Max(0m, valor ?? 0m));
                    if (pesoTotal == 0)
                        barra.RelativeItem().Height(5).Background("#D7E0EE");
                    else
                        for (var i = 0; i < valores.Length; i++)
                            if ((valores[i] ?? 0m) > 0)
                                barra.RelativeItem((float)(valores[i]!.Value / pesoTotal)).Height(5).Background(colores[i]);
                });
                card.Item().Row(row =>
                {
                    CeldaCalificacion(row, "Normal", datos?.Nor, "#00A878");
                    SeparadorCalificacion(row);
                    CeldaCalificacion(row, "Prob. Potenciales", datos?.Cpp, "#F3B323");
                    SeparadorCalificacion(row);
                    CeldaCalificacion(row, "Deficiente", datos?.Def, "#F28C28");
                    SeparadorCalificacion(row);
                    CeldaCalificacion(row, "Dudoso", datos?.Dud, "#E64545");
                    SeparadorCalificacion(row);
                    CeldaCalificacion(row, "Pérdida", datos?.Per, "#E3222B");
                    SeparadorCalificacion(row);
                    CeldaCalificacion(row, "Reportan", null, ColorPrimario, datos?.Reportan);
                });
            });
        }

        private static void CeldaCalificacion(RowDescriptor row, string titulo, decimal? valor, string color, string? texto = null)
        {
            row.RelativeItem().PaddingHorizontal(8).PaddingVertical(7).Column(cell =>
            {
                cell.Item().Text(titulo).FontSize(7).FontColor("#60748F");
                cell.Item().PaddingTop(4).Text(texto ?? FormatearPorcentaje(valor)).FontSize(11).Bold().FontColor(color);
            });
        }

        private static void SeparadorCalificacion(RowDescriptor row) =>
            row.ConstantItem(0.7f).Height(35).Background(ColorBorde);

        private static void AgregarTablaCalificaciones(ColumnDescriptor column, BuscadorHistorialResponse resultado)
        {
            var calificaciones = resultado.Calificaciones;
            column.Item().PaddingTop(8).Border(1).BorderColor(ColorBorde).CornerRadius(5).Column(card =>
            {
                EncabezadoTarjeta(card, "Detalle de calificaciones", calificaciones.Count);
                if (calificaciones.Count == 0)
                {
                    MensajeVacio(card, "No se encontraron calificaciones.");
                    return;
                }

                card.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(1.2f);
                        columns.RelativeColumn(1);
                        columns.RelativeColumn(1.2f);
                        columns.RelativeColumn(1.1f);
                        columns.RelativeColumn(1);
                        columns.RelativeColumn(0.9f);
                        columns.RelativeColumn(1.1f);
                    });
                    table.Header(header =>
                    {
                        foreach (var titulo in new[] { "PERIODO", "NORMAL", "PROB. POTENCIALES", "DEFICIENTE", "DUDOSO", "PÉRDIDA", "REPORTAN" })
                            header.Cell().Background(ColorGrisSuave).BorderBottom(1).BorderColor(ColorBorde)
                                .PaddingHorizontal(4).PaddingVertical(6).Text(titulo).FontSize(6.2f).Bold().FontColor("#536176");
                    });

                    for (var indice = 0; indice < calificaciones.Count; indice++)
                    {
                        var item = calificaciones[indice];
                        table.Cell().Element(cell => CeldaRegistro(cell, indice)).Text(FormatearPeriodo(item.Periodo));
                        CeldaPorcentaje(table, item.Nor, "#00875A", "#E5F5EF", indice);
                        CeldaPorcentaje(table, item.Cpp, "#9A6700", "#FFF4D6", indice);
                        CeldaPorcentaje(table, item.Def, "#B54708", "#FFF0E5", indice);
                        CeldaPorcentaje(table, item.Dud, "#C43232", "#FDECEC", indice);
                        CeldaPorcentaje(table, item.Per, "#C52222", "#FCE5E5", indice);
                        table.Cell().Element(cell => CeldaRegistro(cell, indice)).AlignRight().Text(Mostrar(item.Reportan));
                    }
                });
            });
        }

        private static void CeldaPorcentaje(TableDescriptor table, decimal? valor, string color, string fondo, int indice)
        {
            table.Cell().Element(cell => CeldaRegistro(cell, indice)).AlignCenter().Element(pill =>
                pill.Background(valor.GetValueOrDefault() > 0 ? fondo : "#F1F3F6").CornerRadius(4)
                    .PaddingHorizontal(4).PaddingVertical(2)
                    .Text(FormatearPorcentaje(valor)).FontSize(7).Bold().FontColor(valor.GetValueOrDefault() > 0 ? color : "#68778D"));
        }

        private static IContainer CeldaRegistro(IContainer cell, int indice) =>
            cell.Background(indice % 2 == 0 ? Colors.White : "#FAFBFD")
                .BorderBottom(0.5f).BorderColor("#E6EBF2").PaddingHorizontal(5).PaddingVertical(6);

        private static void EtiquetaCalificacion(IContainer cell, string? calificacion)
        {
            var (texto, color, fondo) = EstiloCalificacion(calificacion);
            cell.AlignLeft().Element(pill => pill.Background(fondo).CornerRadius(4).PaddingHorizontal(5).PaddingVertical(2)
                .Text(texto).FontSize(7).Bold().FontColor(color));
        }

        private static (string Texto, string Color, string Fondo) EstiloCalificacion(string? valor)
        {
            var texto = Mostrar(valor).ToUpperInvariant();
            if (texto.Contains("NOR") || texto == "0") return (texto, "#00875A", "#E5F5EF");
            if (texto.Contains("CPP") || texto == "1") return (texto, "#9A6700", "#FFF4D6");
            if (texto.Contains("DEF") || texto == "2") return (texto, "#B54708", "#FFF0E5");
            if (texto.Contains("DUD") || texto == "3") return (texto, "#C43232", "#FDECEC");
            if (texto.Contains("PER") || texto == "4") return (texto, "#C52222", "#FCE5E5");
            return (texto, "#68778D", "#F1F3F6");
        }

        private static void AgregarDeudasVista(ColumnDescriptor column, BuscadorHistorialResponse resultado)
        {
            var deudas = resultado.Deudas;
            var totalSaldo = deudas.Sum(deuda => deuda.Saldo ?? 0m);
            column.Item().PaddingTop(10).Border(1).BorderColor(ColorBorde).CornerRadius(5).Column(card =>
            {
                EncabezadoTarjeta(card, "Detalle de deuda", deudas.Count);
                if (deudas.Count == 0)
                {
                    MensajeVacio(card, "No registra deudas.");
                    return;
                }
                card.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(2.3f);
                        columns.RelativeColumn(2.2f);
                        columns.RelativeColumn(1.1f);
                        columns.RelativeColumn(0.7f);
                        columns.RelativeColumn(1.5f);
                    });
                    table.Header(header =>
                    {
                        foreach (var titulo in new[] { "Entidad", "Tipo de deuda", "Calificación", "Días", "Capital" })
                            header.Cell().Background(ColorGrisSuave).BorderBottom(1).BorderColor(ColorBorde)
                                .PaddingHorizontal(7).PaddingVertical(7).Text(titulo).FontSize(7).FontColor("#60748F");
                    });
                    foreach (var deuda in deudas)
                    {
                        table.Cell().Element(CeldaTabla).Text(Mostrar(deuda.Entidad)).Bold();
                        table.Cell().Element(CeldaTabla).Text(Mostrar(deuda.TipoDeuda));
                        table.Cell().Element(cell => CeldaRegistro(cell, deudas.IndexOf(deuda)))
                            .Element(cell => EtiquetaCalificacion(cell, deuda.Calificacion));
                        table.Cell().Element(CeldaTabla).AlignRight().Text(deuda.Dias?.ToString(Cultura) ?? "—");
                        table.Cell().Element(CeldaTabla).AlignRight().Text(FormatearMoneda(deuda.Saldo)).Bold();
                    }
                    table.Cell().ColumnSpan(4).Background("#F4F7FB").Padding(7).AlignRight()
                        .Text("TOTAL").FontSize(7.5f).Bold().FontColor(ColorTexto);
                    table.Cell().Background("#F4F7FB").Padding(7).AlignRight()
                        .Text(FormatearMoneda(totalSaldo)).FontSize(7.5f).Bold().FontColor(ColorTexto);
                });
            });
        }

        private static void AgregarPeriodoReporte(ColumnDescriptor column, BuscadorHistorialResponse resultado)
        {
            var periodo = resultado.Deudas.Select(deuda => deuda.Periodo ?? string.Empty)
                .Concat(resultado.Calificaciones.Select(calificacion => calificacion.Periodo ?? string.Empty))
                .OrderByDescending(valor => valor).FirstOrDefault();
            if (periodo is { Length: 6 })
                column.Item().PaddingTop(8).Text($"Reporte actualizado con el periodo {FormatearPeriodo(periodo)}")
                    .FontSize(7.5f).FontColor("#60748F");
        }

        private static void AgregarDeudasConTotales(ColumnDescriptor column, BuscadorHistorialResponse resultado)
        {
            var deudas = resultado.Deudas;
            var totalSaldo = deudas.Sum(deuda => deuda.Saldo ?? 0m);
            column.Item().PaddingTop(10).Border(1).BorderColor(ColorBorde).Column(card =>
            {
                EncabezadoTarjeta(card, "Deudas", deudas.Count);
                if (deudas.Count == 0)
                {
                    MensajeVacio(card, "No registra deudas.");
                    return;
                }

                card.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(1.2f);
                        columns.RelativeColumn(2.5f);
                        columns.RelativeColumn(1.8f);
                        columns.RelativeColumn(0.8f);
                        columns.RelativeColumn(1.5f);
                        columns.RelativeColumn(1.4f);
                    });
                    table.Header(header =>
                    {
                        foreach (var titulo in new[] { "PERIODO", "ENTIDAD", "TIPO DE DEUDA", "DÍAS", "CLASIFICACIÓN", "SALDO" })
                            header.Cell().Background(ColorGrisSuave).BorderBottom(1).BorderColor(ColorBorde)
                                .PaddingHorizontal(5).PaddingVertical(6).Text(titulo).FontSize(6.5f).Bold().FontColor("#536176");
                    });
                    foreach (var deuda in deudas)
                    {
                        table.Cell().Element(CeldaTabla).Text(FormatearPeriodo(deuda.Periodo));
                        table.Cell().Element(CeldaTabla).Text(Mostrar(deuda.Entidad)).Bold();
                        table.Cell().Element(CeldaTabla).Text(Mostrar(deuda.TipoDeuda)).FontColor("#68778D");
                        table.Cell().Element(CeldaTabla).AlignRight().Text(deuda.Dias?.ToString(Cultura) ?? "—");
                        table.Cell().Element(CeldaTabla).Text(Mostrar(deuda.Calificacion));
                        table.Cell().Element(CeldaTabla).AlignRight().Text(FormatearMoneda(deuda.Saldo)).Bold().FontColor(ColorPrimario);
                    }
                    table.Cell().ColumnSpan(5).Background("#F4F7FB").Padding(6).AlignRight()
                        .Text("TOTAL SALDO").FontSize(7).Bold().FontColor(ColorPrimario);
                    table.Cell().Background("#F4F7FB").Padding(6).AlignRight()
                        .Text(FormatearMoneda(totalSaldo)).FontSize(7).Bold().FontColor(ColorPrimario);
                });
            });
        }

        private static IContainer CeldaTabla(IContainer cell) =>
            cell.BorderBottom(0.5f).BorderColor("#E6EBF2").PaddingHorizontal(5).PaddingVertical(6);

        private static void EncabezadoTarjeta(ColumnDescriptor card, string titulo, int cantidad)
        {
            card.Item().BorderBottom(1).BorderColor(ColorBorde).PaddingHorizontal(10).PaddingVertical(8).Row(row =>
            {
                row.RelativeItem().Text(titulo).FontSize(9).Bold().FontColor(ColorTexto);
                row.AutoItem().Background(cantidad > 0 ? "#E8F0FE" : "#F1F3F6").PaddingHorizontal(6).PaddingVertical(2)
                    .Text(cantidad.ToString(Cultura)).FontSize(7).Bold().FontColor(cantidad > 0 ? ColorPrimario : "#64748B");
            });
        }

        private static void MensajeVacio(ColumnDescriptor card, string mensaje) =>
            card.Item().Height(42).AlignCenter().AlignMiddle().Text(mensaje).FontSize(7.5f).FontColor("#68778D");
        private static void AgregarLineasCreditoVista(ColumnDescriptor column, BuscadorHistorialResponse resultado)
        {
            var filas = resultado.LineasCredito.Select(linea =>
            {
                var total = linea.LineaCreditoMonto ?? 0m;
                var usado = linea.LineaUtilizada ?? 0m;
                var noUsado = linea.LineaNoUtilizada ?? 0m;
                return new[]
                {
                    Mostrar(linea.Entidad), Mostrar(linea.Tipo),
                    total > 0 ? FormatearPorcentaje(usado / total * 100m) : "—",
                    total > 0 ? FormatearPorcentaje(noUsado / total * 100m) : "—",
                    FormatearMoneda(linea.LineaCreditoMonto)
                };
            }).ToList();

            AgregarSeccionEstandard(column, "Líneas de crédito", filas.Count,
                new[] { "Entidad reportante", "Tipo de línea", "% utilizado", "% no utilizado", "Línea de crédito" },
                filas, "No se encontraron líneas de crédito.");
        }

        private static void AgregarLineasCredito(ColumnDescriptor column, BuscadorHistorialResponse resultado) =>
            AgregarSeccionEstandard(column, "Líneas de crédito", resultado.LineasCredito.Count,
                new[] { "Periodo", "Entidad", "Tipo", "Línea de crédito", "Utilizada", "Disponible" },
                resultado.LineasCredito.Select(linea => new[]
                {
                    FormatearPeriodo(linea.Periodo), Mostrar(linea.Entidad), Mostrar(linea.Tipo),
                    FormatearMoneda(linea.LineaCreditoMonto), FormatearMoneda(linea.LineaUtilizada),
                    FormatearMoneda(linea.LineaNoUtilizada)
                }).ToList(), "No registra líneas de crédito.");

        private static void AgregarCalificaciones(ColumnDescriptor column, BuscadorHistorialResponse resultado) =>
            AgregarSeccionEstandard(column, "Calificaciones", resultado.Calificaciones.Count,
                new[] { "Periodo", "Normal", "CPP", "Deficiente", "Dudoso", "Pérdida", "Entidades" },
                resultado.Calificaciones.Select(calificacion => new[]
                {
                    FormatearPeriodo(calificacion.Periodo), FormatearPorcentaje(calificacion.Nor),
                    FormatearPorcentaje(calificacion.Cpp), FormatearPorcentaje(calificacion.Def),
                    FormatearPorcentaje(calificacion.Dud), FormatearPorcentaje(calificacion.Per),
                    Mostrar(calificacion.Reportan)
                }).ToList(), "No registra calificaciones.");

        private static void AgregarSueldos(ColumnDescriptor column, BuscadorHistorialResponse resultado) =>
            AgregarSeccionEstandard(column, "Información laboral", resultado.Sueldos.Count,
                new[] { "Periodo", "Empresa", "RUC", "Rango de sueldo", "Nivel de ingreso" },
                resultado.Sueldos.Select(sueldo => new[]
                {
                    FormatearPeriodo(sueldo.Periodo), Mostrar(sueldo.Empresa), Mostrar(sueldo.Ruc),
                    Mostrar(sueldo.RangoSueldo), Mostrar(sueldo.NivelIngreso)
                }).ToList(), "No registra información laboral.");

        private static void AgregarMoviles(ColumnDescriptor column, BuscadorHistorialResponse resultado) =>
            AgregarSeccionEstandard(column, "Teléfonos", resultado.Moviles.Count,
                new[] { "Periodo", "Operadora", "Teléfono", "Titular", "Plan / modalidad", "Alta" },
                resultado.Moviles.Select(movil => new[]
                {
                    FormatearPeriodo(movil.Periodo), Mostrar(movil.EmpresaOperadora), Mostrar(movil.Telefono),
                    Mostrar(string.Join(" ", new[] { movil.Prenombres, movil.ApePat, movil.ApeMat }.Where(v => !string.IsNullOrWhiteSpace(v)))),
                    Mostrar(string.Join(" / ", new[] { movil.PlanMovil, movil.Modalidad }.Where(v => !string.IsNullOrWhiteSpace(v)))),
                    movil.FechaAlta?.ToString("dd/MM/yyyy", Cultura) ?? "—"
                }).ToList(), "No registra teléfonos.");

        private static void AgregarSeccionEstandard(ColumnDescriptor column, string titulo, int cantidad,
            string[] encabezados, List<string[]> filas, string mensajeVacio)
        {
            column.Item().PaddingTop(10).Border(1).BorderColor(ColorBorde).Column(card =>
            {
                EncabezadoTarjeta(card, titulo, cantidad);
                if (filas.Count == 0)
                {
                    MensajeVacio(card, mensajeVacio);
                    return;
                }

                card.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        foreach (var _ in encabezados)
                            columns.RelativeColumn();
                    });
                    table.Header(header =>
                    {
                        foreach (var tituloColumna in encabezados)
                            header.Cell().Background(ColorGrisSuave).BorderBottom(1).BorderColor(ColorBorde)
                                .PaddingHorizontal(5).PaddingVertical(6).Text(tituloColumna.ToUpperInvariant())
                                .FontSize(6.5f).Bold().FontColor("#536176");
                    });
                    for (var numeroFila = 0; numeroFila < filas.Count; numeroFila++)
                    {
                        var fila = filas[numeroFila];
                        for (var indice = 0; indice < encabezados.Length; indice++)
                        {
                            var valor = indice < fila.Length ? fila[indice] : "—";
                            var encabezado = encabezados[indice];
                            if (encabezado.Contains("utilizado", StringComparison.OrdinalIgnoreCase))
                            {
                                var usado = encabezado.Contains("no utilizado", StringComparison.OrdinalIgnoreCase);
                                var color = usado ? "#00875A" : "#9A6700";
                                var fondo = usado ? "#E5F5EF" : "#FFF4D6";
                                table.Cell().Element(cell => CeldaRegistro(cell, numeroFila)).AlignCenter()
                                    .Element(pill => pill.Background(fondo).CornerRadius(4).PaddingHorizontal(4).PaddingVertical(2)
                                        .Text(valor).FontSize(7).Bold().FontColor(color));
                            }
                            else
                                table.Cell().Element(cell => CeldaRegistro(cell, numeroFila)).Text(valor).FontColor(ColorTexto);
                        }
                    }
                });
            });
        }
        private static string ObtenerPeorCalificacion(IEnumerable<internal_search.Domain.Entities.Deuda> deudas)
        {
            var valores = deudas.Select(deuda => deuda.Calificacion)
                .Where(valor => !string.IsNullOrWhiteSpace(valor)).ToList();
            if (valores.Count == 0)
                return "—";

            var peor = valores.OrderByDescending(valor =>
            {
                var texto = valor!.ToUpperInvariant();
                if (texto.Contains("NOR") || texto == "0") return 0;
                if (texto.Contains("CPP") || texto == "1") return 1;
                return 2;
            }).First();
            return Mostrar(peor);
        }

        private static string FormatearPeriodo(string? periodo)
        {
            if (periodo is { Length: 6 } && int.TryParse(periodo.AsSpan(4, 2), out var mes)
                && mes is >= 1 and <= 12)
                return $"{Cultura.DateTimeFormat.GetMonthName(mes)} {periodo[..4]}";
            return Mostrar(periodo);
        }

        private static string FormatearMoneda(decimal? valor) =>
            valor.HasValue ? $"S/ {valor.Value.ToString("N2", Cultura)}" : "—";

        private static string FormatearPorcentaje(decimal? valor) =>
            valor.HasValue ? $"{valor.Value.ToString("0.##", Cultura)}%" : "—";

        private static string Mostrar(string? valor) =>
            string.IsNullOrWhiteSpace(valor) ? "—" : valor.Trim();
    }
}
