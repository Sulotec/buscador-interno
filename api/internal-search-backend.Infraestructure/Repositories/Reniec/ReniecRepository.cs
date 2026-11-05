using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Reniec;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace internal_search_backend.Infraestructure.Repositories.Reniec
{
    public class ReniecRepository : IReniecRepository
    {
        private readonly AppDbContext _db;

        public ReniecRepository(AppDbContext db) => _db = db;

        public async Task GuardarUltimaConsultaAsync(ConsultaReniec consulta, CancellationToken ct)
        {
            await using var transaccion = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable, ct);

            var existente = await _db.ConsultasReniec
                .SingleOrDefaultAsync(x => x.Dni == consulta.Dni, ct);

            if (existente is null)
                _db.ConsultasReniec.Add(consulta);
            else
            {
                existente.PreNombres = consulta.PreNombres;
                existente.ApePaterno = consulta.ApePaterno;
                existente.ApeMaterno = consulta.ApeMaterno;
                existente.FechaNacimiento = consulta.FechaNacimiento;
                existente.Sexo = consulta.Sexo;
                existente.EstadoCivil = consulta.EstadoCivil;
                existente.GradoInstruccion = consulta.GradoInstruccion;
                existente.Restriccion = consulta.Restriccion;
                existente.Direccion = consulta.Direccion;
                existente.Distrito = consulta.Distrito;
                existente.Provincia = consulta.Provincia;
                existente.Departamento = consulta.Departamento;
                existente.NombrePadre = consulta.NombrePadre;
                existente.NombreMadre = consulta.NombreMadre;
                existente.FechaEmision = consulta.FechaEmision;
                existente.FechaCaducidad = consulta.FechaCaducidad;
                existente.FechaFallecimiento = consulta.FechaFallecimiento;
                if (consulta.Foto is not null)
                    existente.Foto = consulta.Foto;
                existente.FechaConsultaUtc = consulta.FechaConsultaUtc;
            }

            await _db.SaveChangesAsync(ct);
            await transaccion.CommitAsync(ct);
        }
    }
}
