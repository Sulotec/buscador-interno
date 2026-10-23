'use client';
// Presentacion de resultados: resumen + una tarjeta por seccion (deudas, lineas, calificaciones, laboral, telefonos).
import { useEffect, useState, type ReactNode } from 'react';
import { Banknote, Briefcase, Building2, CalendarDays, CreditCard, Gauge, IdCard, LucideIcon, Phone, PhoneCall, Smartphone, UserRound } from 'lucide-react';
import { Chip, Tabla, Tarjeta, type Columna } from '@/components/ui';
import { fFecha, fMoneda, fNumero, fPeriodo, fTexto, nombreCompleto } from '@/lib/formato';
import type { Calificacion, Deuda, LineaCredito, Movil, Sueldo } from './tipos';
import clsx from 'clsx';

export function tonoCalificacion(c: string | null | undefined): 'verde' | 'ambar' | 'peligro' | 'neutro' {
  const v = String(c ?? '').toUpperCase();
  if (!v) return 'neutro';
  if (v.includes('NOR') || v === '0') return 'verde';
  if (v.includes('CPP') || v === '1') return 'ambar';
  return 'peligro';
}

export function Seccion({ titulo, icono, cantidad, children }: { titulo: string; icono: ReactNode; cantidad: number; children: ReactNode }) {
  return (
    <Tarjeta sinRelleno className="aparecer overflow-hidden"
      titulo={<h2 className="flex items-center gap-2.5 text-base font-semibold text-texto"><span className="text-azul">{icono}</span>{titulo}<Chip tono={cantidad ? 'azul' : 'neutro'}>{fNumero(cantidad)}</Chip></h2>}>
      {children}
    </Tarjeta>
  );
}

function PeriodoCelda({ periodo }: { periodo: string | null }) {
  return <span className="inline-flex rounded-md bg-azul-10 px-2 py-1 text-xs font-semibold text-azul">{fPeriodo(periodo ?? '')}</span>;
}

export function Operadora({ nombre }: { nombre: string | null }) {
  const normalizado = nombre?.toLowerCase() ?? '';
  const color = /claro/.test(normalizado)
    ? 'bg-[#FCE8E8] text-[#B4232E] ring-[#F5C5C8]'
    : /movistar|telef[oó]nica/.test(normalizado)
      ? 'bg-[#E8F0FE] text-[#174EA6] ring-[#C6D7F5]'
      : /entel/.test(normalizado)
        ? 'bg-[#E5F6FC] text-[#08749B] ring-[#B7E6F4]'
        : /bitel|viettel/.test(normalizado)
          ? 'bg-[#EAF5E8] text-[#34713A] ring-[#C9E3C5]'
          : 'bg-[#F1F3F6] text-[#525B6A] ring-[#DDE2E8]';

  return <span className={clsx('inline-flex max-w-56 whitespace-normal break-words rounded-md px-2 py-1 text-xs font-semibold leading-4 ring-1 ring-inset', color)}>{fTexto(nombre)}</span>;
}

function DocumentoMovil({ documento }: { documento: string | null }) {
  if (!documento) return <span className="text-gris">—</span>;
  const digitos = documento.replace(/\D/g, '');
  const tipo = digitos.length === 11 ? 'RUC' : digitos.length === 8 ? 'DNI' : null;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {tipo && <span className="rounded bg-[#f1f3f6] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-gris">{tipo}</span>}
      <span className="font-mono text-xs font-medium tracking-wide text-texto">{documento}</span>
    </span>
  );
}

const colDeudas: Columna<Deuda>[] = [
  { titulo: 'Periodo', celda: (d) => <PeriodoCelda periodo={d.periodo} /> },
  { titulo: 'Entidad', celda: (d) => <span className="block max-w-64 whitespace-normal break-words font-semibold leading-5 text-texto" title={d.entidad ?? undefined}>{fTexto(d.entidad)}</span>, className: 'w-64 min-w-64 whitespace-normal' },
  { titulo: 'Tipo de deuda', celda: (d) => <span className="text-gris">{fTexto(d.tipoDeuda)}</span> },
  { titulo: 'Días', celda: (d) => <span className="font-medium">{fNumero(d.dias)}</span>, derecha: true },
  { titulo: 'Clasificación', celda: (d) => d.calificacion ? <Chip tono={tonoCalificacion(d.calificacion)}>{d.calificacion}</Chip> : '—' },
  { titulo: 'Saldo', celda: (d) => <span className="font-bold text-azul-oscuro">{fMoneda(d.saldo)}</span>, derecha: true },
];
const colLineas: Columna<LineaCredito>[] = [
  { titulo: 'Periodo', celda: (l) => <PeriodoCelda periodo={l.periodo} /> },
  { titulo: 'Entidad', celda: (l) => <span className="block max-w-64 whitespace-normal break-words font-semibold leading-5" title={l.entidad ?? undefined}>{fTexto(l.entidad)}</span>, className: 'w-64 min-w-64 whitespace-normal' },
  { titulo: 'Tipo', celda: (l) => <span className="text-gris">{fTexto(l.tipo)}</span> },
  { titulo: 'Línea de crédito', celda: (l) => <span className="font-medium">{fMoneda(l.lineaCreditoMonto)}</span>, derecha: true },
  { titulo: 'Utilizada', celda: (l) => {
    const total = l.lineaCreditoMonto ?? 0;
    const usada = l.lineaUtilizada ?? 0;
    const porcentaje = total > 0 ? Math.min(100, Math.max(0, (usada / total) * 100)) : 0;
    return <span className="inline-block min-w-28 text-right"><span className="font-semibold">{fMoneda(l.lineaUtilizada)}</span><span className="mt-1 block h-1 overflow-hidden rounded-full bg-azul-10"><span className="block h-full rounded-full bg-azul-claro" style={{ width: `${porcentaje}%` }} /></span></span>;
  }, derecha: true },
  { titulo: 'Disponible', celda: (l) => <span className="font-semibold text-verde">{fMoneda(l.lineaNoUtilizada)}</span>, derecha: true },
];
const pct = (n: number | null) => (n == null ? '—' : `${n}%`);
const colCalificaciones: Columna<Calificacion>[] = [
  { titulo: 'Periodo', celda: (c) => <PeriodoCelda periodo={c.periodo} /> },
  { titulo: 'Normal', celda: (c) => <Chip tono="verde">{pct(c.nor)}</Chip>, derecha: true },
  { titulo: 'CPP', celda: (c) => <Chip tono="ambar">{pct(c.cpp)}</Chip>, derecha: true },
  { titulo: 'Deficiente', celda: (c) => <Chip tono="peligro">{pct(c.def)}</Chip>, derecha: true },
  { titulo: 'Dudoso', celda: (c) => <Chip tono="peligro">{pct(c.dud)}</Chip>, derecha: true },
  { titulo: 'Pérdida', celda: (c) => <Chip tono="peligro">{pct(c.per)}</Chip>, derecha: true },
  { titulo: 'Entidades', celda: (c) => fTexto(c.reportan), derecha: true },
];
const colSueldos: Columna<Sueldo>[] = [
  { titulo: 'Periodo', celda: (s) => <PeriodoCelda periodo={s.periodo} /> },
  { titulo: 'Empresa', celda: (s) => <span className="font-semibold">{fTexto(s.empresa)}<span className="mt-0.5 block text-xs font-normal text-gris">{s.ruc ? `RUC ${s.ruc}` : ''}</span></span> },
  { titulo: 'Sueldo', celda: (s) => <span className="font-bold text-azul-oscuro">{fMoneda(s.montoSueldo)}</span>, derecha: true },
  { titulo: 'Gratif./bono', celda: (s) => fMoneda(s.gratifBono), derecha: true },
  { titulo: 'Ingreso anual est.', celda: (s) => fMoneda(s.ingresoEstimadoAnual), derecha: true },
  { titulo: 'Rango', celda: (s) => fTexto(s.rangoSueldo) },
  { titulo: 'Nivel', celda: (s) => fTexto(s.nivelIngreso) },
];
export const colMoviles: Columna<Movil>[] = [
  { titulo: 'Periodo', celda: (m) => <PeriodoCelda periodo={m.periodo} /> },
  { titulo: 'Operadora', celda: (m) => <span className="inline-flex items-start gap-2"><Building2 aria-hidden className="mt-1 size-3.5 shrink-0 text-gris" /><Operadora nombre={m.empresaOperadora} /></span>, className: 'min-w-48' },
  { titulo: 'Teléfono', celda: (m) => <span className="inline-flex items-center gap-2 rounded-lg bg-azul-10/70 px-2.5 py-1.5 font-bold text-azul-oscuro"><PhoneCall aria-hidden className="size-3.5 text-azul" />{fTexto(m.telefono)}</span> },
  { titulo: 'Titular', celda: (m) => <span className="inline-flex items-center gap-2 font-semibold text-texto"><UserRound aria-hidden className="size-4 shrink-0 text-gris" />{nombreCompleto(m.prenombres, m.apePat, m.apeMat)}</span>, className: 'min-w-52' },
  { titulo: 'Documento', celda: (m) => <span className="inline-flex items-center gap-1.5"><IdCard aria-hidden className="size-3.5 shrink-0 text-gris" /><DocumentoMovil documento={m.documento} /></span> },
  { titulo: 'Plan', celda: (m) => <span className="inline-flex items-center gap-1.5 text-gris"><CreditCard aria-hidden className="size-3.5 shrink-0" />{fTexto(m.planMovil)}</span> },
  { titulo: 'Modalidad', celda: (m) => <span className="inline-flex items-center gap-1.5 text-gris"><Smartphone aria-hidden className="size-3.5 shrink-0" />{fTexto(m.modalidad)}</span> },
  { titulo: 'Alta', celda: (m) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-gris"><CalendarDays aria-hidden className="size-3.5 shrink-0" />{fFecha(m.fechaAlta)}</span> },
];

// Para tablas sin tipo fijo (la API de empresas devuelve telefonos y sueldos como objetos libres)
function columnasLibres(filas: Record<string, unknown>[]): Columna<Record<string, unknown>>[] {
  const claves = [...new Set(filas.flatMap((f) => Object.keys(f)))].filter((k) => !/^(id|fechaCarga)$/i.test(k)).slice(0, 10);
  return claves.map((k) => ({
    titulo: ({ periodo: 'Periodo', documento: 'Documento', ruc: 'RUC', apepat: 'Apellido paterno', apemat: 'Apellido materno', prenombres: 'Nombres', telefono: 'Teléfono', fechaalta: 'Fecha de alta', planmovil: 'Plan móvil', modalidad: 'Modalidad', empresaoperadora: 'Empresa operadora' } as Record<string, string>)[k.replace(/[_\s]/g, '').toLowerCase()] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
    celda: (f) => {
      const v = f[k];
      if (typeof v === 'number') return /monto|sueldo|saldo|ingreso|bono/i.test(k) ? fMoneda(v) : fNumero(v);
      const campo = k.replace(/[_\s]/g, '').toLowerCase();
      if (campo === 'periodo') return <PeriodoCelda periodo={v == null ? null : String(v)} />;
      if (campo === 'documento' || campo === 'ruc') return <DocumentoMovil documento={v == null ? null : String(v)} />;
      if (campo === 'empresaoperadora') return <Operadora nombre={v == null ? null : String(v)} />;
      if (campo === 'telefono') return <span className="font-bold text-azul-oscuro">{fTexto(v == null ? null : String(v))}</span>;
      if (campo === 'apepat' || campo === 'apemat' || campo === 'prenombres') return <span className="font-medium text-texto">{fTexto(v == null ? null : String(v))}</span>;
      if (campo === 'fechaalta') return <span className="whitespace-nowrap text-gris">{fFecha(v == null ? null : String(v))}</span>;
      if (campo === 'planmovil' || campo === 'modalidad') return <span className="text-gris">{fTexto(v == null ? null : String(v))}</span>;
      return fTexto(v == null ? null : String(v));
    },
    className: k.replace(/[_\s]/g, '').toLowerCase() === 'empresaoperadora' ? 'w-64 min-w-64 whitespace-normal' : undefined,
  }));
}

export interface Secciones {
  deudas: Deuda[]; lineasCredito: LineaCredito[]; calificaciones: Calificacion[];
  sueldos: Sueldo[] | Record<string, unknown>[]; moviles: Movil[] | Record<string, unknown>[];
}

const PALETAS = {
  violeta:  { acento: '#7F77DD', marco: 'bg-[#CECBF6]', fondo: 'bg-[#EEEDFE]', etiqueta: 'text-[#534AB7]', valor: 'text-[#26215C]', icono: 'bg-[#CECBF6]/60' },
  turquesa: { acento: '#1D9E75', marco: 'bg-[#9FE1CB]', fondo: 'bg-[#E1F5EE]', etiqueta: 'text-[#0F6E56]', valor: 'text-[#04342C]', icono: 'bg-[#9FE1CB]/60' },
  ambar:    { acento: '#EF9F27', marco: 'bg-[#FAC775]', fondo: 'bg-[#FAEEDA]', etiqueta: 'text-[#854F0B]', valor: 'text-[#412402]', icono: 'bg-[#FAC775]/60' },
  verde:    { acento: '#639922', marco: 'bg-[#C0DD97]', fondo: 'bg-[#EAF3DE]', etiqueta: 'text-[#3B6D11]', valor: 'text-[#173404]', icono: 'bg-[#C0DD97]/60' },
  coral:    { acento: '#D85A30', marco: 'bg-[#F5C4B3]', fondo: 'bg-[#FAECE7]', etiqueta: 'text-[#993C1D]', valor: 'text-[#4A1B0C]', icono: 'bg-[#F5C4B3]/60' },
  rojo:     { acento: '#E24B4A', marco: 'bg-[#F7C1C1]', fondo: 'bg-[#FCEBEB]', etiqueta: 'text-[#A32D2D]', valor: 'text-[#501313]', icono: 'bg-[#F7C1C1]/60' },
  gris:     { acento: '#888780', marco: 'bg-[#D3D1C7]', fondo: 'bg-[#F1EFE8]', etiqueta: 'text-[#5F5E5A]', valor: 'text-[#2C2C2A]', icono: 'bg-[#D3D1C7]/60' },
} as const;

type Paleta = keyof typeof PALETAS;

// Cuenta desde 0 hasta el valor (respeta "reducir movimiento")
function useContador(objetivo: number | null, duracion = 900) {
  const [valor, setValor] = useState(0);
  useEffect(() => {
    if (objetivo == null) return;
    // if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValor(objetivo); return; }
    let inicio: number | null = null;
    let id = 0;
    const paso = (t: number) => {
      if (inicio === null) inicio = t;
      const p = Math.min((t - inicio) / duracion, 1);
      setValor(objetivo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [objetivo, duracion]);
  return valor;
}

type ItemResumen = {
  titulo: string;
  nota: string;
  Icono: LucideIcon;
  paleta: Paleta;
  numero?: number | null;
  formato?: (n: number) => string;
  texto?: string;
};

function TarjetaResumen({ item, indice }: { item: ItemResumen; indice: number }) {
  const { titulo, nota, Icono, paleta, numero, formato, texto } = item;
  const p = PALETAS[paleta];
  const contado = useContador(numero ?? null);
  const valor = texto ?? (numero == null ? '—' : formato ? formato(contado) : String(Math.round(contado)));

  const rebote = 'ease-[cubic-bezier(0.34,1.56,0.64,1)]';

  return (
    <article
      style={{ animationDelay: `${indice * 80}ms`, '--acento': p.acento } as React.CSSProperties}
      className={clsx(
        'aparecer group relative isolate cursor-default overflow-hidden rounded-2xl p-4 [animation-fill-mode:backwards] sm:p-5',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1.5 hover:shadow-[0_16px_30px_-16px_var(--acento)]',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        p.marco,
      )}
    >
      {/* Luz que recorre todo el borde */}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <span className="aspect-square w-[200%] shrink-0 animate-[spin_2.5s_linear_infinite] bg-[conic-gradient(transparent_0deg,transparent_220deg,var(--acento)_300deg,#fff_350deg,transparent_360deg)] motion-reduce:animate-none" />
      </span>

      {/* Capa interior: fondo de la tarjeta (deja ver solo 1.5px de borde) */}
      <span aria-hidden className={clsx('absolute inset-[1.5px] overflow-hidden rounded-[calc(1rem-1.5px)]', p.fondo)}>
        {/* Círculo de color que crece desde la esquina */}
        <span className="absolute -right-8 -top-8 size-28 scale-50 rounded-full bg-[var(--acento)] opacity-0 transition-all duration-500 ease-out group-hover:scale-100 group-hover:opacity-15" />

        {/* Brillo que cruza la tarjeta */}
        <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/60 to-transparent transition-none group-hover:translate-x-[400%] group-hover:transition-transform group-hover:duration-700 group-hover:ease-out" />

        {/* Barra inferior que crece */}
        <span className="absolute bottom-0 left-0 h-[3px] w-0 rounded-r-full bg-[var(--acento)] transition-all duration-500 ease-out group-hover:w-full" />
      </span>

      {/* Contenido */}
      <div className="relative">
        <p className={clsx('flex items-center gap-2 text-xs font-semibold', p.etiqueta)}>
          <span
            className={clsx(
              'grid size-7 place-items-center rounded-lg transition-all duration-500',
              rebote,
              'group-hover:-rotate-12 group-hover:scale-125 group-hover:bg-[var(--acento)] group-hover:text-white',
              p.icono,
            )}
          >
            <Icono className="size-4" />
          </span>
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">{titulo}</span>
        </p>

        <p
          className={clsx(
            'numeros mt-3 origin-left truncate text-xl font-bold tracking-tight transition-transform duration-500 sm:text-2xl',
            rebote,
            'group-hover:scale-105',
            p.valor,
          )}
        >
          {valor}
        </p>

        <p className={clsx('mt-0.5 text-xs transition-opacity duration-300 group-hover:opacity-80', p.etiqueta)}>{nota}</p>
      </div>
    </article>
  );
}

export function Resumen({ s }: { s: Secciones }) {
  const ultimoPeriodo = s.deudas.reduce((m, d) => (d.periodo > m ? d.periodo : m), '');
  const deudasRecientes = s.deudas.filter((d) => d.periodo === ultimoPeriodo);
  const total = deudasRecientes.reduce((t, d) => t + (d.saldo ?? 0), 0);
  const entidades = new Set(deudasRecientes.map((d) => d.entidad)).size;
  const orden = ['verde', 'ambar', 'peligro'] as const;
  const peor = s.deudas.reduce<string | null>((p, d) => {
    if (!d.calificacion) return p;
    return !p || orden.indexOf(tonoCalificacion(d.calificacion) as typeof orden[number]) > orden.indexOf(tonoCalificacion(p) as typeof orden[number]) ? d.calificacion : p;
  }, null);
  const sueldo = (s.sueldos as Sueldo[]).find((x) => typeof x?.montoSueldo === 'number')?.montoSueldo ?? null;

  const paletaPeor: Paleta = { verde: 'verde', ambar: 'coral', peligro: 'rojo', neutro: 'gris' }[tonoCalificacion(peor)] as Paleta;

  const items: ItemResumen[] = [
    { titulo: 'Deuda total', nota: ultimoPeriodo ? fPeriodo(ultimoPeriodo) : 'Sin deudas reportadas', numero: ultimoPeriodo ? total : null, formato: (n) => fMoneda(n), Icono: Banknote, paleta: 'violeta' },
    { titulo: 'Entidades', nota: 'En el último periodo', numero: entidades, formato: (n) => fNumero(Math.round(n)), Icono: CreditCard, paleta: 'turquesa' },
    { titulo: 'Peor calificación', nota: 'En el historial', texto: peor ?? '—', Icono: Gauge, paleta: paletaPeor },
    { titulo: 'Sueldo reportado', nota: 'Último registro', numero: sueldo, formato: (n) => fMoneda(n), Icono: Briefcase, paleta: 'ambar' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item, idx) => (
        <TarjetaResumen key={item.titulo} item={item} indice={idx} />
      ))}
    </div>
  );
}

// En pantalla cada seccion muestra solo su ultimo periodo (pedido del usuario, 2026-10-22); con "Ver todos los periodos"
// se despliega el historial completo. El PDF se genera con el resultado entero, asi que siempre lleva todos los periodos.
function soloUltimoPeriodo<T>(filas: T[], periodoDe: (f: T) => string): T[] {
  const ultimo = filas.reduce((m, f) => (periodoDe(f) > m ? periodoDe(f) : m), '');
  return ultimo ? filas.filter((f) => periodoDe(f) === ultimo) : filas;
}
const periodoTipado = (f: { periodo?: string | null }) => f.periodo ?? '';
const periodoLibre = (f: Record<string, unknown>) => String(f.periodo ?? '');

export function SeccionesResultado({ s, tipadas = true }: { s: Secciones; tipadas?: boolean }) {
  const [verTodo, setVerTodo] = useState(false);
  useEffect(() => { setVerTodo(false); }, [s]);

  const deudas = verTodo ? s.deudas : soloUltimoPeriodo(s.deudas, periodoTipado);
  const lineas = verTodo ? s.lineasCredito : soloUltimoPeriodo(s.lineasCredito, periodoTipado);
  const calificaciones = verTodo ? s.calificaciones : soloUltimoPeriodo(s.calificaciones, periodoTipado);
  const sueldosTipados = verTodo ? (s.sueldos as Sueldo[]) : soloUltimoPeriodo(s.sueldos as Sueldo[], periodoTipado);
  const sueldosLibres = verTodo ? (s.sueldos as Record<string, unknown>[]) : soloUltimoPeriodo(s.sueldos as Record<string, unknown>[], periodoLibre);
  const movilesTipados = verTodo ? (s.moviles as Movil[]) : soloUltimoPeriodo(s.moviles as Movil[], periodoTipado);
  const movilesLibres = verTodo ? (s.moviles as Record<string, unknown>[]) : soloUltimoPeriodo(s.moviles as Record<string, unknown>[], periodoLibre);
  const totalRegistros = s.deudas.length + s.lineasCredito.length + s.calificaciones.length + s.sueldos.length + s.moviles.length;
  const visibles = deudas.length + lineas.length + calificaciones.length + (tipadas ? sueldosTipados.length + movilesTipados.length : sueldosLibres.length + movilesLibres.length);
  const hayMas = totalRegistros > visibles;

  return (
    <div className="space-y-4">
      {(hayMas || verTodo) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borde bg-fondo px-4 py-2.5 text-sm text-gris">
          <span>
            {verTodo
              ? 'Mostrando todos los periodos.'
              : 'Mostrando solo el último periodo de cada sección. El PDF incluye todos los periodos.'}
          </span>
          <button type="button" className="font-semibold text-azul hover:underline" onClick={() => setVerTodo((v) => !v)}>
            {verTodo ? 'Ver solo el último periodo' : `Ver todos los periodos (${fNumero(totalRegistros)} registros)`}
          </button>
        </div>
      )}
      <Seccion titulo="Deudas" icono={<Banknote className="size-[18px]" />} cantidad={deudas.length}>
        <Tabla columnas={colDeudas} filas={deudas} clave={(d, i) => `${d.periodo}-${d.codigoSbs}-${i}`} vacio="No registra deudas." />
      </Seccion>
      <Seccion titulo="Líneas de crédito" icono={<CreditCard className="size-[18px]" />} cantidad={lineas.length}>
        <Tabla columnas={colLineas} filas={lineas} clave={(l, i) => `${l.periodo}-${i}`} vacio="No registra líneas de crédito." />
      </Seccion>
      <Seccion titulo="Calificaciones" icono={<Gauge className="size-[18px]" />} cantidad={calificaciones.length}>
        <Tabla columnas={colCalificaciones} filas={calificaciones} clave={(c, i) => `${c.periodo}-${i}`} vacio="No registra calificaciones." />
      </Seccion>
      <Seccion titulo="Información laboral" icono={<Briefcase className="size-[18px]" />} cantidad={tipadas ? sueldosTipados.length : sueldosLibres.length}>
        {tipadas
          ? <Tabla columnas={colSueldos} filas={sueldosTipados} clave={(x, i) => `${x.periodo}-${i}`} vacio="No registra información laboral." />
          : <Tabla columnas={columnasLibres(sueldosLibres)} filas={sueldosLibres} clave={(_, i) => i} vacio="No registra información laboral." />}
      </Seccion>
      <Seccion titulo="Teléfonos" icono={<Phone className="size-[18px]" />} cantidad={tipadas ? movilesTipados.length : movilesLibres.length}>
        {tipadas
          ? <Tabla columnas={colMoviles} filas={movilesTipados} clave={(m, i) => `${m.telefono}-${i}`} vacio="No registra teléfonos." />
          : <Tabla columnas={columnasLibres(movilesLibres)} filas={movilesLibres} clave={(_, i) => i} vacio="No registra teléfonos." />}
      </Seccion>
    </div>
  );
}
