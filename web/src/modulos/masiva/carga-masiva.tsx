'use client';
// Carga masiva (personas o empresas): 1) secciones, 2) documentos, 3) procesar y descargar el Excel.
import clsx from 'clsx';
import { Banknote, BriefcaseBusiness, Check, ClipboardPaste, CreditCard, Database, FileSpreadsheet, FileUp, Gauge, HeartCrack, Loader2, Phone, Play, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Aviso, Boton, Chip, Pestanas, Tarjeta } from '@/components/ui';
import { guardarArchivo, type Archivo } from '@/lib/api';
import { fNumero, SIN_DATO } from '@/lib/formato';
import { useSesion } from '@/modulos/sesion/proveedor';
import { LIMITE_DOCUMENTOS, TAMANO_BLOQUE_DOCUMENTOS, TAMANO_MAXIMO, analizar, crearArchivo, puedeEstarBloqueado, revisarLineas, seccionesDe, type TipoLista } from './documentos';
import { combinarExcels } from './combinar-excels';
import { HistorialDescargas } from './historial';
import { servicioMasiva } from './servicio';
import { cargaOcupada, useEstadoCarga } from './estado';
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

// Resultado_Masivo_20261105.xlsx → Resultado_Masivo_20261105_carga2de4.xlsx
function nombreDeCarga(nombre: string, carga: number, total: number) {
  const sufijo = `_carga${carga}de${total}`;
  return /\.xlsx$/i.test(nombre) ? nombre.replace(/\.xlsx$/i, `${sufijo}.xlsx`) : `${nombre}${sufijo}.xlsx`;
}

export function CargaMasiva({ tipo }: { tipo: TipoLista }) {
  const { usuario, saldo, actualizarSaldo } = useSesion();
  const { estado, actualizar } = useEstadoCarga(tipo);
  const { secciones, fuente, texto, nombreArchivo, fase, error, serieTotal } = estado;
  const SECCIONES = seccionesDe(tipo);
  const setSecciones = (valor: string[]) => actualizar({ secciones: valor });
  const setFuente = (valor: Fuente) => actualizar({ fuente: valor });
  const setTexto = (valor: string) => actualizar({ texto: valor });
  const setNombreArchivo = (valor: string) => actualizar({ nombreArchivo: valor });
  const setFase = (valor: typeof fase) => actualizar({ fase: valor });
  const setError = (valor: string) => actualizar({ error: valor });
  const [historial, setHistorial] = useState<HistorialDescarga[] | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  // Bloques ya listos de la carga en curso, para continuar si algo falla sin volver a cobrarlos
  const [progresoBloques, setProgresoBloques] = useState<{ clave: string; archivos: Archivo[] } | null>(null);

  const etiqueta = tipo === 'empresas' ? 'RUC' : 'documentos';

  // Lista negra: se pregunta a la API cuáles de la lista están bloqueados (sin costo) para marcarlos en rojo
  // y no enviarlos. Mientras responde, no se deja generar el Excel para que lo que se ve cuadre con el cobro.
  const candidatos = useMemo(() => {
    const previo = analizar(texto, tipo);
    return [...previo.validos, ...previo.excedentes].filter(puedeEstarBloqueado);
  }, [texto, tipo]);
  const claveCandidatos = candidatos.join(',');
  const [listaNegra, setListaNegra] = useState<{ clave: string; bloqueados: ReadonlySet<string> } | null>(null);
  useEffect(() => {
    if (!candidatos.length) return;
    let vigente = true;
    const espera = setTimeout(() => {
      servicioMasiva.listaNegra(candidatos)
        .then((b) => { if (vigente) setListaNegra({ clave: claveCandidatos, bloqueados: new Set(b) }); })
        // Si no se pudo revisar, se deja continuar: la API igual excluye los bloqueados al procesar
        .catch(() => { if (vigente) setListaNegra({ clave: claveCandidatos, bloqueados: new Set() }); });
    }, 400);
    return () => { vigente = false; clearTimeout(espera); };
  }, [candidatos, claveCandidatos]);
  const bloqueadosLista = useMemo<ReadonlySet<string>>(
    () => (listaNegra?.clave === claveCandidatos ? listaNegra.bloqueados : new Set()), [listaNegra, claveCandidatos]);
  const revisandoListaNegra = candidatos.length > 0 && listaNegra?.clave !== claveCandidatos;

  const analisis = useMemo(() => analizar(texto, tipo, bloqueadosLista), [texto, tipo, bloqueadosLista]);
  // No válidos, repetidos o en lista negra (rojo) se omiten solos; los que pasan de 5000 (ámbar) quedan para la carga siguiente
  const lineas = useMemo(() => revisarLineas(texto, tipo, bloqueadosLista), [texto, tipo, bloqueadosLista]);
  const noValidos = analisis.invalidos.length + analisis.duplicados;
  const enListaNegra = analisis.bloqueados.length;
  const excedentes = analisis.excedentes.length;
  const excluidos = noValidos + enListaNegra + excedentes;
  const fondoListaRef = useRef<HTMLDivElement>(null);

  // Contador de cargas para listas de más de 5000: "Carga 2 de 4 · faltan 6.000"
  const restantes = analisis.validos.length + excedentes;
  const totalCargas = serieTotal ? Math.ceil(serieTotal / LIMITE_DOCUMENTOS) : Math.ceil(restantes / LIMITE_DOCUMENTOS);
  const cargaActual = serieTotal ? totalCargas - Math.ceil(restantes / LIMITE_DOCUMENTOS) + 1 : 1;
  const enSerie = totalCargas > 1;

  // Editar la lista a mano empieza una lista nueva (se reinicia el contador de cargas)
  const cambiarTexto = (valor: string) => actualizar({ texto: valor, nombreArchivo: '', serieTotal: null });
  // Opcional: los no válidos ya se omiten solos; esto solo limpia la lista a la vista
  const quitarNoValidos = () => {
    setTexto(lineas.filter((l) => l.estado === 'valido' || l.estado === 'excede' || l.estado === 'bloqueado').map((l) => l.texto.trim()).join('\n'));
    setNombreArchivo('');
  };
  // Quita de la lista los DNI que están en la lista negra (también funciona con un archivo cargado)
  const quitarListaNegra = () => {
    const fuera = new Set(analisis.bloqueados);
    const quedan = texto.replace(/^﻿/, '').split(/[\s,;|]+/)
      .filter((bruto) => !fuera.has(bruto.replace(/["']/g, '').trim().toUpperCase()))
      .map((bruto) => bruto.trim()).filter(Boolean);
    actualizar({ texto: quedan.join('\n'), nombreArchivo: '', serieTotal: null });
  };
  // Al terminar una carga: deja en la lista solo los pendientes, lista para la siguiente
  const cargarPendientes = () => {
    actualizar({ texto: analisis.excedentes.join('\n'), nombreArchivo: '', fase: { tipo: 'lista' }, error: '' });
  };
  const ocupado = cargaOcupada(fase);

  // Mientras procesa, avisar si intenta cerrar o recargar la pestaña (se perdería la carga en curso).
  useEffect(() => {
    if (!ocupado) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [ocupado]);
  const pasoActual = !analisis.validos.length ? 1 : !secciones.length ? 2 : 3;

  const cargarHistorial = useCallback(() => {
    if (!usuario) return;
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
    const contenido = await archivo.text();
    actualizar({ texto: contenido, nombreArchivo: archivo.name, serieTotal: null });
  }

  const claveSolicitud = JSON.stringify([tipo, secciones, analisis.validos]);
  const progresoSolicitud = progresoBloques?.clave === claveSolicitud ? progresoBloques : null;
  // Documentos que faltan procesar (todos, o lo que quedó si se continúa una carga interrumpida)
  const documentosPendientes = Math.max(0, analisis.validos.length - (progresoSolicitud?.archivos.length ?? 0) * TAMANO_BLOQUE_DOCUMENTOS);
  // Solo la carga de personas cobra (1 token por documento); la de empresas hoy no cobra
  const cobraTokens = tipo === 'personas' && !saldo?.ilimitado;
  const faltanTokens = Boolean(cobraTokens && saldo && saldo.saldo < documentosPendientes);

  const problema = !secciones.length ? 'Elige al menos una sección.'
    : revisandoListaNegra ? 'Revisando la lista negra…'
    : !analisis.validos.length ? (enListaNegra > 0
      ? `Todos los ${tipo === 'empresas' ? 'RUC' : 'documentos'} válidos están en la lista negra. Quítalos o agrega otros.`
      : `Agrega al menos un ${tipo === 'empresas' ? 'RUC' : 'documento'} válido.`)
      : faltanTokens ? `Necesitas ${fNumero(documentosPendientes)} tokens y tienes ${fNumero(saldo!.saldo)}. Pide más a un Administrador General.` : null;

  // Una carga de hasta 5000 documentos. Si la lista es más larga, al terminar quedan los pendientes
  // y el usuario sigue con "Cargar los pendientes" (un clic, sin volver al Excel).
  async function procesar() {
    if (problema || !usuario) return;
    setError('');
    // Primera carga de una lista grande: se recuerda el total para el contador "Carga 1 de 4"
    if (excedentes > 0 && serieTotal === null) actualizar({ serieTotal: restantes });
    setFase({ tipo: 'subiendo', porcentaje: 0 });
    try {
      let resultado: Archivo;
      if (tipo === 'personas') {
        const totalBloques = Math.ceil(analisis.validos.length / TAMANO_BLOQUE_DOCUMENTOS);
        const archivos = progresoSolicitud ? [...progresoSolicitud.archivos] : [];

        for (let indice = archivos.length; indice < totalBloques; indice++) {
          const inicio = indice * TAMANO_BLOQUE_DOCUMENTOS;
          const documentos = analisis.validos.slice(inicio, inicio + TAMANO_BLOQUE_DOCUMENTOS);
          const archivo = crearArchivo(documentos, 'Documentos');
          const porcentajeCompletado = Math.round((inicio / analisis.validos.length) * 100);
          setFase({ tipo: 'procesando', bloqueActual: indice + 1, totalBloques, porcentaje: porcentajeCompletado });

          const parcial = await servicioMasiva.procesar(tipo, archivo, secciones, (porcentaje) => {
            if (porcentaje >= 100) {
              setFase({ tipo: 'procesando', bloqueActual: indice + 1, totalBloques, porcentaje: porcentajeCompletado });
              return;
            }
            const progresoLista = inicio + documentos.length * (porcentaje / 100);
            setFase({
              tipo: 'subiendo',
              bloqueActual: indice + 1,
              totalBloques,
              porcentaje: Math.round((progresoLista / analisis.validos.length) * 100),
            });
          });
          archivos.push(parcial);
          setProgresoBloques({ clave: claveSolicitud, archivos: [...archivos] });
        }

        setFase({ tipo: 'consolidando' });
        resultado = await combinarExcels(archivos);
      } else {
        const archivo = crearArchivo(analisis.validos, 'RUC');
        resultado = await servicioMasiva.procesar(tipo, archivo, secciones, (porcentaje) =>
          setFase(porcentaje >= 100 ? { tipo: 'procesando' } : { tipo: 'subiendo', porcentaje }));
      }

      // Lista grande: el Excel de cada carga lleva su número (Resultado_Masivo_..._carga2de4.xlsx)
      if (enSerie) resultado = { ...resultado, nombre: nombreDeCarga(resultado.nombre, cargaActual, totalCargas) };
      guardarArchivo(resultado);
      setFase({ tipo: 'listo', nombre: resultado.nombre });
      setProgresoBloques(null);
      await servicioMasiva.guardarEnHistorial(resultado, secciones, analisis.validos.length).catch(() => null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar la carga.');
      setFase({ tipo: 'lista' });
    } finally {
      actualizarSaldo();
      setCargandoHistorial(true);
      cargarHistorial();
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

      {/* Mientras procesa, el fieldset deshabilita todos los controles de los pasos 1 y 2 */}
      <fieldset disabled={ocupado} aria-busy={ocupado} className={clsx('grid min-w-0 items-start gap-5 xl:grid-cols-2 transition-opacity', ocupado && 'pointer-events-none select-none opacity-60')}>
      <Paso numero={1} titulo={`Agrega los ${etiqueta}`} descripcion="Pega una lista o carga un archivo .txt o .csv." icono={ClipboardPaste} hecho={analisis.validos.length > 0} activo={pasoActual === 1}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Pestanas<Fuente> valor={fuente} deshabilitadas={ocupado} alCambiar={(v) => { if (!ocupado) setFuente(v); }} opciones={[
            { id: 'pegar', texto: 'Pegar lista', icono: <ClipboardPaste className="size-4" /> },
            // { id: 'archivo', texto: 'Subir archivo', icono: <FileUp className="size-4" /> },
            ]} />
            {ocupado && <span role="status" className="text-xs font-medium text-azul">La carga está en curso; espera a que termine para cambiar la entrada.</span>}
            <span className="text-xs text-gris">{fuente === 'pegar' ? 'Un registro por línea o separados por comas' : 'TXT o CSV, hasta 5 MB'}</span>
          </div>
          {/* <Boton type="button" variante="secundario" className="h-9 w-full sm:w-auto" onClick={() => guardarArchivo({ blob: plantilla(tipo), nombre: plantilla(tipo).name })}><FileDown className="size-4" />Descargar plantilla</Boton> */}
        </div>
        {fuente === 'pegar' ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-texto">Lista de {etiqueta}</p>
              <span className="text-xs font-semibold text-gris">Un documento por línea · {fNumero(LIMITE_DOCUMENTOS)} por carga; si pegas más, el resto queda para la siguiente</span>
            </div>
            <div className="overflow-hidden rounded-xl border-2 border-borde bg-white transition-colors focus-within:border-azul focus-within:ring-2 focus-within:ring-azul/15">
            {/* El texto del cuadro es transparente y, detrás, la misma lista se dibuja con las líneas
                que no se incluirán marcadas en rojo. Ambos usan la misma letra y espaciado para coincidir. */}
            <div className="relative">
              <div ref={fondoListaRef} aria-hidden className="numeros pointer-events-none absolute inset-0 overflow-hidden whitespace-pre p-4 text-sm leading-6 text-texto">
                {texto && lineas.map((linea, i) => (
                  <div key={i} className={clsx(
                    (linea.estado === 'invalido' || linea.estado === 'repetido' || linea.estado === 'bloqueado') && 'rounded bg-peligro-10 text-peligro',
                    linea.estado === 'excede' && 'rounded bg-ambar-10 text-ambar',
                  )}>
                    <span className={clsx((linea.estado === 'invalido' || linea.estado === 'repetido' || linea.estado === 'bloqueado') && 'line-through decoration-peligro/60')}>{linea.texto || ' '}</span>
                    {(linea.estado === 'invalido' || linea.estado === 'repetido' || linea.estado === 'bloqueado') && (
                      <span className="ml-3 text-[11px] font-semibold">
                        ✗ No se incluirá: {linea.estado === 'invalido' ? 'formato no válido' : linea.estado === 'bloqueado' ? 'está en la lista negra' : `repetido (línea ${linea.repetidoDe})`}
                      </span>
                    )}
                    {linea.estado === 'excede' && (
                      <span className="ml-3 text-[11px] font-semibold">
                        ⏸ Pendiente: va en la carga siguiente
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <textarea value={texto} onChange={(e) => cambiarTexto(e.target.value.replace(/[\s,;|/\\]+/g, '\n'))} rows={8} disabled={ocupado}
                onScroll={(e) => { if (fondoListaRef.current) { fondoListaRef.current.scrollTop = e.currentTarget.scrollTop; fondoListaRef.current.scrollLeft = e.currentTarget.scrollLeft; } }}
                placeholder={tipo === 'empresas' ? 'Pega un RUC por línea\n20100000001\n20100000002' : 'Pega un documento por línea\n12345678\n87654321'}
                aria-label={`Lista de ${etiqueta} para procesar`}
                aria-describedby="resumen-lista-masiva"
                spellCheck={false}
                className="focus-control numeros relative min-h-48 w-full resize-none whitespace-pre border-0 bg-transparent p-4 text-sm leading-6 text-transparent caret-texto placeholder:text-gris/70 selection:bg-azul/25 focus:outline-none focus:ring-0" />
            </div>
            <div id="resumen-lista-masiva" className="border-t border-borde text-[11px]">
              {enListaNegra > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-peligro-10 px-4 py-2 text-peligro">
                  <span>{fNumero(enListaNegra)} {enListaNegra === 1 ? 'está' : 'están'} en la lista negra (en rojo): no se consultarán ni se cobrarán.</span>
                  <button type="button" onClick={quitarListaNegra} className="font-semibold underline underline-offset-2 hover:no-underline">Quitar los de la lista negra</button>
                </div>
              )}
              {noValidos > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-peligro-10 px-4 py-2 text-peligro">
                  <span>{fNumero(noValidos)} no válidos o repetidos (en rojo) se omiten solos; no tienes que quitarlos.</span>
                  <button type="button" onClick={quitarNoValidos} className="font-semibold underline underline-offset-2 hover:no-underline">Limpiar la lista</button>
                </div>
              )}
              {excedentes > 0 && (
                <div className="bg-ambar-10 px-4 py-2 text-ambar">
                  Esta carga procesa los primeros {fNumero(LIMITE_DOCUMENTOS)}. {fNumero(excedentes)} quedan pendientes (en ámbar); al terminar los cargas con un clic, sin volver a copiarlos.
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-fondo/40 px-4 py-2 text-gris">
                <span>{excluidos === 0 ? 'Un documento por línea. Se omiten encabezados.' : ''}</span>
                <span className="numeros font-semibold text-texto">
                  {revisandoListaNegra
                    ? <span className="inline-flex items-center gap-1.5 text-gris"><Loader2 className="size-3 animate-spin" />Revisando la lista negra…</span>
                    : `${fNumero(analisis.validos.length)} se incluirán en esta carga`}
                </span>
              </div>
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
        {(analisis.validos.length > 0 || analisis.invalidos.length > 0 || enListaNegra > 0) && (
          <div className="numeros mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#f5f7fb] p-3 text-sm">
            {analisis.porTipo.map((t) => <Chip key={t.nombre} tono="verde">{fNumero(t.cantidad)} {t.nombre}</Chip>)}
            {enListaNegra > 0 && (
              <span className="inline-flex flex-wrap items-center gap-2">
                <Chip tono="peligro">{fNumero(enListaNegra)} en lista negra (no se incluirán): {analisis.bloqueados.slice(0, 3).join(', ')}{enListaNegra > 3 ? '…' : ''}</Chip>
                {fuente === 'archivo' && <button type="button" onClick={quitarListaNegra} disabled={ocupado} className="text-xs font-semibold text-peligro underline underline-offset-2 hover:no-underline disabled:opacity-50">Quitarlos</button>}
              </span>
            )}
            {analisis.duplicados > 0 && <Chip tono="peligro">{fNumero(analisis.duplicados)} repetidos (no se incluirán)</Chip>}
            {excedentes > 0 && <Chip tono="ambar">{fNumero(excedentes)} pendientes para la carga siguiente</Chip>}
            {analisis.invalidos.length > 0 && <Chip tono="peligro">{fNumero(analisis.invalidos.length)} no válidos (no se incluirán): {analisis.invalidos.slice(0, 3).join(', ')}{analisis.invalidos.length > 3 ? '…' : ''}</Chip>}
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
            const iconos = { personas: UserRound, moviles: Phone, sueldos: BriefcaseBusiness, deuda: Banknote, 'lineas-credito': CreditCard, calificacion: Gauge, fallecidos: HeartCrack };
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
      </fieldset>

      <Paso numero={3} titulo="Procesa y descarga el Excel" descripcion="Inicia la consulta para generar tu archivo con los resultados." icono={FileSpreadsheet} hecho={fase.tipo === 'listo'} activo={pasoActual === 3}>
        {error && <div className="mb-4"><Aviso tono="error" alCerrar={() => setError('')}>{error}</Aviso></div>}
        {/* Lista de más de 5000: en qué carga va y cuánto falta */}
        {enSerie && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-azul-25 bg-azul-10/60 px-4 py-3 text-sm text-azul">
            <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold shadow-sm">Carga {cargaActual} de {totalCargas}</span>
            <span className="numeros">
              {fase.tipo === 'listo'
                ? excedentes > 0 ? `Lista. Faltan ${fNumero(excedentes)} documentos.` : 'Terminaste todas las cargas de tu lista.'
                : `Faltan ${fNumero(restantes)} documentos, contando esta carga.`}
            </span>
          </div>
        )}
        {fase.tipo === 'listo' && <div className="mb-4"><Aviso tono="exito">Listo: se descargó <strong>{fase.nombre}</strong>. También quedó en tu historial.</Aviso></div>}
        {fase.tipo === 'listo' && excedentes > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-ambar/30 bg-ambar-10 p-4 text-sm text-ambar sm:flex-row sm:items-center sm:justify-between">
            <p>Quedan <strong className="numeros">{fNumero(excedentes)}</strong> documentos. Un clic y quedan listos para la carga {cargaActual + 1} de {totalCargas}.</p>
            <Boton type="button" onClick={cargarPendientes} className="shrink-0">Cargar los pendientes</Boton>
          </div>
        )}
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
                {noValidos > 0 && analisis.validos.length > 0 && <p className="mt-1 text-xs font-medium text-peligro">{fNumero(noValidos)} se omiten por ser no válidos o repetidos.</p>}
                {enListaNegra > 0 && analisis.validos.length > 0 && <p className="mt-1 text-xs font-medium text-peligro">{fNumero(enListaNegra)} se omiten por estar en la lista negra (sin costo).</p>}
                {excedentes > 0 && fase.tipo !== 'listo' && <p className="mt-1 text-xs font-medium text-ambar">{fNumero(excedentes)} quedan pendientes para la carga siguiente.</p>}
                {problema && !ocupado && <p className="mt-2 text-xs font-medium text-ambar">{problema}</p>}
              </div>
            </div>
            <Boton onClick={() => void procesar()} disabled={Boolean(problema) || ocupado} cargando={ocupado} className="group h-12 w-full shrink-0 px-6 shadow-lg shadow-azul/20 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto">
              {!ocupado && <span className="grid size-7 place-items-center rounded-lg bg-white/15 transition-transform group-hover:scale-110"><Play className="size-3.5 fill-current" /></span>}
              {progresoSolicitud ? 'Continuar' : 'Generar Excel'}
              <span className="rounded-md border border-white/20 bg-white/15 px-2 py-0.5 text-xs font-bold">{analisis.validos.length ? fNumero(analisis.validos.length) : SIN_DATO}</span>
            </Boton>
          </div>
          {ocupado && (
            <div className="relative mt-5 rounded-xl border border-azul-25/70 bg-white/80 p-3.5">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-azul">
                <Loader2 className="size-4 animate-spin" />
                {fase.tipo === 'subiendo'
                  ? `Enviando bloque ${fase.bloqueActual ?? 1} de ${fase.totalBloques ?? 1}… ${fase.porcentaje}%`
                  : fase.tipo === 'procesando'
                    ? fase.bloqueActual
                      ? `Procesando bloque ${fase.bloqueActual} de ${fase.totalBloques}… (si hay otras cargas en curso, puede esperar su turno)`
                      : 'Consultando en el servidor. Si hay otras cargas en curso, puede esperar su turno.'
                    : 'Consolidando todos los bloques en un solo Excel…'}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-azul-10">
                {fase.tipo === 'subiendo'
                  ? <div className="h-full rounded-full bg-azul transition-[width]" style={{ width: `${fase.porcentaje}%` }} />
                  : fase.tipo === 'procesando' && fase.porcentaje != null
                    ? <div className="h-full rounded-full bg-azul transition-[width]" style={{ width: `${fase.porcentaje}%` }} />
                  : <div className="h-full w-1/3 rounded-full bg-azul [animation:barrido_1.2s_ease-in-out_infinite]" />}
              </div>
            </div>
          )}
          {progresoSolicitud && progresoSolicitud.archivos.length > 0 && !ocupado && (
            <p className="mt-3 text-xs text-ambar">
              Se conservaron {progresoSolicitud.archivos.length} bloques completados. Al continuar se procesa solo lo que falta, sin volver a cobrar lo ya hecho.
            </p>
          )}
        </div>
      </Paso>

      <fieldset disabled={ocupado} aria-busy={ocupado} className={clsx('min-w-0 transition-opacity', ocupado && 'pointer-events-none select-none opacity-60')}>
        <HistorialDescargas items={historial} cargando={cargandoHistorial} />
      </fieldset>
    </div>
  );
}
