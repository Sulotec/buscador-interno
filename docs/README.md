# Documentación del Buscador Interno

Documentación técnica del proyecto. El `README.md` de la raíz explica cómo está organizado el repositorio y cómo
trabajar en local; `api/DESPLIEGUE.md` explica el despliegue paso a paso. Aquí está el resto.

| Documento | Para quién | Qué contiene |
|---|---|---|
| [arquitectura.md](arquitectura.md) | Desarrollo | Componentes, recorrido de una consulta, capas de la API, tokens y auditoría |
| [datos-y-secciones.md](datos-y-secciones.md) | Desarrollo | Qué sección sale de qué tabla, ubigeos, y cómo agregar una sección nueva |
| [limites-y-redis.md](limites-y-redis.md) | Desarrollo y operación | Límites de peticiones, Redis, caché de consultas y cómo probarlos |
| [operacion.md](operacion.md) | Operación y soporte | Variables de configuración, permisos SQL, Redis en producción y qué revisar cuando algo falla |

Para negocio y usuarios hay una guía sin detalles técnicos (pantallas, tokens, roles y hoja de ruta) en Claude Docs:
**Buscador Interno — Guía del sistema**. Pide el enlace a quien administra el proyecto.

Última revisión: 05/11/2026.
