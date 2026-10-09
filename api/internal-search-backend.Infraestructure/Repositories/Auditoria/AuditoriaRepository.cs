using internal_search.Domain.DTOs.Auditoria;
using internal_search.Domain.DTOs.Common;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Auditoria;
using Microsoft.EntityFrameworkCore;

namespace internal_search_backend.Infraestructure.Repositories.Auditoria
{
    public class AuditoriaRepository : IAuditoriaRepository
    {
        private readonly AppDbContext _context;

        public AuditoriaRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task RegistrarAsync(AuditoriaRegistro registro)
        {
            _context.Auditoria.Add(registro);
            await _context.SaveChangesAsync();
        }

        public async Task<PaginaDto<AuditoriaRegistro>> ListarAsync(AuditoriaFiltroDto filtro)
        {
            var pagina = Math.Max(1, filtro.Pagina);
            var tamano = Math.Clamp(filtro.Tamano, 1, 200);

            var q = _context.Auditoria.AsNoTracking().AsQueryable();

            if (filtro.Desde.HasValue) q = q.Where(a => a.Fecha >= filtro.Desde.Value);
            if (filtro.Hasta.HasValue) q = q.Where(a => a.Fecha <= filtro.Hasta.Value);
            if (!string.IsNullOrWhiteSpace(filtro.Usuario)) q = q.Where(a => a.Usuario == filtro.Usuario);
            if (!string.IsNullOrWhiteSpace(filtro.Accion)) q = q.Where(a => a.Accion == filtro.Accion);

            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(a => a.CodAuditoria)
                .Skip((pagina - 1) * tamano)
                .Take(tamano)
                .ToListAsync();

            return new PaginaDto<AuditoriaRegistro>
            {
                Items = items,
                Total = total,
                Pagina = pagina,
                Tamano = tamano
            };
        }
    }
}
