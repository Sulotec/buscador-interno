# Buscador Interno — Sulotec

Herramienta interna de consultas de personas y empresas: deudas, líneas de crédito, calificaciones, información laboral, teléfonos y RENIEC. Incluye cargas masivas a Excel y administración de usuarios, tokens y auditoría.

**Uso exclusivo del personal autorizado.** Funciona solo desde las sedes (Lince y Los Olivos); el rol ADMIN GENERAL puede entrar desde cualquier lugar.

| | Dirección |
|---|---|
| Producción | https://buscadorinterno.sulotec.com |
| Repositorio | https://github.com/Sulotec/buscador-interno (privado) |
| Operación del servidor | https://github.com/Sulotec/Sulotec-infra → `apps/buscador/` (solo administradores) |

## Qué hay en este repositorio

```
buscador-interno/
├── web/   Frontend: Next.js 16 + React 19 + TypeScript + Tailwind 4
└── api/   API: C# .NET 10 + Entity Framework + SQL Server (base en la oficina)
```

```
Navegador ──▶ buscadorinterno.sulotec.com  (web/, servidor Oracle)
                 │  /backend/...  intermediario: sesión en cookie httpOnly + regla de sedes
                 ▼
              API (api/, servidor de la oficina) ──▶ SQL Server 192.168.1.17
```

### web/ — cómo está organizado

```
web/src/
├── app/            rutas: cada pantalla solo arma piezas de los módulos
├── components/
│   ├── ui/         Boton, Campo, Tarjeta, Tabla, Modal, Pestanas, Aviso, Paginacion…
│   └── layout/     menú lateral, cabecera, marca, marco de acceso
├── modulos/        una carpeta por área: tipos.ts + servicio.ts + componentes
│   ├── sesion/  consultas/  personas/  empresas/  masiva/  admin/
├── lib/            api.ts (cliente), formato.ts, sesion-servidor.ts (cookie y sedes)
└── proxy.ts        sin sesión → al login
```

**Agregar una integración o pantalla nueva:**
1. Crea `src/modulos/<nombre>/` con `tipos.ts` (lo que devuelve la API) y `servicio.ts` (las llamadas).
2. Arma sus componentes en esa carpeta, reutilizando `@/components/ui`.
3. Crea la ruta en `src/app/(app)/<ruta>/page.tsx` y agrega el enlace en `components/layout/shell.tsx`.

Las pantallas **nunca** llaman a la API directamente: siempre pasan por el `servicio.ts` de su módulo.

### api/ — la API .NET

Arquitectura por capas: `internal-search-backend` (controladores), `.Business` (reglas), `.Infraestructure` (datos y seguridad) y `internal-search.Domain` (entidades). Los scripts de base de datos están en `api/database/` y el despliegue en la oficina se explica en `api/DESPLIEGUE.md`.

**Plan (fase 2):** pasar la API a TypeScript módulo por módulo (login y tokens → personas → empresas → masivas), con los mismos contratos. Así `web/` no cambia.

## Trabajar en local

**Frontend**
```bash
cd web
npm install
# Apunta a una API de pruebas; SEDES_IPS = tu IP pública si no eres ADMIN GENERAL
BUSCADOR_API_URL=https://<api-de-pruebas> SEDES_IPS=<tu-ip> npm run dev
```
Abre http://localhost:3000.

**API**
```bash
cd api/internal-search-backend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<cadena de una base de PRUEBAS>"
dotnet user-secrets set "Jwt:Key" "<clave aleatoria de 64 caracteres>"
dotnet run
```

## Cómo se publica

- **web/:** cada commit en `main` se publica solo en unos 2 minutos.
  - El servidor de Oracle lee este repositorio con una llave de **solo lectura**, construye la imagen y la cambia.
  - Si la versión nueva no arranca, vuelve sola a la anterior.
  - Quien trabaja aquí no tiene acceso al servidor.
- **api/:** el servidor de la oficina se actualiza solo desde `main` con `api/deploy/windows/actualizar.ps1`. Lee la sección "Mover el actualizador a este repositorio" de `api/DESPLIEGUE.md`.

## Roles

| Rol | Puede | No puede |
|---|---|---|
| **ADMIN GENERAL** | Todo: consultas ilimitadas (no gastan tokens), usuarios y roles, asignar tokens, auditoría. Entra desde cualquier lugar. | — |
| **SUPERVISOR** | Consultas de personas y empresas (individual y masiva), su historial de cargas y su propio saldo. Solo desde las sedes. | Crear o editar usuarios, asignar tokens, ver la auditoría (prohibido: la API responde 403 y la web ni muestra ni reenvía esas rutas). |
| **GERENCIA** | Reservado: hoy igual que SUPERVISOR. | Igual que SUPERVISOR. |
| **Operador** | Lo que tenga asignado en `RRCC.RolMenu` (`database/004_menu_operador.sql`). | Administración. |

Dónde se hace cumplir: la API con la política `AdminGeneral` (`system/usuarios`, `system/auditoria`, `system/tokens` salvo `mi-saldo`); la web en `src/app/backend/[...ruta]/route.ts` (corta esas rutas para quien no es ADMIN GENERAL) y en las páginas de administración (`SoloAdmin`). Las descripciones de los roles en la base se actualizan con `database/005_rol_supervisor.sql`.

## Reglas del equipo

1. **Trabaja en una rama** (`git checkout -b mejora/lo-que-haces`) y abre un *pull request* hacia `main`. Que otra persona lo revise antes de unirlo: `main` es producción.
2. **Nunca subas secretos.**
   - Nada de claves, tokens ni `.env` reales.
   - En local usa `user-secrets` (API) o variables de entorno (web).
3. **Nunca subas datos reales.**
   - Nada de Excel con reportes, exportaciones ni respaldos de la base.
   - Esos archivos van al almacenamiento privado de la empresa, no a GitHub.
4. **Los cambios de base de datos** van como script en `api/database/` y se ejecutan a mano **antes** de subir el código que los usa.
5. **Mensajes de commit claros**, en español: qué cambia y por qué.
