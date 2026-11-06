// Formatos para Peru (es-PE).

// Texto único para "no hay dato" en toda la web (en PDF y Excel es SinDato.Texto en la API).
export const SIN_DATO = '-';

// Vacío, solo espacios o el texto "null" que llega de algunas fuentes cuenta como sin dato.
export const esVacio = (v: unknown): v is null | undefined | '' =>
  v == null || String(v).trim() === '' || String(v).trim().toLowerCase() === 'null';

const numero = new Intl.NumberFormat('es-PE');
const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });

export const fNumero = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? SIN_DATO : numero.format(n));
export const fMoneda = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? SIN_DATO : moneda.format(n));
export const fTexto = (t: string | number | null | undefined) => (esVacio(t) ? SIN_DATO : String(t).trim());

export function fEdad(fechaNacimiento: string | null | undefined): string {
  if (esVacio(fechaNacimiento) || !fechaNacimiento) return SIN_DATO;

  const fechaIso = fechaNacimiento.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const nacimiento = fechaIso
    ? { anio: Number(fechaIso[1]), mes: Number(fechaIso[2]), dia: Number(fechaIso[3]) }
    : (() => {
      const fecha = new Date(fechaNacimiento);
      return Number.isNaN(fecha.getTime())
        ? null
        : { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1, dia: fecha.getDate() };
    })();

  if (!nacimiento) return SIN_DATO;
  const valida = new Date(Date.UTC(nacimiento.anio, nacimiento.mes - 1, nacimiento.dia));
  if (
    valida.getUTCFullYear() !== nacimiento.anio
    || valida.getUTCMonth() + 1 !== nacimiento.mes
    || valida.getUTCDate() !== nacimiento.dia
  ) return SIN_DATO;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.anio;
  if (
    hoy.getMonth() + 1 < nacimiento.mes
    || (hoy.getMonth() + 1 === nacimiento.mes && hoy.getDate() < nacimiento.dia)
  ) edad -= 1;

  if (edad < 0) return SIN_DATO;
  return `${edad} ${edad === 1 ? 'año' : 'años'}`;
}

export function fFecha(valor: string | null | undefined, conHora = false): string {
  if (esVacio(valor) || !valor) return SIN_DATO;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('es-PE', conHora
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Periodos SBS: "202609" -> "Set 2026"
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
export function fPeriodo(p: string | null | undefined): string {
  if (esVacio(p)) return SIN_DATO;
  const m = String(p).match(/^(\d{4})(\d{2})$/);
  return m ? `${MESES[Number(m[2]) - 1] ?? m[2]} ${m[1]}` : String(p);
}

export function fBytes(b: number | null | undefined): string {
  if (b == null || Number.isNaN(b)) return SIN_DATO;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export const nombreCompleto = (...partes: (string | null | undefined)[]) =>
  partes.filter((p) => !esVacio(p)).map((p) => String(p).trim()).join(' ') || SIN_DATO;
