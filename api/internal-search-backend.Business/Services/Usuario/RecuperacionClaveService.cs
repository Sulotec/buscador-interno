using internal_search.Domain.Configuration;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Auth;
using internal_search.Domain.Interfaces.Notificaciones;
using internal_search.Domain.Interfaces.Usuario;
using internal_search_backend.Business.helpers;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace internal_search_backend.Business.Services.Usuario
{
    public class RecuperacionClaveService : IRecuperacionClaveService
    {
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IPasswordResetRepository _resetRepository;
        private readonly IContrasenaRepository _contrasena;
        private readonly IEmailSender _email;
        private readonly RecuperacionClaveOptions _options;
        private readonly ILogger<RecuperacionClaveService> _logger;

        public RecuperacionClaveService(
            IUsuarioRepository usuarioRepository,
            IPasswordResetRepository resetRepository,
            IContrasenaRepository contrasena,
            IEmailSender email,
            RecuperacionClaveOptions options,
            ILogger<RecuperacionClaveService> logger)
        {
            _usuarioRepository = usuarioRepository;
            _resetRepository = resetRepository;
            _contrasena = contrasena;
            _email = email;
            _options = options;
            _logger = logger;
        }

        public async Task SolicitarRecuperacionAsync(string identificador, string? ip)
        {
            try
            {
                var usuario = await _usuarioRepository
                    .ObtenerActivoPorLoginOCorreoAsync(identificador.Trim());

                if (usuario == null || string.IsNullOrWhiteSpace(usuario.Correo))
                    return;

                await EmitirAsync(usuario, PasswordResetToken.TipoRecuperacion,
                    TimeSpan.FromMinutes(_options.VigenciaRecuperacionMinutos), ip);
            }
            catch (Exception ex)
            {
                // La respuesta al cliente debe ser idéntica exista o no el usuario
                _logger.LogError(ex, "Falló la solicitud de recuperación de clave.");
            }
        }

        public async Task<bool> EnviarInvitacionAsync(Usuarios usuario, string? ip)
        {
            try
            {
                await EmitirAsync(usuario, PasswordResetToken.TipoInvitacion,
                    TimeSpan.FromHours(_options.VigenciaInvitacionHoras), ip);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudo enviar la invitación al usuario {CodUsuario}.", usuario.CodUsuario);
                return false;
            }
        }

        public async Task<int> RestablecerAsync(string token, string nuevaClave)
        {
            var error = ValidadorClave.Validar(nuevaClave);
            if (error != null)
                throw new ArgumentException(error);

            var codUsuario = await _resetRepository.RestablecerAsync(
                Hash(token.Trim()),
                _contrasena.Hashear(nuevaClave),
                DateTime.UtcNow);

            return codUsuario
                ?? throw new ArgumentException("El enlace no es válido o ya expiró. Solicita uno nuevo.");
        }

        private async Task EmitirAsync(Usuarios usuario, byte tipo, TimeSpan vigencia, string? ip)
        {
            var token = GenerarToken();
            var ahora = DateTime.UtcNow;

            await _resetRepository.InvalidarPendientesAsync(usuario.CodUsuario);
            await _resetRepository.CrearAsync(new PasswordResetToken
            {
                CodUsuario = usuario.CodUsuario,
                TokenHash = Hash(token),
                Tipo = tipo,
                FechaCreo = ahora,
                FechaExpira = ahora.Add(vigencia),
                IpSolicitud = ip
            });

            var enlace = $"{_options.FrontendResetUrl}?token={Uri.EscapeDataString(token)}";
            var nombre = WebUtility.HtmlEncode(usuario.Nombres);
            var sistema = WebUtility.HtmlEncode(_options.NombreSistema);
            var login = WebUtility.HtmlEncode(usuario.UsuarioLogin);

            string asunto, cuerpo;
            if (tipo == PasswordResetToken.TipoInvitacion)
            {
                asunto = $"Bienvenido a {_options.NombreSistema}";
                cuerpo = PlantillaCorreo.Construir(
                    "Te damos la bienvenida",
                    $"<p>Hola {nombre},</p>" +
                    $"<p>Ya creamos tu cuenta en {sistema}. Tu usuario es <b>{login}</b>.</p>" +
                    $"<p>Define tu contraseña con el botón de abajo. El enlace es válido por {_options.VigenciaInvitacionHoras} horas y de un solo uso.</p>",
                    "Definir contraseña",
                    enlace,
                    LogoUrl());
            }
            else
            {
                asunto = $"Recupera tu contraseña - {_options.NombreSistema}";
                cuerpo = PlantillaCorreo.Construir(
                    "Recupera tu contraseña",
                    $"<p>Hola {nombre},</p>" +
                    $"<p>Recibimos una solicitud para restablecer tu contraseña en {sistema}.</p>" +
                    $"<p>Usa el botón de abajo. El enlace es válido por {_options.VigenciaRecuperacionMinutos} minutos y de un solo uso.</p>" +
                    "<p>Si no fuiste tú, ignora este mensaje: tu contraseña no cambia.</p>",
                    "Restablecer contraseña",
                    enlace,
                    LogoUrl());
            }

            await _email.EnviarAsync(usuario.Correo!, asunto, cuerpo);
        }

        // Logo completo a color del manual de marca, servido por el frontend (o LogoUrl si se configura)
        private string? LogoUrl()
        {
            if (!string.IsNullOrWhiteSpace(_options.LogoUrl))
                return _options.LogoUrl;

            return Uri.TryCreate(_options.FrontendResetUrl, UriKind.Absolute, out var uri)
                ? $"{uri.GetLeftPart(UriPartial.Authority)}/images/image.png"
                : null;
        }

        private static string GenerarToken() =>
            Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                .TrimEnd('=').Replace('+', '-').Replace('/', '_');

        private static string Hash(string token) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
    }
}
