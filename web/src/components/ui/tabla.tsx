'use client';
import clsx from 'clsx';
import { useState, type ReactNode } from "react";
import { Paginacion } from './paginacion';

export interface Columna<T> { titulo: string; celda: (fila: T) => ReactNode; derecha?: boolean; className?: string }

// Tabla de datos: en pantallas pequenas se desplaza de lado, con la cabecera fija.

export function Tabla<T>({ columnas, filas, clave, vacio = 'Sin registros.', paginacion = true, filasPorPagina = 10 }:
  { columnas: Columna<T>[]; filas: T[]; clave: (fila: T, i: number) => string | number; vacio?: string; paginacion?: boolean; filasPorPagina?: number }) {
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(filasPorPagina);
  if (!filas.length) return <p className="px-5 py-8 text-center text-sm text-gris">{vacio}</p>;
  const paginas = Math.max(1, Math.ceil(filas.length / tamano));
  const paginaActual = Math.min(pagina, paginas);
  const filasVisibles = paginacion
    ? filas.slice((paginaActual - 1) * tamano, paginaActual * tamano)
    : filas;
  return (
    <div>
      <div className="tabla-scroll max-h-[32rem] overflow-auto overscroll-contain">
        <table className="numeros w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              {columnas.map((c) => (
                <th key={c.titulo} scope="col" className={clsx('whitespace-nowrap border-b border-borde bg-[#f5f7fb] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gris sm:px-5', c.derecha && 'text-right', c.className)}>
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map((f, i) => (
              <tr key={clave(f, paginacion ? (paginaActual - 1) * tamano + i : i)} className="transition-colors duration-150 odd:bg-white even:bg-[#fafbfe] hover:bg-azul-10/70 [&:last-child>td]:border-b-0">
                {columnas.map((c) => (
                  <td key={c.titulo} className={clsx('whitespace-nowrap border-b border-borde/70 px-4 py-3 align-top text-texto sm:px-5', c.derecha && 'text-right', c.className)}>{c.celda(f)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginacion && (
        <Paginacion pagina={paginaActual} tamano={tamano} total={filas.length} alCambiar={setPagina}
          opcionesTamano={[...new Set([10, 25, 50, 100, tamano])].sort((a, b) => a - b)}
          alCambiarTamano={(nuevoTamano) => { setTamano(nuevoTamano); setPagina(1); }} />
      )}
    </div>
  );
}
