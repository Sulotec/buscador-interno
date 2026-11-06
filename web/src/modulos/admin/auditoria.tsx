'use client';
// Auditoria: quien hizo que, cuando y desde que IP. Con filtros por fecha, usuario y accion.
import { CalendarDays, CheckCircle2, FileText, Filter, Globe, ListChecks, RotateCcw, Tag, UserRound, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Aviso, Boton, Campo, Chip, Paginacion, Tabla, type Columna } from '@/components/ui';
import { ErrorApi } from '@/lib/api';
import { fFecha, fTexto } from '@/lib/formato';
import { CabeceraAdmin, Panel } from './diseno';
import { servicioAdmin, type FiltroAuditoria } from './servicio';
import type { Pagina, RegistroAuditoria } from './tipos';

const BORRADOR_VACIO = { desde: '', hasta: '', usuario: '', accion: '' };

// Color de la acción según su tipo, para leer la bitácora de un vistazo
function tonoAccion(accion: string): 'azul' | 'verde' | 'ambar' | 'peligro' | 'neutro' {
  const a = accion.toUpperCase();
  if (a.startsWith('LISTA_NEGRA')) return 'peligro';
  if (a.startsWith('LOGIN') || a.includes('SESION')) return 'neutro';
  if (a.startsWith('TOKENS') || a.includes('USUARIO') || a.includes('ROL') || a.includes('CLAVE')) return 'ambar';
  if (a.startsWith('DESCARGA')) return 'verde';
  return 'azul';
}

export function AdminAuditoria() {
  const [filtro, setFiltro] = useState<FiltroAuditoria>({ pagina: 1, tamano: 25 });
  const [borrador, setBorrador] = useState(BORRADOR_VACIO);
  const [datos, setDatos] = useState<Pagina<RegistroAuditoria> | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    servicioAdmin.auditoria(filtro)
      .then((d) => { setDatos(d); setError(''); })
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la auditoría.'));
  }, [filtro]);
  useEffect(cargar, [cargar]);

  function aplicar(e: FormEvent) { e.preventDefault(); setFiltro({ ...borrador, pagina: 1, tamano: filtro.tamano }); }
  function limpiar() { setBorrador(BORRADOR_VACIO); setFiltro({ pagina: 1, tamano: filtro.tamano }); }
  const hayFiltros = Object.values(borrador).some(Boolean);

  const columnas: Columna<RegistroAuditoria>[] = [
    { titulo: 'Fecha', celda: (r) => <span className="numeros inline-flex items-center gap-1.5 whitespace-nowrap text-gris"><CalendarDays aria-hidden className="size-3.5 shrink-0" />{fFecha(r.fecha, true)}</span> },
    { titulo: 'Usuario', celda: (r) => <span className="inline-flex items-center gap-1.5 font-semibold text-texto"><UserRound aria-hidden className="size-3.5 shrink-0 text-azul" />{fTexto(r.usuario)}</span> },
    { titulo: 'Acción', celda: (r) => <Chip tono={tonoAccion(r.accion)} className="font-semibold tracking-wide">{r.accion}</Chip> },
    { titulo: 'Sobre', celda: (r) => <span className="inline-flex items-center gap-1.5 text-gris"><Tag aria-hidden className="size-3.5 shrink-0" />{fTexto([r.entidad, r.entidadId].filter(Boolean).join(' '))}</span> },
    { titulo: 'Detalle', celda: (r) => <span className="inline-flex max-w-80 items-center gap-1.5 text-gris" title={r.detalle ?? ''}><FileText aria-hidden className="size-3.5 shrink-0" /><span className="truncate">{fTexto(r.detalle)}</span></span> },
    { titulo: 'IP', celda: (r) => <span className="inline-flex items-center gap-1.5 font-mono text-xs text-gris"><Globe aria-hidden className="size-3.5 shrink-0" />{fTexto(r.ip)}</span> },
    { titulo: 'Resultado', celda: (r) => r.exito
      ? <Chip tono="verde"><CheckCircle2 aria-hidden className="size-3" />Correcto</Chip>
      : <Chip tono="peligro"><XCircle aria-hidden className="size-3" />Falló</Chip> },
  ];

  return (
    <div className="space-y-6">
      <CabeceraAdmin titulo="Auditoría" descripcion="Registro de inicios de sesión, consultas y cambios de administración: quién, qué, cuándo y desde dónde." />

      <Panel icono={Filter} titulo="Filtrar registros">
        <form onSubmit={aplicar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_1.3fr_auto] lg:items-end">
          <Campo etiqueta="Desde" type="date" value={borrador.desde} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} />
          <Campo etiqueta="Hasta" type="date" value={borrador.hasta} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} />
          <Campo etiqueta="Usuario" placeholder="Ej. jperez" value={borrador.usuario} onChange={(e) => setBorrador({ ...borrador, usuario: e.target.value })} />
          <Campo etiqueta="Acción" placeholder="Ej. LOGIN" value={borrador.accion} onChange={(e) => setBorrador({ ...borrador, accion: e.target.value })} />
          <div className="flex gap-2">
            {hayFiltros && <Boton type="button" variante="secundario" onClick={limpiar} aria-label="Limpiar filtros" title="Limpiar filtros"><RotateCcw className="size-4" /></Boton>}
            <Boton type="submit" className="flex-1"><Filter className="size-4" />Filtrar</Boton>
          </div>
        </form>
      </Panel>

      {error && <Aviso tono="error">{error}</Aviso>}

      <Panel sinRelleno icono={ListChecks} titulo="Registros de auditoría" cantidad={datos?.total}>
        {datos ? <>
          <Tabla columnas={columnas} filas={datos.items} clave={(r) => r.codAuditoria} vacio="No hay registros con esos filtros." paginacion={false} />
          <Paginacion pagina={filtro.pagina} tamano={filtro.tamano} total={datos.total} alCambiar={(p) => setFiltro({ ...filtro, pagina: p })}
            opcionesTamano={[10, 25, 50, 100]} alCambiarTamano={(tamano) => setFiltro({ ...filtro, pagina: 1, tamano })} />
        </> : !error && <p className="px-5 py-8 text-center text-sm text-gris">Cargando…</p>}
      </Panel>
    </div>
  );
}
