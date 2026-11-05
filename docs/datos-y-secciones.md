# Datos y secciones

## Qué sección sale de qué tabla

La pantalla y el PDF muestran solo el **periodo más reciente** de cada sección (`SoloUltimoPeriodo` en
`modulos/consultas/resultados.tsx` y en `PersonaPdfService.cs`). El Excel de la carga masiva trae **todos** los
periodos.

| Sección | Tabla | Entidad | Clave de cruce | Aplica a |
|---|---|---|---|---|
| Personas | `Operador.Personas` + `RNC.Ubigeos` | `PersonaOperador`, `Ubigeo` | `DNI` | Solo DNI |
| Teléfonos | `Operador.Moviles` | `Movil` | `Documento` | Todos |
| Sueldos | `Operador.Sueldos` | `Sueldo` | `Documento` | Todos |
| Deudas | `RRCC.Deuda` | `Deuda` | `Documento` | Todos |
| Calificación | `RRCC.Calificacion` | `Calificacion` | `Documento` | Todos |
| Líneas de crédito | `RRCC.LineasCredito` | `LineaCredito` | `Documento` | Todos |
| Fallecidos | `Operador.Fallecidos` | `Fallecidos` | `DNI` | Solo DNI |
| RENIEC | Proveedor externo; última respuesta en `RNC.Consultas` | `ConsultaReniec` | `DNI` | Solo DNI, a pedido |

Las tablas de consulta (`Moviles`, `Sueldos`, `Deuda`, `Calificacion`, `LineasCredito`) no tienen clave primaria y
se mapean con `HasNoKey()` en `AppDbContext`.

## Ubigeos

`Operador.Personas.UBIGEO_RENIEC` se cruza con `RNC.Ubigeos.UBIGEO` para mostrar `UBIGEO_DESCRIPCION`.

- La descripción **no es una columna** de `Operador.Personas`: `PersonaOperador.UbigeoDescripcion` está marcada con
  `Ignore` y se completa después de la consulta con `UbigeoExtensions.CompletarUbigeosAsync`.
- Esa función hace **una consulta por cada 1000 códigos distintos**, no una por persona. Una carga masiva de 5000 DNI
  con 300 ubigeos distintos hace una sola consulta extra.
- Si un código no está en el catálogo, la pantalla, el PDF y el Excel muestran el código.
- El usuario SQL de la aplicación necesita `SELECT` sobre `RNC.Ubigeos`.
- La columna ID de Personas no se muestra en ningún lado; sigue existiendo como clave interna.

## Cómo agregar una sección nueva

Así se agregó **Personas** a la carga masiva y al PDF el 05/11/2026. Para una sección nueva, recorre la lista
completa; si salteas un paso, la sección aparece en un lado y falta en otro.

**Consulta individual**

1. Entidad en `internal-search.Domain/Entities` y su `DbSet` + mapeo en `AppDbContext`.
2. Método en el repositorio (`IndividualRepository.cs`) y su firma en `IBuscadorRepository`.
3. Llamada en `IndividualService.BuscarAsync` y propiedad nueva en `BuscadorHistorialResponse`.
4. Si también aplica a la búsqueda por nombres, cargarla en `BuscarPorNombresAsync` (mismo repositorio).
5. Web: tipo en `modulos/personas/tipos.ts`, columnas en `modulos/consultas/resultados.tsx`, pestaña en
   `modulos/personas/consulta-personas.tsx` (búsqueda global) y sección en la vista apilada (segmento).
6. PDF: un método `Agregar<Seccion>` en `PersonaPdfService.cs`, llamado desde `Generar`.
7. **Caché:** si cambia la forma de la respuesta, sube la versión de `Prefijo` en `Redis/CacheConsultas.cs`
   (`consulta:v2:` → `consulta:v3:`). Si no, durante la vida del caché (60 min) se devuelven respuestas viejas sin
   la sección.

**Carga masiva**

1. Constante en `SeccionesMasivo.cs` y agregarla a `Todas` (lo que no está ahí se rechaza con 400).
2. Lista nueva en `BuscadorMasivoResponse` (`BuscadorMasivoSalida.cs`).
3. Consulta por lote en `MasivoRepository.cs`, dentro del `foreach (var lote in validos.Chunk(1000))`.
4. Contarla en `encontrados` de `BuscadorMasivoService.cs`, para que "documentos sin resultados" sea correcto.
5. Hoja nueva y fila del Resumen en `MasivoExcelService .cs`.
6. Web: opción en `SECCIONES` de `modulos/masiva/documentos.ts` (con `solo: 'personas'` si no aplica a RUC),
   ícono en `carga-masiva.tsx` y color en `historial.tsx`.

No hace falta tocar `combinarExcels`: une los bloques por nombre de hoja y suma la columna B del Resumen.

## Reglas de validación de documentos

Mismas reglas en la web (`modulos/masiva/documentos.ts`) y en la API (`DocumentoFileParser`):

| Tipo | Formato |
|---|---|
| DNI | 8 dígitos |
| Carnet de extranjería | 9 dígitos |
| RUC persona natural | 11 dígitos, empieza con 10 |
| RUC persona jurídica | 11 dígitos, empieza con 20 (o 15, 16, 17) |
| Pasaporte | 6 a 12 letras o dígitos |

En la carga masiva, los que no cumplen y los repetidos se marcan en rojo y no se envían a la API.
