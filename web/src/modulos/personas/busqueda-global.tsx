'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Check, ChevronDown, Search, UserRound, X } from 'lucide-react';
import { Aviso, Boton, Cargando, Tarjeta, Vacio } from '@/components/ui';
import { ErrorApi } from '@/lib/api';
import { fPeriodo, fTexto, nombreCompleto } from '@/lib/formato';
import { useSesion } from '@/modulos/sesion/proveedor';
import { useEstadoConsultas } from '@/modulos/consultas/estado';
import { servicioPersonas } from './servicio';
import { DOCUMENTOS, validarDocumento, type TipoDocumento } from './documentos';
import type { Movil } from '@/modulos/consultas/tipos';
import type { ResultadoNombre, ResultadoPersona, ResultadoTelefono } from './tipos';

type TipoBusqueda = TipoDocumento | 'telefono' | 'nombres' | 'fallecidos';
type ResultadoGlobal =
  | { tipo: 'documento'; valor: ResultadoPersona }
  | { tipo: 'telefono'; valor: ResultadoTelefono }
  | { tipo: 'nombres'; valor: ResultadoNombre[] }
  | null;

const etiqueta: Record<TipoBusqueda, string> = {
  DNI: 'DNI', CE: 'CE', RUC: 'RUC', PASAPORTE: 'Pasaporte',
  telefono: 'Teléfono', nombres: 'Apellidos y nombres', fallecidos: 'Fallecidos',
};

function agruparPorDocumento(registros: Movil[]) {
  const grupos = new Map<string, Movil[]>();
  for (const registro of registros) {
    const nombre = nombreCompleto(registro.prenombres, registro.apePat, registro.apeMat);
    const clave = registro.documento?.trim() || nombre;
    grupos.set(clave, [...(grupos.get(clave) ?? []), registro]);
  }
  return [...grupos.entries()].map(([clave, historial]) => ({
    clave,
    documento: historial[0].documento,
    nombre: nombreCompleto(historial[0].prenombres, historial[0].apePat, historial[0].apeMat),
    historial,
  }));
}

function detectarTipoDocumento(documento: string): TipoDocumento | null {
  if (/^\d{8}$/.test(documento)) return 'DNI';
  if (/^\d{9}$/.test(documento)) return 'CE';
  if (/^\d{11}$/.test(documento)) return 'RUC';
  if (/^[A-Z0-9]{6,12}$/i.test(documento)) return 'PASAPORTE';
  return null;
}

export function BusquedaGlobalPersonas({ activa, documentoTelefonoSeleccionado, alCambiarCarga, alEncontrarDocumento, alEncontrarTelefono, alLimpiarTelefono, alFiltrarTelefono, alInteractuar }: {
  activa: boolean;
  documentoTelefonoSeleccionado: string | null;
  alCambiarCarga: (cargando: boolean) => void;
  alEncontrarDocumento: (tipo: TipoDocumento, resultado: ResultadoPersona, mantenerTelefono?: boolean) => void;
  alEncontrarTelefono: (resultado: ResultadoTelefono) => void;
  alLimpiarTelefono: () => void;
  alFiltrarTelefono: (documento: string | null) => void;
  alInteractuar: () => void;
}) {
  const { actualizarSaldo } = useSesion();
  const selectorBusquedaRef = useRef<HTMLDetailsElement>(null);
  const { busquedaPersona, setBusquedaPersona } = useEstadoConsultas();
  const global = busquedaPersona.global;
  const { tipo, telefono, apellidoPaterno: apePat, apellidoMaterno: apeMat, nombres, resultado, personaNombreSeleccionada } = global;
  const documento = tipo === 'fallecidos' ? global.dniFallecido : global.documentos[tipo as TipoDocumento];
  const actualizarGlobal = (cambios: Partial<typeof global>) => {
    setBusquedaPersona((estado) => ({ ...estado, global: { ...estado.global, ...cambios } }));
  };
  const setTipo = (valor: TipoBusqueda) => actualizarGlobal({ tipo: valor });
  const setDocumento = (valor: string) => tipo === 'fallecidos'
    ? actualizarGlobal({ dniFallecido: valor })
    : actualizarGlobal({ documentos: { ...global.documentos, [tipo as TipoDocumento]: valor } });
  const setTelefono = (valor: string) => actualizarGlobal({ telefono: valor });
  const setApePat = (valor: string) => actualizarGlobal({ apellidoPaterno: valor });
  const setApeMat = (valor: string) => actualizarGlobal({ apellidoMaterno: valor });
  const setNombres = (valor: string) => actualizarGlobal({ nombres: valor });
  const setResultado = (valor: ResultadoGlobal) => {
    const resultadosPorTipo = { ...global.resultadosPorTipo };
    const fichasPorTipo = { ...global.fichasPorTipo };
    const personasNombreSeleccionadas = { ...global.personasNombreSeleccionadas };
    if (valor) resultadosPorTipo[tipo] = valor;
    else {
      delete resultadosPorTipo[tipo];
      delete fichasPorTipo[tipo];
      personasNombreSeleccionadas[tipo] = '';
    }
    actualizarGlobal({ resultado: valor, resultadosPorTipo, fichasPorTipo, personasNombreSeleccionadas });
  };
  const setPersonaNombreSeleccionada = (valor: string) => actualizarGlobal({
    personaNombreSeleccionada: valor,
    personasNombreSeleccionadas: { ...global.personasNombreSeleccionadas, [tipo]: valor },
  });
  const cargando = global.cargando;
  const setCargando = (valor: boolean) => actualizarGlobal({ cargando: valor });
  const [error, setError] = useState('');
  const registrosTelefono = resultado?.tipo === 'telefono' ? agruparPorDocumento(resultado.valor.registros) : [];
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState('');
  const clientesFiltrados = registrosTelefono.filter(({ nombre, documento }) =>
    `${nombre} ${documento ?? ''}`.toLocaleLowerCase().includes(filtroCliente.trim().toLocaleLowerCase()),
  );
  const resultadosNombresFiltrados = resultado?.tipo === 'nombres'
    ? resultado.valor.filter(({ nombreCompleto, documento }) => `${nombreCompleto} ${documento}`.toLocaleLowerCase().includes(filtroCliente.trim().toLocaleLowerCase()))
    : [];
  async function cargarFichaDocumento(documentoAsociado: string, mantenerTelefono = false, mantenerResultado = false) {
    const valor = documentoAsociado.trim();
    const tipoDocumento = detectarTipoDocumento(valor);
    if (!tipoDocumento) {
      setError('No se pudo identificar el tipo de documento del cliente seleccionado.');
      return;
    }
    setError('');
    setCargando(true);
    alCambiarCarga(true);
    try {
      const respuesta = await servicioPersonas.porDocumento(tipoDocumento, valor);
      actualizarGlobal({ fichasPorTipo: { ...global.fichasPorTipo, [tipo]: { tipo: tipoDocumento, valor: respuesta } } });
      if (!mantenerTelefono && !mantenerResultado) setResultado({ tipo: 'documento', valor: respuesta });
      alEncontrarDocumento(tipoDocumento, respuesta, mantenerTelefono);
    } catch (e) {
      setError(e instanceof ErrorApi || e instanceof Error ? e.message : 'No se pudo cargar la información del cliente.');
    } finally {
      setCargando(false);
      alCambiarCarga(false);
      actualizarSaldo();
    }
  }

  async function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setResultado(null);
    alFiltrarTelefono(null);
    alLimpiarTelefono();
    setFiltroCliente('');
    setMostrarClientes(false);
    setPersonaNombreSeleccionada('');
    if (tipo === 'telefono') actualizarGlobal({ telefonoSeleccionado: null });

    try {
      setCargando(true);
      alCambiarCarga(true);
      if (tipo === 'telefono') {
        const valor = telefono.replace(/\D/g, '');
        if (!/^\d{9}$/.test(valor)) throw new Error('El teléfono debe tener 9 dígitos.');
        const respuesta = await servicioPersonas.porTelefono(valor);
        setResultado({ tipo, valor: respuesta });
        alEncontrarTelefono(respuesta);
        setFiltroCliente('');
      } else if (tipo === 'nombres') {
        if (apePat.trim().length < 2) throw new Error('Ingresa un apellido paterno de al menos 2 letras.');
        if (!/^[\p{L}]+$/u.test(apePat.trim()) || (apeMat.trim() && !/^[\p{L}]+$/u.test(apeMat.trim())) || (nombres.trim() && !/^[\p{L}\s]+$/u.test(nombres.trim()))) {
          throw new Error('Usa solo letras en los apellidos y nombres.');
        }
        setResultado({ tipo, valor: await servicioPersonas.porNombres(apePat.trim(), apeMat.trim(), nombres.trim()) });
      } else if (tipo === 'fallecidos') {
        if (!/^\d{8}$/.test(documento)) throw new Error('El DNI debe tener exactamente 8 dígitos.');
        const respuesta = await servicioPersonas.porDocumento('DNI', documento);
        setResultado({ tipo: 'documento', valor: respuesta });
        alEncontrarDocumento('DNI', respuesta);
      } else {
        const valor = documento.trim();
        const validacion = validarDocumento(tipo, valor);
        if (validacion) throw new Error(validacion);
        const respuesta = await servicioPersonas.porDocumento(tipo, valor);
        setResultado({ tipo: 'documento', valor: respuesta });
        alEncontrarDocumento(tipo, respuesta);
      }
    } catch (e) {
      setError(e instanceof ErrorApi || e instanceof Error ? e.message : 'No se pudo realizar la búsqueda.');
    } finally {
      setCargando(false);
      alCambiarCarga(false);
      actualizarSaldo();
    }
  }

  function cambiarTipo(valor: TipoBusqueda) {
    setTipo(valor);
    setError('');
    setMostrarClientes(false);
    setFiltroCliente('');
    const resultadoGuardado = global.resultadosPorTipo[valor] ?? null;
    const fichaGuardada = resultadoGuardado ? global.fichasPorTipo[valor] : undefined;
    actualizarGlobal({
      tipo: valor,
      resultado: resultadoGuardado,
      personaNombreSeleccionada: global.personasNombreSeleccionadas[valor] ?? '',
    });
    if (resultadoGuardado?.tipo === 'documento') {
      alEncontrarDocumento(valor === 'fallecidos' ? 'DNI' : valor as TipoDocumento, resultadoGuardado.valor);
    } else if (resultadoGuardado?.tipo === 'telefono') {
      alEncontrarTelefono(resultadoGuardado.valor);
      alFiltrarTelefono(global.telefonoSeleccionado);
      if (fichaGuardada) alEncontrarDocumento(fichaGuardada.tipo, fichaGuardada.valor, true);
    } else {
      alLimpiarTelefono();
      alFiltrarTelefono(null);
      if (fichaGuardada) alEncontrarDocumento(fichaGuardada.tipo, fichaGuardada.valor);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="busqueda-global-titulo">
      <div>
        <h2 id="busqueda-global-titulo" className="text-sm font-semibold text-texto">Búsqueda global</h2>
        <p className="mt-0.5 text-xs text-gris">Elige un criterio y realiza una consulta independiente.</p>
      </div>
      <form onSubmit={buscar} onFocusCapture={alInteractuar} className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-end">
        <div className="relative block">
          <span className="mb-1.5 block text-sm font-medium text-texto">Buscar por</span>
          <details ref={selectorBusquedaRef} className="group relative" onKeyDown={(evento) => {
            if (evento.key === 'Escape') {
              selectorBusquedaRef.current?.removeAttribute('open');
              selectorBusquedaRef.current?.querySelector('summary')?.focus();
            }
          }}>
            <summary aria-label="Buscar por" aria-haspopup="listbox" className="focus-control flex h-10 list-none cursor-pointer items-center justify-between rounded-xl border-2 border-borde bg-white px-3 pr-3 text-sm font-semibold text-texto shadow-sm transition-colors hover:border-azul [&::-webkit-details-marker]:hidden">
              {etiqueta[tipo]}<ChevronDown className="size-4 shrink-0 text-azul transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            {!cargando && <div role="listbox" aria-label="Criterio de búsqueda" className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-borde bg-white p-1 shadow-lg">
              {(Object.keys(etiqueta) as TipoBusqueda[]).map((opcion) => <button key={opcion} type="button" role="option" aria-selected={tipo === opcion} onClick={() => {
                cambiarTipo(opcion);
                selectorBusquedaRef.current?.removeAttribute('open');
              }} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul ${tipo === opcion ? 'bg-fondo font-semibold text-azul' : 'text-texto'}`}>
                {etiqueta[opcion]}
              </button>)}
            </div>}
          </details>
        </div>
        
        <div className={tipo === 'nombres'
          ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_auto] lg:items-end'
          : 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'}>
          {tipo === 'nombres' ? <>
            <label className="block text-sm font-medium text-texto">Apellido paterno<input disabled={cargando} className="input mt-1.5 disabled:cursor-not-allowed disabled:bg-fondo disabled:opacity-60" value={apePat} onChange={(e) => setApePat(e.target.value)} maxLength={50} required placeholder="Ej. García" /></label>
            <label className="block text-sm font-medium text-texto">Apellido materno<input disabled={cargando} className="input mt-1.5 disabled:cursor-not-allowed disabled:bg-fondo disabled:opacity-60" value={apeMat} onChange={(e) => setApeMat(e.target.value)} maxLength={50} placeholder="Opcional" /></label>
            <label className="block text-sm font-medium text-texto">Nombres<input disabled={cargando} className="input mt-1.5 disabled:cursor-not-allowed disabled:bg-fondo disabled:opacity-60" value={nombres} onChange={(e) => setNombres(e.target.value)} maxLength={100} placeholder="Opcional" /></label>
          </> : 
          <label className="block text-sm font-medium text-texto">
            {tipo === 'telefono' ? 'Teléfono' : tipo === 'fallecidos' ? 'DNI' : etiqueta[tipo]}
            <input
              className="input mt-1.5"
              disabled={cargando}
              value={tipo === 'telefono' ? telefono : documento}
              onChange={(e) => tipo === 'telefono'
                ? setTelefono(e.target.value.replace(/\D/g, '').slice(0, 9))
                : setDocumento(tipo === 'PASAPORTE' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) : e.target.value.replace(/\D/g, '').slice(0, tipo === 'fallecidos' ? 8 : DOCUMENTOS[tipo as TipoDocumento].longitudMaxima))}
              inputMode={tipo === 'PASAPORTE' ? 'text' : 'numeric'}
              maxLength={tipo === 'telefono' ? 9 : tipo === 'fallecidos' ? 8 : DOCUMENTOS[tipo as TipoDocumento]?.longitudMaxima}
              required placeholder={tipo === 'telefono' ? '9 dígitos' : tipo === 'fallecidos' ? 'DNI de 8 dígitos' : DOCUMENTOS[tipo as TipoDocumento].descripcion}
            />
          </label>
          }
          <div className="flex gap-2 sm:justify-end">
            <Boton type="submit" cargando={cargando} disabled={cargando} className={tipo === 'nombres' ? 'h-10 w-full lg:w-36' : 'h-10 w-full sm:w-36'}><Search className="size-4" />Buscar</Boton>
          </div>
        </div>
      </form>

      {cargando && <Cargando texto="Consultando información..." />}
      {error && <Aviso tono="error">{error}</Aviso>}
      {activa && !cargando && !error && !resultado && <Vacio icono={<Search className="size-5" />} titulo="Los resultados aparecerán aquí">
        Selecciona un criterio, ingresa el dato y pulsa Buscar para iniciar la consulta.
      </Vacio>}
      {resultado && resultado.tipo !== 'documento' && <Tarjeta className="space-y-2" sinRelleno>
        {resultado.tipo === 'telefono' && <div className="space-y-3">
          <div className="flex justify-end">
            <Boton type="button" variante="secundario" disabled={cargando} onClick={() => setMostrarClientes(true)}>
              <UserRound className="size-4" />Filtrar y elegir cliente
            </Boton>
          </div>

          {mostrarClientes && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (!cargando && e.target === e.currentTarget) setMostrarClientes(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="clientes-telefono-titulo" className="flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-borde bg-white shadow-xl">
              <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
                <div><h3 id="clientes-telefono-titulo" className="font-semibold text-texto">Elegir cliente asociado</h3><p className="mt-1 text-xs text-gris">Filtra por nombre o documento. Se muestran {registrosTelefono.length} clientes/documentos únicos.</p></div>
                <button type="button" disabled={cargando} aria-label="Cerrar" onClick={() => setMostrarClientes(false)} className="rounded-lg p-2 text-gris hover:bg-fondo hover:text-texto disabled:cursor-not-allowed disabled:opacity-50"><X className="size-4" /></button>
              </header>
              <div className="border-b border-borde p-4">
                <div className="flex gap-2">
                  <label className="relative block min-w-0 flex-1"><span className="sr-only">Filtrar clientes</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input autoFocus disabled={cargando} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="input input--icono disabled:cursor-not-allowed disabled:bg-fondo" placeholder="Buscar por nombre o documento" /></label>
                  <Boton type="button" variante="secundario" disabled={cargando} onClick={() => setFiltroCliente('')}>Limpiar</Boton>
                </div>
              </div>
              <ul className="min-h-0 divide-y divide-borde overflow-y-auto">
                {clientesFiltrados.map(({ clave, documento, nombre, historial }) => <li key={clave}>
                  <button type="button" disabled={cargando} aria-pressed={(documento?.trim() || clave) === documentoTelefonoSeleccionado} onClick={() => { const seleccionado = documento?.trim() || clave; actualizarGlobal({ telefonoSeleccionado: seleccionado }); alFiltrarTelefono(seleccionado); setMostrarClientes(false); if (documento) void cargarFichaDocumento(documento, true); }} className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-azul disabled:opacity-50 ${(documento?.trim() || clave) === documentoTelefonoSeleccionado ? 'bg-azul-10 ring-1 ring-inset ring-azul/30' : 'hover:bg-azul-10/50'}`}>
                    <span className="flex min-w-0 items-center gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-texto">{nombre}</span><span className="mt-0.5 block text-xs text-gris">Documento {fTexto(documento)} · {historial.length} {historial.length === 1 ? 'línea' : 'líneas'}</span></span>{(documento?.trim() || clave) === documentoTelefonoSeleccionado && <Check aria-label="Cliente seleccionado" className="size-4 shrink-0 text-azul" />}</span><span className="shrink-0 text-xs font-medium text-azul">{fPeriodo(historial[0].periodo)}</span>
                  </button>
                </li>)}
                {!clientesFiltrados.length && <li className="px-5 py-8 text-center text-sm text-gris">No hay clientes que coincidan con el filtro.</li>}
              </ul>
            </section>
          </div>}
        </div>}
        {resultado.tipo === 'nombres' && <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-texto">{resultado.valor.length} coincidencias encontradas</p>
            <Boton type="button" variante="secundario" disabled={cargando || !resultado.valor.length} onClick={() => { setFiltroCliente(''); setMostrarClientes(true); }}>
              <UserRound className="size-4" />Filtrar y elegir persona
            </Boton>
          </div>
          {!resultado.valor.length && <Vacio icono={<UserRound className="size-5" />} titulo="No encontramos coincidencias">
            Prueba con otra combinación de apellidos y nombres.
          </Vacio>}
          {mostrarClientes && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (!cargando && e.target === e.currentTarget) setMostrarClientes(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="personas-nombres-titulo" className="flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-borde bg-white shadow-xl">
              <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
                <div><h3 id="personas-nombres-titulo" className="font-semibold text-texto">Elegir persona</h3><p className="mt-1 text-xs text-gris">Filtra por apellidos, nombres o documento. Se encontraron {resultado.valor.length} coincidencias.</p></div>
                <button type="button" disabled={cargando} aria-label="Cerrar" onClick={() => setMostrarClientes(false)} className="rounded-lg p-2 text-gris hover:bg-fondo hover:text-texto disabled:cursor-not-allowed disabled:opacity-50"><X className="size-4" /></button>
              </header>
              <div className="border-b border-borde p-4">
                <div className="flex gap-2">
                  <label className="relative block min-w-0 flex-1"><span className="sr-only">Filtrar personas</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input autoFocus disabled={cargando} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="input input--icono disabled:cursor-not-allowed disabled:bg-fondo" placeholder="Buscar por apellidos, nombres o documento" /></label>
                  <Boton type="button" variante="secundario" disabled={cargando} onClick={() => setFiltroCliente('')}>Limpiar</Boton>
                </div>
              </div>
              <ul className="min-h-0 divide-y divide-borde overflow-y-auto">
                {resultadosNombresFiltrados.map((persona) => <li key={persona.documento}>
                  <button type="button" disabled={cargando} aria-pressed={persona.documento === personaNombreSeleccionada} onClick={() => { setPersonaNombreSeleccionada(persona.documento); void cargarFichaDocumento(persona.documento, false, true); }} className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-azul disabled:opacity-50 ${persona.documento === personaNombreSeleccionada ? 'bg-azul-10 ring-1 ring-inset ring-azul/30' : 'hover:bg-azul-10/50'}`}>
                    <span className="flex min-w-0 items-center gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-texto">{persona.nombreCompleto}</span><span className="mt-0.5 block text-xs text-gris">Documento {fTexto(persona.documento)}</span></span>{persona.documento === personaNombreSeleccionada && <Check aria-label="Persona seleccionada" className="size-4 shrink-0 text-azul" />}</span><span className="shrink-0 text-xs font-medium text-azul">Ver tablas</span>
                  </button>
                </li>)}
                {!resultadosNombresFiltrados.length && <li className="px-5 py-8 text-center text-sm text-gris">No hay personas que coincidan con el filtro.</li>}
              </ul>
            </section>
          </div>}
        </div>}
      </Tarjeta>}
    </section>
  );
}
