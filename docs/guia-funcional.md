# Guía funcional del Buscador Interno

## Propósito

El Buscador Interno reúne información disponible sobre personas y empresas para que el personal autorizado pueda
consultarla desde una aplicación web. La información se presenta por secciones y depende de los registros
disponibles en las fuentes conectadas.

Esta guía describe el sistema que existe en este repositorio. La disponibilidad de cada pantalla y acción depende
del rol del usuario.

## Consultas

### Personas

En **Personas** se puede buscar por tipo y número de documento, teléfono, apellidos y nombres, o consultar
registros de fallecidos. Para una consulta por documento, los resultados pueden incluir:

- Datos de identidad y ubicación registrados.
- Deudas, líneas de crédito y calificaciones.
- Información laboral y teléfonos.
- Registros de fallecimiento, cuando corresponda.
- Ficha RENIEC bajo demanda para consultas por DNI, si el servicio está configurado.

La ficha puede descargarse en PDF. La pantalla presenta las secciones disponibles para el criterio consultado y,
cuando los datos tienen periodos, muestra el más reciente.

### Empresas

La consulta de empresas permite buscar por RUC o razón social. La información que se devuelve depende de los
registros disponibles para ese documento.

### Cargas masivas

Las pantallas de carga masiva permiten procesar listas de personas o empresas y descargar los resultados en Excel.
Cada carga procesa hasta 5 000 documentos; si la lista es mayor, los restantes quedan disponibles para continuar
con otra carga. La interfaz identifica documentos inválidos, repetidos o bloqueados para que no se envíen como una
consulta válida.

El Excel reúne un resumen y las secciones seleccionadas. Las cargas realizadas quedan disponibles en el historial
del usuario.

## Información y costos

Las consultas pueden consumir tokens según la operación y la tarifa configurada. El saldo se descuenta de forma
controlada; si una consulta falla por un error del sistema, los tokens se devuelven. ADMIN GENERAL no consume
tokens por sus consultas. Los límites de frecuencia y concurrencia evitan sobrecargar el servicio; las solicitudes
rechazadas por esos límites no se cobran.

La aplicación presenta un guion (`-`) cuando no hay un dato disponible. La ausencia de un dato no significa que
la fuente haya confirmado que ese dato no existe.

## Usuarios y acceso

| Rol | Alcance general |
|---|---|
| **ADMIN GENERAL** | Administración de usuarios, roles, tokens, auditoría y lista negra; consultas sin consumo de tokens. |
| **SUPERVISOR** | Consultas individuales y masivas, historial de cargas y revisión de su saldo. |
| **GERENCIA** | Actualmente tiene el mismo alcance operativo que SUPERVISOR. |
| **Operador** | Acceso a las opciones habilitadas para su rol en el menú. |

El acceso normal está restringido a las sedes autorizadas de Lince y Los Olivos. ADMIN GENERAL puede ingresar desde
fuera de las sedes. Las operaciones administrativas están restringidas a ADMIN GENERAL.

## Protección de datos y trazabilidad

Las consultas y acciones relevantes quedan registradas en auditoría. La lista negra impide la consulta de los DNI
bloqueados por cualquier usuario, incluido ADMIN GENERAL. SQL Server no está expuesto a internet: la API es el
componente que accede a la base de datos.

No uses datos reales de clientes en ejemplos, pruebas locales ni archivos que se vayan a subir al repositorio.
Consulta [Operación](operacion.md) y [Arquitectura](arquitectura.md) para los controles técnicos y de despliegue.

## Alcance de esta guía

El Word de referencia contiene también capítulos sobre una aplicación Android para auditorías de campo, visitas,
GPS, trabajo sin conexión, Caja Huancayo, MySQL y Prisma. Esas capacidades no corresponden al sistema de consultas
de este repositorio y no se describen aquí como funciones implementadas. La aplicación actual está compuesta por
una web Next.js y una API .NET que utiliza SQL Server.

## Documentación relacionada

- [Arquitectura](arquitectura.md): componentes, recorridos, tokens, auditoría y lista negra.
- [Datos y secciones](datos-y-secciones.md): fuentes de datos y secciones de resultados.
- [Límites y Redis](limites-y-redis.md): límites de peticiones, concurrencia y caché.
- [Operación](operacion.md): configuración, permisos de base de datos y diagnóstico.
