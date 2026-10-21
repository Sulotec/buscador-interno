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

            // MÓVIL - solo último período
            var pMovil = await UltimoPeriodoAsync(_context.Movil
                .Where(x => x.Documento == numeroDocumento)
                .Select(x => x.Periodo));

            var moviles = pMovil.Count == 0 ? new List<Movil>() : await _context.Movil
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && pMovil.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            // SUELDOS
            var pSueldo = await UltimoPeriodoAsync(_context.Sueldos
                .Where(x => x.Documento == numeroDocumento)
                .Select(x => x.Periodo));

            var sueldos = pSueldo.Count == 0 ? new List<Sueldo>() : await _context.Sueldos
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && pSueldo.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            // DEUDAS
            var pDeuda = await UltimoPeriodoAsync(_context.Deudas
                .Where(x => x.Documento == numeroDocumento)
                .Select(x => x.Periodo));

            var deudas = pDeuda.Count == 0 ? new List<Deuda>() : await _context.Deudas
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && pDeuda.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            // LÍNEAS DE CRÉDITO
            var pLinea = await UltimoPeriodoAsync(_context.LineaCreditos
                .Where(x => x.Documento == numeroDocumento)
                .Select(x => x.Periodo));

            var lineas = pLinea.Count == 0 ? new List<LineaCredito>() : await _context.LineaCreditos
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && pLinea.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            // CALIFICACIONES
            var pCalif = await UltimoPeriodoAsync(_context.Calificaciones
                .Where(x => x.Documento == numeroDocumento)
                .Select(x => x.Periodo));

            var calificaciones = pCalif.Count == 0 ? new List<Calificacion>() : await _context.Calificaciones
                .AsNoTracking()
                .Where(x => x.Documento == numeroDocumento && x.Periodo != null && pCalif.Contains(x.Periodo))
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
            if (string.IsNullOrWhiteSpace(razonSocial) || razonSocial.Trim().Length < 4)
            {
                throw new ArgumentException("Debe ingresar al menos 4 caracteres para buscar por razón social.");
            }
            
            string filtro = razonSocial.Trim();

            // DEUDAS - solo último período
            var pDeuda = await UltimoPeriodoAsync(_context.Deudas
                .Where(x => x.RazonSocial != null && x.RazonSocial.StartsWith(filtro))
                .Select(x => x.Periodo));

            var deudas = pDeuda.Count == 0 ? new List<Deuda>() : await _context.Deudas
                .AsNoTracking()
                .Where(x => x.RazonSocial != null &&
                            x.RazonSocial.StartsWith(filtro) &&
                            x.Periodo != null &&
                            pDeuda.Contains(x.Periodo))
                .Take(50)
                .ToListAsync();

            // LÍNEAS DE CRÉDITO - solo último período
            var pLinea = await UltimoPeriodoAsync(_context.LineaCreditos
                .Where(x => x.RazonSocial != null && x.RazonSocial.StartsWith(filtro))
                .Select(x => x.Periodo));

            var lineas = pLinea.Count == 0 ? new List<LineaCredito>() : await _context.LineaCreditos
                .AsNoTracking()
                .Where(x => x.RazonSocial != null &&
                            x.RazonSocial.StartsWith(filtro) &&
                            x.Periodo != null &&
                            pLinea.Contains(x.Periodo))
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