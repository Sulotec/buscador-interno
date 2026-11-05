# Operación y soporte

En producción la web se publica sola desde `main`. La API corre en el servidor de la oficina como **servicio de
Windows `BuscadorApi`** (en `C:\Buscador`) y se actualiza sola desde `main`. El detalle de instalación y
actualización está en `api/DESPLIEGUE.md`.

## Variables de configuración de la API

Van en el `.env` del servidor (plantilla: `api/.env.example`), nunca en el repositorio.

| Variable | Obligatoria | Para qué | Si falta |
|---|---|---|---|
| `ConnectionStrings__DefaultConnection` | Sí | Conexión a SQL Server | La API no arranca |
| `Jwt__Key` | Sí | Firma de sesiones (mínimo 32 caracteres) | La API no arranca |
| `Jwt__Issuer`, `Jwt__Audience` | Sí | Validación del token | La API no arranca |
| `Cors__Origins__0` | No | Orígenes permitidos si un navegador llama directo a la API (la web pasa por su intermediario `/backend`, servidor a servidor) | Usa los orígenes locales por defecto |
| `Reniec__Token` | No | Consulta RENIEC | «La consulta RENIEC no está configurada» |
| `Email__*` | No | Invitaciones y recuperación de contraseña | No salen correos |
| `Redis__ConnectionString` | No | Límites compartidos y caché | Límites en memoria, sin caché |
| `Cache__MinutosConsultas` | No | Duración del caché de consultas | 60 |
| `Limites__MasivoSimultaneos` / `MasivoEnFila` / `MasivoPorUsuario` / `ConsultasPorMinuto` | No | Límites de peticiones | 3 / 10 / 1 / 60 |

## Redis en producción

`api/docker-compose.yml` trae Redis listo, pero **el servidor de producción no usa Docker**: la API corre como
servicio de Windows. Hoy, por lo tanto, producción funciona **sin Redis** (límites en memoria, sin caché), que es
seguro con una sola copia de la API.

Para activarlo cuando haga falta (varias copias de la API o mucha carga):

1. Instalar Redis en un equipo de la red de la oficina (por ejemplo Redis en Docker o en WSL), con contraseña y sin
   exponerlo fuera de la red interna.
2. Agregar al `.env` del servidor: `Redis__ConnectionString=<host>:6379,password=<clave>`. La clave debe ser solo
   letras y números: una coma o un `=` rompen la cadena.
3. Reiniciar el servicio `BuscadorApi`.

## Permisos SQL que necesita la aplicación

| Objeto | Permiso | Por qué |
|---|---|---|
| Tablas de consulta (`Operador.*`, `RRCC.Deuda`, `RRCC.Calificacion`, `RRCC.LineasCredito`) | `SELECT` | Consultas |
| `RNC.Ubigeos` | `SELECT` | Descripción del ubigeo. **Sin él fallan las búsquedas por DNI.** |
| `RNC.Consultas` | `SELECT`, `INSERT`, `UPDATE` | Última respuesta de RENIEC |
| `RRCC.*` (usuarios, tokens, auditoría, historial, sesiones) | Lectura y escritura | Administración y cobro |

Los cambios de base de datos van como script en `api/database/` y se ejecutan **antes** de subir el código que los usa.

## Qué revisar cuando algo falla

1. **`GET /health`** de la API: `Healthy` = funciona y llega a la base; `Unhealthy` (503) = no alcanza SQL Server.
2. **Servicio `BuscadorApi`** iniciado en el servidor de la oficina.
3. **RENIEC falla siempre:** falta o venció `Reniec__Token`.
4. **Búsquedas por DNI con error 500:** revisar el permiso sobre `RNC.Ubigeos`.
5. **Usuarios ven «Hiciste muchas consultas» sin motivo:** revisar `Limites__ConsultasPorMinuto`.
6. **Cargas masivas que no empiezan:** puede haber 3 en curso y la fila llena; esperar o subir
   `Limites__MasivoSimultaneos` si el servidor tiene memoria de sobra.
7. **Auditoría** (`RRCC.Auditoria`): registra cada consulta, si falló y el tipo de error.

## Cosas a tener presentes

- La API local en Docker (`api/docker-compose.yml`) apunta a la base **real** según `api/.env`. Las consultas de
  prueba descuentan tokens reales y quedan en la auditoría real.
- RENIEC es un servicio de pago: no lo incluyas en pruebas automáticas.
- `api/DESPLIEGUE.md` todavía describe el front en Vercel; según el `README.md` de la raíz, hoy se publica en el
  servidor de Oracle. Conviene actualizarlo.
