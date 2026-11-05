using internal_search.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace internal_search_backend.Infraestructure.Repositories.Buscador.personas
{
    public static class UbigeoExtensions
    {
        // Completa UbigeoDescripcion cruzando UBIGEO_RENIEC con RNC.Ubigeos.UBIGEO.
        // Una sola consulta por cada 1000 códigos distintos (no una por persona), para que la carga masiva
        // siga siendo rápida. Si un código no está en el catálogo, la descripción queda vacía y la pantalla
        // muestra el código.
        public static async Task CompletarUbigeosAsync(this AppDbContext db, IEnumerable<PersonaOperador> personas, CancellationToken ct)
        {
            var lista = personas.ToList();
            var codigos = lista
                .Select(p => p.UbigeoReniec?.Trim())
                .Where(c => !string.IsNullOrEmpty(c))
                .Select(c => c!)
                .Distinct()
                .ToList();
            if (codigos.Count == 0)
                return;

            var descripciones = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var lote in codigos.Chunk(1000))
            {
                var encontrados = await db.Ubigeos.AsNoTracking()
                    .Where(u => u.Codigo != null && lote.Contains(u.Codigo))
                    .Select(u => new { u.Codigo, u.Descripcion })
                    .ToListAsync(ct);

                // Si el catálogo repitiera un código, se toma la primera descripción no vacía
                foreach (var u in encontrados)
                {
                    var codigo = u.Codigo!.Trim();
                    if (!descripciones.ContainsKey(codigo) && !string.IsNullOrWhiteSpace(u.Descripcion))
                        descripciones[codigo] = u.Descripcion.Trim();
                }
            }

            foreach (var persona in lista)
            {
                var codigo = persona.UbigeoReniec?.Trim();
                if (codigo is not null && descripciones.TryGetValue(codigo, out var descripcion))
                    persona.UbigeoDescripcion = descripcion;
            }
        }
    }
}
