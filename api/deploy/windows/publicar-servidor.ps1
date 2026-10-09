<#
.SYNOPSIS
    Arma el paquete para instalar la API como servicio de Windows en el servidor de la oficina.

.DESCRIPTION
    Se ejecuta en la PC de desarrollo (necesita el SDK de .NET 10). Compila la API autocontenida para Windows x64
    (el servidor no necesita instalar .NET) y deja en artifacts\:
        buscador-servidor\   la carpeta lista para copiar al servidor
        buscador-servidor.zip  la misma carpeta comprimida

    En el servidor, dentro de la carpeta descomprimida, se ejecuta instalar-servicio.ps1 como administrador.

.PARAMETER IncluirEnv
    Copia al paquete el .env de la raíz del repositorio (con los secretos reales). Cómodo, pero trata el .zip como
    una contraseña: no lo subas a ningún sitio ni lo envíes por correo.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File deploy\windows\publicar-servidor.ps1
#>
[CmdletBinding()]
param([switch]$IncluirEnv)

$ErrorActionPreference = 'Stop'

$aqui = $PSScriptRoot
if (-not $aqui -and $MyInvocation.MyCommand.Path) { $aqui = Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $aqui) { $aqui = (Get-Location).Path }

$raiz = (Resolve-Path -LiteralPath (Join-Path $aqui '..\..')).Path
$carpeta = Join-Path $raiz 'artifacts\buscador-servidor'
$zip = Join-Path $raiz 'artifacts\buscador-servidor.zip'

if (Test-Path -LiteralPath $carpeta) { Remove-Item -LiteralPath $carpeta -Recurse -Force }
New-Item -ItemType Directory -Force -Path $carpeta | Out-Null

Write-Host '==> Compilando la API (Windows x64, autocontenida)' -ForegroundColor Cyan
& dotnet publish (Join-Path $raiz 'internal-search-backend\internal-search-backend.Api.csproj') `
    -c Release -r win-x64 --self-contained true -o (Join-Path $carpeta 'api') --nologo
if ($LASTEXITCODE -ne 0) { throw 'Falló dotnet publish.' }

# Solo sirven en desarrollo: la configuración del servidor la genera el instalador
Remove-Item -LiteralPath (Join-Path $carpeta 'api\appsettings.Development.json') -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $carpeta 'api\appsettings.example.json') -ErrorAction SilentlyContinue

Copy-Item -LiteralPath (Join-Path $aqui 'instalar-servicio.ps1') -Destination $carpeta
Copy-Item -LiteralPath (Join-Path $aqui 'instalar.bat') -Destination $carpeta
Copy-Item -LiteralPath (Join-Path $raiz '.env.example') -Destination $carpeta

if ($IncluirEnv) {
    $archivoEnv = Join-Path $raiz '.env'
    if (-not (Test-Path -LiteralPath $archivoEnv)) { throw "No existe $archivoEnv." }
    Copy-Item -LiteralPath $archivoEnv -Destination $carpeta
    Write-Host '    El paquete incluye el .env con los secretos: cuídalo como una contraseña.' -ForegroundColor Yellow
}

$leeme = @'
BUSCADOR - API COMO SERVICIO DE WINDOWS

1. Copia esta carpeta al servidor (por ejemplo a C:\Instalar\buscador).
2. Si no vino incluido, copia ahí también el archivo .env (el mismo que usa Docker; plantilla: .env.example).
3. Haz doble clic en instalar.bat (pide permisos de administrador y deja la ventana abierta al final).
   Es lo mismo que abrir PowerShell COMO ADMINISTRADOR en esa carpeta y ejecutar:

       powershell -ExecutionPolicy Bypass -File .\instalar-servicio.ps1

   Para actualizar a una versión nueva: reemplaza la carpeta api y vuelve a ejecutar el mismo comando
   (sin el .env se conserva la configuración instalada).
   Para quitar el servicio: agrega -Desinstalar.

4. Al terminar, sigue las instrucciones que imprime (publicar la API por HTTPS) y borra el .env y el .zip.

Más detalle: DESPLIEGUE.md del repositorio.
'@
Set-Content -LiteralPath (Join-Path $carpeta 'LEEME.txt') -Value $leeme -Encoding UTF8

Write-Host '==> Comprimiendo' -ForegroundColor Cyan
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $carpeta '*') -DestinationPath $zip

$mb = [math]::Round((Get-Item -LiteralPath $zip).Length / 1MB, 1)
Write-Host "Listo: $zip ($mb MB)" -ForegroundColor Green
Write-Host "Carpeta sin comprimir: $carpeta"
