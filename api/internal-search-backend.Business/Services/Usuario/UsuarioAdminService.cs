using internal_search.Domain.Constants;
using internal_search.Domain.DTOs.Auditoria;
using internal_search.Domain.DTOs.Common;
using internal_search.Domain.DTOs.Usuario;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Auth;
using internal_search.Domain.Interfaces.Tokens;
using internal_search.Domain.Interfaces.Usuario;
using internal_search_backend.Business.helpers;
using internal_search_backend.Business.Services.Auditoria;
using System.Security.Cryptography;

namespace internal_search_backend.Business.Services.Usuario
{
    public class UsuarioAdminService : IUsuarioAdminService
    {
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IContrasenaRepository _contrasena;
        private readonly IRecuperacionClaveService _recuperacion;
        private readonly ITokenRepository _tokens;
        private readonly IAuditoriaService _auditoria;

        public UsuarioAdminService(
            IUsuarioRepository usuarioRepository,
            IContrasenaRepository contrasena,
            IRecuperacionClaveService recuperacion,
            ITokenRepository tokens,
            IAuditoriaService auditoria)
        {
            _usuarioRepository = usuarioRepository;
            _contrasena = contrasena;
            _recuperacion = recuperacion;
            _tokens = tokens;
            _auditoria = auditoria;
        }

        public async Task<CrearUsuarioResponseDto> CrearAsync(CrearUsuarioDto dto, ContextoAccion admin)
        {
            var login = dto.UsuarioLogin.Trim();
            var correo = dto.Correo.Trim();
            var conClaveInicial = !string.IsNullOrEmpty(dto.Clave);

            if (conClaveInicial)
            {
                var error = ValidadorClave.Validar(dto.Clave);
                if (error != null)
                    throw new ArgumentException(error);
            }

            if (await _usuarioRepository.ExisteLoginAsync(login))
                throw new InvalidOperationException("El usuario ya existe.");

            if (await _usuarioRepository.ExisteCorreoAsync(correo))
                throw new InvalidOperationException("El correo ya está registrado.");

            var rolesValidos = await _usuarioRepository.ObtenerRolesActivosAsync(dto.CodRoles);
            if (rolesValidos.Count != dto.CodRoles.Distinct().Count())
                throw new ArgumentException("Alguno de los roles no existe o está inactivo.");

            // Sin clave inicial se guarda el hash de un valor aleatorio que nadie conoce:
            // la cuenta solo se activa con el enlace de invitación.
            var clave = conClaveInicial
                ? dto.Clave!
                : Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

            var usuario = new Usuarios
            {
                Nombres = dto.Nombres.Trim(),
                ApePat = dto.ApePat.Trim(),
                ApeMat = dto.ApeMat?.Trim(),
                UsuarioLogin = login,
                Clave = _contrasena.Hashear(clave),
                Correo = correo,
                Dni = dto.Dni?.Trim(),
                Telefono = dto.Telefono?.Trim(),
                Estado = 1,
                UsuCreo = Corto(admin.Login),
                FechaCreo = DateTime.Now
            };

            var codUsuario = await _usuarioRepository.CrearAsync(usuario, rolesValidos);

            var codAdminGeneral = await _usuarioRepository.ObtenerCodRolAsync(RolesSistema.AdminGeneral);
            var esAdminGeneral = codAdminGeneral != null && rolesValidos.Contains(codAdminGeneral.Value);

            if (dto.TokensIniciales > 0 && !esAdminGeneral)
            {
                await _tokens.AjustarAsync(codUsuario, dto.TokensIniciales, TokenMovimiento.TipoAsignacion,
                    "ALTA_USUARIO", "Tokens iniciales", admin.CodUsuario);
            }

            await _auditoria.RegistrarAsync(admin, "USUARIO_CREADO", "Usuario", codUsuario.ToString(),
                $"{login}; roles [{string.Join(",", rolesValidos)}]; tokens iniciales {(esAdminGeneral ? "ilimitados" : dto.TokensIniciales.ToString())}");

            var invitacionEnviada = !conClaveInicial &&
                await _recuperacion.EnviarInvitacionAsync(usuario, admin.Ip);

            return new CrearUsuarioResponseDto
            {
                CodUsuario = codUsuario,
                UsuarioLogin = login,
                InvitacionEnviada = invitacionEnviada
            };
        }

        public Task<PaginaDto<UsuarioListadoDto>> ListarAsync(string? texto, int pagina, int tamano) =>
            _usuarioRepository.ListarAsync(texto, pagina, tamano);

        public Task<List<RolListadoDto>> ListarRolesAsync() =>
            _usuarioRepository.ListarRolesActivosAsync();

        public async Task CambiarEstadoAsync(int codUsuario, bool activo, ContextoAccion admin)
        {
            var contexto = await _usuarioRepository.ObtenerContextoSesionAsync(codUsuario)
                ?? throw new ArgumentException("El usuario no existe.");

            if (!activo)
            {
                if (codUsuario == admin.CodUsuario)
                    throw new InvalidOperationException("No puedes desactivar tu propia cuenta.");

                await ValidarQueQuedeAdminAsync(codUsuario, contexto);
            }

            await _usuarioRepository.CambiarEstadoAsync(codUsuario, activo, Corto(admin.Login));

            await _auditoria.RegistrarAsync(admin, activo ? "USUARIO_ACTIVADO" : "USUARIO_DESACTIVADO",
                "Usuario", codUsuario.ToString());
        }

        // Útil si se sospecha que un token fue robado o el equipo se perdió
        public async Task CerrarSesionesAsync(int codUsuario, ContextoAccion admin)
        {
            _ = await _usuarioRepository.ObtenerContextoSesionAsync(codUsuario)
                ?? throw new ArgumentException("El usuario no existe.");

            await _usuarioRepository.RevocarSesionesAsync(codUsuario);

            await _auditoria.RegistrarAsync(admin, "USUARIO_SESIONES_CERRADAS", "Usuario", codUsuario.ToString());
        }

        public async Task CambiarRolesAsync(int codUsuario, IEnumerable<int> codRoles, ContextoAccion admin)
        {
            var contexto = await _usuarioRepository.ObtenerContextoSesionAsync(codUsuario)
                ?? throw new ArgumentException("El usuario no existe.");

            var nuevos = codRoles.Distinct().ToList();
            var validos = await _usuarioRepository.ObtenerRolesActivosAsync(nuevos);
            if (nuevos.Count == 0 || validos.Count != nuevos.Count)
                throw new ArgumentException("Alguno de los roles no existe o está inactivo.");

            var codAdminGeneral = await _usuarioRepository.ObtenerCodRolAsync(RolesSistema.AdminGeneral);
            var seguiraSiendoAdmin = codAdminGeneral != null && nuevos.Contains(codAdminGeneral.Value);

            if (!seguiraSiendoAdmin)
                await ValidarQueQuedeAdminAsync(codUsuario, contexto);

            await _usuarioRepository.ReemplazarRolesAsync(codUsuario, nuevos, Corto(admin.Login));

            await _auditoria.RegistrarAsync(admin, "USUARIO_ROLES", "Usuario", codUsuario.ToString(),
                $"Roles ahora: [{string.Join(",", nuevos)}]");
        }

        // Evita quedarse sin ningún ADMIN GENERAL activo (nadie podría administrar tokens ni cuentas)
        private async Task ValidarQueQuedeAdminAsync(int codUsuario, ContextoSesionDto contexto)
        {
            var eraAdmin = contexto.Activo &&
                contexto.Roles.Contains(RolesSistema.AdminGeneral, StringComparer.OrdinalIgnoreCase);

            if (eraAdmin && await _usuarioRepository.ContarAdminsGeneralesActivosAsync(codUsuario) == 0)
                throw new InvalidOperationException("Debe quedar al menos un ADMIN GENERAL activo.");
        }

        private static string Corto(string valor) => valor.Length > 20 ? valor[..20] : valor;
    }
}
