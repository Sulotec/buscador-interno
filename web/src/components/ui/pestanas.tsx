'use client';
import clsx from 'clsx';
import { type ReactNode } from 'react';

// Pestañas tipo tarjeta unidas a un panel:
// - las no elegidas son tarjetitas blancas, un poco más bajas, con el ícono en un círculo celeste;
// - la elegida es más alta, del mismo color que el panel, con franja azul arriba, y tapa la línea de base:
//   queda "abierta" hacia el contenido, como una carpeta;
// - con `children`, el contenido va dentro de un panel celeste suave unido a la pestaña elegida.
// La línea de base es una sombra interior del contenedor (se pinta debajo de los hijos): por eso la pestaña puede taparla.
const FONDO_PANEL = 'bg-[#f5f8fc]'; // opaco: si fuera transparente, la línea de base se vería a través de la pestaña

export function Pestanas<T extends string>({ opciones, valor, alCambiar, deshabilitadas = false, children }:
  { opciones: { id: T; texto: string; icono?: ReactNode }[]; valor: T; alCambiar: (v: T) => void; deshabilitadas?: boolean; children?: ReactNode }) {
  const tira = (
    <div role="tablist" aria-busy={deshabilitadas}
      // Alto fijo (pestaña elegida h-12 + 4px): mientras una pestaña crece y la otra se encoge, la fila no cambia
      // de alto, así el contenido de abajo no sube ni baja
      className="flex h-[52px] max-w-full shrink-0 items-end gap-1.5 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-azul-25)]">
      {opciones.map((o) => {
        const activa = valor === o.id;
        return (
          <button
            key={o.id} role="tab" aria-selected={activa} disabled={deshabilitadas} onClick={() => alCambiar(o.id)}
            className={clsx(
              'group/pestana inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-t-xl border border-b-0 border-azul-25 pr-4 text-sm font-semibold',
              'transition-all duration-300 ease-out motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azul/30 disabled:cursor-not-allowed disabled:opacity-55',
              o.icono ? 'pl-1.5' : 'pl-4',
              activa
                ? clsx('h-12 text-azul shadow-[inset_0_3px_0_var(--color-azul)]', FONDO_PANEL)
                // 1px más arriba que la base, para que la línea se vea debajo de las no elegidas
                : 'mb-px h-10 bg-white text-gris hover:h-11 hover:text-azul',
            )}
          >
            {o.icono && (
              <span aria-hidden className={clsx(
                'grid size-8 shrink-0 place-items-center rounded-full transition-all duration-300 motion-reduce:transition-none [&_svg]:size-4',
                activa ? 'bg-azul text-white shadow-sm shadow-azul/30' : 'bg-azul-10 text-azul group-hover/pestana:scale-105',
              )}>
                {o.icono}
              </span>
            )}
            {o.texto}
          </button>
        );
      })}
    </div>
  );

  if (children === undefined) return tira;
  return (
    <div className="min-w-0">
      {tira}
      <div role="tabpanel" className={clsx('space-y-4 rounded-b-2xl border border-t-0 border-azul-25 p-3 sm:p-4', FONDO_PANEL)}>
        {children}
      </div>
    </div>
  );
}
