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

    public DbSet<Calificacion> Calificaciones { get; set; }
    public DbSet<Deuda> Deudas { get; set; }
    public DbSet<Movil> Movil { get; set; }
    public DbSet<LineaCredito> LineaCreditos { get; set; }
    public DbSet<Sueldo> Sueldos { get; set; }

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
    }
}