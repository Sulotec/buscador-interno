'use client';
// Selector del tipo de documento (DNI, CE, RUC, Pasaporte) para la consulta individual.
import { ChevronDown } from 'lucide-react';
import { useRef } from 'react';
import { TIPOS_DOCUMENTO, type TipoDocumento } from './documentos';

export function SelectorDocumento({ valor, alCambiar, disabled = false }: { valor: TipoDocumento; alCambiar: (t: TipoDocumento) => void; disabled?: boolean }) {
  const selectorRef = useRef<HTMLDetailsElement>(null);

  return (
    <div className="block w-full shrink-0 sm:w-44">
      <span className="sr-only">Tipo de documento</span>
      <details ref={selectorRef} className="group relative" onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          selectorRef.current?.removeAttribute('open');
          selectorRef.current?.querySelector('summary')?.focus();
        }
      }}>
        <summary
          aria-label="Tipo de documento"
          aria-haspopup="listbox"
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          onClick={(evento) => { if (disabled) evento.preventDefault(); }}
          className={`focus-control flex w-full list-none items-center justify-between rounded-xl border-2 border-borde bg-white p-2 pl-4 pr-3 text-sm font-semibold text-texto shadow-sm transition-colors [&::-webkit-details-marker]:hidden ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-azul-25'}`}
        >
          {TIPOS_DOCUMENTO.find((t) => t.id === valor)?.etiqueta ?? valor}
          <ChevronDown className="size-4 shrink-0 text-azul transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        {!disabled && <div role="listbox" aria-label="Tipo de documento" className="absolute left-0 top-full z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-borde bg-white p-1 shadow-lg">
          {TIPOS_DOCUMENTO.map((t) => <button
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul ${valor === t.id ? 'bg-fondo font-semibold text-azul' : 'text-texto'}`}
            key={t.id}
            type="button"
            role="option"
            aria-selected={valor === t.id}
            onClick={() => {
              alCambiar(t.id);
              selectorRef.current?.removeAttribute('open');
            }}
          >{t.etiqueta}</button>)}
        </div>}
      </details>
    </div>
  );
}
