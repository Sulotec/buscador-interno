'use client';
// Vista previa de un PDF en un popup antes de descargarlo. Usa el archivo ya generado: descargar no vuelve a pedirlo a la API.
import { useEffect, useMemo } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { guardarArchivo, type Archivo } from '@/lib/api';
import { Boton } from './boton';
import { Modal } from './modal';

export function VisorPdf({ archivo, alCerrar, titulo = 'Vista previa del PDF' }:
  { archivo: Archivo | null; alCerrar: () => void; titulo?: string }) {
  // El navegador solo muestra el PDF si el blob lleva el tipo correcto
  const url = useMemo(() => {
    if (!archivo) return null;
    const pdf = archivo.blob.type === 'application/pdf' ? archivo.blob : new Blob([archivo.blob], { type: 'application/pdf' });
    return URL.createObjectURL(pdf);
  }, [archivo]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  return (
    <Modal abierto={!!archivo} titulo={titulo} alCerrar={alCerrar} ancho="max-w-5xl">
      <div className="space-y-4">
        {url && (
          <iframe src={url} title={archivo?.nombre ?? 'PDF'} className="h-[70vh] w-full rounded-lg border border-borde bg-fondo" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="truncate text-xs text-gris" title={archivo?.nombre}>
            {archivo?.nombre}
            {url && <> · <a href={url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-azul hover:underline">Abrir en otra pestaña<ExternalLink aria-hidden className="size-3" /></a></>}
          </p>
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={alCerrar}>Cerrar</Boton>
            <Boton variante="primario" onClick={() => archivo && guardarArchivo(archivo)}><Download className="size-4" />Descargar</Boton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
