# Despliegue: front en Vercel + API y base de datos de la oficina

> **Repositorio nuevo (oct-2026):** la API ahora vive en `Sulotec/buscador-interno`, carpeta `api/`. El servidor de la oficina se sigue actualizando desde el repositorio viejo (`jeliases-informaDev/InternalBuscador`) hasta hacer el paso [Mover el actualizador a este repositorio](#mover-el-actualizador-a-este-repositorio).

## Cómo queda armado

```
Navegador ──HTTPS──▶ Vercel (front Angular, sitio estático)
    │
    └──HTTPS──▶ https://api.tudominio.com ──(túnel de Cloudflare)──▶ máquina de la oficina
                                                                       │  API .NET (servicio de Windows o Docker; solo localhost)
                                                                       └──▶ SQL Server 192.168.1.17:1433 (red interna)
```

La API corre en una máquina **siempre encendida** de la oficina. Desde el 6-oct-2026 es un servicio de Windows en un
servidor (antes, una laptop con Docker): ver
[Que la API no dependa de una laptop](#que-la-api-no-dependa-de-una-laptop-servicio-de-windows-en-el-servidor-de-la-oficina).

**Por qué así:** Vercel solo sirve el front. No ejecuta .NET y, además, `192.168.1.17` es una IP privada que no
existe desde internet. La API tiene que correr **dentro de la red de la oficina**, donde sí ve la base de datos, y
publicarse por HTTPS mediante un túnel. **El puerto 1433 de SQL Server no se abre a internet en ningún caso.**

---

## Mientras se compra el dominio: la API desde la PC de la oficina con Tailscale Funnel

> Así se arrancó (API en una laptop con Docker). Desde el 6-oct-2026 la API corre en el servidor y la laptop quedó
> fuera; esta sección queda de referencia y para el paso del Funnel de Tailscale.

Sin dominio propio se puede desplegar igual: la PC (tiene Tailscale) publica la API con una URL HTTPS **estable**
(no cambia al reiniciar), y el front va en Vercel con su dirección gratuita `*.vercel.app`.

1. **API en Docker** (ya probado: modo producción, llega a la base real, Swagger apagado, solo escucha en localhost):
   en `.env` poner `API_PUERTO=8090` (el 8080 de esa PC está ocupado por otros programas) y
   ```bash
   docker compose up -d --build
   ```
2. **Publicarla con Funnel.** El Funnel de esta PC ya usa el puerto 443 para otro servicio (`127.0.0.1:8077`), así que
   se usa el **8443** (Funnel solo admite 443, 8443 y 10000):
   ```bash
   tailscale funnel --bg --https=8443 http://127.0.0.1:8090
   tailscale funnel status
   ```
   La API queda en `https://desktop-rqr1dib.tail4a0d10.ts.net:8443`.
   Para dejar de publicarla: `tailscale funnel --https=8443 off`.
   ⚠️ No usar `tailscale funnel reset`: borra **toda** la configuración, incluido el servicio del 443.
3. **Front en Vercel con la CLI.** El repositorio del front pertenece a otra cuenta de GitHub, y la CLI evita depender
   de la integración con Git. Desde la carpeta del front:
   ```bash
   npx vercel login
   npx vercel link
   npx vercel env add API_URL production     # valor: https://desktop-rqr1dib.tail4a0d10.ts.net:8443
   npx vercel deploy --prod
   ```
4. **Cerrar el círculo.** Con la URL `*.vercel.app` que entregue Vercel, editar `.env` de la API
   (`Cors__Origins__0` y `Recuperacion__FrontendResetUrl`) y aplicar con `docker compose up -d`.

**Estado actual (6-oct-2026):**

| Pieza | Dónde |
|---|---|
| Front (producción, pública) | `https://internal-search-frontend.vercel.app` — proyecto `informa-peru/internal-search-frontend` |
| API (pública, vía Funnel) | `https://win-hkbui0id607.tail4a0d10.ts.net:8443` → servicio de Windows `BuscadorApi` en el servidor de la oficina (`127.0.0.1:8090`, instalado en `C:\Buscador`) |
| Base de datos | La real de la oficina (`192.168.1.17`), solo accesible desde la red interna |

- **Actualizar el front:** el proyecto de Vercel **no está conectado a GitHub** (la conexión nativa exige ser
  administrador del repositorio, que es de otra cuenta), así que un `git push` por sí solo no publica nada.
  Dos vías:
  1. *Automática:* el repositorio del front trae `.github/workflows/desplegar-vercel.yml`, que despliega con cada push a
     `main` sin importar quién lo haga. Se activa cuando alguien con permiso de **administrador** del repositorio crea
     tres secretos en *Settings → Secrets and variables → Actions*: `VERCEL_TOKEN` (token creado en Vercel →
     Account Settings → Tokens, con alcance al equipo `informa-peru`), `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`
     (los ids del equipo y del proyecto; están en `.vercel/project.json` de la copia local del front).
     Mientras falten, el flujo avisa y se omite sin dar error.
  2. *Manual:* `git pull` y, desde la carpeta del front, `npx vercel deploy --prod`.
- **Actualizar la API:** automático: cada push a `main` se publica solo (ver «Actualización automática desde GitHub»).
- Solo la URL de producción es pública; la URL única que Vercel da a cada despliegue pide iniciar sesión en Vercel.
- La contraseña de `admin.general` está en `.credenciales-admin.txt` (solo en esta PC, ignorado por git).

**Cada persona usa el sistema desplegado; nadie necesita su propia copia de la API.** La auditoría del 5-oct mostró a
compañeros corriendo una copia local de la API contra la base real (se nota por IPs de redes Docker `172.x` en
`RRCC.Auditoria`): sus consultas a RENIEC fallaban el 100 % porque el token del proveedor **no está en el repositorio**
(es un secreto que solo vive en el `.env` del servidor). Además esas copias necesitan la clave de la base de datos.
Quien necesite consultar solo debe entrar a `https://internal-search-frontend.vercel.app` con su cuenta. Si alguien
desarrolla en local y de verdad necesita RENIEC, el token se le entrega por un canal seguro y va en su `.env`
(`Reniec__Token`), nunca en el repositorio. Desde esta versión, una copia sin token responde
"La consulta RENIEC no está configurada" y la auditoría guarda el motivo.

**Archivos del historial de descargas.** En el servidor de Windows, los Excel de la carga masiva quedan en
`C:\Buscador\historial` (carpeta con permiso solo para el servicio). En Docker se guardaban en `/data/historial`, dentro del
volumen de Docker `historial`: sobreviven a `docker compose up -d --build`, pero `docker compose down -v` los borra.
La API corre sin privilegios y por eso no escribe en `/app` (esa carpeta fue la causa de un error 500 en
`/api/historial/...` el 5-oct). Los registros de historial creados antes desde un equipo de desarrollo apuntan a rutas
de Windows que el contenedor no tiene; al descargarlos responde "el archivo ya no está disponible", no error.
El contenedor trabaja en hora de Lima (`TZ=America/Lima`).

Limitaciones de esta etapa:
- La API depende ahora del servidor de la oficina: debe estar **encendido, con internet y con Tailscale**. La API y
  Tailscale arrancan solos con el equipo, sin que nadie inicie sesión. Con un solo servidor, si se apaga el sistema se
  cae; un monitor externo sobre `/health` avisa.
- En modo producción los correos (invitaciones y recuperación de contraseña) **solo salen si se configura `Email__*`**;
  sin SMTP no hay forma de entregar los enlaces. Mientras tanto, las cuentas se crean con contraseña inicial.
- Funnel no garantiza ancho de banda; sirve para esta etapa, no para producción definitiva.
- Antes de publicar, cambiar la contraseña de `admin.general`: la temporal circuló por chat.

Cuando llegue el dominio, ver [Cuando llegue el dominio](#cuando-llegue-el-dominio).

**Estado de la API:** `GET /health` (público; solo responde `Healthy` o `Unhealthy`, sin detalles). `200` = la API
vive y alcanza la base de datos; `503` = la API vive pero no alcanza la base. En Docker, `docker ps` lo muestra como
`(healthy)` / `(unhealthy)`.

## Que la API no dependa de una laptop: servicio de Windows en el servidor de la oficina

**Hecho el 6-oct-2026.** La API corre como servicio `BuscadorApi` en el servidor `win-hkbui0id607` (`C:\Buscador`),
publicada en `https://win-hkbui0id607.tail4a0d10.ts.net:8443`. La laptop quedó fuera (contenedor detenido y su Funnel
:8443 apagado). Lo que sigue explica cómo se hizo y cómo operarlo.

**El problema.** Hoy la API corre en una laptop con Docker Desktop. Si Windows se reinicia (actualizaciones), se
agota la batería, se cierra la tapa o se pierde el internet, el sistema se cae para todos. Y Docker Desktop arranca
recién cuando alguien **inicia sesión**: tras un reinicio sin nadie delante, la API no vuelve sola.

**La solución.** Correr la API como **servicio de Windows** en un servidor que siempre esté encendido. El servicio
arranca con el equipo **sin que nadie inicie sesión**, se reinicia solo si falla y no necesita Docker. El front sigue
en Vercel y la base de datos no se mueve: solo cambia dónde corre la API.

**Qué servidor sirve.** Uno **siempre encendido**, con **internet**, en la **misma red que la base de datos**
(`192.168.1.17:1433`) y con **Tailscale** (mientras no haya dominio). No hace falta instalar .NET: el paquete lo
trae. El instalador avisa si la zona horaria del servidor no es la de Lima (las fechas que escribe la API usan la hora
del equipo).

### Primera instalación

1. **En la PC de desarrollo**, armar el paquete (≈ 57 MB):
   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy\windows\publicar-servidor.ps1
   ```
   Deja `artifacts\buscador-servidor.zip`. Con `-IncluirEnv` el paquete lleva el `.env` real: trátalo como una
   contraseña (no lo subas a ningún sitio ni lo mandes por correo).
2. **Copiar el `.zip` al servidor** (Escritorio remoto o carpeta compartida) y descomprimirlo. Dejar el `.env`
   (el mismo que usa Docker; plantilla en `.env.example`) junto a `instalar-servicio.ps1`.
3. **En el servidor**, doble clic en `instalar.bat` (pide permisos de administrador y deja la ventana abierta al
   final). Es lo mismo que abrir PowerShell **como administrador** dentro de esa carpeta y ejecutar:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\instalar-servicio.ps1
   ```
   Copia la API a `C:\Buscador`, genera la configuración desde el `.env`, registra el servicio `BuscadorApi`
   (inicio automático, cuenta sin privilegios, reinicio automático si se cae), restringe los permisos de la carpeta
   (hay secretos) y comprueba `GET /health`. Si algo falla lo dice claro (p. ej. si el servidor no alcanza la base).
   Antes de tocar nada valida el `.env`: rechaza claves faltantes o con los valores de ejemplo.
4. **Publicarla por HTTPS** (una sola vez). Con Tailscale; antes de elegir el puerto, mirar `tailscale funnel status`
   para no pisar un servicio existente:
   ```powershell
   tailscale set --unattended          # que Tailscale siga activo aunque nadie tenga la sesión abierta
   tailscale funnel --bg --https=8443 http://127.0.0.1:8090
   ```
   La dirección pública es `https://<nombre-del-servidor>.<tu-tailnet>.ts.net:8443` (el instalador la imprime).
5. **Apuntar el front al servidor nuevo** (desde la carpeta del front):
   ```bash
   npx vercel env rm API_URL production
   npx vercel env add API_URL production      # la dirección del paso 4
   npx vercel deploy --prod
   ```
6. **Probar** `https://internal-search-frontend.vercel.app` (login y una consulta) y, recién entonces, **retirar la
   laptop**: `docker compose down` y `tailscale funnel --https=8443 off`.

Para no cortar a nadie, el orden es: instalar y probar el servidor → cambiar `API_URL` → apagar la laptop. Mientras
conviven, ambas usan la misma base y el mismo `Jwt__Key` (el `.env` es el mismo), así que las sesiones abiertas
siguen valiendo. Lo único que no se muda es el historial de descargas (los Excel de la carga masiva, últimos 5 por
usuario): quedó en el volumen de Docker de la laptop y esos registros responderán "el archivo ya no está disponible";
se vuelven a generar con una carga nueva.

### Día a día

- **Estado:** `Get-Service BuscadorApi` y `Invoke-WebRequest http://127.0.0.1:8090/health` (200 = todo bien).
- **Registros:** Visor de eventos → Registros de Windows → *Aplicación* (origen `internal-search-backend.Api`).
- **Actualizar la API:** es automático (ver la sección siguiente). A mano: repetir los pasos 1-3 **sin** el `.env`: se conserva la configuración instalada. Para
  cambiar algún valor (clave, CORS, SMTP…), poner el `.env` actualizado junto al script y volver a ejecutarlo.
- **Quitar el servicio:** `.\instalar-servicio.ps1 -Desinstalar` (los archivos y el historial de `C:\Buscador` se
  conservan).
- **Monitoreo:** que un monitor externo gratuito (UptimeRobot, Better Stack, etc.) consulte
  `https://<la-api>/health` cada minuto y avise por correo si no responde `200`. Así el equipo se entera antes que los
  usuarios. Es lo único que falta configurar a mano y requiere una cuenta del equipo en ese servicio.

### Actualización automática desde GitHub

Cada push a `main` se publica solo en unos minutos, sin tocar el servidor. Una tarea programada
(`BuscadorApi-Actualizador`, cada 2 minutos, como SYSTEM) ejecuta `C:\Buscador\actualizador\actualizar.ps1`:

1. Pregunta a GitHub por el último commit de `main` (casi siempre no hay novedades y la consulta es gratuita).
2. Si hay uno nuevo, descarga las fuentes, las compila con un SDK de .NET propio (`C:\Buscador\dotnet`, se baja la
   primera vez) y compara el resultado con lo instalado. Si es idéntico (p. ej. cambió solo la documentación) no
   reinicia nada.
3. Si cambió: guarda una copia de la API actual (`C:\Buscador\api.anterior`), detiene el servicio, copia la versión
   nueva (la configuración instalada no se toca), lo inicia y espera a que `/health` responda. **Si no arranca,
   restaura la copia y no reintenta ese commit**; el siguiente commit se prueba solo.

La API se reinicia unos 10–15 segundos cuando hay cambios reales. Si el servidor se apaga a mitad de una
actualización, la siguiente ejecución deja todo en orden.

**Activarla (una sola vez)**, en un Símbolo del sistema como administrador **en el servidor**:
```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://raw.githubusercontent.com/jeliases-informaDev/InternalBuscador/main/deploy/windows/actualizar.ps1 -OutFile $env:TEMP\actualizar.ps1 -UseBasicParsing; & $env:TEMP\actualizar.ps1 -Instalar"
```
La primera vez instala el SDK y compila (varios minutos) y hace la primera actualización; al final dice
«Actualización automática ACTIVA».

- **Ver el estado:** `type C:\Buscador\actualizador\estado.txt` (último resultado) y `actualizador.log` (detalle).
- **Desactivarla:** `powershell -ExecutionPolicy Bypass -File C:\Buscador\actualizador\actualizar.ps1 -Desinstalar`.
- **El propio `actualizar.ps1` también se actualiza** desde el repositorio (si el nuevo no tiene errores de sintaxis).
- **Todo lo que llegue a `main` se despliega solo, sin revisión.** Quien pueda escribir en `main` manda sobre el
  servidor: mantener los repositorios privados y con pocas personas con permiso de escritura.
- **Los cambios de base de datos se ejecutan a mano, antes de subir el código que los usa**: la actualización no
  corre scripts SQL.
- Si el repositorio pasa a ser privado, guardar un token de GitHub de solo lectura en
  `C:\Buscador\actualizador\github-token.txt`.
- Hace falta cerca de 2 GB libres en `C:` (SDK, caché de paquetes y copia anterior).

### Qué cubre y qué no

Cubre: reinicios del servidor, que nadie tenga la sesión iniciada y caídas del proceso de la API.
No cubre: un corte de energía o de internet en la oficina (un UPS y un segundo enlace lo mitigan) ni la caída del
propio SQL Server. Para independizarse por completo de la oficina, la API y la base tendrían que ir a un proveedor en la
nube.

### Cuando llegue el dominio

Solo cambian las direcciones; la API y el servidor siguen igual.

1. **Cloudflare** (gratis): agregar el dominio y crear el túnel (*Zero Trust → Networks → Tunnels → Create a tunnel*,
   tipo *Cloudflared*).
2. **En el servidor** (PowerShell como administrador), con el token que muestra Cloudflare. Queda también como servicio
   de Windows, igual que la API:
   ```powershell
   cloudflared.exe service install <TOKEN>
   ```
   y en *Public Hostname*: `api.<dominio>` → `http://localhost:8090`.
3. **Vercel:** `API_URL = https://api.<dominio>` y volver a desplegar. Si se quiere, darle al front un dominio propio
   (`buscador.<dominio>`).
4. **API (`.env` del servidor):** agregar `Cors__Origins__1` con el front nuevo (conservar el anterior hasta terminar de
   migrar), actualizar `Recuperacion__FrontendResetUrl` y volver a ejecutar `instalar-servicio.ps1`.
5. **Apagar Funnel:** `tailscale funnel --https=8443 off`.
6. **Correo:** configurar `Email__*` con un remitente del dominio (`no-reply@<dominio>`, con SPF/DKIM) para las
   invitaciones y la recuperación de contraseña.
7. **Monitor externo** sobre `https://api.<dominio>/health`.

## 0. Antes de empezar (una sola vez)

1. **Cambiar la contraseña de la base de datos.** La anterior estuvo en el historial de git y hay que darla por
   comprometida. Crear de paso un usuario SQL propio de la aplicación con permisos mínimos:

   ```sql
   CREATE LOGIN buscador_app WITH PASSWORD = 'UNA-CLAVE-LARGA-Y-NUEVA';
   USE Buscador;
   CREATE USER buscador_app FOR LOGIN buscador_app;
   ALTER ROLE db_datareader ADD MEMBER buscador_app;
   ALTER ROLE db_datawriter ADD MEMBER buscador_app;
   ```

2. **Ejecutar los scripts en la base REAL**, en SSMS y en este orden (todos se pueden repetir sin problema):
   `database/000_instalar_todo.sql` → crear/asignar el primer ADMIN GENERAL (ver `database/002…`, paso 5) →
   tokens iniciales (paso 6) → `database/004_menu_operador.sql`.
3. **Cambiar la contraseña temporal de `admin.general`** y pedir al proveedor un token de RENIEC nuevo
   (el actual circuló por chat).

## 1. La API en una máquina de la oficina

Requisitos: Docker instalado y que la máquina alcance `192.168.1.17:1433`.

```bash
git clone https://github.com/jeliases-informaDev/InternalBuscador.git
cd internal-search-backend
cp .env.example .env        # completar TODOS los valores (ver la tabla de abajo)
docker compose up -d --build
curl http://localhost:8080/system/usuarios      # debe responder 401 (la API está viva y pide sesión)
```

Si en lugar de `401` falla, mirar `docker compose logs api`:
- *"No se configuró ConnectionStrings…"* / *"Jwt:Key…"* → falta algo en `.env`.
- Errores de SQL → la máquina no alcanza la base o el usuario/clave son incorrectos.

## 2. Publicar la API por HTTPS (túnel de Cloudflare)

Se necesita una cuenta de Cloudflare con el dominio que se quiera usar (gratis).

1. Cloudflare → **Zero Trust → Networks → Tunnels → Create a tunnel** (tipo *Cloudflared*). Copiar el **token**.
2. En *Public Hostname*: `api.tudominio.com` → Service **HTTP** `api:8080`.
3. Pegar el token en `.env` como `TUNNEL_TOKEN` y levantar el túnel:
   ```bash
   docker compose --profile tunel up -d
   ```
4. Probar desde cualquier lado: `https://api.tudominio.com/system/usuarios` → `401`.

Alternativas equivalentes: Tailscale Funnel, o un servidor con IP pública y Caddy/nginx con certificado.
Lo importante es que la API quede en **HTTPS** (el sitio de Vercel es HTTPS y el navegador bloquea llamadas HTTP).

## 3. El front en Vercel

1. Vercel → **Add New → Project** → importar el repositorio `internal-search-frontend`.
2. La configuración ya está en `vercel.json` (build, carpeta de salida y rutas). No cambiar nada más.
3. **Settings → Environment Variables**: crear `API_URL` = `https://api.tudominio.com` (Production y Preview).
   El build falla a propósito si la URL no empieza con `https://`.
4. **Settings → General → Node.js Version**: 22.x o superior.
5. **Deploy.** Anotar la URL que entrega (ej. `https://tu-proyecto.vercel.app`).

## 4. Cerrar el círculo (CORS y correos)

Con la URL real de Vercel, editar `.env` de la API y reiniciar:

```
Cors__Origins__0=https://tu-proyecto.vercel.app
Recuperacion__FrontendResetUrl=https://tu-proyecto.vercel.app/auth/reset-password
```
```bash
docker compose up -d
```

Cada dominio desde el que se use el front (dominio propio, etc.) va en una línea `Cors__Origins__N` adicional.
Las URLs de *preview* de Vercel no están permitidas salvo que se agreguen.

## 5. Verificación final

- [ ] `https://tu-proyecto.vercel.app` abre el login (con el logo).
- [ ] Entrar con `admin.general`: arriba dice **Tokens ilimitados** y aparece **Administración** en el menú.
- [ ] Recargar con F5 estando en *Usuarios y tokens* **no** manda a la portada.
- [ ] Crear un usuario de prueba: llega el correo de invitación (requiere `Email__*`).
- [ ] Con ese usuario, una consulta por DNI descuenta 1 token.
- [ ] *Auditoría* muestra el login y la consulta.
- [ ] Desactivar el usuario de prueba al terminar.

## Variables de entorno de la API

| Variable | Obligatoria | Para qué |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | Sí | Conexión a la base real |
| `Jwt__Key` | Sí | Clave de firma (32+ caracteres aleatorios) |
| `Jwt__Issuer`, `Jwt__Audience` | Sí | Valores propios; no dejar los genéricos |
| `Cors__Origins__0` | Sí | URL exacta del front en Vercel |
| `Recuperacion__FrontendResetUrl` | Sí | Enlace de los correos de recuperación |
| `Email__Host/Port/EnableSsl/User/Password/From` | Para correos | SMTP; sin esto no salen invitaciones ni recuperaciones |
| `Reniec__Token` | Para RENIEC | Token del proveedor |
| `Proxy__ConfiarEnCabeceras` | Sí detrás del túnel | Ya lo fija `docker-compose.yml`. Sin esto todos los usuarios compartirían una IP y el límite de intentos los bloquearía a la vez |
| `TUNNEL_TOKEN` | Con túnel | Token de Cloudflare |

## Cosas a tener presentes

- **Datos personales en internet.** La API devuelve datos de DNI y RENIEC. Además del login y los tokens, conviene
  limitar quién llega: *Cloudflare Access* (login corporativo delante de la API o del front) o lista de IPs permitidas.
- **Plan de Vercel.** El plan *Hobby* es solo para uso personal y no comercial; una herramienta de la empresa
  corresponde al plan *Pro* (o publicar el front en otro hosting estático).
- **Secretos.** `.env` no se versiona (está en `.gitignore`). Nunca poner claves en `appsettings.json` ni en el repositorio.
- **Actualizar la API.** `git pull && docker compose up -d --build` en la máquina de la oficina.
- **Si la máquina de la oficina se apaga**, el sistema deja de funcionar (el front sigue en Vercel pero sin API). Por
  eso la API debe correr como servicio en un servidor siempre encendido (ver la sección dedicada) y conviene un monitor
  externo sobre `/health`.

## Mover el actualizador a este repositorio

Se hace una sola vez en el servidor de la oficina:

1. En GitHub, crea un token *fine-grained* con acceso de **solo lectura** a `Sulotec/buscador-interno`:
   - Ruta: *Settings → Developer settings → Fine-grained tokens*.
   - Permiso: *Contents: Read*.
2. Guárdalo en `C:\Buscador\actualizador\github-token.txt`. Ese archivo nunca se sube a GitHub.
3. Copia `api/deploy/windows/actualizar.ps1` de este repositorio a `C:\Buscador\actualizador\actualizar.ps1`. Ya apunta a `Sulotec/buscador-interno` y a la carpeta `api/`.
4. Comprueba que la siguiente ejecución funcione: `type C:\Buscador\actualizador\estado.txt`.
5. Archiva el repositorio viejo en GitHub.
