'use client';
// Lista negra: DNI que nadie puede consultar en el Buscador. Solo ADMIN GENERAL agrega y quita.
import clsx from 'clsx';
import { Ban, CalendarDays, Fingerprint, ListChecks, Loader2, MessageSquareText, ShieldCheck, Unlock, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Aviso, Boton, Chip, Modal, Paginacion, Tabla, type Columna } from '@/components/ui';
import { ErrorApi } from '@/lib/api';
import { fFecha, fTexto } from '@/lib/formato';
import { BuscadorPanel, CabeceraAdmin, Panel } from './diseno';
import { servicioAdmin } from './servicio';
import type { Pagina, RegistroListaNegra } from './tipos';

const MAX_MOTIVO = 250;
const fechaUtc = (f: string) => (f.endsWith('Z') ? f : `${f}Z`);

const DIGITOS_DNI = 8;

// Limpia lo que se escribe o pega en el cuadro: solo números, un DNI por línea y como máximo 8 dígitos por línea.
// Al completar 8 dígitos al final, salta solo a la línea siguiente para escribir el próximo.
function normalizarEntrada(nuevo: string, anterior: string): string {
  const lineas = nuevo
    .replace(/[\s,;|]+/g, '\n')          // separadores (espacios, comas, tabuladores) → nueva línea
    .replace(/[^\d\n]/g, '')             // fuera letras y símbolos
    .split('\n')
    // Un número largo pegado se corta en bloques de 8
    .flatMap((l) => (l.length > DIGITOS_DNI ? l.match(/\d{1,8}/g) ?? [] : [l]));
  let texto = lineas.join('\n').replace(/\n{2,}/g, '\n').replace(/^\n/, '');
  const ultima = texto.split('\n').at(-1) ?? '';
  if (texto.length > anterior.length && ultima.length === DIGITOS_DNI) texto += '\n';
  return texto;
}

type EstadoDni = 'valido' | 'incompleto' | 'repetido' | 'bloqueado' | 'vacio';
interface LineaDni { texto: string; estado: EstadoDni; repetidoDe?: number }

// Clasifica cada línea: válida, incompleta (menos de 8 dígitos), repetida o ya bloqueada
function revisarDnis(texto: string, yaBloqueados: ReadonlySet<string>) {
  const primera = new Map<string, number>();
  const lineas: LineaDni[] = texto.split('\n').map((t, i) => {
    if (!t) return { texto: t, estado: 'vacio' };
    if (t.length < DIGITOS_DNI) return { texto: t, estado: 'incompleto' };
    const previa = primera.get(t);
    if (previa !== undefined) return { texto: t, estado: 'repetido', repetidoDe: previa + 1 };
    primera.set(t, i);
    return { texto: t, estado: yaBloqueados.has(t) ? 'bloqueado' : 'valido' };
  });
  const de = (e: EstadoDni) => lineas.filter((l) => l.estado === e).map((l) => l.texto);
  return { lineas, validos: de('valido'), incompletos: de('incompleto'), repetidos: de('repetido'), bloqueados: de('bloqueado'), completos: [...primera.keys()] };
}

const SIN_BLOQUEOS: ReadonlySet<string> = new Set();

export function AdminListaNegra() {
  const [texto, setTexto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'alerta' | 'error'; texto: string } | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState({ texto: '', pagina: 1, tamano: 25 });
  const [datos, setDatos] = useState<Pagina<RegistroListaNegra> | null>(null);
  const [errorLista, setErrorLista] = useState('');

  // Desbloquear pide el motivo; el registro no se borra, queda en el historial
  const [aQuitar, setAQuitar] = useState<RegistroListaNegra | null>(null);
  const [motivoQuitar, setMotivoQuitar] = useState('');
  const [quitando, setQuitando] = useState(false);
  const abrirQuitar = (r: RegistroListaNegra) => { setMotivoQuitar(''); setAQuitar(r); };

  // DNI completos (8 dígitos, sin repetir) que hay que revisar contra la lista negra
  const completos = useMemo(() => revisarDnis(texto, SIN_BLOQUEOS).completos, [texto]);
  const claveCompletos = completos.join(',');
  const [revision, setRevision] = useState<{ clave: string; bloqueados: ReadonlySet<string> } | null>(null);
  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    if (!completos.length) return;
    let vigente = true;
    const espera = setTimeout(() => {
      servicioAdmin.yaBloqueados(completos)
        .then((b) => { if (vigente) setRevision({ clave: claveCompletos, bloqueados: new Set(b) }); })
        // Si no se pudo revisar, se deja continuar: la API igual informa los que ya estaban al bloquear
        .catch(() => { if (vigente) setRevision({ clave: claveCompletos, bloqueados: new Set() }); });
    }, 350);
    return () => { vigente = false; clearTimeout(espera); };
  }, [completos, claveCompletos, recarga]);
  const yaBloqueados = useMemo<ReadonlySet<string>>(
    () => (revision?.clave === claveCompletos ? revision.bloqueados : SIN_BLOQUEOS), [revision, claveCompletos]);
  const revisando = completos.length > 0 && revision?.clave !== claveCompletos;
  const documentos = useMemo(() => revisarDnis(texto, yaBloqueados), [texto, yaBloqueados]);
  const fondoRef = useRef<HTMLDivElement>(null);

  // Saca del cuadro los DNI que ya están bloqueados, los repetidos y los incompletos
  const limpiarEntrada = () => setTexto(documentos.validos.length ? `${documentos.validos.join('\n')}\n` : '');

  // Una sola tabla con todos los registros: primero los bloqueados y debajo los desbloqueados
  const cargar = useCallback(() => {
    servicioAdmin.listaNegra(filtro.texto, 'historial', filtro.pagina, filtro.tamano)
      .then((d) => { setDatos(d); setErrorLista(''); })
      .catch((e) => setErrorLista(e instanceof ErrorApi ? e.message : 'No se pudo cargar la lista negra.'));
  }, [filtro]);
  useEffect(() => { cargar(); }, [cargar]);

  async function bloquear(e: FormEvent) {
    e.preventDefault();
    if (!documentos.validos.length) {
      setAviso({ tono: 'error', texto: documentos.bloqueados.length
        ? 'Los DNI ingresados ya están en la lista de bloqueados.'
        : 'Ingresa al menos un DNI completo (8 dígitos).' });
      return;
    }
    if (motivo.trim().length < 3) { setAviso({ tono: 'error', texto: 'Escribe el motivo del bloqueo.' }); return; }
    setGuardando(true);
    setAviso(null);
    try {
      const r = await servicioAdmin.bloquear(documentos.validos, motivo.trim());
      const partes = [
        r.agregados.length ? `${r.agregados.length} DNI bloqueado(s).` : '',
        r.yaBloqueados.length ? `${r.yaBloqueados.length} ya estaba(n) en la lista de bloqueados: ${r.yaBloqueados.join(', ')}.` : '',
        documentos.bloqueados.length ? `No se incluyeron porque ya estaban bloqueados: ${documentos.bloqueados.join(', ')}.` : '',
        documentos.incompletos.length ? `No se incluyeron por estar incompletos: ${documentos.incompletos.join(', ')}.` : '',
      ].filter(Boolean);
      setAviso({ tono: r.agregados.length ? 'exito' : 'alerta', texto: partes.join(' ') });
      if (r.agregados.length) { setTexto(''); setMotivo(''); setRecarga((n) => n + 1); }
      setFiltro((f) => ({ ...f, pagina: 1 }));
      cargar();
    } catch (err) {
      setAviso({ tono: 'error', texto: err instanceof ErrorApi ? err.message : 'No se pudo bloquear.' });
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarQuitar() {
    if (!aQuitar || motivoQuitar.trim().length < 3) return;
    setQuitando(true);
    try {
      await servicioAdmin.desbloquear(aQuitar.documento, motivoQuitar.trim());
      setAviso({ tono: 'exito', texto: `El DNI ${aQuitar.documento} se desbloqueó y ya se puede consultar. El registro queda en el historial.` });
      setAQuitar(null);
      setRecarga((n) => n + 1);
      cargar();
    } catch (err) {
      setAviso({ tono: 'error', texto: err instanceof ErrorApi ? err.message : 'No se pudo desbloquear el DNI.' });
      setAQuitar(null);
    } finally {
      setQuitando(false);
    }
  }

  const columnas: Columna<RegistroListaNegra>[] = [
    { titulo: 'DNI', celda: (r) => <span className={clsx('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide', r.activo ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-fondo text-gris')}><Fingerprint aria-hidden className="size-3.5 shrink-0" />{r.documento}</span> },
    { titulo: 'Estado', celda: (r) => r.activo
      ? <Chip tono="peligro"><Ban aria-hidden className="size-3" />Bloqueado</Chip>
      : <Chip tono="verde"><ShieldCheck aria-hidden className="size-3" />Desbloqueado</Chip> },
    { titulo: 'Motivo del bloqueo', celda: (r) => <span className="inline-flex max-w-80 items-start gap-1.5 whitespace-normal break-words text-texto"><MessageSquareText aria-hidden className="mt-0.5 size-3.5 shrink-0 text-azul" />{fTexto(r.motivo)}</span>, className: 'min-w-56 whitespace-normal' },
    { titulo: 'Bloqueado por', celda: (r) => (
      <span className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 font-semibold text-texto"><UserRound aria-hidden className="size-3.5 shrink-0 text-gris" />{fTexto(r.usuario)}</span>
        <span className="numeros inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-gris"><CalendarDays aria-hidden className="size-3 shrink-0" />{fFecha(fechaUtc(r.fechaUtc), true)}</span>
      </span>
    ) },
    ...[
      { titulo: 'Desbloqueado por', celda: (r: RegistroListaNegra) => r.activo ? null : (
        <span className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 font-semibold text-texto"><UserRound aria-hidden className="size-3.5 shrink-0 text-gris" />{fTexto(r.usuarioQuito)}</span>
          <span className="numeros inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-gris"><CalendarDays aria-hidden className="size-3 shrink-0" />{r.fechaQuitoUtc ? fFecha(fechaUtc(r.fechaQuitoUtc), true) : '-'}</span>
        </span>
      ) },
      { titulo: 'Motivo del desbloqueo', className: 'min-w-56 whitespace-normal', celda: (r: RegistroListaNegra) => r.activo ? null : (
        <span className="inline-flex max-w-80 items-start gap-1.5 whitespace-normal break-words text-texto"><MessageSquareText aria-hidden className="mt-0.5 size-3.5 shrink-0 text-verde" />{fTexto(r.motivoQuito)}</span>
      ) },
    ],
    { titulo: '', derecha: true, celda: (r) => r.activo
      ? <Boton variante="peligro" className="h-9 px-3" onClick={() => abrirQuitar(r)} aria-label={`Desbloquear ${r.documento}`}><Unlock className="size-4" />Desbloquear</Boton>
      : <span className="sr-only">Sin acciones</span> },
  ];

  return (
    <div className="space-y-6">
      <CabeceraAdmin titulo="Lista negra"
        descripcion="DNI que nadie puede consultar: búsqueda por DNI, ficha personal, PDF, teléfono, nombres, fallecidos ni carga masiva. No se cobran tokens por ellos." />

      <Panel icono={Ban} titulo="Bloquear DNI">
        <p className="mb-4 text-sm text-gris">Pega uno o varios DNI y escribe el motivo. El bloqueo aplica a todos los usuarios, incluido ADMIN GENERAL.</p>
        <form onSubmit={bloquear} className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="dnis-bloquear" className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-texto">
              DNI a bloquear
              <span className="text-xs font-normal text-gris">Solo números · 8 dígitos · uno por línea</span>
            </label>
            <div className="overflow-hidden rounded-xl border-2 border-borde bg-white transition-colors focus-within:border-azul focus-within:ring-2 focus-within:ring-azul/15">
              {/* El texto del cuadro es transparente; detrás se dibuja la misma lista con cada línea marcada,
                  como en la carga masiva. Ambos usan la misma letra y espaciado para coincidir. */}
              <div className="relative">
                <div ref={fondoRef} aria-hidden className="numeros pointer-events-none absolute inset-0 overflow-hidden whitespace-pre p-4 text-sm leading-6 text-texto">
                  {texto && documentos.lineas.map((l, i) => (
                    <div key={i} className={clsx(
                      (l.estado === 'bloqueado' || l.estado === 'repetido') && 'rounded bg-peligro-10 text-peligro',
                      l.estado === 'incompleto' && 'rounded bg-ambar-10 text-ambar',
                    )}>
                      <span className={clsx((l.estado === 'bloqueado' || l.estado === 'repetido') && 'line-through decoration-peligro/60')}>{l.texto || ' '}</span>
                      {l.estado === 'bloqueado' && <span className="ml-3 text-[11px] font-semibold">✗ Ya está en la lista de bloqueados · no se incluirá</span>}
                      {l.estado === 'repetido' && <span className="ml-3 text-[11px] font-semibold">✗ Repetido (línea {l.repetidoDe}) · no se incluirá</span>}
                      {l.estado === 'incompleto' && i < documentos.lineas.length - 1 && <span className="ml-3 text-[11px] font-semibold">Faltan {DIGITOS_DNI - l.texto.length} dígito(s)</span>}
                    </div>
                  ))}
                </div>
                <textarea id="dnis-bloquear" value={texto} rows={6} disabled={guardando} inputMode="numeric" spellCheck={false}
                  onChange={(e) => setTexto(normalizarEntrada(e.target.value, texto))}
                  onScroll={(e) => { if (fondoRef.current) { fondoRef.current.scrollTop = e.currentTarget.scrollTop; fondoRef.current.scrollLeft = e.currentTarget.scrollLeft; } }}
                  placeholder={'12345678\n87654321'}
                  className="focus-control numeros relative min-h-40 w-full resize-none whitespace-pre border-0 bg-transparent p-4 text-sm leading-6 text-transparent caret-texto placeholder:text-gris/70 selection:bg-azul/25 focus:outline-none focus:ring-0 disabled:cursor-not-allowed" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borde bg-fondo/40 px-4 py-2 text-[11px]">
                <span className="flex flex-wrap items-center gap-1.5">
                  <Chip tono={documentos.validos.length ? 'verde' : 'neutro'}>{documentos.validos.length} listo(s) para bloquear</Chip>
                  {documentos.bloqueados.length > 0 && <Chip tono="peligro">{documentos.bloqueados.length} ya bloqueado(s)</Chip>}
                  {documentos.repetidos.length > 0 && <Chip tono="peligro">{documentos.repetidos.length} repetido(s)</Chip>}
                  {revisando && <span className="inline-flex items-center gap-1 text-gris"><Loader2 aria-hidden className="size-3 animate-spin" />Revisando la lista…</span>}
                </span>
                {(documentos.bloqueados.length > 0 || documentos.repetidos.length > 0) && (
                  <button type="button" onClick={limpiarEntrada} disabled={guardando} className="font-semibold text-peligro underline underline-offset-2 hover:no-underline">Quitar los que no se incluirán</button>
                )}
              </div>
            </div>
            {documentos.bloqueados.length > 0 && (
              <p role="status" className="mt-2 flex items-start gap-1.5 text-xs text-peligro">
                <Ban aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {documentos.bloqueados.length === 1
                  ? `El DNI ${documentos.bloqueados[0]} ya está en la lista de bloqueados y no se incluirá.`
                  : `Los DNI ${documentos.bloqueados.join(', ')} ya están en la lista de bloqueados y no se incluirán.`}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-texto">Motivo del bloqueo</span>
              {/* Tamaño fijo y el mismo relleno (p-4) que el cuadro de "DNI a bloquear" */}
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, MAX_MOTIVO))} rows={3} disabled={guardando}
                placeholder="Ej. Solicitud del titular, caso legal, colaborador de la empresa…"
                className="input min-h-20 resize-none !p-4 leading-6 disabled:cursor-not-allowed disabled:bg-fondo" />
              <span className="mt-1 block text-right text-xs text-gris">{motivo.length}/{MAX_MOTIVO}</span>
            </label>
            <div className="mt-auto flex justify-end">
              <Boton type="submit" className="shadow-md hover:-translate-y-0.5 hover:shadow-lg" cargando={guardando} disabled={revisando || !documentos.validos.length || motivo.trim().length < 3}>
                <Ban className="size-4" />Bloquear {documentos.validos.length > 1 ? `${documentos.validos.length} DNI` : 'DNI'}
              </Boton>
            </div>
          </div>
        </form>
      </Panel>

      {aviso && <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>{aviso.texto}</Aviso>}
      {errorLista && <Aviso tono="error">{errorLista}</Aviso>}

      <Panel sinRelleno icono={ListChecks} titulo="DNI en la lista negra" cantidad={datos?.total}
        accion={<BuscadorPanel valor={busqueda} alCambiar={setBusqueda} alBuscar={() => setFiltro({ ...filtro, texto: busqueda, pagina: 1 })} placeholder="DNI, motivo o usuario" etiqueta="Buscar en la lista negra" />}>
        <p className="border-b border-borde bg-fondo/50 px-5 py-2.5 text-xs text-gris">
          Arriba los <strong className="text-peligro">bloqueados</strong> (no se pueden consultar). Debajo, en gris, los <strong className="text-verde">desbloqueados</strong>: se conservan como historial con quién y por qué se desbloquearon.
        </p>
        {datos ? <>
          <Tabla columnas={columnas} filas={datos.items} clave={(r) => r.id} paginacion={false} className="[&_td]:align-middle"
            filaClassName={(r) => (r.activo ? '' : 'opacity-70')}
            vacio={filtro.texto ? 'No hay registros con esa búsqueda.' : 'La lista negra está vacía. Todos los DNI se pueden consultar.'} />
          {datos.total > 0 && <Paginacion pagina={filtro.pagina} tamano={filtro.tamano} total={datos.total} alCambiar={(p) => setFiltro({ ...filtro, pagina: p })}
            opcionesTamano={[10, 25, 50, 100]} alCambiarTamano={(tamano) => setFiltro({ ...filtro, pagina: 1, tamano })} />}
        </> : !errorLista && <p className="px-5 py-8 text-center text-sm text-gris">Cargando…</p>}
      </Panel>

      <Modal abierto={!!aQuitar} titulo="Desbloquear DNI" alCerrar={() => !quitando && setAQuitar(null)}>
        {aQuitar && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); confirmarQuitar(); }}>
            <p className="text-sm text-texto">
              ¿Desbloquear el DNI <strong className="numeros">{aQuitar.documento}</strong>? Desde ese momento se podrá consultar por todas las vías.
              El registro <strong>no se borra</strong>: queda en el historial.
            </p>
            <div className="rounded-lg bg-fondo p-3 text-xs text-gris">
              <p><strong>Motivo del bloqueo:</strong> {fTexto(aQuitar.motivo)}</p>
              <p className="mt-1"><strong>Bloqueado por:</strong> {fTexto(aQuitar.usuario)} · {fFecha(fechaUtc(aQuitar.fechaUtc), true)}</p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-texto">Motivo del desbloqueo <span className="text-peligro">*</span></span>
              <textarea autoFocus value={motivoQuitar} onChange={(e) => setMotivoQuitar(e.target.value.slice(0, MAX_MOTIVO))} rows={3} disabled={quitando}
                placeholder="Ej. Caso cerrado, el titular retiró su solicitud, bloqueo por error…"
                className="input min-h-20 resize-y disabled:cursor-not-allowed disabled:bg-fondo" />
              <span className="mt-1 flex justify-between text-xs text-gris"><span>Obligatorio, mínimo 3 caracteres.</span><span>{motivoQuitar.length}/{MAX_MOTIVO}</span></span>
            </label>
            <div className="flex justify-end gap-2">
              <Boton type="button" variante="secundario" onClick={() => setAQuitar(null)} disabled={quitando}>Cancelar</Boton>
              <Boton type="submit" variante="peligro" cargando={quitando} disabled={motivoQuitar.trim().length < 3}><Unlock className="size-4" />Desbloquear</Boton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
