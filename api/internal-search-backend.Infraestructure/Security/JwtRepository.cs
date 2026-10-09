using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Text;
namespace internal_search_backend.Infrastructure.Security;

using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using internal_search.Domain.Entities;
using internal_search.Domain.Interfaces.Auth;

public class JwtRepository : IJwtRepository 
{
    private readonly IConfiguration _configuration;

    public JwtRepository(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    // Antes se leía "ExpirationMinutes" mientras el appsettings definía "ExpiresInMinutes":
    // se aceptan ambas y por defecto son 15 minutos.
    private int DuracionMinutos => int.Parse(
        _configuration["Jwt:ExpiresInMinutes"]
        ?? _configuration["Jwt:ExpirationMinutes"]
        ?? "15");

    public int DuracionSegundos => DuracionMinutos * 60;

    public string GenerarToken(Usuarios usuario)
    {
        var jwtKey = _configuration["Jwt:Key"]
                     ?? throw new InvalidOperationException(
                         "No se configuró Jwt:Key");

        var jwtIssuer = _configuration["Jwt:Issuer"]
                        ?? throw new InvalidOperationException(
                            "No se configuró Jwt:Issuer");

        var jwtAudience = _configuration["Jwt:Audience"]
                          ?? throw new InvalidOperationException(
                              "No se configuró Jwt:Audience");

        var expirationMinutes = DuracionMinutos;

        var claims = new List<Claim>
        {
            new System.Security.Claims.Claim(
                JwtRegisteredClaimNames.Sub,
                usuario.CodUsuario.ToString()
            ),

            new System.Security.Claims.Claim(
                "UsuarioLogin",
                usuario.UsuarioLogin
            )
        };

        // iat permite invalidar los tokens emitidos antes de un cambio de clave (SesionesRevocadas)
        claims.Add(new System.Security.Claims.Claim(
            JwtRegisteredClaimNames.Iat,
            DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
            ClaimValueTypes.Integer64));

        claims.Add(new System.Security.Claims.Claim(
            JwtRegisteredClaimNames.Jti,
            Guid.NewGuid().ToString("N")));

        foreach (var ur in usuario.UsuarioRoles.Where(ur => ur.Estado == 1 && ur.Rol != null))
        {
            claims.Add(new System.Security.Claims.Claim(
                System.Security.Claims.ClaimTypes.Role,
                ur.Rol.NomRol));
        }

        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey));

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256);

        var expiration = DateTime.UtcNow.AddMinutes(
            expirationMinutes);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: expiration,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}