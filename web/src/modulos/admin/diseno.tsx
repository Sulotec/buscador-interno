'use client';
// Piezas visuales de Administración (Usuarios y tokens, Auditoría, Lista negra). Copian el diseño de Personas:
// el mismo encabezado y las secciones con icono y contador.
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Search, type LucideIcon } from 'lucide-react';
import { Boton, Chip, Encabezado, Tarjeta } from '@/components/ui';
import { fNumero } from '@/lib/formato';

// Encabezado de la página: el mismo de Búsqueda global / Carga masiva
export function CabeceraAdmin({ titulo, descripcion, accion }: { titulo: string; descripcion: string; accion?: ReactNode }) {
  return <Encabezado titulo={titulo} bajada={descripcion} accion={accion} />;
}

// Sección con icono azul, título y contador: igual que "Deudas", "Teléfonos"… en la consulta de personas
export function Panel({ icono: Icono, titulo, cantidad, accion, children, sinRelleno, className }:
  { icono: LucideIcon; titulo: string; cantidad?: number; accion?: ReactNode; children: ReactNode; sinRelleno?: boolean; className?: string }) {
  return (
    <Tarjeta sinRelleno={sinRelleno} className={clsx('aparecer overflow-hidden', className)} accion={accion}
      titulo={
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-texto">
          <span className="text-azul"><Icono className="size-[18px]" aria-hidden /></span>{titulo}
          {cantidad !== undefined && <Chip tono={cantidad ? 'azul' : 'neutro'}>{fNumero(cantidad)}</Chip>}
        </h2>
      }>
      {children}
    </Tarjeta>
  );
}

// Buscador para la cabecera de una sección: busca con el botón o con Enter
export function BuscadorPanel({ valor, alCambiar, alBuscar, placeholder, etiqueta }:
  { valor: string; alCambiar: (v: string) => void; alBuscar: () => void; placeholder: string; etiqueta: string }) {
  return (
    <form role="search" aria-label={etiqueta} onSubmit={(e) => { e.preventDefault(); alBuscar(); }} className="flex w-full gap-2 sm:w-auto">
      <label className="relative block min-w-0 flex-1 sm:w-72 sm:flex-none">
        <span className="sr-only">{etiqueta}</span>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" />
        <input value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} className="input input--icono" />
      </label>
      <Boton type="submit" className="shrink-0"><Search className="size-4" aria-hidden />Buscar</Boton>
    </form>
  );
}

// Avatar con iniciales
export function Avatar({ nombre, alterno, admin }: { nombre: string; alterno: string; admin?: boolean }) {
  const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || alterno.slice(0, 2).toUpperCase();
  return (
    <span aria-hidden className={clsx('grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold', admin ? 'bg-peligro-10 text-peligro' : 'bg-azul-10 text-azul')}>
      {iniciales}
    </span>
  );
}
