<#
.SYNOPSIS
    Mantiene la API del servidor al día con GitHub: cada pocos minutos mira si hay un commit nuevo en la rama
    principal, lo compila, reemplaza la API y comprueba que arranque. Si no arranca, vuelve a la versión anterior.

.DESCRIPTION
    Para el servidor de la oficina donde corre el servicio de Windows "BuscadorApi" (ver instalar-servicio.ps1).

    Cada ejecución (la lanza una tarea programada cada 2 minutos, como SYSTEM):
      1. Pregunta a GitHub cuál es el último commit de la rama. Casi siempre no hay novedades (consulta gratuita).
      2. Si hay uno nuevo: descarga las fuentes, las compila con un SDK de .NET propio (C:\Buscador\dotnet, se
         descarga la primera vez) y compara el resultado con la API instalada. Si es idéntico (por ejemplo, cambió
         solo la documentación) no reinicia nada.
      3. Si cambió: guarda una copia de la API actual, detiene el servicio, copia la versión nueva (la configuración
         instalada no se toca), lo inicia y espera a que /health responda. Si no arranca, restaura la copia y no
         vuelve a intentar ese commit: espera uno nuevo.

    Qué mirar: C:\Buscador\actualizador\estado.txt (último resultado) y actualizador.log (detalle).

    Importante: todo lo que llegue a la rama principal se despliega solo, sin pasos de revisión. Los cambios que
    necesiten un script SQL en la base deben ejecutarse ANTES de subir el código que los usa. Si el repositorio pasa a
    ser privado, guardar un token de solo lectura en C:\Buscador\actualizador\github-token.txt.

.PARAMETER Instalar
    La primera vez, como administrador: copia este script a C:\Buscador\actualizador, hace la primera actualización
    (instala el SDK de .NET y compila: tarda varios minutos) y registra la tarea programada.

.PARAMETER Desinstalar
    Quita la tarea programada. La API y el servicio quedan como están.

.PARAMETER Forzar
    Despliega aunque el commit sea el que ya está instalado (igual no reinicia si el programa es idéntico).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\actualizar.ps1 -Instalar
#>
[CmdletBinding()]
param(
    [switch]$Instalar,
    [switch]$Desinstalar,
    [string]$Raiz = 'C:\Buscador',
    [string]$Repositorio = 'Sulotec/buscador-interno',
    [string]$Rama = 'main',
    [string]$Servicio = 'BuscadorApi',
    [string]$Dotnet,
    [switch]$Forzar
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # la barra de progreso de Invoke-WebRequest vuelve lentas las descargas en PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$rutaScript = $MyInvocation.MyCommand.Path
$carpetaApi = Join-Path $Raiz 'api'
$carpetaAnterior = Join-Path $Raiz 'api.anterior'
$carpetaAct = Join-Path $Raiz 'actualizador'
$trabajo = Join-Path $carpetaAct 'trabajo'
$archivoLog = Join-Path $carpetaAct 'actualizador.log'
$archivoVersion = Join-Path $carpetaAct 'version.txt'
$archivoFallido = Join-Path $carpetaAct 'fallido.txt'
$archivoEtag = Join-Path $carpetaAct 'etag.txt'
$archivoEstado = Join-Path $carpetaAct 'estado.txt'
$archivoToken = Join-Path $carpetaAct 'github-token.txt'
$marcador = Join-Path $carpetaAct 'en-curso.txt'
$nombreTarea = 'BuscadorApi-Actualizador'
if (-not $Dotnet) { $Dotnet = Join-Path $Raiz 'dotnet\dotnet.exe' }

# ---------------------------------------------------------------------------------------------------------------
# Utilidades

function Log([string]$texto, [string]$nivel = 'INFO') {
    if (-not (Test-Path -LiteralPath $carpetaAct)) { New-Item -ItemType Directory -Force -Path $carpetaAct | Out-Null }
    # El registro se rota para que no crezca sin límite
    if ((Test-Path -LiteralPath $archivoLog) -and ((Get-Item -LiteralPath $archivoLog).Length -gt 2MB)) {
        Move-Item -LiteralPath $archivoLog -Destination ($archivoLog + '.1') -Force
    }
    $linea = '{0:yyyy-MM-dd HH:mm:ss} [{1}] {2}' -f (Get-Date), $nivel, $texto
    Add-Content -LiteralPath $archivoLog -Value $linea -Encoding UTF8
    if ([Environment]::UserInteractive) { Write-Host $linea }
}

function Leer([string]$ruta) {
    if (Test-Path -LiteralPath $ruta) {
        $texto = Get-Content -LiteralPath $ruta -Raw
        if ($texto) { return $texto.Trim() }
    }
    return ''
}

function Guardar([string]$ruta, [string]$valor) { Set-Content -LiteralPath $ruta -Value $valor -Encoding ASCII }

function Estado([string]$texto) { Guardar $archivoEstado ('{0:yyyy-MM-dd HH:mm} {1}' -f (Get-Date), $texto) }

function Obtener-Puerto {
    try {
        $urls = (Get-Content -LiteralPath (Join-Path $carpetaApi 'appsettings.Production.json') -Raw | ConvertFrom-Json).Urls
        if ($urls -match ':(\d+)') { return [int]$Matches[1] }
    }
    catch { }
    return 8090
}

function Comprobar-Espacio {
    $unidad = New-Object System.IO.DriveInfo -ArgumentList ([System.IO.Path]::GetPathRoot($Raiz))
    if ($unidad.AvailableFreeSpace -lt 2GB) {
        throw ('Poco espacio libre en {0}: {1} MB (hacen falta al menos 2048 MB).' -f $unidad.Name, [int]($unidad.AvailableFreeSpace / 1MB))
    }
}

# ---------------------------------------------------------------------------------------------------------------
# Servicio y salud de la API

function Detener-Api {
    $s = Get-Service -Name $Servicio -ErrorAction SilentlyContinue
    if ($s -and $s.Status -ne 'Stopped') {
        Stop-Service -Name $Servicio -Force
        $s.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(60))
    }
}

function Iniciar-Api { Start-Service -Name $Servicio }

# 200 = todo bien, 503 = la API vive pero no alcanza la base de datos, 0 = no responde
function Estado-Salud([int]$puerto) {
    try {
        return [int](Invoke-WebRequest -Uri "http://127.0.0.1:$puerto/health" -UseBasicParsing -TimeoutSec 10).StatusCode
    }
    catch [System.Net.WebException] {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    }
    catch { return 0 }
}

# Espera hasta 75 s a que la API responda 200. Devuelve el último estado visto (503 = sin base de datos; 0 = no arrancó)
function Esperar-Estado([int]$puerto) {
    $fin = (Get-Date).AddSeconds(75)
    $estado = 0
    while ((Get-Date) -lt $fin) {
        Start-Sleep -Seconds 3
        $estado = Estado-Salud $puerto
        if ($estado -eq 200) { return 200 }
    }
    return $estado
}

# ---------------------------------------------------------------------------------------------------------------
# Copias y comparaciones

# Deja el destino idéntico al origen. La configuración instalada (appsettings.Production.json) no se toca nunca.
function Copiar-Carpeta([string]$origen, [string]$destino) {
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'   # en PowerShell 5.1 lo que un programa escribe en stderr no debe cortar el script
    try {
        & robocopy.exe $origen $destino /MIR /XF appsettings.Production.json /R:5 /W:2 /NFL /NDL /NJH /NJS /NP | Out-Null
        $codigo = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $anterior }
    if ($codigo -gt 7) { throw "robocopy falló (código $codigo) al copiar '$origen' a '$destino'." }
}

# Huella de todos los archivos de la carpeta (menos la configuración instalada): dos carpetas con la misma huella son iguales
function Huella-Carpeta([string]$carpeta) {
    $base = (Resolve-Path -LiteralPath $carpeta).Path.TrimEnd('\')
    $lineas = Get-ChildItem -LiteralPath $base -Recurse -File |
        Where-Object { $_.Name -ne 'appsettings.Production.json' } |
        Sort-Object FullName |
        ForEach-Object { $_.FullName.Substring($base.Length) + ':' + (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    return [BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes(($lineas -join "`n"))))
}

function Restaurar-Anterior {
    Detener-Api
    Copiar-Carpeta $carpetaAnterior $carpetaApi
    Iniciar-Api
}

# ---------------------------------------------------------------------------------------------------------------
# GitHub y compilación

function Cabeceras-GitHub {
    $h = @{ 'Accept' = 'application/vnd.github+json' }
    $token = Leer $archivoToken
    if ($token) { $h['Authorization'] = "Bearer $token" }
    return $h
}

# Último commit de la rama: @{ Sha; Etag }. Devuelve $null si no hay novedades (304, no cuenta contra el límite de
# GitHub) o si GitHub no respondió (se vuelve a intentar en la próxima ejecución).
function Obtener-UltimoCommit {
    $h = Cabeceras-GitHub
    $etag = Leer $archivoEtag
    if ($etag -and (Test-Path -LiteralPath $archivoVersion)) { $h['If-None-Match'] = $etag }
    try {
        $r = Invoke-WebRequest -Uri "https://api.github.com/repos/$Repositorio/commits/$Rama" -Headers $h -UserAgent 'BuscadorActualizador' -UseBasicParsing -TimeoutSec 30
        return @{ Sha = [string](ConvertFrom-Json $r.Content).sha; Etag = [string]$r.Headers['ETag'] }
    }
    catch [System.Net.WebException] {
        $respuesta = $_.Exception.Response
        if ($respuesta -and [int]$respuesta.StatusCode -eq 304) { return $null }
        Log "No se pudo consultar GitHub: $($_.Exception.Message)" 'AVISO'
        return $null
    }
}

function Asegurar-Sdk {
    if (Test-Path -LiteralPath $Dotnet) { return }
    Log 'Instalando el SDK de .NET 10 (una sola vez; son unos 250 MB)...'
    $instalador = Join-Path $carpetaAct 'dotnet-install.ps1'
    Invoke-WebRequest -Uri 'https://dot.net/v1/dotnet-install.ps1' -OutFile $instalador -UseBasicParsing -TimeoutSec 120
    & $instalador -Channel 10.0 -InstallDir (Split-Path -Parent $Dotnet) -NoPath
    if (-not (Test-Path -LiteralPath $Dotnet)) { throw 'No se pudo instalar el SDK de .NET.' }
}

# Descarga las fuentes del commit y devuelve la carpeta donde quedan
function Descargar-Fuentes([string]$sha) {
    $zip = Join-Path $trabajo 'fuentes.zip'
    Invoke-WebRequest -Uri "https://api.github.com/repos/$Repositorio/zipball/$sha" -Headers (Cabeceras-GitHub) -UserAgent 'BuscadorActualizador' -OutFile $zip -UseBasicParsing -TimeoutSec 900
    $extraido = Join-Path $trabajo 'extraido'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $extraido)
    # GitHub mete todo en una carpeta "<repo>-<sha>". Se renombra a un nombre fijo: así las rutas que la compilación
    # incrusta no dependen del commit y el resultado es idéntico cuando el código no cambió.
    $interna = Get-ChildItem -LiteralPath $extraido -Directory | Select-Object -First 1
    $fuentes = Join-Path $trabajo 'fuentes'
    Move-Item -LiteralPath $interna.FullName -Destination $fuentes
    return $fuentes
}

function Compilar([string]$fuentes, [string]$destino) {
    $csproj = Join-Path $fuentes 'api\internal-search-backend\internal-search-backend.Api.csproj'
    if (-not (Test-Path -LiteralPath $csproj)) { throw 'No encuentro api\internal-search-backend\internal-search-backend.Api.csproj en las fuentes descargadas.' }

    $env:DOTNET_CLI_HOME = Join-Path $carpetaAct 'dotnet-home'
    $env:NUGET_PACKAGES = Join-Path $Raiz 'nuget'
    $env:DOTNET_NOLOGO = '1'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
    $env:MSBUILDDISABLENODEREUSE = '1'

    $registro = Join-Path $trabajo 'compilacion.log'
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Dotnet publish $csproj -c Release -r win-x64 --self-contained true -o $destino --nologo --disable-build-servers -p:ContinuousIntegrationBuild=true *> $registro
        $codigo = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $anterior }

    if ($codigo -ne 0) {
        Copy-Item -LiteralPath $registro -Destination (Join-Path $carpetaAct 'ultima-compilacion-fallida.log') -Force
        throw "La compilación falló (código $codigo). Detalle en $carpetaAct\ultima-compilacion-fallida.log"
    }
}

# Si el actualizador del repositorio cambió y no tiene errores de sintaxis, reemplaza al instalado (se usa desde la próxima ejecución)
function Autoactualizar-Script([string]$fuentes) {
    $nuevo = Join-Path $fuentes 'api\deploy\windows\actualizar.ps1'
    $actual = Join-Path $carpetaAct 'actualizar.ps1'
    if (-not (Test-Path -LiteralPath $nuevo) -or -not (Test-Path -LiteralPath $actual)) { return }
    if ((Get-FileHash -LiteralPath $nuevo).Hash -eq (Get-FileHash -LiteralPath $actual).Hash) { return }

    $errores = $null
    $tokens = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($nuevo, [ref]$tokens, [ref]$errores)
    if ($errores.Count -gt 0) {
        Log 'El actualizador del repositorio tiene errores de sintaxis: se sigue usando el instalado.' 'AVISO'
        return
    }
    Copy-Item -LiteralPath $nuevo -Destination $actual -Force
    Log 'El actualizador se actualizó desde el repositorio (se usará en la próxima ejecución).'
}

# ---------------------------------------------------------------------------------------------------------------
# Una actualización

function Actualizar([bool]$forzado) {
    $consulta = Obtener-UltimoCommit
    if (-not $consulta) { return }

    $sha = $consulta.Sha
    $corto = $sha.Substring(0, 7)
    $instalada = Leer $archivoVersion

    if (-not $forzado) {
        # Ya instalado, o ya falló (no se reintenta hasta que llegue otro commit)
        if ($sha -eq $instalada -or $sha -eq (Leer $archivoFallido)) {
            Guardar $archivoEtag $consulta.Etag
            return
        }
    }

    $instaladaCorta = 'ninguno'
    if ($instalada) { $instaladaCorta = $instalada.Substring(0, 7) }
    Log "Commit nuevo en GitHub: $corto (instalado: $instaladaCorta)."

    Comprobar-Espacio
    Remove-Item -LiteralPath $trabajo -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $trabajo | Out-Null

    # 1) Descargar y compilar. Si falla la red no se anota nada y se reintenta en la próxima ejecución.
    try {
        Asegurar-Sdk
        $fuentes = Descargar-Fuentes $sha
    }
    catch {
        Log "No se pudo preparar la compilación: $($_.Exception.Message)" 'ERROR'
        Estado "ERROR preparando $corto (se reintenta)"
        return
    }
    Autoactualizar-Script $fuentes

    $publicado = Join-Path $trabajo 'publicado'
    Guardar $marcador 'compilando'
    try { Compilar $fuentes $publicado }
    catch {
        Log $_.Exception.Message 'ERROR'
        Guardar $archivoFallido $sha
        Guardar $archivoEtag $consulta.Etag
        Estado "ERROR compilando $corto (sigue la versión instalada)"
        return
    }

    # 2) ¿Cambió algo respecto a lo instalado?
    if ((Huella-Carpeta $publicado) -eq (Huella-Carpeta $carpetaApi)) {
        Log 'El programa compilado es idéntico al instalado (cambió solo documentación u otros archivos): no se reinicia nada.'
        Guardar $archivoVersion $sha
        Guardar $archivoEtag $consulta.Etag
        Estado "OK $corto (sin cambios en el programa)"
        return
    }

    # 3) Reemplazar
    $puerto = Obtener-Puerto
    $previa = Estado-Salud $puerto
    Guardar $marcador 'reemplazando'
    Log "Reemplazando la API (estado antes de actualizar: $previa)..."
    Copiar-Carpeta $carpetaApi $carpetaAnterior   # copia de seguridad, con la API todavía en marcha
    $nueva = 0
    try {
        Detener-Api
        Copiar-Carpeta $publicado $carpetaApi
        Iniciar-Api
        $nueva = Esperar-Estado $puerto
    }
    catch { Log "Error al reemplazar: $($_.Exception.Message)" 'ERROR' }

    # Bien = responde 200; o responde 503 cuando ya respondía 503 antes (la base de datos está caída, no es culpa del código nuevo)
    if ($nueva -eq 200 -or ($nueva -eq 503 -and $previa -eq 503)) {
        if ($nueva -eq 503) { Log 'La API nueva arrancó pero no alcanza la base de datos (igual que antes de actualizar).' 'AVISO' }
        Guardar $archivoVersion $sha
        Guardar $archivoEtag $consulta.Etag
        Log "API actualizada a $corto."
        Estado "OK $corto desplegada"
        return
    }

    # 4) No arrancó bien: se vuelve a la versión anterior y no se reintenta este commit
    Log "La versión nueva no arrancó bien (estado $nueva). Se vuelve a la anterior." 'ERROR'
    try {
        Restaurar-Anterior
        $tras = Esperar-Estado $puerto
        Log "Versión anterior restaurada (estado $tras)." 'AVISO'
    }
    catch { Log "No se pudo restaurar la versión anterior: $($_.Exception.Message). Revisar el servidor." 'ERROR' }
    Guardar $archivoFallido $sha
    Guardar $archivoEtag $consulta.Etag
    Estado "ERROR $corto no arrancó; se restauró la anterior"
}

function Invoke-Actualizacion([bool]$forzado) {
    if (-not (Test-Path -LiteralPath $carpetaApi)) {
        Log "No existe ${carpetaApi}: primero hay que instalar la API (instalar.bat)." 'ERROR'
        return
    }
    New-Item -ItemType Directory -Force -Path $carpetaAct | Out-Null

    # Una sola ejecución a la vez; y si una anterior se interrumpió (corte de luz, reinicio) se deja todo en orden
    if (Test-Path -LiteralPath $marcador) {
        $edad = (Get-Date) - (Get-Item -LiteralPath $marcador).LastWriteTime
        if ($edad.TotalMinutes -lt 40) {
            Log 'Hay otra actualización en curso: se omite esta ejecución.'
            return
        }
        $fase = Leer $marcador
        Log "Se encontró una actualización interrumpida (fase: $fase)." 'AVISO'
        if ($fase -eq 'reemplazando' -and (Test-Path -LiteralPath $carpetaAnterior)) {
            Log 'Se restaura la versión anterior.' 'AVISO'
            Restaurar-Anterior
        }
        Remove-Item -LiteralPath $marcador -Force
    }
    Guardar $marcador 'consultando'

    try { Actualizar $forzado }
    catch {
        Log "Error inesperado: $($_.Exception.Message)" 'ERROR'
        Estado "ERROR $($_.Exception.Message)"
    }
    finally {
        Remove-Item -LiteralPath $marcador -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $trabajo -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ---------------------------------------------------------------------------------------------------------------
# Instalación de la tarea programada

function Registrar-Tarea([string]$script) {
    $accion = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}" -Raiz "{1}"' -f $script, $Raiz)
    # Cada 2 minutos, y también al arrancar el equipo (por si se reinició a mitad de una actualización)
    $cadaDosMinutos = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
        -RepetitionInterval (New-TimeSpan -Minutes 2) -RepetitionDuration (New-TimeSpan -Days 3650)
    $alArrancar = New-ScheduledTaskTrigger -AtStartup
    $opciones = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
        -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    $cuenta = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName $nombreTarea -Action $accion -Trigger @($cadaDosMinutos, $alArrancar) `
        -Settings $opciones -Principal $cuenta -Description 'Mantiene la API del Buscador al día con GitHub (ver actualizar.ps1).' -Force | Out-Null
}

function Instalar-Actualizador {
    $esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $esAdmin) { throw 'Ejecuta esto como administrador.' }
    if (-not (Get-Service -Name $Servicio -ErrorAction SilentlyContinue)) {
        throw "No existe el servicio ${Servicio}: primero instala la API (instalar.bat)."
    }
    if (-not $rutaScript) { throw 'No pude determinar la ruta de este script.' }

    New-Item -ItemType Directory -Force -Path $carpetaAct | Out-Null
    $destino = Join-Path $carpetaAct 'actualizar.ps1'
    if ($rutaScript -ne $destino) { Copy-Item -LiteralPath $rutaScript -Destination $destino -Force }

    Log 'Primera actualización: instala el SDK de .NET (si falta) y compila. Puede tardar varios minutos.'
    Invoke-Actualizacion $true
    Registrar-Tarea $destino

    Log "Actualización automática ACTIVA: la tarea '$nombreTarea' revisa GitHub cada 2 minutos."
    Log ('Último resultado: ' + (Leer $archivoEstado))
    Log "Para ver el estado en cualquier momento:  type $archivoEstado"
}

function Desinstalar-Actualizador {
    Unregister-ScheduledTask -TaskName $nombreTarea -Confirm:$false -ErrorAction SilentlyContinue
    Log 'Actualización automática desactivada (la API y el servicio siguen como están).'
}

# ---------------------------------------------------------------------------------------------------------------
# Punto de entrada (no se ejecuta si el script se carga con punto, p. ej. en pruebas)

if ($MyInvocation.InvocationName -ne '.') {
    if ($Desinstalar) { Desinstalar-Actualizador }
    elseif ($Instalar) { Instalar-Actualizador }
    else {
        try { Invoke-Actualizacion $Forzar.IsPresent }
        catch { Log "Error inesperado: $($_.Exception.Message)" 'ERROR' }
    }
}
