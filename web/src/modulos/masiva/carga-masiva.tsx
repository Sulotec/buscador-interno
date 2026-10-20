'use client';
// Carga masiva (personas o empresas): 1) secciones, 2) documentos, 3) procesar y descargar el Excel.
import clsx from 'clsx';
import { Check, ClipboardPaste, Database, FileDown, FileSpreadsheet, FileUp, Loader2, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Aviso, Boton, Chip, Pestanas, Tarjeta } from '@/components/ui';
import { ErrorApi, guardarArchivo } from '@/lib/api';
import { fNumero } from '@/lib/formato';
import { useSesion } from '@/modulos/sesion/proveedor';
import { LIMITE_DOCUMENTOS, SECCIONES, TAMANO_MAXIMO, analizar, crearArchivo, plantilla, type TipoLista } from './documentos';
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
  const pasoActual = !secciones.length ? 1 : !analisis.validos.length ? 2 : 3;

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
    <div className="space-y-5">
      <Paso numero={1} titulo="Elige qué información incluir" descripcion="Selecciona las secciones que quieres recibir en el Excel." icono={Database} hecho={secciones.length > 0} activo={pasoActual === 1}>
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-3">
            <Chip tono={secciones.length ? 'azul' : 'neutro'}>{secciones.length} de {SECCIONES.length} seleccionadas</Chip>
            <button type="button" className="text-sm font-semibold text-azul transition-colors hover:text-azul-oscuro hover:underline" onClick={() => setSecciones(secciones.length === SECCIONES.length ? [] : SECCIONES.map((s) => s.id))}>
            {secciones.length === SECCIONES.length ? 'Quitar todas' : 'Elegir todas'}
            </button>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          {SECCIONES.map((s) => {
            const marcada = secciones.includes(s.id);
            return (
              <label key={s.id} className={clsx('flex min-h-20 cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-azul/25', marcada ? 'border-azul bg-azul-10/60' : 'border-borde bg-white hover:border-azul-25 hover:bg-[#fafbfe]')}>
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-azul)]" checked={marcada}
                  onChange={() => setSecciones(marcada ? secciones.filter((x) => x !== s.id) : [...secciones, s.id])} />
                <span><span className="block text-sm font-semibold leading-5 text-texto">{s.nombre}</span><span className="mt-1 block text-xs leading-4 text-gris">{s.detalle}</span></span>
              </label>
            );
          })}
        </div>
      </Paso>

      <Paso numero={2} titulo={`Agrega los ${etiqueta}`} descripcion="Pega una lista o carga un archivo .txt o .csv." icono={ClipboardPaste} hecho={analisis.validos.length > 0} activo={pasoActual === 2}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Pestanas<Fuente> valor={fuente} alCambiar={setFuente} opciones={[
            { id: 'pegar', texto: 'Pegar lista', icono: <ClipboardPaste className="size-4" /> },
            { id: 'archivo', texto: 'Subir archivo', icono: <FileUp className="size-4" /> },
          ]} />
          <Boton type="button" variante="secundario" className="h-9" onClick={() => guardarArchivo({ blob: plantilla(tipo), nombre: plantilla(tipo).name })}><FileDown className="size-4" />Descargar plantilla</Boton>
        </div>
        {fuente === 'pegar' ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-texto">Lista de {etiqueta}</p>
              <span className="text-xs font-medium text-gris">Máximo {fNumero(LIMITE_DOCUMENTOS)} por carga</span>
            </div>
            <textarea value={texto} onChange={(e) => { setTexto(e.target.value); setNombreArchivo(''); }} rows={7} disabled={ocupado}
              placeholder={tipo === 'empresas' ? 'Pega los RUC, uno por línea o separados por comas' : 'Pega los DNI u otros documentos, uno por línea o separados por comas'}
              aria-label={`Lista de ${etiqueta} para procesar`}
              className="focus-control numeros min-h-44 w-full resize-y rounded-xl border border-borde bg-white p-4 text-sm leading-6 placeholder:text-gris/70 disabled:bg-fondo/50" />
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

      <Paso numero={3} titulo="Procesa y descarga el Excel" descripcion="Inicia la consulta para generar tu archivo con los resultados." icono={FileSpreadsheet} hecho={fase.tipo === 'listo'} activo={pasoActual === 3}>
        {error && <div className="mb-4"><Aviso tono="error" alCerrar={() => setError('')}>{error}</Aviso></div>}
        {fase.tipo === 'listo' && <div className="mb-4"><Aviso tono="exito">Listo: se descargó <strong>{fase.nombre}</strong>. También quedó en tu historial.</Aviso></div>}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Boton onClick={procesar} disabled={Boolean(problema) || ocupado} cargando={ocupado} className="h-11 w-full px-6 sm:w-auto">
            {!ocupado && <Play className="size-4" />}Procesar {analisis.validos.length ? fNumero(analisis.validos.length) : ''} {etiqueta}
          </Boton>
          {problema && !ocupado && <span className="text-sm leading-5 text-gris">{problema}</span>}
          {ocupado && (
            <div className="w-full min-w-56 flex-1 sm:w-auto">
              <p className="mb-1.5 flex items-center gap-2 text-sm text-gris">
                <Loader2 className="size-4 animate-spin text-azul" />
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
