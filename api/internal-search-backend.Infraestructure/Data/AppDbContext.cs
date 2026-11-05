using internal_search.Domain.Entities;
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Usuarios> Usuarios { get; set; }
    public DbSet<UsuarioRol> UsuarioRoles { get; set; }
    public DbSet<Rol> Roles { get; set; }
    public DbSet<Menu> Menus { get; set; }
    public DbSet<RolMenu> RolMenus { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    public DbSet<SesionRevocada> SesionesRevocadas { get; set; }
    public DbSet<TokenSaldo> TokenSaldos { get; set; }
    public DbSet<TokenMovimiento> TokenMovimientos { get; set; }
    public DbSet<AuditoriaRegistro> Auditoria { get; set; }
    public DbSet<ConsultaReniec> ConsultasReniec { get; set; }

    public DbSet<Calificacion> Calificaciones { get; set; }
    public DbSet<Deuda> Deudas { get; set; }
    public DbSet<Movil> Movil { get; set; }
    public DbSet<LineaCredito> LineaCreditos { get; set; }
    public DbSet<Sueldo> Sueldos { get; set; }
    public DbSet<Fallecidos> Fallecidos { get; set; }
    public DbSet<PersonaOperador> PersonasOperador { get; set; }

    // NUEVO
    public DbSet<HistorialDescarga> HistorialDescargas { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Relaciones existentes
        modelBuilder.Entity<UsuarioRol>()
            .HasOne(ur => ur.Usuario)
            .WithMany(u => u.UsuarioRoles)
            .HasForeignKey(ur => ur.CodUsuario);

        modelBuilder.Entity<UsuarioRol>()
            .HasOne(ur => ur.Rol)
            .WithMany(r => r.UsuarioRoles)
            .HasForeignKey(ur => ur.CodRol);

        // Tablas de consulta sin PK
        modelBuilder.Entity<Calificacion>().HasNoKey();
        modelBuilder.Entity<Deuda>().HasNoKey();
        modelBuilder.Entity<LineaCredito>().HasNoKey();
        modelBuilder.Entity<Movil>().HasNoKey();
        modelBuilder.Entity<Sueldo>().HasNoKey();

        modelBuilder.Entity<PersonaOperador>(e =>
        {
            e.ToTable("Personas", "Operador");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("ID").HasColumnType("bigint").ValueGeneratedNever();
            e.Property(x => x.TipoDoc).HasColumnName("TIPODOC").HasMaxLength(3).IsUnicode(false);
            e.Property(x => x.Dni).HasColumnName("DNI").HasMaxLength(15).IsUnicode(false);
            e.Property(x => x.FechaNacimiento).HasColumnName("FECHANAC").HasColumnType("date");
            e.Property(x => x.ApePat).HasColumnName("APE_PAT").HasMaxLength(100).IsUnicode(false);
            e.Property(x => x.ApeMat).HasColumnName("APE_MAT").HasMaxLength(100).IsUnicode(false);
            e.Property(x => x.Prenombres).HasColumnName("PRENOMBRES").HasMaxLength(150).IsUnicode(false);
            e.Property(x => x.UbigeoReniec).HasColumnName("UBIGEO_RENIEC").HasMaxLength(6).IsUnicode(false);
        });

        // NUEVO: historial de descargas (tabla ya creada en BD)
        modelBuilder.Entity<HistorialDescarga>(e =>
        {
            e.ToTable("HistorialDescarga", "RRCC");
            e.HasKey(x => x.CodHistorial);

            e.Property(x => x.CodHistorial).HasColumnName("COD_HISTORIAL").ValueGeneratedOnAdd();
            e.Property(x => x.CodUsuario).HasColumnName("COD_USUARIO");
            e.Property(x => x.NombreArchivo).HasColumnName("NOMBRE_ARCHIVO").HasMaxLength(200);
            e.Property(x => x.RutaArchivo).HasColumnName("RUTA_ARCHIVO").HasMaxLength(400);
            e.Property(x => x.Secciones).HasColumnName("SECCIONES").HasMaxLength(200);
            e.Property(x => x.TotalDnis).HasColumnName("TOTAL_DNIS");
            e.Property(x => x.TamanoBytes).HasColumnName("TAMANO_BYTES");
            e.Property(x => x.FechaCreo).HasColumnName("FECHA_CREO")
                .HasColumnType("datetime2")
                .HasDefaultValueSql("SYSDATETIME()")
                .ValueGeneratedOnAdd();
        });

        modelBuilder.Entity<ConsultaReniec>(e =>
        {
            e.ToTable("Consultas", "RNC");
            e.HasKey(x => x.Dni);

            e.Property(x => x.Dni).HasColumnName("DNI").HasColumnType("char(8)");
            e.Property(x => x.PreNombres).HasColumnName("PRENOMBRES").HasMaxLength(250);
            e.Property(x => x.ApePaterno).HasColumnName("APE_PATERNO").HasMaxLength(150);
            e.Property(x => x.ApeMaterno).HasColumnName("APE_MATERNO").HasMaxLength(150);
            e.Property(x => x.FechaNacimiento).HasColumnName("FECHA_NACIMIENTO").HasMaxLength(30);
            e.Property(x => x.Sexo).HasColumnName("SEXO").HasMaxLength(30);
            e.Property(x => x.EstadoCivil).HasColumnName("ESTADO_CIVIL").HasMaxLength(100);
            e.Property(x => x.GradoInstruccion).HasColumnName("GRADO_INSTRUCCION").HasMaxLength(150);
            e.Property(x => x.Restriccion).HasColumnName("RESTRICCION").HasMaxLength(200);
            e.Property(x => x.Direccion).HasColumnName("DIRECCION").HasMaxLength(500);
            e.Property(x => x.Distrito).HasColumnName("DISTRITO").HasMaxLength(150);
            e.Property(x => x.Provincia).HasColumnName("PROVINCIA").HasMaxLength(150);
            e.Property(x => x.Departamento).HasColumnName("DEPARTAMENTO").HasMaxLength(150);
            e.Property(x => x.NombrePadre).HasColumnName("NOMBRE_PADRE").HasMaxLength(200);
            e.Property(x => x.NombreMadre).HasColumnName("NOMBRE_MADRE").HasMaxLength(200);
            e.Property(x => x.FechaEmision).HasColumnName("FECHA_EMISION").HasMaxLength(30);
            e.Property(x => x.FechaCaducidad).HasColumnName("FECHA_CADUCIDAD").HasMaxLength(30);
            e.Property(x => x.FechaFallecimiento).HasColumnName("FECHA_FALLECIMIENTO").HasMaxLength(30);
            e.Property(x => x.Foto).HasColumnName("FOTO").HasColumnType("varbinary(max)");
            e.Property(x => x.FechaConsultaUtc).HasColumnName("FECHA_CONSULTA_UTC")
                .HasColumnType("datetime2(0)");
        });
    }
}
