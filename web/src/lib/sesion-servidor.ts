// Sesion y regla de sedes. Se usa en el servidor (proxy y rutas /backend), nunca en el navegador.
//
// - El token de la API vive en una cookie httpOnly: el JavaScript del navegador no puede leerlo.
// - Regla de sedes: solo se usa el sistema desde las IPs publicas de las sedes (Lince, Los Olivos).
//   El rol ADMIN GENERAL puede entrar desde cualquier lugar.
//   La IP viene de Cloudflare (cf-connecting-ip): este servidor solo recibe trafico por el tunel.

export const COOKIE_SESION = 'bi_sesion';
export const ROL_TOTAL = 'ADMIN GENERAL';

const CLAIM_ROL_LARGO = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

interface CargaToken {
  exp?: number;
  role?: string | string[];
  [CLAIM_ROL_LARGO]?: string | string[];
}

// Lee la carga del JWT sin verificar la firma. Solo se usa para decidir que mostrar y para la regla de
// sedes: la API verifica la firma en cada peticion, asi que un token falso no obtiene datos.
export function leerToken(token: string | undefined): CargaToken | null {
  if (!token) return null;
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(parte), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function rolesDelToken(token: string | undefined): string[] {
  const carga = leerToken(token);
  if (!carga) return [];
  const crudo = carga.role ?? carga[CLAIM_ROL_LARGO] ?? [];
  return (Array.isArray(crudo) ? crudo : [crudo]).map((r) => String(r).toUpperCase());
}

export const esAdminGeneral = (roles: string[]) => roles.includes(ROL_TOTAL);

export function segundosRestantes(token: string | undefined): number {
  const exp = leerToken(token)?.exp;
  return exp ? Math.max(0, Math.floor(exp - Date.now() / 1000)) : 0;
}

export function ipCliente(cabeceras: Headers): string {
  return (
    cabeceras.get('cf-connecting-ip') ??
    cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    ''
  );
}

// SEDES_IPS: lista separada por comas de IPs o rangos IPv4 o IPv6 (ej. "200.1.2.3/32,190.4.5.0/29,2800:200:1:2::/64").
// Sin configurar = ninguna sede habilitada (solo ADMIN GENERAL puede entrar).
function sedes(): string[] {
  return (process.env.SEDES_IPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

interface IpNumerica {
  n: bigint;
  bits: 32 | 128;
}

function ipv4ANumero(ip: string): bigint | null {
  const partes = ip.split('.');
  if (partes.length !== 4) return null;
  let n = BigInt(0);
  for (const p of partes) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = n * BigInt(256) + BigInt(p);
  }
  return n;
}

// IPv4 o IPv6 (con "::" y, si viene, un IPv4 al final). Una IPv4 mapeada en IPv6 (::ffff:a.b.c.d) cuenta como IPv4.
function analizarIp(texto: string): IpNumerica | null {
  let ip = texto.trim().split('%')[0];
  if (!ip.includes(':')) {
    const n = ipv4ANumero(ip);
    return n === null ? null : { n, bits: 32 };
  }

  const v4 = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) {
    const n4 = ipv4ANumero(v4[1]);
    if (n4 === null) return null;
    const alto = (n4 >> BigInt(16)).toString(16);
    const bajo = (n4 & BigInt(0xffff)).toString(16);
    ip = `${ip.slice(0, -v4[1].length)}${alto}:${bajo}`;
  }

  const mitades = ip.split('::');
  if (mitades.length > 2) return null;
  const grupos = (s: string) => (s === '' ? [] : s.split(':'));
  const cabeza = grupos(mitades[0]);
  const cola = mitades.length === 2 ? grupos(mitades[1]) : [];
  const relleno = mitades.length === 2 ? 8 - cabeza.length - cola.length : 0;
  if (cabeza.length + cola.length + relleno !== 8 || (mitades.length === 2 && relleno < 1)) return null;

  let n = BigInt(0);
  for (const g of [...cabeza, ...Array<string>(relleno).fill('0'), ...cola]) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    n = (n << BigInt(16)) | BigInt(parseInt(g, 16));
  }
  const mapeada = (n >> BigInt(32)) === BigInt(0xffff);
  return mapeada ? { n: n & BigInt(0xffffffff), bits: 32 } : { n, bits: 128 };
}

export function enSede(ip: string): boolean {
  const cliente = analizarIp(ip);
  if (!cliente) return false;
  return sedes().some((rango) => {
    const [base, prefijoTexto] = rango.split('/');
    const sede = analizarIp(base);
    if (!sede || sede.bits !== cliente.bits) return false;
    if (prefijoTexto !== undefined && !/^\d{1,3}$/.test(prefijoTexto)) return false;
    const prefijo = prefijoTexto === undefined ? sede.bits : Number(prefijoTexto);
    if (prefijo > sede.bits) return false;
    const resto = BigInt(sede.bits - prefijo);
    return (cliente.n >> resto) === (sede.n >> resto);
  });
}

export const MENSAJE_FUERA_DE_SEDE =
  'El Buscador Interno solo se puede usar desde las sedes de la empresa (Lince y Los Olivos). Si necesitas acceso desde otro lugar, pídeselo a un Administrador General.';
