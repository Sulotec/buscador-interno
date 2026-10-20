'use client';
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export function Paginacion({ pagina, tamano, total, alCambiar, opcionesTamano, alCambiarTamano }: {
  pagina: number;
  tamano: number;
  total: number;
  alCambiar: (p: number) => void;
  opcionesTamano?: number[];
  alCambiarTamano?: (tamano: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const paginaActual = Math.min(Math.max(1, pagina), paginas);
  const desde = total ? (paginaActual - 1) * tamano + 1 : 0;
  const hasta = Math.min(paginaActual * tamano, total);
  return (
    <div className="flex flex-col gap-3 border-t border-borde bg-[#fafbfe] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-gris sm:justify-start">
        <span className="numeros">Mostrando <strong className="font-semibold text-texto">{desde}–{hasta}</strong> de <strong className="font-semibold text-texto">{total.toLocaleString('es-PE')}</strong></span>
        {opcionesTamano && alCambiarTamano && (
          <label className="flex items-center gap-2 font-medium">
            Filas por página
            <span className="relative">
              <select value={tamano} onChange={(e) => alCambiarTamano(Number(e.target.value))} aria-label="Filas por página"
                className="focus-control h-9 min-w-16 cursor-pointer appearance-none rounded-lg border border-borde bg-white pl-3 pr-8 text-xs font-semibold text-texto shadow-sm transition-colors hover:border-azul-25">
                {opcionesTamano.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gris" aria-hidden />
            </span>
          </label>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="numeros text-xs font-medium text-gris">Página <strong className="text-texto">{paginaActual}</strong> de {paginas}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" className="grid size-9 place-items-center rounded-lg border border-borde bg-white text-azul transition-colors hover:border-azul-25 hover:bg-azul-10 disabled:cursor-not-allowed disabled:opacity-40" disabled={paginaActual <= 1} onClick={() => alCambiar(paginaActual - 1)} aria-label="Página anterior"><ChevronLeft className="size-4" /></button>
          <button type="button" className="grid size-9 place-items-center rounded-lg border border-borde bg-white text-azul transition-colors hover:border-azul-25 hover:bg-azul-10 disabled:cursor-not-allowed disabled:opacity-40" disabled={paginaActual >= paginas} onClick={() => alCambiar(paginaActual + 1)} aria-label="Página siguiente"><ChevronRight className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}
