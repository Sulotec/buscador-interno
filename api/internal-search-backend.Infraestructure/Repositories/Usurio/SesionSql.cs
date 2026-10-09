using Microsoft.EntityFrameworkCore;

namespace internal_search_backend.Infraestructure.Repositories.Usurio
{
    internal static class SesionSql
    {
        // Upsert de la fecha de revocación; se puede llamar dentro de una transacción abierta
        public static Task<int> RevocarAsync(AppDbContext context, int codUsuario, DateTime ahoraUtc) =>
            context.Database.ExecuteSqlInterpolatedAsync($@"
                MERGE RRCC.SesionesRevocadas AS t
                USING (SELECT {codUsuario} AS COD_USUARIO) AS s ON t.COD_USUARIO = s.COD_USUARIO
                WHEN MATCHED THEN UPDATE SET FECHA_REVOCACION = {ahoraUtc}
                WHEN NOT MATCHED THEN INSERT (COD_USUARIO, FECHA_REVOCACION) VALUES ({codUsuario}, {ahoraUtc});");
    }
}
