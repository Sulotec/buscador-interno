'use client';
import clsx from 'clsx';
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({ abierto, titulo, alCerrar, children, ancho = 'max-w-lg' }:
  { abierto: boolean; titulo: string; alCerrar: () => void; children: ReactNode; ancho?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);
  return (
    <dialog ref={ref} onClose={alCerrar} aria-labelledby={tituloId} className={clsx('m-auto w-[calc(100%-2rem)] rounded-xl border border-borde bg-white p-0 shadow-2xl backdrop:bg-slate-950/45', ancho)}>
      {abierto && (
        <div className="aparecer">
          <header className="flex items-center justify-between border-b border-borde px-5 py-4">
            <h2 id={tituloId} className="text-lg font-semibold text-texto">{titulo}</h2>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className="rounded-md p-1 text-gris hover:bg-fondo focus-visible:outline-2 focus-visible:outline-azul"><X aria-hidden className="size-5" /></button>
          </header>
          <div className="p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
