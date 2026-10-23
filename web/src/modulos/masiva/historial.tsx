'use client';
// Historial de descargas de la carga masiva (ultimos archivos generados por la persona).
import { Download, FileSpreadsheet, History } from 'lucide-react';
import { useState } from 'react';
import { Aviso, Boton, Chip, Tabla, Tarjeta, Vacio, type Columna } from '@/components/ui';
import { ErrorApi, guardarArchivo } from '@/lib/api';
import { fBytes, fFecha, fNumero } from '@/lib/formato';
import { SECCIONES } from './documentos';
import { servicioMasiva } from './servicio';
import type { HistorialDescarga } from './tipos';

const nombreSeccion = (id: string) => SECCIONES.find((s) => s.id === id)?.nombre ?? id;
const colorSeccion: Record<string, string> = {
  moviles: 'bg-[#e8f5fb] text-[#26718e]',
  sueldos: 'bg-[#edf5e4] text-[#587b2c]',
  deuda: 'bg-[#f9eaf0] text-[#9b4c68]',
  'lineas-credito': 'bg-[#eeeafa] text-[#6555a0]',
  calificacion: 'bg-[#e8f3ef] text-[#3d7768]',
  fallecidos: 'bg-[#fbeaea] text-[#9b3b3b]',
};

export function HistorialDescargas({ items, cargando }: { items: HistorialDescarga[] | null; cargando: boolean }) {
  const [descargando, setDescargando] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function bajar(h: HistorialDescarga) {
    setDescargando(h.id); setError('');
    try { guardarArchivo(await servicioMasiva.descargar(h)); }
    catch (e) { setError(e instanceof ErrorApi ? e.message : 'No se pudo descargar el archivo.'); }
    finally { setDescargando(null); }
  }

  const columnas: Columna<HistorialDescarga>[] = [
    { titulo: 'Archivo', celda: (h) => <div className="flex min-w-56 items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e8f5ed] text-[#23834b]"><FileSpreadsheet className="size-4" /></span><span className="max-w-64 truncate font-semibold text-texto" title={h.archivo}>{h.archivo}</span></div>, className: 'py-4' },
    { titulo: 'Fecha', celda: (h) => <span className="text-sm text-gris">{fFecha(h.fecha, true)}</span> },
    { titulo: 'Documentos', celda: (h) => <span className="font-semibold tabular-nums text-texto">{fNumero(h.totalDnis)}</span>, derecha: true },
    { titulo: 'Con resultados', celda: (h) => <span className="font-semibold tabular-nums text-[#23834b]">{fNumero(h.dnisConResultados ?? null)}</span>, derecha: true },
    { titulo: 'Secciones', celda: (h) => <div className="flex max-w-[280px] flex-wrap gap-1.5 py-0.5">{h.secciones.map((s) => <span key={s} className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${colorSeccion[s] ?? 'bg-fondo text-gris'}`}>{nombreSeccion(s)}</span>)}</div>, className: 'w-[280px] max-w-[280px] whitespace-normal' },
    { titulo: 'Tamaño', celda: (h) => <span className="text-sm text-gris">{fBytes(h.tamanoBytes)}</span>, derecha: true },
    { titulo: '', celda: (h) => <Boton variante="secundario" className="h-9 rounded-lg border-azul-25 px-3 text-azul hover:bg-azul-10" onClick={() => bajar(h)} cargando={descargando === h.id} aria-label={`Descargar ${h.archivo}`}><Download className="size-4" /><span className="hidden xl:inline">Descargar</span></Boton>, derecha: true },
  ];

  return (
    <Tarjeta sinRelleno titulo={<h2 className="flex items-center gap-2 text-base font-semibold"><History className="size-[18px] text-azul" />Tus últimas descargas</h2>}>
      {error && <div className="p-4"><Aviso tono="error" alCerrar={() => setError('')}>{error}</Aviso></div>}
      {cargando ? <p className="px-5 py-8 text-center text-sm text-gris">Cargando historial…</p>
        : !items?.length ? <Vacio icono={<History className="size-5" />} titulo="Aún no tienes descargas">Los archivos que generes aparecerán aquí.</Vacio>
          : <div className="historial-tabla">
            <Tabla columnas={columnas} filas={items} clave={(h) => h.id} className="[&_thead_th]:border-b-2 [&_thead_th]:border-b-[#e5eaf2] [&_thead_th]:bg-white [&_thead_th]:py-3.5 [&_thead_th]:text-[10px] [&_thead_th]:font-semibold [&_thead_th]:tracking-[0.1em] [&_thead_th]:text-[#687286] [&_thead_th:first-child]:pl-6" filaClassName={() => 'odd:bg-white even:bg-[#fcfcfd] hover:bg-[#f7f9fc] [&>td]:border-b-[#edf0f4] [&>td]:py-3'} />
          </div>}
    </Tarjeta>
  );
}
