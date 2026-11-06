// Cliente del navegador: todo pasa por /backend (mismo sitio), que agrega la sesion y la regla de sedes.

export class ErrorApi extends Error {
  constructor(mensaje: string, public estado: number, public fueraDeSede = false) {
    super(mensaje);
  }
}

type DetalleError = { mensaje: string; fueraDeSede: boolean };
const errorDe = (d: DetalleError, estado: number) => new ErrorApi(d.mensaje, estado, d.fueraDeSede);

const SERVIDOR_NO_DISPONIBLE = 'El servidor no está disponible en este momento. Intenta de nuevo en unos minutos.';
const SIN_CONEXION = 'No se pudo conectar con el Buscador. Revisa tu conexión a internet e intenta de nuevo.';
const ERROR_INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo; si se repite, avisa al administrador.';

const MENSAJES: Record<number, string> = {
  400: 'Revisa los datos ingresados.',
  401: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  402: 'No tienes tokens suficientes para esta consulta. Pide más a un Administrador General.',
  403: 'No tienes permiso para esta acción.',
  404: 'No se encontró lo que buscabas.',
  405: 'Esta acción no está disponible. Recarga la página e intenta de nuevo.',
  408: 'La consulta tardó demasiado. Intenta de nuevo.',
  409: 'Los datos cambiaron mientras trabajabas. Recarga la página e intenta de nuevo.',
  413: 'El archivo es demasiado grande (máximo 5 MB).',
  415: 'El formato del archivo o de los datos no es válido.',
  423: 'Este documento está bloqueado y no se puede consultar.',
  429: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
  500: 'El servidor no pudo completar la consulta. Si se cobraron tokens, se devolvieron. Intenta de nuevo en unos minutos.',
  502: SERVIDOR_NO_DISPONIBLE,
  503: SERVIDOR_NO_DISPONIBLE,
  504: 'El servidor tardó demasiado en responder. Intenta de nuevo en unos minutos.',
  // Códigos de Cloudflare (el túnel no alcanzó la API o esta no respondió a tiempo)
  520: SERVIDOR_NO_DISPONIBLE, 521: SERVIDOR_NO_DISPONIBLE, 522: SERVIDOR_NO_DISPONIBLE,
  523: SERVIDOR_NO_DISPONIBLE, 524: 'El servidor tardó demasiado en responder. Intenta de nuevo en unos minutos.',
  530: SERVIDOR_NO_DISPONIBLE,
};

const porEstado = (estado: number) =>
  MENSAJES[estado] ?? (estado >= 500 ? SERVIDOR_NO_DISPONIBLE : estado >= 400 ? MENSAJES[400] : ERROR_INESPERADO);

// Un texto sirve para mostrarlo tal cual solo si es una frase corta, no una página HTML ni una traza técnica
const textoLegible = (t: unknown): t is string =>
  typeof t === 'string' && t.trim().length > 0 && t.length <= 400 && !/<\/?[a-z!][^>]*>/i.test(t)
  && !/\bat\s+[\w.]+\(|Exception\b|^\s*[{[]/.test(t);

// ASP.NET responde las validaciones como { title: "One or more validation errors occurred.", errors: { campo: [..] } }.
// El "title" siempre es genérico y en inglés: no se muestra. De "errors" se toma el primer mensaje si está en español.
function primerErrorDeValidacion(errores: unknown): string | undefined {
  if (!errores || typeof errores !== 'object') return undefined;
  for (const lista of Object.values(errores as Record<string, unknown>)) {
    const texto = Array.isArray(lista) ? lista[0] : lista;
    if (textoLegible(texto) && !/^(The |A non-empty|The JSON|'.+' is)/.test(texto)) return texto;
  }
  return undefined;
}

async function mensajeDe(respuesta: Response): Promise<DetalleError> {
  const estado = respuesta.status;
  const texto = await respuesta.text().catch(() => '');
  try {
    const datos = JSON.parse(texto);
    if (typeof datos === 'string') return { mensaje: textoLegible(datos) ? datos : porEstado(estado), fueraDeSede: false };
    const propio = [datos?.message, datos?.mensaje].find(textoLegible) ?? primerErrorDeValidacion(datos?.errors);
    return { mensaje: propio ?? porEstado(estado), fueraDeSede: Boolean(datos?.fueraDeSede) };
  } catch {
    // Texto plano propio de la API (p. ej. BadRequest("Sube un archivo .txt o .csv.")) sí se muestra;
    // una página HTML (proxy, Cloudflare, error de IIS) o una traza no.
    return { mensaje: textoLegible(texto) ? texto : porEstado(estado), fueraDeSede: false };
  }
}

// fetch solo falla (sin respuesta) si no hay red, se cortó la conexión o el navegador la bloqueó
async function conectar(url: string, opciones: RequestInit): Promise<Response> {
  try {
    return await fetch(url, opciones);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ErrorApi(SIN_CONEXION, 0);
  }
}

// Mensaje para mostrar al usuario a partir de cualquier error atrapado en un catch.
// ErrorApi y los Error propios (validaciones en español) se muestran; los errores técnicos del navegador
// o de librerías (TypeError, SyntaxError, etc., normalmente en inglés) se cambian por el mensaje por defecto.
export function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e instanceof ErrorApi) return e.message;
  if (e instanceof Error && e.constructor === Error && textoLegible(e.message)) return e.message;
  if (e instanceof Error) console.error(e);
  return porDefecto;
}

function alExpirar(estado: number) {
  if (estado === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/auth/')) {
    location.href = `/auth/login?volver=${encodeURIComponent(location.pathname)}`;
  }
}

export async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const cuerpoJson = opciones.body && !(opciones.body instanceof FormData);
  const respuesta = await conectar(`/backend/${ruta.replace(/^\//, '')}`, {
    ...opciones,
    headers: { Accept: 'application/json', ...(cuerpoJson ? { 'Content-Type': 'application/json' } : {}), ...opciones.headers },
    cache: 'no-store',
  });
  if (!respuesta.ok) {
    alExpirar(respuesta.status);
    throw errorDe(await mensajeDe(respuesta), respuesta.status);
  }
  if (respuesta.status === 204) return undefined as T;
  const texto = await respuesta.text().catch(() => { throw new ErrorApi(SIN_CONEXION, 0); });
  try {
    return (texto ? JSON.parse(texto) : null) as T;
  } catch {
    // Respuesta 200 que no es JSON (p. ej. una página intermedia del proxy)
    throw new ErrorApi('El servidor respondió algo inesperado. Recarga la página e intenta de nuevo.', respuesta.status);
  }
}

export const api = {
  get: <T>(ruta: string) => pedir<T>(ruta),
  post: <T>(ruta: string, datos?: unknown) =>
    pedir<T>(ruta, { method: 'POST', body: datos instanceof FormData ? datos : JSON.stringify(datos ?? {}) }),
  put: <T>(ruta: string, datos?: unknown) => pedir<T>(ruta, { method: 'PUT', body: JSON.stringify(datos ?? {}) }),
  eliminar: <T>(ruta: string) => pedir<T>(ruta, { method: 'DELETE' }),
};

function nombreDeArchivo(disposicion: string | null, porDefecto: string): string {
  if (!disposicion) return porDefecto;
  const utf8 = disposicion.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) return decodeURIComponent(utf8[1]);
  const simple = disposicion.match(/filename="?([^";]+)"?/i);
  return simple ? simple[1] : porDefecto;
}

export interface Archivo { blob: Blob; nombre: string }

// Sube un formulario con progreso y recibe un archivo (Excel de la carga masiva).
export function subirYDescargar(ruta: string, datos: FormData, alProgresar: (porcentaje: number) => void, porDefecto: string): Promise<Archivo> {
  return new Promise((resolver, rechazar) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/backend/${ruta}`);
    xhr.responseType = 'blob';
    xhr.timeout = 300_000;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) alProgresar(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolver({ blob: xhr.response, nombre: nombreDeArchivo(xhr.getResponseHeader('Content-Disposition'), porDefecto) });
        return;
      }
      alExpirar(xhr.status);
      const detalle = await mensajeDe(new Response(xhr.response, { status: xhr.status }));
      rechazar(errorDe(detalle, xhr.status));
    };
    xhr.onerror = () => rechazar(new ErrorApi(SIN_CONEXION, 0));
    xhr.ontimeout = () => rechazar(new ErrorApi('La carga tardó demasiado (más de 5 minutos). Prueba con menos documentos.', 0));
    xhr.send(datos);
  });
}

export async function descargar(ruta: string, porDefecto: string): Promise<Archivo> {
  const respuesta = await conectar(`/backend/${ruta}`, { cache: 'no-store' });
  if (!respuesta.ok) {
    alExpirar(respuesta.status);
    throw errorDe(await mensajeDe(respuesta), respuesta.status);
  }
  return { blob: await respuesta.blob(), nombre: nombreDeArchivo(respuesta.headers.get('Content-Disposition'), porDefecto) };
}

export async function enviarYDescargar(ruta: string, datos: unknown, porDefecto: string): Promise<Archivo> {
  const respuesta = await conectar(`/backend/${ruta}`, {
    method: 'POST',
    headers: { Accept: 'application/pdf', 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
    cache: 'no-store',
  });
  if (!respuesta.ok) {
    alExpirar(respuesta.status);
    throw errorDe(await mensajeDe(respuesta), respuesta.status);
  }
  return { blob: await respuesta.blob(), nombre: nombreDeArchivo(respuesta.headers.get('Content-Disposition'), porDefecto) };
}

export function guardarArchivo({ blob, nombre }: Archivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
