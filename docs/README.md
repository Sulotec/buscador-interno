# Documentación del Buscador Interno

Documentación técnica del proyecto. El `README.md` de la raíz explica cómo está organizado el repositorio y cómo
trabajar en local; `api/DESPLIEGUE.md` explica el despliegue paso a paso. Aquí está el resto.

## Capacidades

| Capacidad | Cómo se logra | Ver |
|---|---|---|
| Acceso solo desde las sedes | El intermediario de la web (`route.ts`) valida la IP de origen contra las sedes autorizadas (Lince y Los Olivos); solo ADMIN GENERAL entra desde cualquier lugar. | [README](../README.md#roles) |
| Acceso seguro | Sesión en cookie httpOnly con JWT firmado; sesiones revocables al cambiar la contraseña o por un ADMIN GENERAL; máximo 10 intentos de login por minuto por IP. | [Seguridad](arquitectura.md#seguridad) |
| Control por roles | La administración (usuarios, tokens, auditoría, lista negra) exige la política `AdminGeneral` en la API y además se corta en la web; los demás roles reciben 403. | [Roles](../README.md#roles) |
| Cobro justo de tokens | Descuento atómico en base de datos, seguro con consultas en paralelo; si la consulta falla, los tokens se devuelven solos. ADMIN GENERAL no consume. | [Tokens y auditoría](arquitectura.md#tokens-y-auditoría) |
| Protección ante sobrecarga | 60 consultas por minuto por usuario; máximo 3 cargas masivas a la vez en todo el sistema (10 en fila) y 1 por usuario. Lo rechazado no se cobra. | [Límites](limites-y-redis.md#límites) |
| Respuesta rápida y escalable | Redis comparte los contadores entre varias copias de la API y guarda en caché las consultas por 60 minutos, sin cambiar el precio en tokens. | [Redis](limites-y-redis.md#redis) |
| Consultas masivas | Validación línea por línea antes de enviar; envío en bloques de 500 y unión en un solo Excel con hoja Resumen y una hoja por sección; historial de cargas. | [Carga masiva](arquitectura.md#recorrido-de-una-carga-masiva) |
| Lista negra | DNI que nadie puede consultar, incluido ADMIN GENERAL, por ninguna vía (DNI, PDF, teléfono, nombres, masiva, RUC 10); se revisa antes de cobrar. Desbloquear no borra: queda el historial con el motivo. | [Lista negra](arquitectura.md#lista-negra) |
| Trazabilidad | Toda consulta, con éxito o con fallo, queda en auditoría con usuario, acción, fecha e IP; también las descargas de PDF y los cambios de administración. | [Tokens y auditoría](arquitectura.md#tokens-y-auditoría) |
| Evidencia y reportes | Ficha de la persona en PDF con vista previa antes de descargar; Excel para las cargas masivas; un "-" uniforme cuando no hay dato. | [Datos y secciones](datos-y-secciones.md) |
| Datos protegidos | SQL Server no se publica a internet; la API sale solo por un túnel HTTPS y es la única pieza que llega a la base. | [Arquitectura](arquitectura.md) |

## Documentos

| Documento | Para quién | Qué contiene |
|---|---|---|
| [guia-funcional.md](guia-funcional.md) | Usuarios y negocio | Alcance, consultas, cargas masivas, roles, tokens y protección de datos |
| [arquitectura.md](arquitectura.md) | Desarrollo | Componentes, recorrido de una consulta, capas de la API, tokens y auditoría |
| [datos-y-secciones.md](datos-y-secciones.md) | Desarrollo | Qué sección sale de qué tabla, ubigeos, y cómo agregar una sección nueva |
| [limites-y-redis.md](limites-y-redis.md) | Desarrollo y operación | Límites de peticiones, Redis, caché de consultas y cómo probarlos |
| [operacion.md](operacion.md) | Operación y soporte | Variables de configuración, permisos SQL, Redis en producción y qué revisar cuando algo falla |

La guía funcional adaptada al sistema de este repositorio está en [guia-funcional.md](guia-funcional.md).

Última revisión: 06/11/2026.
