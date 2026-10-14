using internal_search.Domain.DTOs.buscador.empresa.individual;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Buscador.empresas.individual;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace internal_search_backend.Infraestructure.Repositories.Buscador.empresas.individual
{
    public class BuscadorIndividualRepository : IEmpresaIndividualRepository
    {
        private readonly AppDbContext _context;

        public BuscadorIndividualRepository(AppDbContext context)
        {
            _context = context;
        }

        // Escapa los comodines de LIKE para que lo que escribe el usuario se busque literalmente
        private static string EscaparLike(string texto) =>
            texto.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

        // Convierte "20606" -> "202606" para poder comparar bien
        private static string NormalizarPeriodo(string p) =>
            p.Length == 5 && p.StartsWith("20") ? "202" + p.Substring(2) : p;

        // Devuelve los valores originales (con y sin error) del período más reciente
        private static async Task<List<string>> UltimoPeriodoAsync(IQueryable<string?> periodos)
        {
            var distintos = await periodos
                .Where(p => p != null)
                .Distinct()
                .ToListAsync();

            if (distintos.Count == 0) return new List<string>();

            var maximo = distintos
                .Select(p => NormalizarPeriodo(p!))
                .OrderByDescending(p => p, StringComparer.Ordinal)
                .First();

            return distintos
                .Where(p => NormalizarPeriodo(p!) == maximo)
                .Select(p => p!)
                .ToList();
        }

        public async Task<BuscadorEmpresaResponseDto> ObtenerTodasLasTablasPorRucAsync(string numeroDocumento)
        {
            if (string.IsNullOrWhiteSpace(numeroDocumento) ||
                numeroDocumento.Length != 11 ||
                !numeroDocumento.StartsWith("20"))
            {
                throw new ArgumentException("El documento debe ser un RUC válido de 11 dígitos que empiece con 20.");
            }

            // Obtenemos el año actual de forma dinámica (por ejemplo, "2026")
            string anioActual = DateTime.Now.Year.ToString();

            // Filtramos para que solo tome en cuenta los periodos del año actual
            var pMovil = await _context.Movil
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                .Select(x => x.Periodo)
                .ToListAsync();

            var moviles = pMovil.Count == 0 ? new List<Movil>() : await _context.Movil
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && pMovil.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            var pSueldo = await _context.Sueldos
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                .Select(x => x.Periodo)
                .ToListAsync();

            var sueldos = pSueldo.Count == 0 ? new List<Sueldo>() : await _context.Sueldos
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && pSueldo.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            var pDeuda = await _context.Deudas
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                .Select(x => x.Periodo)
                .ToListAsync();

            var deudas = pDeuda.Count == 0 ? new List<Deuda>() : await _context.Deudas
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && pDeuda.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            var pLinea = await _context.LineaCreditos
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                .Select(x => x.Periodo)
                .ToListAsync();

            var lineas = pLinea.Count == 0 ? new List<LineaCredito>() : await _context.LineaCreditos
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && pLinea.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            var pCalif = await _context.Calificaciones
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && x.Periodo.StartsWith(anioActual))
                .Select(x => x.Periodo)
                .ToListAsync();

            var calificaciones = pCalif.Count == 0 ? new List<Calificacion>() : await _context.Calificaciones
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && pCalif.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            return new BuscadorEmpresaResponseDto
            {
                Moviles = moviles,
                Sueldos = sueldos,
                Deudas = deudas,
                LineasCredito = lineas,
                Calificaciones = calificaciones
            };
        }

        // 2. BÚSQUEDA POR RAZÓN SOCIAL (Parcial / LIKE)
        // ==========================================
        // 2. BÚSQUEDA POR RAZÓN SOCIAL (Optimizada y controlada)
        // 2. BÚSQUEDA POR RAZÓN SOCIAL (Optimizada con StartsWith para evitar timeouts)
        public async Task<BuscadorEmpresaResponseDto> ObtenerTodasLasTablasPorRazonSocialAsync(string razonSocial)
        {
            // Validación de seguridad: Exigir al menos 4 caracteres para obligar a mayor precisión
            if (string.IsNullOrWhiteSpace(razonSocial) || razonSocial.Trim().Length < 4)
            {
                throw new ArgumentException("Debe ingresar al menos 4 caracteres para buscar por razón social.");
            }

            string filtro = razonSocial.Trim();

            // Obtenemos el año actual de forma dinámica (ej. "2026")
            string anioActual = DateTime.Now.Year.ToString();

            // Filtramos por razón social Y estrictamente por el año actual
            // PostgreSQL: prefijo sin distinguir mayusculas sobre lower(razonsocial), que tiene su indice.
            // SQL Server queda con la consulta original (su ordenamiento ya no distingue mayusculas).
            var patron = EscaparLike(filtro.ToLowerInvariant()) + "%";

            var deudas = _context.Database.IsNpgsql()
                ? await _context.Deudas
                    .AsNoTracking()
                    .Where(x => x.RazonSocial != null &&
                                EF.Functions.Like(x.RazonSocial.ToLower(), patron, "\\") &&
                                x.Periodo != null &&
                                x.Periodo.StartsWith(anioActual))
                    .OrderByDescending(x => x.Periodo)
                    .Take(50)
                    .ToListAsync()
                : await _context.Deudas
                .AsNoTracking()
                .Where(x => x.RazonSocial != null &&
                            x.RazonSocial.StartsWith(filtro) &&
                            x.Periodo != null &&
                            x.Periodo.StartsWith(anioActual)) // <--- FILTRO DEL AÑO ACTUAL
                .OrderByDescending(x => x.Periodo) // Usualmente quieres ver los más recientes primero
                .Take(50)
                .ToListAsync();

            var lineas = _context.Database.IsNpgsql()
                ? await _context.LineaCreditos
                    .AsNoTracking()
                    .Where(x => x.RazonSocial != null &&
                                EF.Functions.Like(x.RazonSocial.ToLower(), patron, "\\") &&
                                x.Periodo != null &&
                                x.Periodo.StartsWith(anioActual))
                    .OrderByDescending(x => x.Periodo)
                    .Take(50)
                    .ToListAsync()
                : await _context.LineaCreditos
                .AsNoTracking()
                .Where(x => x.RazonSocial != null &&
                            x.RazonSocial.StartsWith(filtro) &&
                            x.Periodo != null &&
                            x.Periodo.StartsWith(anioActual)) // <--- FILTRO DEL AÑO ACTUAL
                .OrderByDescending(x => x.Periodo) // Usualmente quieres ver los más recientes primero
                .Take(50)
                .ToListAsync();

            return new BuscadorEmpresaResponseDto
            {
                Moviles = new List<Movil>(),
                Sueldos = new List<Sueldo>(),
                Deudas = deudas,
                LineasCredito = lineas,
                Calificaciones = new List<Calificacion>()
            };
        }
    }
}