# Límites de peticiones y Redis

Los límites protegen al servidor cuando muchos usuarios consultan a la vez. Una petición rechazada responde 429
antes de llegar al controlador, así que **no cobra tokens**.

## Límites

Configurados en `Program.cs` (`AddRateLimiter`) con valores de la sección `Limites` de `appsettings.json`
(o variables `Limites__*`), sin recompilar.

| Límite | Política | Clave | Valor por defecto | Variable |
|---|---|---|---|---|
| Cargas masivas a la vez, todo el sistema | `GlobalLimiter` (concurrencia) | `masivo-servidor` | 3, con 10 en fila | `Limites__MasivoSimultaneos`, `Limites__MasivoEnFila` |
| Cargas masivas a la vez por usuario | `masivo` (concurrencia, sin fila) | usuario | 1 | `Limites__MasivoPorUsuario` |
| Consultas individuales por usuario | `consultas` (ventana fija de 1 min) | usuario | 60 | `Limites__ConsultasPorMinuto` |
| Login y recuperación de clave | `auth` (ventana fija de 1 min) | IP | 10 | fijo en código |

- La "clave usuario" es el claim `NameIdentifier` del token; sin sesión, la IP. Por eso `UseRateLimiter()` va
  **después** de `UseAuthentication()`.
- El `GlobalLimiter` solo actúa sobre rutas que terminan en `/masivo/exportar`; para el resto no hay límite global.
- Las cargas de personas van en bloques de 500: cada bloque es una petición, así que entre bloques el usuario
  libera su lugar y las cargas de varias personas se turnan.
- El mensaje del 429 sale en `{ message }`, el formato que la web muestra (`OnRejected` en `Program.cs`).

## Redis

Redis cumple dos funciones:

1. **Contadores compartidos.** Con varias copias de la API, cada una contaría por separado (3 copias = 9 cargas a
   la vez). Con Redis todas leen el mismo contador. Librería: `RedisRateLimiting.AspNetCore`.
2. **Caché de consultas** (`Redis/CacheConsultas.cs`, `IDistributedCache`): búsqueda por documento, por teléfono y
   por RUC, durante `Cache__MinutosConsultas` (60 por defecto; 0 lo apaga). Claves `buscador:consulta:v2:<tipo>:<valor>`.

**Es opcional.** Sin `Redis__ConnectionString`, la API usa límites en memoria y no cachea. Si Redis se cae con la API
andando:

- los límites cambian solos a memoria (las claves llevan prefijo `r:` o `m:` para no mezclar limitadores);
- el caché se salta y la consulta va directo a SQL Server;
- los tiempos de espera hacia Redis están en 2 s (`RedisConfiguracion.cs`) para que una caída no frene la API.

**Seguridad del Redis de `docker-compose.yml`:** contraseña obligatoria (`REDIS_PASSWORD`, solo letras y números),
sin puertos publicados fuera de la red de Docker, sin persistencia en disco (guarda datos de personas) y 256 MB
como máximo con `volatile-lru`.

**Cuándo subir la versión del caché:** si cambia la forma de una respuesta cacheada (una sección o campo nuevo),
cambia `Prefijo` en `CacheConsultas.cs`. Lo anterior vence solo.

## Cómo probarlo en local

Con la API en Docker (`cd api && docker compose up -d --build`):

```powershell
powershell -ExecutionPolicy Bypass -File api\pruebas\probar-limites.ps1 -Usuario TU_USUARIO [-DniCache 12345678]
```

| Prueba | Esperado | Tokens |
|---|---|---|
| 65 consultas seguidas con cuerpo vacío | 60 × 400 y 5 × 429 | 0 |
| Archivo de 5001 documentos | 400 y el saldo no cambia | 0 |
| Dos cargas masivas a la vez, mismo usuario | Una 200 y otra 429 | 1 |
| Mismo DNI dos veces (`-DniCache`) | La segunda mucho más rápida | 2 |

Ver los contadores y el caché en Redis:

```powershell
cd api
docker compose exec redis sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern "*"'
docker compose exec redis sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning INFO stats' | Select-String keyspace
```

**Importante:** la API local de Docker usa la base REAL de la oficina (ver `api/.env`). No corras pruebas de estrés
contra ella: hace falta una base de pruebas.
