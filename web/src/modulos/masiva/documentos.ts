// Lectura de listas de documentos (pegadas o desde .txt/.csv) para la carga masiva.

// Documentos por carga (un Excel). Una lista más grande se acepta entera: se procesan los primeros 5000 y el
// resto queda pendiente para la carga siguiente, que el usuario lanza con un clic ("Cargar los pendientes").
// Así cada carga dura poco y la pantalla no queda bloqueada varios minutos seguidos.
export const LIMITE_DOCUMENTOS = 5_000;
export const TAMANO_MAXIMO = 4_990_000; // la API acepta hasta 5 MB por peticion (incluye el formulario)
export const TAMANO_BLOQUE_DOCUMENTOS = 500;

export type TipoLista = 'personas' | 'empresas';

const TIPOS_PERSONAS = [
  { nombre: 'DNI', patron: /^\d{8}$/ },
  { nombre: 'RUC persona natural', patron: /^10\d{9}$/ },
  { nombre: 'RUC persona jurídica', patron: /^20\d{9}$/ },
  { nombre: 'RUC', patron: /^(15|16|17)\d{9}$/ },
  { nombre: 'Carnet de extranjería', patron: /^\d{9}$/ },
  { nombre: 'Pasaporte', patron: /^[A-Z0-9]{6,12}$/ },
];
const TIPOS_EMPRESAS = [
  { nombre: 'RUC persona natural', patron: /^10\d{9}$/ },
  { nombre: 'RUC persona jurídica', patron: /^(15|16|17|20)\d{9}$/ },
];

const ENCABEZADOS = /^(dni|ruc|ce|pasaporte|documento|documentos|nro|numero|número|tipo)$/i;

export interface Analisis {
  // Solo los que se procesarán en esta carga: válidos, sin repetir y dentro de LIMITE_DOCUMENTOS
  validos: string[];
  invalidos: string[];
  duplicados: number;
  // Válidos que pasan LIMITE_DOCUMENTOS; quedan pendientes para la carga siguiente
  excedentes: string[];
  // Válidos que están en la lista negra: no se envían ni se cobran
  bloqueados: string[];
  porTipo: { nombre: string; cantidad: number }[];
}

const SIN_BLOQUEOS: ReadonlySet<string> = new Set();

// Documentos que pueden estar en la lista negra: DNI o RUC de persona natural (lleva el DNI adentro)
export const puedeEstarBloqueado = (documento: string) => /^(\d{8}|10\d{9})$/.test(documento);

export function analizar(texto: string, tipo: TipoLista, bloqueadosLista: ReadonlySet<string> = SIN_BLOQUEOS): Analisis {
  const tipos = tipo === 'empresas' ? TIPOS_EMPRESAS : TIPOS_PERSONAS;
  const vistos = new Set<string>();
  const incluidos: string[] = [];
  const excedentes: string[] = [];
  const invalidos: string[] = [];
  const bloqueados: string[] = [];
  const conteo = new Map<string, number>();
  let duplicados = 0;
  for (const bruto of texto.replace(/^﻿/, '').split(/[\s,;|]+/)) {
    const valor = bruto.replace(/["']/g, '').trim().toUpperCase();
    if (!valor || ENCABEZADOS.test(valor)) continue;
    const t = tipos.find((x) => x.patron.test(valor));
    if (!t) { invalidos.push(bruto); continue; }
    if (vistos.has(valor)) { duplicados++; continue; }
    vistos.add(valor);
    // Los de la lista negra no cuentan para el límite de la carga
    if (bloqueadosLista.has(valor)) { bloqueados.push(valor); continue; }
    if (incluidos.length >= LIMITE_DOCUMENTOS) { excedentes.push(valor); continue; }
    incluidos.push(valor);
    conteo.set(t.nombre, (conteo.get(t.nombre) ?? 0) + 1);
  }
  return {
    validos: incluidos,
    invalidos,
    duplicados,
    excedentes,
    bloqueados,
    porTipo: tipos.filter((t) => conteo.has(t.nombre)).map((t) => ({ nombre: t.nombre, cantidad: conteo.get(t.nombre)! })),
  };
}

// Revisión línea por línea de la lista pegada (un documento por línea), para marcar en pantalla
// cuáles no se incluirán en el Excel. Usa las mismas reglas que analizar().
export type EstadoLinea = 'valido' | 'invalido' | 'repetido' | 'bloqueado' | 'excede' | 'ignorado';
export interface LineaRevisada { texto: string; estado: EstadoLinea; repetidoDe?: number }

export function revisarLineas(texto: string, tipo: TipoLista, bloqueadosLista: ReadonlySet<string> = SIN_BLOQUEOS): LineaRevisada[] {
  const tipos = tipo === 'empresas' ? TIPOS_EMPRESAS : TIPOS_PERSONAS;
  const primeraLinea = new Map<string, number>();
  let incluidos = 0;
  return texto.replace(/^﻿/, '').split('\n').map((bruto, indice) => {
    const valor = bruto.replace(/["']/g, '').trim().toUpperCase();
    if (!valor || ENCABEZADOS.test(valor)) return { texto: bruto, estado: 'ignorado' };
    if (!tipos.some((t) => t.patron.test(valor))) return { texto: bruto, estado: 'invalido' };
    const previa = primeraLinea.get(valor);
    if (previa !== undefined) return { texto: bruto, estado: 'repetido', repetidoDe: previa + 1 };
    primeraLinea.set(valor, indice);
    if (bloqueadosLista.has(valor)) return { texto: bruto, estado: 'bloqueado' };
    // Del documento válido número LIMITE_DOCUMENTOS + 1 en adelante queda para la carga siguiente
    if (incluidos >= LIMITE_DOCUMENTOS) return { texto: bruto, estado: 'excede' };
    incluidos++;
    return { texto: bruto, estado: 'valido' };
  });
}

// La API recibe un .txt con un documento por linea.
export function crearArchivo(documentos: string[], prefijo: string): File {
  const f = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const nombre = `${prefijo}_${f.getFullYear()}${p(f.getMonth() + 1)}${p(f.getDate())}_${p(f.getHours())}${p(f.getMinutes())}.txt`;
  return new File([documentos.join('\r\n') + '\r\n'], nombre, { type: 'text/plain' });
}

export function plantilla(tipo: TipoLista): File {
  const contenido = tipo === 'empresas' ? 'RUC\r\n20100000001\r\n' : 'DNI\r\n12345678\r\n';
  return new File([contenido], tipo === 'empresas' ? 'Plantilla_RUC.txt' : 'Plantilla_DNI.txt', { type: 'text/plain' });
}

export const SECCIONES = [
  { id: 'personas', nombre: 'Personas', detalle: 'Nombres, fecha de nacimiento y ubigeo.', solo: 'personas' as TipoLista },
  { id: 'moviles', nombre: 'Teléfonos', detalle: 'Números, operadoras y planes.' },
  { id: 'sueldos', nombre: 'Información laboral', detalle: 'Empresas e ingresos reportados.' },
  { id: 'deuda', nombre: 'Deudas', detalle: 'Entidades, saldos y períodos.' },
  { id: 'lineas-credito', nombre: 'Líneas de crédito', detalle: 'Montos utilizados y disponibles.' },
  { id: 'calificacion', nombre: 'Calificaciones', detalle: 'Clasificación crediticia reportada.' },
  { id: 'fallecidos', nombre: 'Fallecidos', detalle: 'Documentos con fecha de fallecimiento registrada.', solo: 'personas' as TipoLista },
];

// Secciones disponibles segun el tipo de lista: personas y fallecidos solo aplican a personas (DNI), no a empresas (RUC).
export const seccionesDe = (tipo: TipoLista) => SECCIONES.filter((s) => !('solo' in s) || s.solo === tipo);
