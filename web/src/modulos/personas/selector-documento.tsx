'use client';
// Selector del tipo de documento (DNI, CE, RUC, Pasaporte) para la consulta individual.
import { ChevronDown } from 'lucide-react';
import { TIPOS_DOCUMENTO, type TipoDocumento } from './documentos';

export function SelectorDocumento({ valor, alCambiar }: { valor: TipoDocumento; alCambiar: (t: TipoDocumento) => void }) {
  return (
    <label className="relative block w-full shrink-0 sm:w-44">
      <span className="sr-only">Tipo de documento</span>
      <select
        value={valor}
        onChange={(e) => alCambiar(e.target.value as TipoDocumento)}
        className="selector-documento__select focus-control p-2 w-full cursor-pointer appearance-none rounded-xl border-2 border-borde bg-white pl-4 pr-9 text-sm font-semibold text-texto shadow-sm transition-colors hover:border-azul-25"
      >
        {TIPOS_DOCUMENTO.map((t) => <option className="selector-documento__opcion" key={t.id} value={t.id}>{t.etiqueta}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-azul transition-transform" aria-hidden />
    </label>
  );
}
