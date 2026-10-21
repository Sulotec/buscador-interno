'use client';
// Auditoria: quien hizo que, cuando y desde que IP. Con filtros por fecha, usuario y accion.
import { Filter, ListChecks } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Aviso, Boton, Campo, Chip, Encabezado, Paginacion, Tabla, Tarjeta, type Columna } from '@/components/ui';
import { ErrorApi } from '@/lib/api';
import { fFecha } from '@/lib/formato';
import { servicioAdmin, type FiltroAuditoria } from './servicio';
import type { Pagina, RegistroAuditoria } from './tipos';

export function AdminAuditoria() {
  const [filtro, setFiltro] = useState<FiltroAuditoria>({ pagina: 1, tamano: 25 });
  const [borrador, setBorrador] = useState({ desde: '', hasta: '', usuario: '', accion: '' });
  const [datos, setDatos] = useState<Pagina<RegistroAuditoria> | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    setError('');
    servicioAdmin.auditoria(filtro).then(setDatos).catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la auditoría.'));
  }, [filtro]);
  useEffect(cargar, [cargar]);

  function aplicar(e: FormEvent) { e.preventDefault(); setFiltro({ ...borrador, pagina: 1, tamano: filtro.tamano }); }

  const columnas: Columna<RegistroAuditoria>[] = [
    { titulo: 'Fecha', celda: (r) => <span className="whitespace-nowrap text-gris">{fFecha(r.fecha, true)}</span> },
    { titulo: 'Usuario', celda: (r) => <span className="font-medium text-texto">{r.usuario}</span> },
    { titulo: 'Acción', celda: (r) => <Chip tono="azul" className="font-semibold">{r.accion}</Chip> },
    { titulo: 'Sobre', celda: (r) => <span className="text-gris">{[r.entidad, r.entidadId].filter(Boolean).join(' ') || '—'}</span> },
    { titulo: 'Detalle', celda: (r) => <span className="block max-w-80 truncate text-gris" title={r.detalle ?? ''}>{r.detalle ?? '—'}</span> },
    { titulo: 'IP', celda: (r) => <span className="font-mono text-xs text-gris">{r.ip ?? '—'}</span> },
    { titulo: 'Resultado', celda: (r) => <Chip tono={r.exito ? 'verde' : 'peligro'}>{r.exito ? 'Correcto' : 'Falló'}</Chip> },
  ];

  return (
    <>
      <Encabezado titulo="Auditoría" bajada="Registro de inicios de sesión, consultas y cambios de administración." />
      <Tarjeta className="mb-4" titulo={<h2 className="flex items-center gap-2 text-base font-semibold"><Filter className="size-4 text-azul" />Filtrar registros</h2>}>
        <form onSubmit={aplicar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_1.3fr_auto] lg:items-end">
          <Campo etiqueta="Desde" type="date" value={borrador.desde} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} />
          <Campo etiqueta="Hasta" type="date" value={borrador.hasta} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} />
          <Campo etiqueta="Usuario" value={borrador.usuario} onChange={(e) => setBorrador({ ...borrador, usuario: e.target.value })} />
          <Campo etiqueta="Acción" placeholder="Ej. LOGIN" value={borrador.accion} onChange={(e) => setBorrador({ ...borrador, accion: e.target.value })} />
          <Boton type="submit"><Filter className="size-4" />Filtrar</Boton>
        </form>
      </Tarjeta>
      {error && <div className="mb-4"><Aviso tono="error">{error}</Aviso></div>}
      <Tarjeta sinRelleno titulo={<h2 className="flex items-center gap-2 text-base font-semibold"><ListChecks className="size-[18px] text-azul" />Registros de auditoría</h2>}>
        {datos ? <>
          <Tabla columnas={columnas} filas={datos.items} clave={(r) => r.codAuditoria} vacio="No hay registros con esos filtros." paginacion={false} className="[&_th]:bg-[#f5f7fb] [&_th]:py-3" filaClassName={() => 'even:bg-[#fafbfe] hover:bg-azul-10/40'} />
          <Paginacion pagina={filtro.pagina} tamano={filtro.tamano} total={datos.total} alCambiar={(p) => setFiltro({ ...filtro, pagina: p })}
            opcionesTamano={[10, 25, 50, 100]} alCambiarTamano={(tamano) => setFiltro({ ...filtro, pagina: 1, tamano })} />
        </> : <p className="px-5 py-8 text-center text-sm text-gris">Cargando…</p>}
      </Tarjeta>
    </>
  );
}
