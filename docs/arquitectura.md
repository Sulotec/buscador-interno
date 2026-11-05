# Arquitectura

La API es el centro del sistema: cobra tokens, aplica los límites, registra la auditoría y es la única pieza que
llega a la base de datos. La web nunca habla con SQL Server, y SQL Server no está expuesto a internet.

```
Navegador ──HTTPS──▶ Web (Next.js, servidor de Oracle)
                       │  /backend/[...ruta]: cookie de sesión → token Bearer + regla de sedes
                       ▼
                     API .NET 10 (servicio de Windows "BuscadorApi" en la oficina, túnel HTTPS)
                       ├──▶ SQL Server (red de la oficina): datos de consulta + RRCC (usuarios, tokens, auditoría)
                       ├──▶ Redis (opcional): contadores de límites + caché de consultas
                       └──▶ Proveedor RENIEC (externo, de pago): solo "Ver datos RENIEC"
```

## Piezas

| Pieza | Tecnología | Responsabilidad |
|---|---|---|
| `web/` | Next.js 16, React 19, TypeScript, Tailwind 4 | Pantallas, bloqueo de la interfaz durante consultas, unión de los bloques del Excel masivo (`modulos/masiva/combinar-excels.ts`) |
| `web/src/app/backend/[...ruta]/route.ts` | Route handler de Next.js | Intermediario: lee la cookie httpOnly, la reenvía como `Authorization: Bearer`, aplica la regla de sedes y corta las rutas de administración a quien no es ADMIN GENERAL |
| `api/internal-search-backend` | ASP.NET Core (controladores) | Endpoints, autenticación JWT, límites de peticiones, caché |
| `api/internal-search-backend.Business` | Servicios | Reglas: tokens, PDF (QuestPDF), Excel (ClosedXML), RENIEC |
| `api/internal-search-backend.Infraestructure` | EF Core 10 + SQL Server | Repositorios, `AppDbContext`, correo |
| `api/internal-search.Domain` | Entidades y DTOs | Modelos compartidos, sin dependencias de infraestructura |

## Recorrido de una consulta individual

Ejemplo: búsqueda de un DNI (`POST api/buscador/buscar`).

1. **Web:** `servicioPersonas.porDocumento` llama a `/backend/api/buscador/buscar`. La pantalla bloquea el
   formulario, las pestañas, el menú lateral y "Salir" mientras espera (`components/layout/shell.tsx`).
2. **Intermediario:** `route.ts` convierte la cookie en token Bearer y valida la sede.
3. **API, middleware** (orden en `Program.cs`): CORS → autenticación → autorización → **limitador de peticiones**.
   El limitador va después de la autenticación para poder contar por usuario. Si se pasa el límite, responde
   429 y el controlador no llega a ejecutarse: no se cobra nada.
4. **Controlador** (`Controllers/Buscador/persona/individual/IndividualController.cs`): valida la entrada
   (`[ApiController]` responde 400 solo si el modelo no es válido) y llama a `TokenService.EjecutarAsync`.
5. **Tokens** (`Business/Services/Tokens/TokenService.cs`):
   - descuenta el costo de forma atómica (`TokenRepository.ConsumirAsync`: UPDATE condicional `saldo + delta >= 0`
     dentro de una transacción, seguro con consultas en paralelo);
   - ejecuta la consulta;
   - registra la auditoría;
   - si la consulta falla, **devuelve los tokens** y audita el fallo.
6. **Caché** (`Redis/CacheConsultas.cs`): dentro de la consulta, busca la respuesta en Redis; si no está, va al
   servicio y la guarda. El token ya se cobró en el paso 5, así que el caché no cambia el precio.
7. **Servicio y repositorio** (`IndividualService` → `IndividualRepository`): consultas secuenciales sobre el mismo
   `AppDbContext`; después completa la descripción de los ubigeos (`UbigeoExtensions.CompletarUbigeosAsync`).

## Recorrido de una carga masiva

1. **Web** (`modulos/masiva/carga-masiva.tsx`): revisa la lista línea por línea (`revisarLineas`). Los no válidos
   y repetidos se marcan en rojo y **no se envían**. Divide los válidos en bloques de 500
   (`TAMANO_BLOQUE_DOCUMENTOS`) y envía uno a la vez.
2. **API** (`Controllers/Buscador/persona/masivo/MasivoController.cs`): límites de concurrencia (ver
   [limites-y-redis.md](limites-y-redis.md)), validación de secciones y del máximo de 5000 documentos **antes**
   de cobrar, cobro de 1 token por documento válido.
3. **Repositorio** (`MasivoRepository.cs`): por cada lote de 1000 documentos, una consulta por sección pedida;
   trae **todos** los periodos (a diferencia de la pantalla, que muestra el último).
4. **Excel** (`MasivoExcelService .cs`): hoja Resumen + una hoja por sección.
5. **Web:** une los Excel de todos los bloques en uno (`combinarExcels`, por nombre de hoja) y lo guarda en el
   historial.

## Tokens y auditoría

- Saldo por usuario en `RRCC.TokenSaldo`; cada movimiento (consumo, asignación, devolución) en
  `RRCC.TokenMovimientos` con el saldo resultante.
- ADMIN GENERAL no consume tokens (`ContextoAccion.EsAdminGeneral`).
- Toda consulta, éxito o fallo, queda en `RRCC.Auditoria`. De los errores internos se guarda solo el tipo, no el
  mensaje, para no registrar detalles de la base.
- Descargar el PDF no cuesta tokens, pero se audita (`DESCARGA_PDF_PERSONA`).
- La carga masiva de **empresas** hoy no cobra tokens (decisión pendiente).

## Seguridad

- Sesión en cookie httpOnly; JWT firmado con `Jwt:Key` (mínimo 32 caracteres; sin ella la API no arranca).
- Revocación de sesiones en `RRCC.SesionesRevocadas`: al cambiar la contraseña o cuando un ADMIN GENERAL cierra las
  sesiones de un usuario.
- Todos los controladores de consulta exigen `[Authorize]`. La administración exige la política `AdminGeneral`.
- Límite de 10 intentos de login por minuto por IP.
- SQL Server no se publica a internet; la API sale solo por el túnel HTTPS.
