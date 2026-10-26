'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { Banknote, BookOpen, Briefcase, Check, CreditCard, FileDown, Gauge, HeartCrack, IdCard, Phone, Search, UserRound, UserSearch, X } from 'lucide-react';
import { BarraBusqueda } from '@/modulos/consultas/barra-busqueda';
import { useEstadoConsultas } from '@/modulos/consultas/estado';
import { FichaReniec } from '@/modulos/personas/ficha-reniec';
import { Operadora, Resumen, Seccion, SeccionesResultado, colMoviles, type CategoriaSeccionResultado } from '@/modulos/consultas/resultados';
import { useSesion } from '@/modulos/sesion/proveedor';
import { Aviso, Boton, Cargando, Encabezado, Modal, Pestanas, Tabla, Tarjeta, Vacio } from '@/components/ui';
import { ErrorApi, guardarArchivo } from '@/lib/api';
import { servicioPersonas } from '@/modulos/personas/servicio';
import { DOCUMENTOS, esTipoDocumento, validarDocumento, type TipoDocumento } from '@/modulos/personas/documentos';
import { SelectorDocumento } from '@/modulos/personas/selector-documento';
import { BusquedaGlobalPersonas } from '@/modulos/personas/busqueda-global';
import { fFecha, fNumero, fPeriodo, fTexto, nombreCompleto } from '@/lib/formato';
import type { RegistroFallecido, ResultadoFallecidos, ResultadoNombre, ResultadoTelefono } from '@/modulos/personas/tipos';

type Modo = 'documento' | 'telefono' | 'nombres' | 'fallecidos';
type CategoriaResultados = CategoriaSeccionResultado | 'fallecidos';
// La búsqueda por apellidos y nombres usa el formulario y los resultados ya implementados.
const BUSQUEDA_NOMBRES_DISPONIBLE = true;

const columnasFallecidos = [
  { titulo: 'DNI', celda: (r: RegistroFallecido) => <span className="numeros font-semibold">{fTexto(r.dni)}</span> },
  { titulo: 'Ape. paterno', celda: (r: RegistroFallecido) => fTexto(r.apePat) },
  { titulo: 'Ape. materno', celda: (r: RegistroFallecido) => fTexto(r.apeMat) },
  { titulo: 'Prenombres', celda: (r: RegistroFallecido) => fTexto(r.prenombres) },
  { titulo: 'Restricción', celda: (r: RegistroFallecido) => fTexto(r.deRestriccion) },
  { titulo: 'Nacimiento', celda: (r: RegistroFallecido) => fFecha(r.fechaNacimiento) },
  { titulo: 'Fallecimiento', celda: (r: RegistroFallecido) => <span className="font-semibold text-peligro">{fFecha(r.fechaFallecimiento)}</span> },
];

function limpiarApellido(texto: string): string {
  const primeraPalabra = texto.trimStart().split(/\s+/)[0] || '';
  return primeraPalabra.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
}

function limpiarNombres(texto: string): string {
  return texto
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trimStart();
}

export default function Personas() {
  const { actualizarSaldo } = useSesion();
  const {
    modoPersona: modo, setModoPersona: setModo, tipoDocumento: tipo, setTipoDocumento: setTipo,
    entradaDocumento, setEntradaDocumento, entradaTelefono, setEntradaTelefono,
    persona, setPersona, consultado, setConsultado, reniec, setReniec, telefono, setTelefono,
    busquedaPersona, setBusquedaPersona,
  } = useEstadoConsultas();
  const cargando = busquedaPersona.cargandoLocal;
  const setCargando = (value: boolean) => setBusquedaPersona((state) => ({ ...state, cargandoLocal: value }));
  const [error, setError] = useState('');
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [cargandoReniec, setCargandoReniec] = useState(false);
  const [cargandoPdf, setCargandoPdf] = useState(false);
  const apePat = busquedaPersona.apellidoPaterno;
  const apeMat = busquedaPersona.apellidoMaterno;
  const nombres = busquedaPersona.nombres;
  const resultadosNombres = busquedaPersona.resultadosNombres;
  const documentoNombreSeleccionado = busquedaPersona.documentoNombreSeleccionado;
  const setApePat = (value: string) => setBusquedaPersona((state) => ({ ...state, apellidoPaterno: value }));
  const setApeMat = (value: string) => setBusquedaPersona((state) => ({ ...state, apellidoMaterno: value }));
  const setNombres = (value: string) => setBusquedaPersona((state) => ({ ...state, nombres: value }));
  const setResultadosNombres = (value: ResultadoNombre[] | null) => setBusquedaPersona((state) => ({ ...state, resultadosNombres: value }));
  const setDocumentoNombreSeleccionado = (value: string) => setBusquedaPersona((state) => ({ ...state, documentoNombreSeleccionado: value }));
  const [mostrarPersonasNombres, setMostrarPersonasNombres] = useState(false);
  const [filtroPersonaNombres, setFiltroPersonaNombres] = useState('');
  const dniFallecido = busquedaPersona.dniFallecido;
  const apePatFallecido = busquedaPersona.apellidoPaternoFallecido;
  const apeMatFallecido = busquedaPersona.apellidoMaternoFallecido;
  const prenombresFallecido = busquedaPersona.prenombresFallecido;
  const resultadoFallecido = busquedaPersona.resultadoFallecido;
  const setDniFallecido = (value: string) => setBusquedaPersona((state) => ({ ...state, dniFallecido: value }));
  const setApePatFallecido = (value: string) => setBusquedaPersona((state) => ({ ...state, apellidoPaternoFallecido: value }));
  const setApeMatFallecido = (value: string) => setBusquedaPersona((state) => ({ ...state, apellidoMaternoFallecido: value }));
  const setPrenombresFallecido = (value: string) => setBusquedaPersona((state) => ({ ...state, prenombresFallecido: value }));
  const setResultadoFallecido = (value: ResultadoFallecidos | null) => setBusquedaPersona((state) => ({ ...state, resultadoFallecido: value }));
  const [mostrarClientesTelefono, setMostrarClientesTelefono] = useState(false);
  const [filtroClienteTelefono, setFiltroClienteTelefono] = useState('');
  const documentoTelefonoSeleccionado = busquedaPersona.documentoTelefonoSeleccionado;
  const setDocumentoTelefonoSeleccionado = (value: string | null) => setBusquedaPersona((state) => ({ ...state, documentoTelefonoSeleccionado: value }));
  const mostrarResultadosPorTab = busquedaPersona.mostrarResultadosPorTab;
  const setMostrarResultadosPorTab = (value: boolean) => setBusquedaPersona((state) => ({ ...state, mostrarResultadosPorTab: value }));
  const categoriaResultados = busquedaPersona.categoriaResultados as CategoriaResultados;
  const setCategoriaResultados = (value: CategoriaResultados) => setBusquedaPersona((state) => ({ ...state, categoriaResultados: value }));
  const vistaBusqueda = busquedaPersona.vista;
  const setVistaBusqueda = (value: 'global' | 'local' | null) => setBusquedaPersona((state) => ({ ...state, vista: value }));
  const busquedaGlobalCargando = busquedaPersona.global.cargando;
  const setBusquedaGlobalCargando = (value: boolean) => setBusquedaPersona((state) => ({ ...state, global: { ...state.global, cargando: value } }));

  function limpiarBusquedaLocal() {
    setModo('documento');
    setTipo('DNI');
    setEntradaDocumento('');
    setEntradaTelefono('');
    setPersona(null);
    setConsultado(null);
    setReniec(null);
    setTelefono(null);
    setApePat(''); setApeMat(''); setNombres('');
    setResultadosNombres(null); setDocumentoNombreSeleccionado(''); setMostrarPersonasNombres(false); setFiltroPersonaNombres('');
    setDniFallecido(''); setApePatFallecido(''); setApeMatFallecido(''); setPrenombresFallecido('');
    setResultadoFallecido(null);
    setMostrarClientesTelefono(false); setFiltroClienteTelefono(''); setDocumentoTelefonoSeleccionado(null);
    setMostrarResultadosPorTab(false); setCategoriaResultados('telefonos');
    setError('');
  }

  function activarBusquedaGlobal() {
    if (vistaBusqueda === 'global') return;
    setVistaBusqueda('global');
  }

  function activarBusquedaLocal() {
    if (vistaBusqueda === 'local') return;
    setVistaBusqueda('local');
  }

  function limpiarBusquedaGlobal() {
    limpiarBusquedaLocal();
    setBusquedaPersona((state) => ({
      ...state,
      global: { tipo: 'DNI', documentos: { DNI: '', CE: '', RUC: '', PASAPORTE: '' }, dniFallecido: '', telefono: '', apellidoPaterno: '', apellidoMaterno: '', nombres: '', resultado: null, resultadosPorTipo: {}, personaNombreSeleccionada: '', personasNombreSeleccionadas: {}, fichasPorTipo: {}, telefonoSeleccionado: null, cargando: false },
    }));
    setVistaBusqueda(null);
  }

  const bloquearNombresFallecido = Boolean(dniFallecido.trim());
  const bloquearDniFallecido = Boolean(apePatFallecido.trim() || apeMatFallecido.trim() || prenombresFallecido.trim());
  const bloqueandoCambioModo = cargando || cargandoReniec;
  const consultaEnCurso = busquedaGlobalCargando || cargando;

  const botonFallecidosDeshabilitado = cargando || (
    bloquearNombresFallecido
      ? dniFallecido.trim().length !== 8
      : bloquearDniFallecido
        ? apePatFallecido.trim().length < 2 || (!apeMatFallecido.trim() && !prenombresFallecido.trim())
        : true
  );

  const buscarDocumento = useCallback(async (t: TipoDocumento, numero: string) => {
    setModo('documento');
    setMostrarResultadosPorTab(false);
    setTipo(t);
    setError('');
    setPersona(null);
    setReniec(null);
    setConsultado({ tipo: t, numero });
    setEntradaDocumento(numero);
    setCargando(true);
    try {
      setPersona(await servicioPersonas.porDocumento(t, numero));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo realizar la consulta.');
    } finally {
      setCargando(false);
      actualizarSaldo();
    }
  }, [actualizarSaldo, setModo, setTipo, setPersona, setReniec, setConsultado, setEntradaDocumento]);

  const buscarTelefono = useCallback(async (numero: string) => {
    const num = numero.replace(/\D/g, '').slice(0, 9);
    setModo('telefono');
    setError('');
    setTelefono(null);
    setEntradaTelefono(num);
    if (num.length !== 9) {
      setError('El teléfono debe tener 9 dígitos.');
      return;
    }
    setCargando(true);
    try {
      const resultado = await servicioPersonas.porTelefono(num);
      setTelefono(resultado);
      setDocumentoTelefonoSeleccionado(null);
      setFiltroClienteTelefono('');
      setMostrarClientesTelefono(false);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo realizar la consulta.');
    } finally {
      setCargando(false);
      actualizarSaldo();
    }
  }, [actualizarSaldo, setModo, setTelefono, setEntradaTelefono]);

  async function buscarPorNombres() {
    setModo('nombres');
    setError('');
    setResultadosNombres(null);
    setDocumentoNombreSeleccionado('');
    setMostrarPersonasNombres(false);
    setFiltroPersonaNombres('');

    const paterno = apePat.trim();
    const materno = apeMat.trim();
    const nom = nombres.trim();

    if (paterno.length < 2) {
      setError('El apellido paterno debe tener al menos 2 letras.');
      return;
    }
    if (/\s/.test(paterno)) {
      setError('El apellido paterno debe ser solo una palabra.');
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+$/.test(paterno)) {
      setError('El apellido paterno solo debe contener texto, sin números.');
      return;
    }
    if (materno) {
      if (/\s/.test(materno)) {
        setError('El apellido materno debe ser solo una palabra.');
        return;
      }
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+$/.test(materno)) {
        setError('El apellido materno solo debe contener texto, sin números.');
        return;
      }
    }
    if (nom && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nom)) {
      setError('Los nombres solo deben contener texto, sin números.');
      return;
    }

    setCargando(true);
    try {
      setResultadosNombres(await servicioPersonas.porNombres(paterno, materno, nom));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo buscar por apellidos y nombres.');
    } finally {
      setCargando(false);
      actualizarSaldo();
    }
  }

  async function buscarFallecido(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dni = dniFallecido.trim();
    const paterno = apePatFallecido.trim();
    const materno = apeMatFallecido.trim();
    const prenombres = prenombresFallecido.trim();

    if (dni) {
      if (!/^\d{8}$/.test(dni)) {
        setError('El DNI debe tener exactamente 8 dígitos.');
        return;
      }
    } else {
      if (paterno.length < 2) {
        setError('El apellido paterno debe tener al menos 2 letras.');
        return;
      }
      if (!materno && !prenombres) {
        setError('Ingresa al menos el apellido materno o los prenombres.');
        return;
      }
      if (/\s/.test(paterno)) {
        setError('El apellido paterno debe ser solo una palabra.');
        return;
      }
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+$/.test(paterno)) {
        setError('El apellido paterno solo debe contener texto, sin números.');
        return;
      }
      if (materno) {
        if (/\s/.test(materno)) {
          setError('El apellido materno debe ser solo una palabra.');
          return;
        }
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+$/.test(materno)) {
          setError('El apellido materno solo debe contener texto, sin números.');
          return;
        }
      }
      if (prenombres && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(prenombres)) {
        setError('Los prenombres solo deben contener texto, sin números.');
        return;
      }
    }

    setError('');
    setResultadoFallecido(null);
    setCargando(true);
    try {
      setResultadoFallecido(await servicioPersonas.buscarFallecidos({
        dni: dni || null,
        apePat: dni ? null : (paterno || null),
        apeMat: dni ? null : (materno || null),
        prenombres: dni ? null : (prenombres || null),
      }));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo consultar el registro de fallecimiento.');
    } finally {
      setCargando(false);
      actualizarSaldo();
    }
  }

  async function consultarReniec() {
    if (!persona) return;
    setCargandoReniec(true);
    try {
      setReniec(await servicioPersonas.reniec(persona.documento));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo consultar RENIEC.');
    } finally {
      setCargandoReniec(false);
      actualizarSaldo();
    }
  }

  async function exportarPdf() {
    if (!persona) return;
    setCargandoPdf(true);
    setError('');
    try {
      guardarArchivo(await servicioPersonas.exportarPdf(persona, consultado?.tipo ?? tipo, nombrePersona));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo generar el archivo PDF.');
    } finally {
      setCargandoPdf(false);
    }
  }

  // Busqueda que llega desde Inicio (?dni=, ?tipo=CE&documento=... o ?telefono=)
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const dni = q.get('dni'); const tel = q.get('telefono');
    const t = q.get('tipo'); const doc = q.get('documento');
    if (doc && esTipoDocumento(t)) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
      queueMicrotask(() => buscarDocumento(t, doc));
    } else if (dni) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
      queueMicrotask(() => buscarDocumento('DNI', dni));
    } else if (tel) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
      queueMicrotask(() => buscarTelefono(tel));
    }
  }, [buscarDocumento, buscarTelefono]);

  const nombreCalificacion = persona?.calificaciones.find((c) => c.priNombre || c.segNombre || c.apePat || c.apeMat);
  const nombreDesdeCalificacion = nombreCalificacion
    ? nombreCompleto(nombreCalificacion.priNombre, nombreCalificacion.segNombre, nombreCalificacion.apePat, nombreCalificacion.apeMat)
    : '';
  const nombreDesdeMovil = persona?.moviles
    .map((m) => nombreCompleto(m.prenombres, m.apePat, m.apeMat))
    .find((nombre) => nombre !== '—');
  const nombrePersona = nombreDesdeCalificacion && nombreDesdeCalificacion !== '—'
    ? nombreDesdeCalificacion
    : persona?.deudas.find((d) => d.razonSocial?.trim())?.razonSocial?.trim()
      || nombreDesdeMovil
      || persona?.sueldos.find((s) => s.apeNom?.trim())?.apeNom?.trim()
      || '';
  const titularesTelefono = [...new Set(telefono?.registros
    .map((m) => nombreCompleto(m.prenombres, m.apePat, m.apeMat))
    .filter((nombre) => nombre !== '—') ?? [])];

  const clientesTelefono = [...new Map(telefono?.registros.map((registro) => {
    const nombre = nombreCompleto(registro.prenombres, registro.apePat, registro.apeMat);
    const clave = registro.documento?.trim() || nombre;
    return [clave, { clave, documento: registro.documento, nombre, periodo: registro.periodo }] as const;
  }) ?? []).values()];
  const clientesTelefonoFiltrados = clientesTelefono.filter((cliente) =>
    `${cliente.nombre} ${cliente.documento ?? ''}`.toLocaleLowerCase().includes(filtroClienteTelefono.trim().toLocaleLowerCase()),
  );
  const clienteTelefonoSeleccionado = clientesTelefono.find((cliente) => cliente.clave === documentoTelefonoSeleccionado);
  const resultadosNombresFiltrados = resultadosNombres?.filter((resultado) =>
    `${resultado.nombreCompleto} ${resultado.documento}`.toLocaleLowerCase().includes(filtroPersonaNombres.trim().toLocaleLowerCase()),
  ) ?? [];
  const registrosTelefonoVisibles = telefono?.registros.filter((registro) =>
    !documentoTelefonoSeleccionado || (registro.documento?.trim() || nombreCompleto(registro.prenombres, registro.apePat, registro.apeMat)) === documentoTelefonoSeleccionado,
  ) ?? [];

  return (
    <div className="relative space-y-6" aria-busy={busquedaGlobalCargando || cargando}>
      <Encabezado titulo="Consulta de personas" bajada="Cada consulta descuenta tokens y queda registrada en la auditoría."
        accion={<div className="flex flex-wrap items-center gap-2">
          {/* Botón temporalmente oculto; conservar para volver a habilitar la guía.
          <Boton type="button" variante="secundario" onClick={() => setMostrarGuia(true)} aria-haspopup="dialog">
            <BookOpen aria-hidden className="size-4" />Cómo usar la consulta
          </Boton>
          */}
          <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={limpiarBusquedaGlobal}>Limpiar</Boton>
        </div>} />
        <Modal abierto={mostrarGuia} titulo="Guía rápida de consulta" alCerrar={() => setMostrarGuia(false)} ancho="max-w-3xl">
          <p className="mb-5 text-sm text-gris">Cómo buscar, elegir una persona y revisar sus datos.</p>
          <ol className="grid gap-5 sm:grid-cols-2">
          <li className="flex items-start gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-azul-10 text-xs font-bold text-azul">1</span>
            <p className="text-sm leading-5 text-gris"><strong className="text-texto">Elige dónde buscar.</strong> Usa Búsqueda global para un criterio independiente o selecciona un tipo en «¿Qué dato deseas consultar?».</p>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-azul-10 text-xs font-bold text-azul">2</span>
            <p className="text-sm leading-5 text-gris"><strong className="text-texto">Ingresa el dato.</strong> Completa el documento, teléfono, apellidos y nombres o los datos de fallecidos que solicita el formulario.</p>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-azul-10 text-xs font-bold text-azul">3</span>
            <p className="text-sm leading-5 text-gris"><strong className="text-texto">Pulsa Buscar o Consultar.</strong> Espera a que termine la consulta antes de cambiar de criterio o enviar otra búsqueda.</p>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-azul-10 text-xs font-bold text-azul">4</span>
            <p className="text-sm leading-5 text-gris"><strong className="text-texto">Revisa los resultados.</strong> Cambia entre las pestañas de datos. En teléfono o nombres, abre el filtro para encontrar y seleccionar a la persona.</p>
          </li>
          </ol>
        </Modal>
      {vistaBusqueda !== 'local' && <BusquedaGlobalPersonas
        activa={vistaBusqueda === 'global'}
        documentoTelefonoSeleccionado={documentoTelefonoSeleccionado}
        alCambiarCarga={setBusquedaGlobalCargando}
        alInteractuar={activarBusquedaGlobal}
        alFiltrarTelefono={setDocumentoTelefonoSeleccionado}
        alLimpiarTelefono={() => {
          setTelefono(null);
          setPersona(null);
          setConsultado(null);
          setReniec(null);
          setDocumentoTelefonoSeleccionado(null);
          setMostrarClientesTelefono(false);
          setMostrarResultadosPorTab(false);
        }}
        alEncontrarTelefono={(resultado: ResultadoTelefono) => {
          setModo('telefono');
          setTelefono(resultado);
          setEntradaTelefono(resultado.telefono);
          setPersona(null);
          setConsultado(null);
          setMostrarResultadosPorTab(false);
          setCategoriaResultados('telefonos');
          setError('');
        }}
        alEncontrarDocumento={(tipo, resultado, mantenerTelefono = false) => {
        if (!mantenerTelefono) setModo('documento');
        setMostrarResultadosPorTab(true);
        setCategoriaResultados('telefonos');
        setTipo(tipo);
        setPersona(resultado);
        setConsultado({ tipo, numero: resultado.documento });
        setEntradaDocumento(resultado.documento);
        setReniec(null);
        setError('');
        setVistaBusqueda('global');
      }} />}
      {vistaBusqueda !== 'global' && <>
      <div className="flex flex-col gap-2" onFocusCapture={activarBusquedaLocal}>
        <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gris">¿Qué dato deseas consultar?</p>
        </div>
        <Pestanas<Modo>
          valor={modo} deshabilitadas={bloqueandoCambioModo}
          alCambiar={(m) => { if (bloqueandoCambioModo) return; activarBusquedaLocal(); setModo(m); setError(''); }}
          opciones={[
            { id: 'documento', texto: 'Documento', icono: <IdCard className="size-4" /> },
            { id: 'telefono', texto: 'Teléfono', icono: <Phone className="size-4" /> },
            { id: 'nombres', texto: 'Apellidos y nombres', icono: <UserRound className="size-4" /> },
            { id: 'fallecidos', texto: 'Fallecidos', icono: <HeartCrack className="size-4" /> },
          ]}
        />
        {bloqueandoCambioModo && <p role="status" className="text-xs font-medium text-azul">{cargando ? 'La búsqueda está en curso. Espera a que termine para cambiar de pestaña.' : 'La consulta de RENIEC está en curso. Espera a que termine para cambiar de pestaña.'}</p>}
      </div>

      <div onFocusCapture={activarBusquedaLocal}><Tarjeta>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-azul-10 text-azul">
            {modo === 'documento' ? <IdCard className="size-5" /> : modo === 'telefono' ? <Phone className="size-5" /> : modo === 'fallecidos' ? <HeartCrack className="size-5" /> : <UserRound className="size-5" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-texto">
              {modo === 'documento' ? 'Buscar por documento' : modo === 'telefono' ? 'Buscar por teléfono' : modo === 'fallecidos' ? 'Verificar fallecimiento' : 'Buscar por apellidos y nombres'}
            </h2>
            <p className="mt-0.5 text-xs text-gris">
              {modo === 'documento' ? 'Selecciona el tipo e ingresa el número del documento.' : modo === 'telefono' ? 'Ingresa el celular asociado a la persona.' : modo === 'fallecidos' ? 'Consulta en la base de datos interna si el DNI registra una fecha de fallecimiento.' : 'Ingresa el apellido paterno y completa los demás datos para afinar la búsqueda.'}
            </p>
          </div>
        </div>
        {modo === 'documento' && (
          <BarraBusqueda key={`doc-${tipo}`} etiqueta={DOCUMENTOS[tipo].etiqueta}
            placeholder={`${DOCUMENTOS[tipo].etiqueta}: ${DOCUMENTOS[tipo].descripcion}`} valorInicial={entradaDocumento} alCambiarValor={setEntradaDocumento} cargando={cargando}
            numerica={DOCUMENTOS[tipo].soloNumeros} longitudMaxima={DOCUMENTOS[tipo].longitudMaxima} mayusculas sinEspacios
            prefijo={<SelectorDocumento valor={tipo} disabled={cargando} alCambiar={(t) => { setTipo(t); setError(''); }} />}
            validar={(v) => validarDocumento(tipo, v)} alBuscar={(v) => buscarDocumento(tipo, v)} />
        )}
        {modo === 'telefono' && (
          <BarraBusqueda key="tel" etiqueta="Teléfono" placeholder="Celular de 9 dígitos" valorInicial={entradaTelefono} alCambiarValor={setEntradaTelefono} cargando={cargando}
            longitudMaxima={9}
            validar={(v) => (/^\d{9}$/.test(v) ? null : 'El teléfono debe tener 9 dígitos.')} alBuscar={buscarTelefono} />
        )}
        {modo === 'nombres' && !BUSQUEDA_NOMBRES_DISPONIBLE && (
          <Vacio icono={<UserSearch className="size-5" />} titulo="Estamos trabajando en esta búsqueda">
            La consulta por apellidos y nombres estará disponible pronto. Mientras tanto, busca por documento o por teléfono.
          </Vacio>
        )}
        {modo === 'nombres' && BUSQUEDA_NOMBRES_DISPONIBLE && (
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_auto] lg:items-end" onSubmit={(e) => { e.preventDefault(); void buscarPorNombres(); }}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-texto">
                Apellido paterno <span className="font-normal text-gris">(una sola palabra)</span>
              </span>
              <span className="relative block">
                <UserRound aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                <input
                  value={apePat}
                  onChange={(e) => { setApePat(limpiarApellido(e.target.value)); setError(''); }}
                  onKeyDown={(e) => { if (e.key === ' ' || (e.key.length === 1 && /\d/.test(e.key))) e.preventDefault(); }}
                  disabled={cargando} maxLength={50} required placeholder="Ej. García" className="input input--icono h-10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-texto">
                Apellido materno <span className="font-normal text-gris">(una sola palabra, opcional)</span>
              </span>
              <span className="relative block">
                <UserRound aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                <input
                  value={apeMat}
                  onChange={(e) => { setApeMat(limpiarApellido(e.target.value)); setError(''); }}
                  onKeyDown={(e) => { if (e.key === ' ' || (e.key.length === 1 && /\d/.test(e.key))) e.preventDefault(); }}
                  disabled={cargando} maxLength={50} placeholder="Ej. López (opcional)" className="input input--icono h-10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-texto">
                Nombres <span className="font-normal text-gris">(separados, opcional)</span>
              </span>
              <span className="relative block">
                <UserSearch aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                <input
                  value={nombres}
                  onChange={(e) => { setNombres(limpiarNombres(e.target.value)); setError(''); }}
                  onKeyDown={(e) => { if (e.key.length === 1 && /\d/.test(e.key)) e.preventDefault(); }}
                  disabled={cargando} maxLength={100} placeholder="Ej. Ana María (opcional)" className="input input--icono h-10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </span>
            </label>
            <Boton type="submit" cargando={cargando} disabled={apePat.trim().length < 2}><UserSearch className="size-4" />Buscar</Boton>
          </form>
        )}
        {modo === 'fallecidos' && (
          <div>
            <p className="mb-3 text-sm text-gris">
              Busca por DNI o por apellidos y prenombres. Al escribir en un criterio, el otro se bloquea automáticamente.
            </p>
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-end" onSubmit={buscarFallecido}>
              <label className="block min-w-0">
                <span className={clsx('mb-1.5 block text-sm font-medium', bloquearDniFallecido ? 'text-gris' : 'text-texto')}>
                  DNI {bloquearDniFallecido ? <span className="font-normal text-gris/70">(bloqueado)</span> : <span className="font-normal text-gris">(8 dígitos)</span>}
                </span>
                <span className="relative block">
                  <IdCard aria-hidden className={clsx('pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2', bloquearDniFallecido ? 'text-gris/40' : 'text-gris')} />
                  <input
                    value={dniFallecido}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setDniFallecido(v);
                      if (v) {
                        setApePatFallecido('');
                        setApeMatFallecido('');
                        setPrenombresFallecido('');
                      }
                      setError('');
                    }}
                    disabled={cargando || bloquearDniFallecido}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder={bloquearDniFallecido ? 'Bloqueado por nombres' : '8 dígitos'}
                    className="input input--icono h-10 disabled:bg-slate-100 disabled:text-gris/50 disabled:cursor-not-allowed disabled:border-borde/60"
                  />
                  {dniFallecido && !bloquearDniFallecido && (
                    <button
                      type="button"
                      onClick={() => { setDniFallecido(''); setError(''); }}
                      disabled={cargando}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-xs text-gris hover:text-texto disabled:cursor-not-allowed disabled:opacity-50"
                      title="Borrar DNI"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </label>
              <label className="block min-w-0">
                <span className={clsx('mb-1.5 block text-sm font-medium', bloquearNombresFallecido ? 'text-gris' : 'text-texto')}>
                  Apellido paterno {bloquearNombresFallecido ? <span className="font-normal text-gris/70">(bloqueado)</span> : <span className="font-normal text-gris">(una palabra)</span>}
                </span>
                <span className="relative block"><UserRound aria-hidden className={clsx('pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2', bloquearNombresFallecido ? 'text-gris/40' : 'text-gris')} />
                  <input
                    value={apePatFallecido}
                    onChange={(e) => {
                      const v = limpiarApellido(e.target.value);
                      setApePatFallecido(v);
                      if (v) setDniFallecido('');
                      setError('');
                    }}
                    onKeyDown={(e) => { if (e.key === ' ' || (e.key.length === 1 && /\d/.test(e.key))) e.preventDefault(); }}
                    disabled={cargando || bloquearNombresFallecido}
                    maxLength={50} placeholder={bloquearNombresFallecido ? 'Bloqueado por DNI' : 'Ej. García'}
                    className="input input--icono h-10 disabled:bg-slate-100 disabled:text-gris/50 disabled:cursor-not-allowed disabled:border-borde/60"
                  />
                </span>
              </label>
              <label className="block min-w-0">
                <span className={clsx('mb-1.5 block text-sm font-medium', bloquearNombresFallecido ? 'text-gris' : 'text-texto')}>
                  Apellido materno {bloquearNombresFallecido ? <span className="font-normal text-gris/70">(bloqueado)</span> : <span className="font-normal text-gris">(una palabra)</span>}
                </span>
                <span className="relative block"><UserRound aria-hidden className={clsx('pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2', bloquearNombresFallecido ? 'text-gris/40' : 'text-gris')} />
                  <input
                    value={apeMatFallecido}
                    onChange={(e) => {
                      const v = limpiarApellido(e.target.value);
                      setApeMatFallecido(v);
                      if (v) setDniFallecido('');
                      setError('');
                    }}
                    onKeyDown={(e) => { if (e.key === ' ' || (e.key.length === 1 && /\d/.test(e.key))) e.preventDefault(); }}
                    disabled={cargando || bloquearNombresFallecido}
                    maxLength={50} placeholder={bloquearNombresFallecido ? 'Bloqueado por DNI' : 'Ej. López'}
                    className="input input--icono h-10 disabled:bg-slate-100 disabled:text-gris/50 disabled:cursor-not-allowed disabled:border-borde/60"
                  />
                </span>
              </label>
              <label className="block min-w-0">
                <span className={clsx('mb-1.5 block text-sm font-medium', bloquearNombresFallecido ? 'text-gris' : 'text-texto')}>
                  Prenombres {bloquearNombresFallecido ? <span className="font-normal text-gris/70">(bloqueado)</span> : <span className="font-normal text-gris">(separados)</span>}
                </span>
                <span className="relative block"><UserSearch aria-hidden className={clsx('pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2', bloquearNombresFallecido ? 'text-gris/40' : 'text-gris')} />
                  <input
                    value={prenombresFallecido}
                    onChange={(e) => {
                      const v = limpiarNombres(e.target.value);
                      setPrenombresFallecido(v);
                      if (v) setDniFallecido('');
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === ' ' && !prenombresFallecido.length) {
                        e.preventDefault();
                      } else if (e.key.length === 1 && /\d/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    disabled={cargando || bloquearNombresFallecido}
                    maxLength={100} placeholder={bloquearNombresFallecido ? 'Bloqueado por DNI' : 'Ej. Ana María'}
                    className="input input--icono h-10 disabled:bg-slate-100 disabled:text-gris/50 disabled:cursor-not-allowed disabled:border-borde/60"
                  />
                </span>
              </label>
              <Boton type="submit" cargando={cargando} disabled={botonFallecidosDeshabilitado}>
                <HeartCrack className="size-4" />Consultar
              </Boton>
            </form>
          </div>
        )}
      </Tarjeta></div>
      </>}

      {error && <Aviso tono="error" alCerrar={() => setError('')}>{error}</Aviso>}
      {cargando && <Cargando />}

      {modo === 'documento' && persona && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-texto">{nombrePersona || `${DOCUMENTOS[consultado?.tipo ?? 'DNI'].etiqueta} ${persona.documento}`}</h2>
              {nombrePersona && <p className="numeros mt-0.5 text-sm text-gris">{DOCUMENTOS[consultado?.tipo ?? 'DNI'].etiqueta} {persona.documento}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Boton variante="secundario" onClick={exportarPdf} cargando={cargandoPdf}><FileDown className="size-4" />Descargar PDF</Boton>
              {consultado?.tipo === 'DNI' && !reniec && <Boton variante="secundario" onClick={consultarReniec} cargando={cargandoReniec}><IdCard className="size-4" />Ver datos RENIEC</Boton>}
            </div>
          </div>
          {consultado?.tipo === 'DNI' && !persona.esDniValido && <Aviso tono="alerta">El DNI no figura como válido en las fuentes consultadas.</Aviso>}
          {reniec && <FichaReniec r={reniec} />}
          <Resumen s={persona} />
          {mostrarResultadosPorTab ? <>
            <Pestanas<CategoriaResultados>
              valor={categoriaResultados}
              alCambiar={setCategoriaResultados}
              deshabilitadas={consultaEnCurso}
              opciones={[
                { id: 'telefonos', texto: 'Móviles', icono: <Phone className="size-4" /> },
                { id: 'laboral', texto: 'Sueldos', icono: <Briefcase className="size-4" /> },
                { id: 'deudas', texto: 'Deudas', icono: <Banknote className="size-4" /> },
                { id: 'calificaciones', texto: 'Calificación', icono: <Gauge className="size-4" /> },
                { id: 'lineas', texto: 'Líneas de crédito', icono: <CreditCard className="size-4" /> },
                { id: 'fallecidos', texto: 'Fallecidos', icono: <HeartCrack className="size-4" /> },
              ]}
            />
            {categoriaResultados === 'fallecidos'
              ? consultado?.tipo === 'DNI'
                ? <Seccion titulo="Fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={persona.fallecidos?.length ?? 0}>
                    <Tabla columnas={columnasFallecidos} filas={persona.fallecidos ?? []} clave={(r) => r.dni} vacio="No registra fallecimiento." />
                  </Seccion>
                : <p className="text-sm text-gris">La consulta de fallecidos está disponible para DNI.</p>
              : <SeccionesResultado s={persona} categoria={categoriaResultados} />}
          </> : <>
            <SeccionesResultado s={persona} />
            {consultado?.tipo === 'DNI' && <Seccion titulo="Fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={persona.fallecidos?.length ?? 0}>
              <Tabla columnas={columnasFallecidos} filas={persona.fallecidos ?? []} clave={(r) => r.dni} vacio="No registra fallecimiento." />
            </Seccion>}
          </>}
        </div>
      )}

      {modo === 'nombres' && resultadosNombres && (
        resultadosNombres.length ? <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-gris">{fNumero(resultadosNombres.length)} coincidencias encontradas</p>
            <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={() => { setFiltroPersonaNombres(''); setMostrarPersonasNombres(true); }}>
              <UserRound className="size-4" />{documentoNombreSeleccionado ? 'Cambiar persona' : 'Filtrar y elegir persona'}
            </Boton>
          </div>
          {(() => {
            const seleccionado = resultadosNombres.find((r) => r.documento === documentoNombreSeleccionado);
            return seleccionado ? <div className="rounded-lg border border-azul/20 bg-azul-10/50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-azul">Persona seleccionada</p>
              <p className="mt-1 font-semibold text-texto">{seleccionado.nombreCompleto}</p>
              <p className="numeros mt-0.5 text-xs text-gris">Documento {seleccionado.documento}</p>
            </div> : <Vacio icono={<UserRound className="size-5" />} titulo="Elige una persona">Abre el filtro para buscar y seleccionar una coincidencia.</Vacio>;
          })()}
          {mostrarPersonasNombres && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (!consultaEnCurso && e.target === e.currentTarget) setMostrarPersonasNombres(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="personas-nombres-local-titulo" className="flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-borde bg-white shadow-xl">
              <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
                <div><h3 id="personas-nombres-local-titulo" className="font-semibold text-texto">Elegir persona</h3><p className="mt-1 text-xs text-gris">Filtra por apellidos, nombres o documento. Se encontraron {fNumero(resultadosNombres.length)} coincidencias.</p></div>
                <button type="button" aria-label="Cerrar" disabled={consultaEnCurso} onClick={() => setMostrarPersonasNombres(false)} className="rounded-lg p-2 text-gris hover:bg-fondo hover:text-texto disabled:opacity-50"><X className="size-4" /></button>
              </header>
              <div className="border-b border-borde p-4">
                <div className="flex gap-2">
                  <label className="relative block min-w-0 flex-1"><span className="sr-only">Filtrar personas</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input autoFocus disabled={consultaEnCurso} value={filtroPersonaNombres} onChange={(e) => setFiltroPersonaNombres(e.target.value)} className="input input--icono disabled:cursor-not-allowed disabled:bg-fondo" placeholder="Buscar por apellidos, nombres o documento" /></label>
                  <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={() => setFiltroPersonaNombres('')}>Limpiar</Boton>
                </div>
              </div>
              <ul className="min-h-0 divide-y divide-borde overflow-y-auto">
                {resultadosNombresFiltrados.map((resultado) => <li key={resultado.documento}>
                  <button type="button" disabled={consultaEnCurso} aria-pressed={resultado.documento === documentoNombreSeleccionado} onClick={() => { setDocumentoNombreSeleccionado(resultado.documento); setMostrarPersonasNombres(false); }} className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-azul disabled:opacity-50 ${resultado.documento === documentoNombreSeleccionado ? 'bg-azul-10 ring-1 ring-inset ring-azul/30' : 'hover:bg-azul-10/50'}`}>
                    <span className="flex min-w-0 items-center gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-texto">{resultado.nombreCompleto}</span><span className="mt-0.5 block text-xs text-gris">Documento {fTexto(resultado.documento)}</span></span>{resultado.documento === documentoNombreSeleccionado && <Check aria-label="Persona seleccionada" className="size-4 shrink-0 text-azul" />}</span><span className="shrink-0 text-xs font-medium text-azul">Ver tablas</span>
                  </button>
                </li>)}
                {!resultadosNombresFiltrados.length && <li className="px-5 py-8 text-center text-sm text-gris">No hay personas que coincidan con el filtro.</li>}
              </ul>
            </section>
          </div>}
          {(() => {
            const seleccionado = resultadosNombres.find((r) => r.documento === documentoNombreSeleccionado);
            return seleccionado ? (
              <div className="space-y-4 border-t border-borde pt-5">
                <div>
                  <h2 className="text-lg font-semibold text-texto">{seleccionado.nombreCompleto}</h2>
                  <p className="numeros mt-0.5 text-sm text-gris">Documento {seleccionado.documento}</p>
                </div>
                <Resumen s={seleccionado} />
                <SeccionesResultado s={seleccionado} />
              </div>
            ) : <Vacio icono={<UserRound className="size-5" />} titulo="Selecciona una persona">Elige una coincidencia para ver su información completa.</Vacio>;
          })()}
        </div> : <Vacio icono={<UserRound className="size-5" />} titulo="No encontramos coincidencias">
          Prueba con otra combinación de apellidos y nombres.
        </Vacio>
      )}

      {modo === 'telefono' && telefono && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl bg-azul-10/60 p-4 sm:flex-row sm:items-center sm:px-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-azul shadow-sm">
              <Phone className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-azul">Resultado de consulta</p>
              <h2 className="mt-0.5 break-words text-lg font-semibold leading-snug text-texto">
                {titularesTelefono.length === 1 ? titularesTelefono[0] : titularesTelefono.length > 1 ? `${titularesTelefono.length} personas asociadas` : 'Registros del teléfono'}
              </h2>
              <p className="numeros mt-1 text-sm text-gris">Teléfono <span className="font-semibold text-texto">{telefono.telefono}</span></p>
            </div>
            <div className="flex items-baseline gap-2 self-start rounded-lg bg-white/80 px-3 py-2 sm:ml-4 sm:self-center">
              <span className="numeros text-lg font-bold text-azul">{fNumero(telefono.documentosAsociados)}</span>
              <span className="text-xs font-medium text-gris">documentos asociados</span>
            </div>
          </div>
          {vistaBusqueda === 'global' && <Pestanas<CategoriaResultados>
            valor={categoriaResultados}
            alCambiar={setCategoriaResultados}
            deshabilitadas={consultaEnCurso}
            opciones={[
              { id: 'telefonos', texto: 'Móviles', icono: <Phone className="size-4" /> },
              { id: 'laboral', texto: 'Sueldos', icono: <Briefcase className="size-4" /> },
              { id: 'deudas', texto: 'Deudas', icono: <Banknote className="size-4" /> },
              { id: 'calificaciones', texto: 'Calificación', icono: <Gauge className="size-4" /> },
              { id: 'lineas', texto: 'Líneas de crédito', icono: <CreditCard className="size-4" /> },
              { id: 'fallecidos', texto: 'Fallecidos', icono: <HeartCrack className="size-4" /> },
            ]}
          />}
          {vistaBusqueda === 'global' && categoriaResultados !== 'telefonos' ? persona ? (
            categoriaResultados === 'fallecidos'
              ? consultado?.tipo === 'DNI'
                ? <Seccion titulo="Fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={persona.fallecidos?.length ?? 0}>
                    <Tabla columnas={columnasFallecidos} filas={persona.fallecidos ?? []} clave={(r) => r.dni} vacio="No registra fallecimiento." />
                  </Seccion>
                : <p className="text-sm text-gris">La consulta de fallecidos está disponible para DNI.</p>
              : <SeccionesResultado s={persona} categoria={categoriaResultados} />
          ) : <Vacio icono={<UserRound className="size-5" />} titulo="Elige un cliente del teléfono">
            Selecciona un cliente en «Filtrar y elegir cliente» para consultar sus datos en esta pestaña.
          </Vacio> : <>
          <div className="flex flex-wrap items-center gap-2">
            {vistaBusqueda !== 'global' && <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={() => setMostrarClientesTelefono(true)}><UserRound className="size-4" />Filtrar clientes</Boton>}
            {vistaBusqueda !== 'global' && clienteTelefonoSeleccionado && <span className="inline-flex items-center gap-2 rounded-lg border border-azul/20 bg-azul-10/50 px-3 py-2 text-sm text-texto"><Check className="size-4 shrink-0 text-azul" /><span><span className="font-semibold">{clienteTelefonoSeleccionado.nombre}</span><span className="ml-2 text-xs text-gris">{fTexto(clienteTelefonoSeleccionado.documento)}</span></span></span>}
            {documentoTelefonoSeleccionado && <Boton type="button" variante="fantasma" disabled={consultaEnCurso} onClick={() => {
              setDocumentoTelefonoSeleccionado(null);
              if (vistaBusqueda === 'global') {
                setPersona(null);
                setConsultado(null);
                setReniec(null);
                setMostrarResultadosPorTab(false);
                setCategoriaResultados('telefonos');
              }
            }}>Limpiar filtro</Boton>}
          </div>
          <Seccion titulo="Líneas encontradas" icono={<Phone className="size-[18px]" />} cantidad={registrosTelefonoVisibles.length}>
            <div className="divide-y divide-borde sm:hidden">
              {registrosTelefonoVisibles.map((registro, indice) => (
                <article key={`${registro.documento}-${indice}`} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-texto">{nombreCompleto(registro.prenombres, registro.apePat, registro.apeMat)}</h3>
                      <p className="numeros mt-1 text-xs text-gris">Documento {fTexto(registro.documento)}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-azul-10 px-2 py-1 text-xs font-semibold text-azul">{fPeriodo(registro.periodo)}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-gris">Operadora</dt><dd className="mt-1"><Operadora nombre={registro.empresaOperadora} /></dd></div>
                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-gris">Fecha de alta</dt><dd className="mt-0.5 text-xs font-medium text-texto">{fFecha(registro.fechaAlta)}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-gris">Plan</dt><dd className="mt-0.5 text-xs font-medium text-texto">{fTexto(registro.planMovil)}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-gris">Modalidad</dt><dd className="mt-0.5 text-xs font-medium text-texto">{fTexto(registro.modalidad)}</dd></div>
                  </dl>
                </article>
              ))}
              {!registrosTelefonoVisibles.length && <p className="px-5 py-8 text-center text-sm text-gris">No se encontraron registros para este número.</p>}
            </div>
            <div className="hidden sm:block">
              <Tabla columnas={colMoviles} filas={registrosTelefonoVisibles} clave={(m, i) => `${m.documento}-${i}`} vacio="No se encontraron registros para este número." />
            </div>
          </Seccion>
          {vistaBusqueda !== 'global' && mostrarClientesTelefono && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (!consultaEnCurso && e.target === e.currentTarget) setMostrarClientesTelefono(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="clientes-telefono-tab-titulo" className="flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-borde bg-white shadow-xl">
              <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
                <div><h3 id="clientes-telefono-tab-titulo" className="font-semibold text-texto">Elige el cliente del teléfono</h3><p className="mt-1 text-xs text-gris">Filtra por nombre o documento. Se encontraron {clientesTelefono.length} clientes/documentos asociados.</p></div>
                <button type="button" aria-label="Cerrar" disabled={consultaEnCurso} onClick={() => setMostrarClientesTelefono(false)} className="rounded-lg p-2 text-gris hover:bg-fondo hover:text-texto disabled:opacity-50"><X className="size-4" /></button>
              </header>
              <div className="border-b border-borde p-4">
                <div className="flex gap-2">
                  <label className="relative block min-w-0 flex-1"><span className="sr-only">Filtrar clientes</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input autoFocus disabled={consultaEnCurso} value={filtroClienteTelefono} onChange={(e) => setFiltroClienteTelefono(e.target.value)} className="input input--icono" placeholder="Buscar por nombre o documento" /></label>
                  <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={() => setFiltroClienteTelefono('')}>Limpiar</Boton>
                </div>
              </div>
              <ul className="min-h-0 divide-y divide-borde overflow-y-auto">
                {clientesTelefonoFiltrados.map((cliente) => <li key={cliente.clave}>
                  <button type="button" disabled={consultaEnCurso} aria-pressed={cliente.clave === documentoTelefonoSeleccionado} onClick={() => { setDocumentoTelefonoSeleccionado(cliente.documento?.trim() || cliente.clave); setMostrarClientesTelefono(false); }} className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-azul disabled:cursor-not-allowed disabled:opacity-60 ${cliente.clave === documentoTelefonoSeleccionado ? 'bg-azul-10 ring-1 ring-inset ring-azul/30' : 'hover:bg-azul-10/50'}`}>
                    <span className="flex min-w-0 items-center gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-texto">{cliente.nombre}</span><span className="mt-0.5 block text-xs text-gris">Documento {fTexto(cliente.documento)} · {fPeriodo(cliente.periodo)}</span></span>{cliente.clave === documentoTelefonoSeleccionado && <Check aria-label="Cliente seleccionado" className="size-4 shrink-0 text-azul" />}</span><span className="shrink-0 text-xs font-medium text-azul">Ver líneas</span>
                  </button>
                </li>)}
                {!clientesTelefonoFiltrados.length && <li className="px-5 py-8 text-center text-sm text-gris">No hay clientes que coincidan con el filtro.</li>}
              </ul>
            </section>
          </div>}
          </>}
        </div>
      )}

      {modo === 'fallecidos' && resultadoFallecido && (
        <div className="space-y-3">
          <Seccion titulo="Registros de fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={resultadoFallecido.fallecidos.length}>
            <Tabla columnas={columnasFallecidos} filas={resultadoFallecido.fallecidos} clave={(fila, i) => `${fila.dni}-${i}`} vacio="No se encontraron registros con esos filtros." />
          </Seccion>
          {resultadoFallecido.hayMasResultados && <Aviso tono="alerta">Se muestran hasta 200 coincidencias. Agrega más datos para precisar la búsqueda.</Aviso>}
        </div>
      )}

      {vistaBusqueda !== 'global' && !cargando && !error && modo === 'documento' && !persona && (
        <Vacio icono={<UserSearch className="size-5" />} titulo="Escribe un documento para empezar">
          Verás deudas, líneas de crédito, calificaciones, información laboral y teléfonos.
        </Vacio>
      )}
      {vistaBusqueda !== 'global' && !cargando && !error && modo === 'telefono' && !telefono && (
        <Vacio icono={<Phone className="size-5" />} titulo="Escribe un teléfono para empezar">
          Verás los registros asociados al número consultado.
        </Vacio>
      )}
      {vistaBusqueda !== 'global' && !cargando && !error && modo === 'nombres' && BUSQUEDA_NOMBRES_DISPONIBLE && !resultadosNombres && (
        <Vacio icono={<UserRound className="size-5" />} titulo="Escribe un nombre y apellido para empezar">
          Ingresa al menos el apellido paterno. Puedes añadir el apellido materno y los nombres para afinar la búsqueda.
        </Vacio>
      )}
      {vistaBusqueda !== 'global' && !cargando && !error && modo === 'fallecidos' && !resultadoFallecido && (
        <Vacio icono={<HeartCrack className="size-5" />} titulo="Busca registros de fallecidos">
          Ingresa un DNI o el apellido paterno junto con otro dato para consultar.
        </Vacio>
      )}
      {consultaEnCurso && <div className="absolute inset-0 z-[60] cursor-wait bg-white/20" aria-hidden="true" />}
    </div>
  );
}
