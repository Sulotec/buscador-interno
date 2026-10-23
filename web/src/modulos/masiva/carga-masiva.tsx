'use client';
// Carga masiva (personas o empresas): 1) secciones, 2) documentos, 3) procesar y descargar el Excel.
import clsx from 'clsx';
import { Banknote, BriefcaseBusiness, Check, ClipboardPaste, CreditCard, Database, FileDown, FileSpreadsheet, FileUp, Gauge, HeartCrack, Loader2, Phone, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Aviso, Boton, Chip, Pestanas, Tarjeta } from '@/components/ui';
import { ErrorApi, guardarArchivo } from '@/lib/api';
import { fNumero } from '@/lib/formato';
import { useSesion } from '@/modulos/sesion/proveedor';
import { LIMITE_DOCUMENTOS, TAMANO_MAXIMO, analizar, crearArchivo, plantilla, seccionesDe, type TipoLista } from './documentos';
import { HistorialDescargas } from './historial';
import { servicioMasiva } from './servicio';
import { useEstadoCarga } from './estado';
import type { HistorialDescarga } from './tipos';

type Fuente = 'pegar' | 'archivo';

function Paso({ numero, titulo, descripcion, icono: Icono, children, hecho, activo }: { numero: number; titulo: string; descripcion: string; icono: typeof Database; children: React.ReactNode; hecho?: boolean; activo?: boolean }) {
  return (
    <Tarjeta>
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl', hecho ? 'bg-verde-10 text-verde' : activo ? 'bg-azul-10 text-azul' : 'bg-fondo text-gris')}>
          {hecho ? <Check className="size-5" /> : <Icono className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold leading-5 text-texto sm:text-base"><span className="text-xs font-bold text-gris">{numero}.</span>{titulo}</h2>
          <p className="mt-0.5 text-xs leading-5 text-gris">{descripcion}</p>
        </div>
        <Chip className="shrink-0" tono={hecho ? 'verde' : activo ? 'azul' : 'neutro'}>{hecho ? 'Listo' : activo ? 'En curso' : 'Pendiente'}</Chip>
      </div>
      {children}
    </Tarjeta>
  );
}

export function CargaMasiva({ tipo }: { tipo: TipoLista }) {
  const { usuario, actualizarSaldo } = useSesion();
  const { estado, actualizar } = useEstadoCarga(tipo);
  const { secciones, fuente, texto, nombreArchivo, fase, error } = estado;
  const SECCIONES = seccionesDe(tipo);
  const setSecciones = (valor: string[]) => actualizar({ secciones: valor });
  const setFuente = (valor: Fuente) => actualizar({ fuente: valor });
  const setTexto = (valor: string) => actualizar({ texto: valor });
  const setNombreArchivo = (valor: string) => actualizar({ nombreArchivo: valor });
  const setFase = (valor: typeof fase) => actualizar({ fase: valor });
  const setError = (valor: string) => actualizar({ error: valor });
  const [historial, setHistorial] = useState<HistorialDescarga[] | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  const etiqueta = tipo === 'empresas' ? 'RUC' : 'documentos';
  const analisis = useMemo(() => analizar(texto, tipo), [texto, tipo]);
  const ocupado = fase.tipo === 'subiendo' || fase.tipo === 'procesando';
  const pasoActual = !analisis.validos.length ? 1 : !secciones.length ? 2 : 3;

  const cargarHistorial = useCallback(() => {
    if (!usuario) return;
    setCargandoHistorial(true);
    servicioMasiva.historial(usuario.id).then(setHistorial).catch(() => setHistorial([])).finally(() => setCargandoHistorial(false));
  }, [usuario]);
  useEffect(cargarHistorial, [cargarHistorial]);

  async function leerArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    setError('');
    if (!archivo) return;
    if (!/\.(txt|csv)$/i.test(archivo.name)) { setError('Solo se aceptan archivos .txt o .csv.'); return; }
    if (archivo.size > TAMANO_MAXIMO) { setError('El archivo supera el límite de 5 MB.'); return; }
    setNombreArchivo(archivo.name);
    setTexto(await archivo.text());
  }

  const problema = !secciones.length ? 'Elige al menos una sección.'
    : !analisis.validos.length ? `Agrega al menos un ${tipo === 'empresas' ? 'RUC' : 'documento'} válido.`
      : analisis.invalidos.length ? 'Corrige o elimina las entradas no válidas antes de procesar.'
        : analisis.validos.length > LIMITE_DOCUMENTOS ? `El máximo es ${fNumero(LIMITE_DOCUMENTOS)} por carga.` : null;

  async function procesar() {
    if (problema || !usuario) return;
    setError('');
    setFase({ tipo: 'subiendo', porcentaje: 0 });
    const archivo = crearArchivo(analisis.validos, tipo === 'empresas' ? 'RUC' : 'Documentos');
    try {
      const resultado = await servicioMasiva.procesar(tipo, archivo, secciones, (p) =>
        setFase(p >= 100 ? { tipo: 'procesando' } : { tipo: 'subiendo', porcentaje: p }));
      guardarArchivo(resultado);
      setFase({ tipo: 'listo', nombre: resultado.nombre });
      await servicioMasiva.guardarEnHistorial(resultado, secciones, analisis.validos.length).catch(() => null);
      cargarHistorial();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo procesar la carga.');
      setFase({ tipo: 'lista' });
    } finally {
      actualizarSaldo();
    }
  }

  return (
    <div className="space-y-6">
      <Tarjeta>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-azul-10 text-azul"><Sparkles className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-azul">Proceso en tres pasos</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-texto sm:text-xl">Consulta tu lista de forma simple</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gris">Agrega tus {etiqueta}, elige la información que necesitas y genera un Excel con los resultados.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 lg:min-w-[390px]">
            {[
              { n: '01', t: 'Lista', icono: ClipboardPaste, color: 'violeta', acento: '#6d63d9', fondo: 'bg-[#f0efff]', borde: 'border-[#d5d1ff]', tinta: 'text-[#6259c7]', iconBg: 'bg-[#dedbff]' },
              { n: '02', t: 'Secciones', icono: Database, color: 'turquesa', acento: '#0f9b7a', fondo: 'bg-[#e4f7f1]', borde: 'border-[#9ce2cd]', tinta: 'text-[#08765e]', iconBg: 'bg-[#c7eee2]' },
              { n: '03', t: 'Excel', icono: FileSpreadsheet, color: 'ambar', acento: '#e99a20', fondo: 'bg-[#fff2dc]', borde: 'border-[#ffd18a]', tinta: 'text-[#9a5b00]', iconBg: 'bg-[#ffe2ad]' },
            ].map((p, i) => {
              const IconoPaso = p.icono;
              return (
              <div key={p.n} style={{ '--acento': p.acento } as React.CSSProperties} className={clsx('group relative isolate flex min-h-[112px] flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:min-h-[126px] sm:p-4', p.borde, p.fondo, pasoActual === i + 1 && 'ring-2 ring-[var(--acento)]/20')}>
                <span aria-hidden className="absolute -right-5 -top-6 size-20 rounded-full bg-white/50 transition-transform duration-500 group-hover:scale-125" />
                <div className="relative flex items-center justify-between gap-1">
                  <span className={clsx('grid size-8 place-items-center rounded-lg', p.iconBg, p.tinta)}><IconoPaso className="size-4" /></span>
                  <span className={clsx('text-[10px] font-bold tracking-[0.12em]', p.tinta)}>{p.n}</span>
                </div>
                <div className="relative mt-3">
                  <span className={clsx('block text-xs font-semibold leading-4 sm:text-sm', p.tinta)}>{p.t}</span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-texto/65">{pasoActual === i + 1 ? 'En curso' : i + 1 < pasoActual ? 'Completado' : 'Pendiente'}</span>
                </div>
                {pasoActual === i + 1 && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--acento)]" />}
              </div>
              );
            })}
          </div>
        </div>
      </Tarjeta>

      <div className="grid items-start gap-5 xl:grid-cols-2">
      <Paso numero={1} titulo={`Agrega los ${etiqueta}`} descripcion="Pega una lista o carga un archivo .txt o .csv." icono={ClipboardPaste} hecho={analisis.validos.length > 0} activo={pasoActual === 1}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Pestanas<Fuente> valor={fuente} deshabilitadas={ocupado} alCambiar={(v) => { if (!ocupado) setFuente(v); }} opciones={[
            { id: 'pegar', texto: 'Pegar lista', icono: <ClipboardPaste className="size-4" /> },
            { id: 'archivo', texto: 'Subir archivo', icono: <FileUp className="size-4" /> },
            ]} />
            {ocupado && <span role="status" className="text-xs font-medium text-azul">La carga está en curso; espera a que termine para cambiar la entrada.</span>}
            <span className="text-xs text-gris">{fuente === 'pegar' ? 'Un registro por línea o separados por comas' : 'TXT o CSV, hasta 5 MB'}</span>
          </div>
          <Boton type="button" variante="secundario" className="h-9 w-full sm:w-auto" onClick={() => guardarArchivo({ blob: plantilla(tipo), nombre: plantilla(tipo).name })}><FileDown className="size-4" />Descargar plantilla</Boton>
        </div>
        {fuente === 'pegar' ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-texto">Lista de {etiqueta}</p>
              <span className="text-xs font-medium text-gris">Un documento por línea · máximo {fNumero(LIMITE_DOCUMENTOS)}</span>
            </div>
            <div className="overflow-hidden rounded-xl border-2 border-borde bg-white transition-colors focus-within:border-azul focus-within:ring-2 focus-within:ring-azul/15">
            <textarea value={texto} onChange={(e) => { setTexto(e.target.value.replace(/[\s,;|]+/g, '\n')); setNombreArchivo(''); }} rows={8} disabled={ocupado}
              placeholder={tipo === 'empresas' ? 'Pega un RUC por línea\n20100000001\n20100000002' : 'Pega un documento por línea\n12345678\n87654321'}
              aria-label={`Lista de ${etiqueta} para procesar`}
              className="focus-control numeros min-h-48 w-full resize-none border-0 bg-transparent p-4 text-sm leading-6 placeholder:text-gris/70 focus:outline-none focus:ring-0" />
            <div className={clsx('flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-[11px]', analisis.invalidos.length > 0 ? 'border-peligro/20 bg-peligro-10 text-peligro' : 'border-borde bg-fondo/40 text-gris')}>
              <span>{analisis.invalidos.length > 0 ? `${fNumero(analisis.invalidos.length)} entradas no válidas; corrígelas para procesar.` : 'Un documento por línea. Se omiten encabezados y duplicados.'}</span>
              <span className="numeros shrink-0">{fNumero(analisis.validos.length)} válidos</span>
            </div>
            </div>
          </>
        ) : (
          <label className="group flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-azul-25 bg-[#fafbfe] px-6 py-8 text-center transition-colors hover:border-azul hover:bg-azul-10/40 focus-within:border-azul focus-within:outline-none focus-within:ring-2 focus-within:ring-azul/25">
            <span className="grid size-12 place-items-center rounded-xl bg-white text-azul shadow-sm transition-transform group-hover:-translate-y-0.5"><FileUp className="size-6" /></span>
            <span className="mt-1 font-semibold text-texto">{nombreArchivo || 'Selecciona un archivo para cargar'}</span>
            <span className="text-sm text-gris">Formato .txt o .csv, hasta 5 MB</span>
            <span className="text-xs text-gris">Un {tipo === 'empresas' ? 'RUC' : 'documento'} por línea</span>
            <input type="file" accept=".txt,.csv,text/plain,text/csv" className="sr-only" onChange={leerArchivo} disabled={ocupado} />
          </label>
        )}
        {(analisis.validos.length > 0 || analisis.invalidos.length > 0) && (
          <div className="numeros mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#f5f7fb] p-3 text-sm">
            {analisis.porTipo.map((t) => <Chip key={t.nombre} tono="verde">{fNumero(t.cantidad)} {t.nombre}</Chip>)}
            {analisis.duplicados > 0 && <Chip>{fNumero(analisis.duplicados)} repetidos (se omiten)</Chip>}
            {analisis.invalidos.length > 0 && <Chip tono="ambar">{fNumero(analisis.invalidos.length)} no válidos: {analisis.invalidos.slice(0, 3).join(', ')}{analisis.invalidos.length > 3 ? '…' : ''}</Chip>}
          </div>
        )}
      </Paso>

      <Paso numero={2} titulo="Elige qué información incluir" descripcion="Selecciona las secciones que quieres recibir en el Excel." icono={Database} hecho={secciones.length > 0} activo={pasoActual === 2}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-fondo/70 px-3.5 py-3">
          <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-azul" /><p className="text-xs text-gris">Incluye solo la información que necesitas.</p></div>
          <div className="flex items-center gap-3">
            <Chip tono={secciones.length ? 'azul' : 'neutro'}>{secciones.length} de {SECCIONES.length} seleccionadas</Chip>
            <button type="button" className="text-sm font-semibold text-azul transition-colors hover:text-azul-oscuro hover:underline" onClick={() => setSecciones(secciones.length === SECCIONES.length ? [] : SECCIONES.map((s) => s.id))}>
            {secciones.length === SECCIONES.length ? 'Quitar todas' : 'Elegir todas'}
            </button>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {SECCIONES.map((s) => {
            const marcada = secciones.includes(s.id);
            const iconos = { moviles: Phone, sueldos: BriefcaseBusiness, deuda: Banknote, 'lineas-credito': CreditCard, calificacion: Gauge, fallecidos: HeartCrack };
            const IconoSeccion = iconos[s.id as keyof typeof iconos] ?? Database;
            return (
              <label key={s.id} className={clsx('flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-azul/20', marcada ? 'border-azul-25 bg-azul-10/60 text-texto' : 'border-borde bg-white text-texto hover:bg-fondo/60')}>
                <input type="checkbox" className="sr-only" checked={marcada}
                  onChange={() => setSecciones(marcada ? secciones.filter((x) => x !== s.id) : [...secciones, s.id])} />
                <span className={clsx('grid size-8 shrink-0 place-items-center rounded-md', marcada ? 'bg-azul-10 text-azul' : 'bg-fondo text-gris')}><IconoSeccion className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-5">{s.nombre}</span><span className="mt-0.5 block text-xs leading-4 text-gris">{s.detalle}</span></span>
                <span className={clsx('grid size-6 shrink-0 place-items-center rounded-md border transition-colors', marcada ? 'border-azul bg-azul text-white' : 'border-borde bg-white text-transparent')}>{marcada && <Check className="size-4" />}</span>
              </label>
            );
          })}
        </div>
      </Paso>
      </div>

      <Paso numero={3} titulo="Procesa y descarga el Excel" descripcion="Inicia la consulta para generar tu archivo con los resultados." icono={FileSpreadsheet} hecho={fase.tipo === 'listo'} activo={pasoActual === 3}>
        {error && <div className="mb-4"><Aviso tono="error" alCerrar={() => setError('')}>{error}</Aviso></div>}
        {fase.tipo === 'listo' && <div className="mb-4"><Aviso tono="exito">Listo: se descargó <strong>{fase.nombre}</strong>. También quedó en tu historial.</Aviso></div>}
        <div className="relative overflow-hidden rounded-2xl border border-azul-25 bg-gradient-to-br from-[#f7f9fd] via-white to-[#edf2fa] p-4 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-azul-10/70 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#1e9b62] to-[#087443] text-white shadow-lg shadow-[#16834f]/25 ring-4 ring-[#d9f2e5]">
                <FileSpreadsheet className="size-[22px]" />
                <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white bg-[#f0b429] text-[10px] font-black text-white">✓</span>
              </span>
              <div>
                <p className="text-base font-bold tracking-tight text-texto">Tu archivo está casi listo</p>
                <p className="mt-1 max-w-xl text-sm leading-5 text-gris">{analisis.validos.length ? `${fNumero(analisis.validos.length)} ${etiqueta} y ${secciones.length} secciones seleccionadas.` : 'Confirma tu lista y las secciones para generar el Excel.'}</p>
                {problema && !ocupado && <p className="mt-2 text-xs font-medium text-ambar">{problema}</p>}
              </div>
            </div>
            <Boton onClick={procesar} disabled={Boolean(problema) || ocupado} cargando={ocupado} className="group h-12 w-full shrink-0 px-6 shadow-lg shadow-azul/20 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto">
              {!ocupado && <span className="grid size-7 place-items-center rounded-lg bg-white/15 transition-transform group-hover:scale-110"><Play className="size-3.5 fill-current" /></span>}Generar Excel <span className="rounded-md border border-white/20 bg-white/15 px-2 py-0.5 text-xs font-bold">{analisis.validos.length ? fNumero(analisis.validos.length) : '—'}</span>
            </Boton>
          </div>
          {ocupado && (
            <div className="relative mt-5 rounded-xl border border-azul-25/70 bg-white/80 p-3.5">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-azul">
                <Loader2 className="size-4 animate-spin" />
                {fase.tipo === 'subiendo' ? `Enviando la lista… ${fase.porcentaje}%` : 'Consultando en el servidor. Puede tardar unos minutos.'}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-azul-10">
                {fase.tipo === 'subiendo'
                  ? <div className="h-full rounded-full bg-azul transition-[width]" style={{ width: `${fase.porcentaje}%` }} />
                  : <div className="h-full w-1/3 rounded-full bg-azul [animation:barrido_1.2s_ease-in-out_infinite]" />}
              </div>
            </div>
          )}
        </div>
      </Paso>

      <HistorialDescargas items={historial} cargando={cargandoHistorial} />
    </div>
  );
}
