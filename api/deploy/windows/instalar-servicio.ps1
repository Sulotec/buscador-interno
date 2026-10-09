#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala (o actualiza) la API del Buscador como servicio de Windows en el servidor de la oficina.

.DESCRIPTION
    Para una máquina que está siempre encendida y en la misma red que la base de datos. A diferencia de Docker
    Desktop, un servicio de Windows arranca con el equipo sin que nadie inicie sesión y se reinicia solo si falla.

    Qué hace:
      1. Copia la API a C:\Buscador\api (al actualizar conserva la configuración y el historial).
      2. Genera la configuración (appsettings.Production.json) a partir del archivo .env, el mismo que usa Docker.
      3. Registra el servicio "BuscadorApi": arranque automático, cuenta sin privilegios (NT SERVICE\BuscadorApi)
         y reinicio automático si se cae.
      4. Lo inicia y comprueba que responde y alcanza la base de datos (GET /health).

    La API escucha solo en 127.0.0.1. Se publica hacia internet con un túnel (Tailscale Funnel ahora, Cloudflare
    Tunnel cuando haya dominio): ver DESPLIEGUE.md.

    Ejecutar en PowerShell como administrador, dentro de la carpeta descomprimida (api\, este script y el .env).

.PARAMETER Carpeta
    Dónde queda instalada. Sus permisos se restringen a administradores y al servicio.

.PARAMETER ArchivoEnv
    Archivo con la configuración. Por defecto, el .env junto a este script. Si no existe y ya hay una instalación,
    se conserva su configuración (así se actualiza solo el programa).

.PARAMETER Puerto
    Puerto local de la API (solo 127.0.0.1).

.PARAMETER Desinstalar
    Quita el servicio. Los archivos de la carpeta (historial incluido) se conservan.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\instalar-servicio.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\instalar-servicio.ps1 -Desinstalar
#>
[CmdletBinding()]
param(
    [string]$Carpeta = 'C:\Buscador',
    [string]$ArchivoEnv,
    [int]$Puerto = 8090,
    [string]$Nombre = 'BuscadorApi',
    [switch]$Desinstalar
)

$ErrorActionPreference = 'Stop'

# Carpeta de este script. $PSScriptRoot llega vacío si el script se lanza sin -File (basta un error de tecleo
# en el comando), así que hay respaldos: la ruta del propio script y, al final, la carpeta actual.
$aqui = $PSScriptRoot
if (-not $aqui -and $MyInvocation.MyCommand.Path) { $aqui = Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $aqui) { $aqui = (Get-Location).Path }
if (-not $ArchivoEnv) { $ArchivoEnv = Join-Path $aqui '.env' }

# Variables del .env que solo usa Docker Compose: la API no las necesita
$soloDocker = @('API_PUERTO', 'TUNNEL_TOKEN')
# Con este nombre escribe la API en el Visor de eventos (es el nombre de su ensamblado)
$origenEventos = 'internal-search-backend.Api'

function Paso([string]$texto) { Write-Host ''; Write-Host "==> $texto" -ForegroundColor Cyan }
function Ok([string]$texto) { Write-Host "    $texto" -ForegroundColor Green }
function Aviso([string]$texto) { Write-Host "    AVISO: $texto" -ForegroundColor Yellow }

# Ejecuta un programa externo y falla con su salida si termina con error (robocopy usa 0-7 como "bien")
function Invocar([string]$exe, [string[]]$argumentos, [int]$maximoOk = 0) {
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'   # en PowerShell 5.1 lo que un programa escribe en stderr no debe cortar el script
    try {
        $salida = & $exe @argumentos 2>&1 | Out-String
        $codigo = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $anterior }

    if ($codigo -gt $maximoOk) { throw "Falló '$exe $($argumentos -join ' ')' (código $codigo): $salida" }
}

# Lee un archivo .env (CLAVE=valor, # comentarios, comillas opcionales)
function Leer-ArchivoEnv([string]$ruta) {
    $valores = [ordered]@{}
    $ruta = (Resolve-Path -LiteralPath $ruta).Path   # .NET no usa la carpeta actual de PowerShell para rutas relativas
    foreach ($linea in [System.IO.File]::ReadAllLines($ruta)) {
        $texto = $linea.Trim()
        if ($texto -eq '' -or $texto.StartsWith('#')) { continue }

        $i = $texto.IndexOf('=')
        if ($i -lt 1) { continue }

        $clave = $texto.Substring(0, $i).Trim()
        $valor = $texto.Substring($i + 1).Trim()
        if ($valor.Length -ge 2 -and (($valor[0] -eq '"' -and $valor[-1] -eq '"') -or ($valor[0] -eq "'" -and $valor[-1] -eq "'"))) {
            $valor = $valor.Substring(1, $valor.Length - 2)
        }
        $valores[$clave] = $valor
    }
    return $valores
}

# Falla antes de instalar nada si el .env está incompleto o sigue con los valores de ejemplo
function Validar-Configuracion($valores) {
    $faltan = @()
    foreach ($clave in 'ConnectionStrings__DefaultConnection', 'Jwt__Key', 'Cors__Origins__0') {
        if (-not $valores.Contains($clave) -or [string]::IsNullOrWhiteSpace($valores[$clave])) { $faltan += $clave }
    }
    if ($faltan.Count -gt 0) { throw "Faltan valores en el .env: $($faltan -join ', ')." }

    if ($valores['Jwt__Key'].Length -lt 32) { throw 'Jwt__Key debe tener al menos 32 caracteres.' }

    foreach ($par in $valores.GetEnumerator()) {
        if ($par.Value -match 'USUARIO_APP|CLAVE_APP|tu-proyecto|tudominio') {
            throw "$($par.Key) sigue con el valor de ejemplo de .env.example: completa el .env real."
        }
    }
}

# Pasa las variables del .env al formato de appsettings: Jwt__Key -> "Jwt:Key" (el proveedor JSON acepta claves planas)
function Crear-Configuracion($valores, [int]$puerto, [string]$carpetaHistorial) {
    $config = [ordered]@{}
    foreach ($par in $valores.GetEnumerator()) {
        if ($soloDocker -contains $par.Key) { continue }
        $config[($par.Key -replace '__', ':')] = $par.Value
    }
    $config['Urls'] = "http://127.0.0.1:$puerto"
    $config['Historial:Carpeta'] = $carpetaHistorial
    return $config
}

$Carpeta = [System.IO.Path]::GetFullPath($Carpeta)
$servicio = Get-Service -Name $Nombre -ErrorAction SilentlyContinue

# ----------------------------------------------------------------------------------------------------------------
if ($Desinstalar) {
    Paso "Quitando el servicio $Nombre"
    if ($servicio) {
        if ($servicio.Status -ne 'Stopped') {
            Stop-Service -Name $Nombre -Force
            $servicio.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
        }
        Invocar 'sc.exe' @('delete', $Nombre)
        Ok 'Servicio eliminado.'
    }
    else { Ok 'El servicio no existe.' }
    Ok "Los archivos de $Carpeta se conservan (el historial incluido). Bórralos a mano si ya no los necesitas."
    return
}

# --- Comprobaciones previas: nada se toca hasta que todo esté en orden ---------------------------------------------
Paso 'Comprobando'
Ok "Instalador en: $aqui"

$paquete = Join-Path $aqui 'api'
if (-not (Test-Path -LiteralPath (Join-Path $paquete 'internal-search-backend.Api.exe'))) {
    throw "No encuentro '$paquete\internal-search-backend.Api.exe'. Descomprime el paquete completo y ejecuta el script desde esa carpeta."
}

if ([System.IO.Path]::GetPathRoot($Carpeta).TrimEnd('\') -eq $Carpeta.TrimEnd('\')) {
    throw "-Carpeta no puede ser la raíz de un disco (se restringen sus permisos). Usa por ejemplo C:\Buscador."
}

if (-not $servicio -and (Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue)) {
    throw "El puerto $Puerto ya lo usa otra aplicación. Vuelve a ejecutar con -Puerto y otro número."
}

$destinoApi = Join-Path $Carpeta 'api'
$historial = Join-Path $Carpeta 'historial'
$archivoConfig = Join-Path $destinoApi 'appsettings.Production.json'

$config = $null
if (Test-Path -LiteralPath $ArchivoEnv) {
    $valores = Leer-ArchivoEnv $ArchivoEnv
    Validar-Configuracion $valores
    $config = Crear-Configuracion $valores $Puerto $historial
    Ok "Configuración leída de $ArchivoEnv"
}
elseif (Test-Path -LiteralPath $archivoConfig) {
    Ok 'No hay .env junto al script: se conserva la configuración ya instalada.'
}
else {
    throw "No encuentro $ArchivoEnv. Copia ahí el .env (el mismo que usa Docker) y vuelve a ejecutar."
}

# Las fechas que escribe la aplicación usan la hora del equipo: debe ser la de Lima, como la oficina
if ((Get-TimeZone).Id -ne 'SA Pacific Standard Time') {
    Aviso "La zona horaria del servidor es '$((Get-TimeZone).Id)', no la de Lima: las fechas de creación saldrían desfasadas."
}

# --- Copia de archivos --------------------------------------------------------------------------------------------
Paso 'Copiando la API'
if ($servicio -and $servicio.Status -ne 'Stopped') {
    Stop-Service -Name $Nombre -Force
    $servicio.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
}

New-Item -ItemType Directory -Force -Path $destinoApi, $historial | Out-Null
# Un .zip descargado marca sus archivos como "de internet" y esa marca se copiaría con ellos
Get-ChildItem -LiteralPath $paquete -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
# /MIR deja la carpeta idéntica al paquete (quita lo que sobre); la configuración instalada se respeta
Invocar 'robocopy.exe' @($paquete, $destinoApi, '/MIR', '/XF', 'appsettings.Production.json', '/R:5', '/W:2', '/NFL', '/NDL', '/NJH', '/NJS', '/NP') 7
Ok "Programa en $destinoApi"

if ($config) {
    $json = $config | ConvertTo-Json
    [System.IO.File]::WriteAllText($archivoConfig, $json, (New-Object System.Text.UTF8Encoding($false)))
    Ok 'Configuración guardada en appsettings.Production.json'
}

# --- Servicio -----------------------------------------------------------------------------------------------------
Paso 'Registrando el servicio'
$exe = Join-Path $destinoApi 'internal-search-backend.Api.exe'

if (-not [System.Diagnostics.EventLog]::SourceExists($origenEventos)) {
    [System.Diagnostics.EventLog]::CreateEventSource($origenEventos, 'Application')
}

if (-not $servicio) {
    New-Service -Name $Nombre -BinaryPathName "`"$exe`"" -DisplayName 'Buscador interno - API' `
        -Description 'API del buscador interno. Escucha solo en 127.0.0.1; se publica con un túnel.' `
        -StartupType Automatic | Out-Null
    Ok "Servicio $Nombre creado."
}
else {
    # Directo en el registro: sc.exe config binPath= se complica con rutas que tienen espacios
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$Nombre" -Name ImagePath -Value "`"$exe`""
    Set-Service -Name $Nombre -StartupType Automatic
    Ok "Servicio $Nombre actualizado."
}

# Cuenta virtual del servicio: sin contraseña y sin privilegios. Solo puede leer su programa y escribir en el historial.
$cuenta = "NT SERVICE\$Nombre"
Invocar 'sc.exe' @('config', $Nombre, 'obj=', $cuenta)

# Si se cae, vuelve a levantarse (5 s, 15 s y 60 s; el contador se reinicia tras un día sin fallos)
Invocar 'sc.exe' @('failure', $Nombre, 'reset=', '86400', 'actions=', 'restart/5000/restart/15000/restart/60000')
Invocar 'sc.exe' @('failureflag', $Nombre, '1')

# Permisos: la carpeta contiene secretos (configuración), así que solo administradores, el sistema y el servicio.
# Se usan SID (*S-1-5-18 = SYSTEM, *S-1-5-32-544 = Administradores) porque el nombre del grupo cambia según el idioma de Windows.
Invocar 'icacls.exe' @($Carpeta, '/inheritance:r', '/grant:r', '*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F')
Invocar 'icacls.exe' @($Carpeta, '/grant', "${cuenta}:(RX)")                 # solo la carpeta raíz (sin heredar): poder recorrerla
Invocar 'icacls.exe' @($destinoApi, '/grant', "${cuenta}:(OI)(CI)RX")
Invocar 'icacls.exe' @($historial, '/grant', "${cuenta}:(OI)(CI)M")
Ok 'Permisos restringidos (administradores, sistema y la cuenta del servicio).'

# --- Inicio y comprobación ----------------------------------------------------------------------------------------
Paso 'Iniciando'
try { Start-Service -Name $Nombre }
catch { Aviso "El servicio no pudo iniciar: $($_.Exception.Message)" }

$url = "http://127.0.0.1:$Puerto/health"
$estado = 0
for ($intento = 0; $intento -lt 30; $intento++) {
    Start-Sleep -Seconds 2

    # Si se cayó al arrancar no tiene sentido esperar más
    if ((Get-Service -Name $Nombre).Status -notin 'Running', 'StartPending') { break }

    try {
        $estado = [int](Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).StatusCode
    }
    catch [System.Net.WebException] {
        # 503 llega aquí como excepción; sin respuesta (aún no escucha) no hay código
        $estado = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    }
    catch { $estado = 0 }

    if ($estado -eq 200 -or $estado -eq 503) { break }
}

if ($estado -eq 200) {
    Ok "Listo: la API responde en $url y alcanza la base de datos."
}
elseif ($estado -eq 503) {
    Aviso 'La API arrancó pero NO alcanza la base de datos. Revisa la cadena de conexión del .env y que este servidor llegue al SQL Server (puerto 1433).'
    Aviso 'Corrige y vuelve a ejecutar este script; el servicio ya queda instalado.'
}
else {
    Aviso "La API no respondió en $url."
    Aviso "Mira el motivo en el Visor de eventos (Registros de Windows > Aplicación) o con:"
    Aviso "  Get-EventLog -LogName Application -Newest 10 -EntryType Error,Warning | Format-List TimeGenerated,Source,Message"
}

# --- Siguiente paso -----------------------------------------------------------------------------------------------
$nombreTailscale = $null
try {
    $ts = Get-Command tailscale.exe -ErrorAction SilentlyContinue
    $rutaTs = if ($ts) { $ts.Source } elseif (Test-Path 'C:\Program Files\Tailscale\tailscale.exe') { 'C:\Program Files\Tailscale\tailscale.exe' } else { $null }
    if ($rutaTs) { $nombreTailscale = ((& $rutaTs status --json | ConvertFrom-Json).Self.DNSName).TrimEnd('.') }
}
catch { }

Paso 'Falta publicarla por HTTPS (una sola vez)'
Write-Host '    Con Tailscale (mientras no haya dominio). Antes mira "tailscale funnel status" y no uses un puerto que ya esté en uso:'
Write-Host '        tailscale set --unattended'
Write-Host "        tailscale funnel --bg --https=8443 http://127.0.0.1:$Puerto"
if ($nombreTailscale) {
    Write-Host "    La dirección pública sería: https://${nombreTailscale}:8443"
    Write-Host '    Ese valor va en Vercel como API_URL (y se vuelve a desplegar el front).'
}
Write-Host ''
Write-Host "    Ya terminaste: borra el .env y el .zip de esta carpeta (la configuración quedó en $destinoApi, con permisos restringidos)."
