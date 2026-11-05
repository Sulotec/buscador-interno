# Prueba local de los límites de peticiones de la API.
# Uso (en tu propia terminal, para que la clave no quede en ningún historial compartido):
#   powershell -ExecutionPolicy Bypass -File api\pruebas\probar-limites.ps1 -Usuario <usuario>
#   (pide la clave de forma oculta). Para probar también el caché de Redis agrega:  -DniCache 12345678
#
# Prueba 1 y 2 NO gastan tokens. La prueba 3 sube dos cargas masivas de 1 documento: la que se procesa
# cuesta 1 token (0 si usas una cuenta ADMIN GENERAL).

param(
    [Parameter(Mandatory = $true)][string]$Usuario,
    [string]$Api = 'http://127.0.0.1:8080',
    # DNI real para probar el caché (prueba 4). Si no se indica, la prueba 4 se omite.
    [string]$DniCache
)

$ErrorActionPreference = 'Stop'
$claveSegura = Read-Host "Clave de $Usuario" -AsSecureString
$clave = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($claveSegura))

function Estado([scriptblock]$peticion) {
    try { & $peticion | Out-Null; return 200 }
    catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { throw } }
}

# --- Login ---
$login = Invoke-RestMethod -Method Post "$Api/system/auth/login" -ContentType 'application/json' `
    -Body (@{ usuarioLogin = $Usuario; clave = $clave } | ConvertTo-Json)
$token = $login.token
if (-not $token) { Write-Host 'No se pudo iniciar sesión.' -ForegroundColor Red; exit 1 }
$cabeceras = @{ Authorization = "Bearer $token" }
Write-Host "Sesión iniciada como $Usuario`n" -ForegroundColor Green

$saldoInicial = (Invoke-RestMethod "$Api/system/tokens/mi-saldo" -Headers $cabeceras)

# --- Prueba 1: 60 consultas por minuto ---
# Cuerpo vacío: la API lo rechaza por validación (400) sin cobrar, pero igual cuenta para el límite.
Write-Host 'Prueba 1: 65 consultas seguidas (esperado: 60 x 400 y 5 x 429)'
$conteo = @{}
1..65 | ForEach-Object {
    $s = Estado { Invoke-WebRequest -Method Post "$Api/api/buscador/buscar" -Headers $cabeceras `
            -ContentType 'application/json' -Body '{}' -UseBasicParsing }
    $conteo[$s] = 1 + [int]$conteo[$s]
}
$conteo.GetEnumerator() | Sort-Object Name | ForEach-Object { "   HTTP $($_.Name): $($_.Value)" }
if ($conteo[429] -ge 1) { Write-Host '   OK: el límite por minuto funciona' -ForegroundColor Green }
else { Write-Host '   FALLO: no apareció ningún 429' -ForegroundColor Red }

# --- Prueba 2: más de 5000 documentos se rechaza antes de cobrar ---
Write-Host "`nPrueba 2: archivo con 5001 documentos (esperado: 400 y el saldo no cambia)"
$tmp = Join-Path $env:TEMP "limites-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory $tmp | Out-Null
$grande = Join-Path $tmp 'grande.txt'
(10000000..10005000 | ForEach-Object { "$_" }) | Set-Content -Encoding ascii $grande
$respuesta = & curl.exe -s -w "`n%{http_code}" -H "Authorization: Bearer $token" `
    -F "archivo=@$grande" -F "secciones=deuda" "$Api/api/buscador/masivo/exportar"
$lineas = $respuesta -split "`n"
"   HTTP $($lineas[-1]): $($lineas[0..($lineas.Count-2)] -join ' ')"
$saldoDespues = (Invoke-RestMethod "$Api/system/tokens/mi-saldo" -Headers $cabeceras)
"   Saldo antes: $($saldoInicial.saldo)  después: $($saldoDespues.saldo)  (ilimitado: $($saldoDespues.ilimitado))"

# --- Prueba 3: una carga masiva a la vez por usuario ---
Write-Host "`nPrueba 3: dos cargas masivas al mismo tiempo (esperado: una 200 y otra 429)"
$chico = Join-Path $tmp 'chico.txt'
'12345678' | Set-Content -Encoding ascii $chico
$procesos = 1..2 | ForEach-Object {
    $salida = Join-Path $tmp "carga$_.txt"
    Start-Process curl.exe -NoNewWindow -PassThru -RedirectStandardOutput $salida -ArgumentList @(
        '-s', '-o', 'NUL', '-w', '%{http_code}', '-H', "`"Authorization: Bearer $token`"",
        '-F', "`"archivo=@$chico`"", '-F', 'secciones=deuda', '-F', 'secciones=sueldos',
        '-F', 'secciones=calificacion', '-F', 'secciones=lineas-credito', '-F', 'secciones=moviles',
        "$Api/api/buscador/masivo/exportar")
}
$procesos | Wait-Process
$estados = 1..2 | ForEach-Object { (Get-Content (Join-Path $tmp "carga$_.txt") -Raw).Trim() }
"   Carga 1: HTTP $($estados[0])   Carga 2: HTTP $($estados[1])"
if ($estados -contains '429') { Write-Host '   OK: la segunda carga simultánea fue rechazada' -ForegroundColor Green }
else { Write-Host '   Ninguna fue rechazada: la primera terminó antes de que llegara la segunda. Repite la prueba o usa un archivo más grande.' -ForegroundColor Yellow }

Remove-Item -Recurse -Force $tmp

# --- Prueba 4: caché de consultas en Redis (opcional, cuesta 2 tokens) ---
if ($DniCache) {
    Write-Host "`nPrueba 4: mismo DNI dos veces (esperado: la segunda mucho más rápida)"
    Write-Host '   Espera 60 s para que se libere el límite por minuto de la prueba 1...'
    Start-Sleep 61
    $cuerpo = @{ tipoDocumento = 'DNI'; documento = $DniCache } | ConvertTo-Json
    $tiempos = 1..2 | ForEach-Object {
        (Measure-Command { Invoke-RestMethod -Method Post "$Api/api/buscador/buscar" -Headers $cabeceras `
            -ContentType 'application/json' -Body $cuerpo | Out-Null }).TotalMilliseconds
    }
    "   Primera (base de datos): $([int]$tiempos[0]) ms   Segunda (caché): $([int]$tiempos[1]) ms"
    if ($tiempos[1] -lt $tiempos[0] / 2) { Write-Host '   OK: la segunda salió del caché' -ForegroundColor Green }
    else { Write-Host '   Sin diferencia clara: el DNI ya estaba en caché o Redis no está activo' -ForegroundColor Yellow }
}
