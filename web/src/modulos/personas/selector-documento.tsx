'use client';
// Selector del tipo de documento (DNI, CE, RUC, Pasaporte) para la consulta individual.
import { ChevronDown } from 'lucide-react';
import { TIPOS_DOCUMENTO, type TipoDocumento } from './documentos';

export function SelectorDocumento({ valor, alCambiar }: { valor: TipoDocumento; alCambiar: (t: TipoDocumento) => void }) {
  return (
    <label className="relative sm:w-40">
      <span className="sr-only">Tipo de documento</span>
      <select
        value={valor}
        onChange={(e) => alCambiar(e.target.value as TipoDocumento)}
        className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-borde bg-azul-10/60 pl-3.5 pr-9 text-sm font-semibold text-azul focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/15"
      >
        {TIPOS_DOCUMENTO.map((t) => <option key={t.id} value={t.id}>{t.etiqueta}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-azul" aria-hidden />
    </label>
  );
}
