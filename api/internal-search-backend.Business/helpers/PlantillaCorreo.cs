using System.Net;

namespace internal_search_backend.Business.helpers
{
    // Correo transaccional con la identidad del Manual de marca Informa Perú 2026:
    // logo completo a color sobre fondo blanco, azul #1B4589, rojo #ED1C24 solo como filete,
    // texto #231F20, Leelawadee UI (alternativa Arial) y pie azul con texto blanco.
    public static class PlantillaCorreo
    {
        private const string Azul = "#1B4589";
        private const string Rojo = "#ED1C24";
        private const string Texto = "#231F20";
        private const string AzulClaro = "#E8ECF3";
        private const string Fuente = "'Leelawadee UI', Arial, sans-serif";

        // parrafosHtml debe venir ya codificado (WebUtility.HtmlEncode) por quien lo arma.
        // logoUrl debe ser una URL pública (los clientes de correo no ven archivos locales);
        // si no hay, se usa el nombre de la marca en texto.
        public static string Construir(string titulo, string parrafosHtml, string textoBoton, string enlace, string? logoUrl = null)
        {
            var enlaceAttr = WebUtility.HtmlEncode(enlace);

            var cabecera = string.IsNullOrWhiteSpace(logoUrl)
                ? $@"<span style=""font-family:{Fuente};font-size:22px;font-weight:bold;color:{Azul};"">Informa Perú</span>"
                : $@"<img src=""{WebUtility.HtmlEncode(logoUrl)}"" alt=""Informa Perú"" height=""52"" style=""display:block;height:52px;width:auto;border:0;"" />";

            return $@"<!DOCTYPE html>
<html lang=""es""><body style=""margin:0;padding:0;background:{AzulClaro};font-family:{Fuente};color:{Texto};"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:{AzulClaro};padding:24px 12px;"">
<tr><td align=""center"">
  <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;width:100%;background:#FFFFFF;"">
    <tr><td style=""background:#FFFFFF;padding:24px 28px 20px 28px;"">{cabecera}</td></tr>
    <tr><td style=""background:{Rojo};height:4px;line-height:4px;font-size:0;"">&nbsp;</td></tr>
    <tr><td style=""padding:32px 28px 8px 28px;font-family:{Fuente};"">
      <h1 style=""margin:0 0 16px 0;font-size:22px;color:{Azul};font-weight:bold;"">{WebUtility.HtmlEncode(titulo)}</h1>
      <div style=""font-size:15px;line-height:1.6;color:{Texto};"">{parrafosHtml}</div>
    </td></tr>
    <tr><td align=""left"" style=""padding:16px 28px 32px 28px;"">
      <a href=""{enlaceAttr}"" style=""display:inline-block;background:{Azul};color:#FFFFFF;text-decoration:none;font-family:{Fuente};font-weight:bold;font-size:15px;padding:12px 28px;border-radius:4px;"">{WebUtility.HtmlEncode(textoBoton)}</a>
    </td></tr>
    <tr><td style=""background:{Azul};padding:18px 28px;font-family:{Fuente};font-size:12px;color:#FFFFFF;line-height:1.6;"">
      ¿Necesitas ayuda? Escríbenos a <a href=""mailto:servicioalcliente@informaperu.com"" style=""color:#FFFFFF;"">servicioalcliente@informaperu.com</a> o llama al +51 939 861 521.<br/>
      <a href=""https://www.informaperu.com"" style=""color:#FFFFFF;"">www.informaperu.com</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>";
        }
    }
}
