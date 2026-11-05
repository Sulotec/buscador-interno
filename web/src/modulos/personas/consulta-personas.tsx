'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Banknote, Briefcase, Check, CreditCard, FileDown, Gauge, HeartCrack, IdCard, Phone, Search, UserRound, UserSearch, X } from 'lucide-react';
import { useEstadoConsultas } from '@/modulos/consultas/estado';
import { FichaReniec } from '@/modulos/personas/ficha-reniec';
import { colMoviles, Operadora, Resumen, Seccion, SeccionPersonas, SeccionesResultado, type CategoriaSeccionResultado } from '@/modulos/consultas/resultados';
import { useSesion } from '@/modulos/sesion/proveedor';
import { Aviso, Boton, Cargando, Encabezado, Modal, Pestanas, Tabla, Vacio } from '@/components/ui';
import { ErrorApi, guardarArchivo } from '@/lib/api';
import { servicioPersonas } from '@/modulos/personas/servicio';
import { DOCUMENTOS, esTipoDocumento, type TipoDocumento } from '@/modulos/personas/documentos';
import { BusquedaGlobalPersonas, detectarTipoDocumento } from '@/modulos/personas/busqueda-global';
import { BUSQUEDA_NOMBRES_DISPONIBLE, ConsultaIndividual } from '@/modulos/personas/consulta-individual';
import { fFecha, fNumero, fPeriodo, fTexto, nombreCompleto } from '@/lib/formato';
import type { RegistroFallecido, ResultadoFallecidos, ResultadoNombre, ResultadoTelefono } from '@/modulos/personas/tipos';

type CategoriaResultados = CategoriaSeccionResultado | 'fallecidos';
// La búsqueda por apellidos y nombres usa el formulario y los resultados ya implementados.

const columnasFallecidos = [
  { titulo: 'DNI', celda: (r: RegistroFallecido) => <span className="numeros font-semibold">{fTexto(r.dni)}</span> },
  { titulo: 'Ape. paterno', celda: (r: RegistroFallecido) => fTexto(r.apePat) },
  { titulo: 'Ape. materno', celda: (r: RegistroFallecido) => fTexto(r.apeMat) },
  { titulo: 'Prenombres', celda: (r: RegistroFallecido) => fTexto(r.prenombres) },
  { titulo: 'Restricción', celda: (r: RegistroFallecido) => fTexto(r.deRestriccion) },
  { titulo: 'Nacimiento', celda: (r: RegistroFallecido) => fFecha(r.fechaNacimiento) },
  { titulo: 'Fallecimiento', celda: (r: RegistroFallecido) => <span className="font-semibold text-peligro">{fFecha(r.fechaFallecimiento)}</span> },
];

export function ConsultaPersonas({ tipoConsulta }: { tipoConsulta: 'global' | 'segmento' }) {
  const { actualizarSaldo } = useSesion();
  const {
    modoPersona: modoGlobal, setModoPersona: setModoGlobal, tipoDocumento: tipoGlobal, setTipoDocumento: setTipoGlobal,
    entradaDocumento: entradaDocumentoGlobal, setEntradaDocumento: setEntradaDocumentoGlobal,
    entradaTelefono: entradaTelefonoGlobal, setEntradaTelefono: setEntradaTelefonoGlobal,
    persona: personaGlobal, setPersona: setPersonaGlobal, consultado: consultadoGlobal, setConsultado: setConsultadoGlobal,
    reniec: reniecGlobal, setReniec: setReniecGlobal, telefono: telefonoGlobal, setTelefono: setTelefonoGlobal,
    busquedaPersona, setBusquedaPersona,
  } = useEstadoConsultas();
  const esSegmento = tipoConsulta === 'segmento';
  const estadoSegmento = busquedaPersona.segmento;
  const actualizarSegmento = (cambios: Partial<typeof estadoSegmento>) => setBusquedaPersona((state) => ({ ...state, segmento: { ...state.segmento, ...cambios } }));
  const modo = esSegmento ? estadoSegmento.modo : modoGlobal;
  const setModo = (value: typeof modo) => esSegmento ? actualizarSegmento({ modo: value }) : setModoGlobal(value);
  const tipo = esSegmento ? estadoSegmento.tipoDocumento : tipoGlobal;
  const setTipo = (value: TipoDocumento) => esSegmento ? actualizarSegmento({ tipoDocumento: value }) : setTipoGlobal(value);
  const entradaDocumento = esSegmento ? estadoSegmento.entradaDocumento : entradaDocumentoGlobal;
  const setEntradaDocumento = (value: string) => esSegmento ? actualizarSegmento({ entradaDocumento: value }) : setEntradaDocumentoGlobal(value);
  const entradaTelefono = esSegmento ? estadoSegmento.entradaTelefono : entradaTelefonoGlobal;
  const setEntradaTelefono = (value: string) => esSegmento ? actualizarSegmento({ entradaTelefono: value }) : setEntradaTelefonoGlobal(value);
  const persona = esSegmento ? estadoSegmento.persona : personaGlobal;
  const setPersona = (value: typeof persona) => esSegmento ? actualizarSegmento({ persona: value }) : setPersonaGlobal(value);
  const consultado = esSegmento ? estadoSegmento.consultado : consultadoGlobal;
  const setConsultado = (value: typeof consultado) => esSegmento ? actualizarSegmento({ consultado: value }) : setConsultadoGlobal(value);
  const reniec = esSegmento ? estadoSegmento.reniec : reniecGlobal;
  const setReniec = (value: typeof reniec) => esSegmento ? actualizarSegmento({ reniec: value }) : setReniecGlobal(value);
  const telefono = esSegmento ? estadoSegmento.telefono : telefonoGlobal;
  const setTelefono = (value: typeof telefono) => esSegmento ? actualizarSegmento({ telefono: value }) : setTelefonoGlobal(value);
  const cargando = esSegmento ? estadoSegmento.cargando : busquedaPersona.cargandoLocal;
  const setCargando = (value: boolean) => esSegmento ? actualizarSegmento({ cargando: value }) : setBusquedaPersona((state) => ({ ...state, cargandoLocal: value }));
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
  const [cargandoClienteTelefono, setCargandoClienteTelefono] = useState(false);
  const [filtroClienteTelefono, setFiltroClienteTelefono] = useState('');
  const documentoTelefonoSeleccionado = esSegmento ? estadoSegmento.documentoTelefonoSeleccionado : busquedaPersona.documentoTelefonoSeleccionado;
  const setDocumentoTelefonoSeleccionado = (value: string | null) => esSegmento ? actualizarSegmento({ documentoTelefonoSeleccionado: value }) : setBusquedaPersona((state) => ({ ...state, documentoTelefonoSeleccionado: value }));
  const mostrarResultadosPorTab = esSegmento ? estadoSegmento.mostrarResultadosPorTab : busquedaPersona.mostrarResultadosPorTab;
  const setMostrarResultadosPorTab = (value: boolean) => esSegmento ? actualizarSegmento({ mostrarResultadosPorTab: value }) : setBusquedaPersona((state) => ({ ...state, mostrarResultadosPorTab: value }));
  const categoriaResultados = (esSegmento ? estadoSegmento.categoriaResultados : busquedaPersona.categoriaResultados) as CategoriaResultados;
  const setCategoriaResultados = (value: CategoriaResultados) => esSegmento ? actualizarSegmento({ categoriaResultados: value }) : setBusquedaPersona((state) => ({ ...state, categoriaResultados: value }));
  const vistaBusqueda = esSegmento ? estadoSegmento.vista : busquedaPersona.vista;
  const resultadosDeEstaVista = vistaBusqueda === (tipoConsulta === 'global' ? 'global' : 'local');
  const setVistaBusqueda = (value: 'global' | 'local' | null) => esSegmento
    ? actualizarSegmento({ vista: value === 'local' ? 'local' : null })
    : setBusquedaPersona((state) => ({ ...state, vista: value }));
  const busquedaGlobalCargando = busquedaPersona.global.cargando;
  const setBusquedaGlobalCargando = (value: boolean) => setBusquedaPersona((state) => ({
    ...state,
    ...(value ? { vista: 'global' as const } : {}),
    global: { ...state.global, cargando: value },
  }));

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

  function limpiarBusquedaGlobal() {
    setModo('documento');
    setTipo('DNI');
    setEntradaDocumento('');
    setEntradaTelefono('');
    setPersona(null);
    setConsultado(null);
    setReniec(null);
    setTelefono(null);
    setDocumentoTelefonoSeleccionado(null);
    setMostrarResultadosPorTab(false);
    setCategoriaResultados('telefonos');
    setError('');
    setBusquedaPersona((state) => ({
      ...state,
      global: { tipo: 'DNI', documentos: { DNI: '', CE: '', RUC: '', PASAPORTE: '' }, dniFallecido: '', telefono: '', apellidoPaterno: '', apellidoMaterno: '', nombres: '', resultado: null, resultadosPorTipo: {}, personaNombreSeleccionada: '', personasNombreSeleccionadas: {}, fichasPorTipo: {}, telefonoSeleccionado: null, cargando: false, cargandoFicha: false },
    }));
    setVistaBusqueda(null);
  }

  const bloquearNombresFallecido = Boolean(dniFallecido.trim());
  const bloquearDniFallecido = Boolean(apePatFallecido.trim() || apeMatFallecido.trim() || prenombresFallecido.trim());
  const accionEnCurso = cargandoPdf || cargandoReniec || cargandoClienteTelefono;
  const bloqueandoCambioModo = cargando || cargandoReniec;
  const consultaEnCurso = busquedaGlobalCargando || cargando || accionEnCurso;

  // El menú lateral lee este estado para bloquearse mientras se descarga el PDF o se consulta RENIEC
  useEffect(() => {
    setBusquedaPersona((s) => (s.accionEnCurso === accionEnCurso ? s : { ...s, accionEnCurso }));
  }, [accionEnCurso, setBusquedaPersona]);
  useEffect(() => () => setBusquedaPersona((s) => (s.accionEnCurso ? { ...s, accionEnCurso: false } : s)), [setBusquedaPersona]);

  const botonFallecidosDeshabilitado = cargando || (
    bloquearNombresFallecido
      ? dniFallecido.trim().length !== 8
      : bloquearDniFallecido
        ? apePatFallecido.trim().length < 2 || (!apeMatFallecido.trim() && !prenombresFallecido.trim())
        : true
  );

  const buscarDocumento = useCallback(async (t: TipoDocumento, numero: string) => {
    setVistaBusqueda(tipoConsulta === 'global' ? 'global' : 'local');
    setModo('documento');
    setMostrarResultadosPorTab(tipoConsulta === 'global');
    setCategoriaResultados('personas');
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
  }, [actualizarSaldo, setModo, setTipo, setPersona, setReniec, setConsultado, setEntradaDocumento, setVistaBusqueda, setMostrarResultadosPorTab, setCategoriaResultados, tipoConsulta]);

  const buscarTelefono = useCallback(async (numero: string) => {
    const num = numero.replace(/\D/g, '').slice(0, 9);
    setVistaBusqueda(tipoConsulta === 'global' ? 'global' : 'local');
    setModo('telefono');
    setError('');
    setTelefono(null);
    setEntradaTelefono(num);
    if (num.length !== 9) {
      setError('El teléfono debe tener 9 dígitos.');
      return;
    }
    setCargando(true);
    // Documento del único cliente del teléfono (si hay uno solo), para cargar sus datos en segmento
    let documentoUnico: string | null = null;
    try {
      const resultado = await servicioPersonas.porTelefono(num);
      setTelefono(resultado);
      const clientesUnicos = [...new Map(resultado.registros.map((registro) => {
        const nombre = nombreCompleto(registro.prenombres, registro.apePat, registro.apeMat);
        const clave = registro.documento?.trim() || nombre;
        return [clave, { clave, documento: registro.documento }] as const;
      })).values()];
      setDocumentoTelefonoSeleccionado(clientesUnicos.length === 1 ? clientesUnicos[0].documento?.trim() || clientesUnicos[0].clave : null);
      documentoUnico = clientesUnicos.length === 1 ? clientesUnicos[0].documento?.trim() || null : null;
      setFiltroClienteTelefono('');
      setMostrarClientesTelefono(false);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo realizar la consulta.');
    } finally {
      setCargando(false);
      actualizarSaldo();
    }
    return documentoUnico;
  }, [actualizarSaldo, setModo, setTelefono, setEntradaTelefono, setVistaBusqueda, tipoConsulta]);

  // Segmento: al elegir un cliente del teléfono se consultan sus datos (cuesta 1 token, como en la búsqueda global)
  async function cargarClienteTelefono(documento: string) {
    const valor = documento.trim();
    setPersona(null);
    setConsultado(null);
    setReniec(null);
    const tipoDocumento = detectarTipoDocumento(valor);
    if (!tipoDocumento) {
      setError('No se pudo identificar el tipo de documento del cliente seleccionado.');
      return;
    }
    setError('');
    setCargandoClienteTelefono(true);
    try {
      const respuesta = await servicioPersonas.porDocumento(tipoDocumento, valor);
      setPersona(respuesta);
      setConsultado({ tipo: tipoDocumento, numero: respuesta.documento });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la información del cliente.');
    } finally {
      setCargandoClienteTelefono(false);
      actualizarSaldo();
    }
  }

  async function buscarPorNombres() {
    setVistaBusqueda('local');
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
    if (materno.length < 2) {
      setError('El apellido materno debe tener al menos 2 letras.');
      return;
    }
    const apellidoValido = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
    if (!apellidoValido.test(paterno)) {
      setError('El apellido paterno debe contener solo texto; puedes ingresar apellidos compuestos, como «De la Cruz».');
      return;
    }
    if (materno) {
      if (!apellidoValido.test(materno)) {
        setError('El apellido materno debe contener solo texto; puedes ingresar apellidos compuestos, como «De la Cruz».');
        return;
      }
    }
    if (nom && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nom)) {
      setError('Los nombres solo deben contener texto, sin números.');
      return;
    }

    setCargando(true);
    try {
      const resultados = await servicioPersonas.porNombres(paterno, materno, nom);
      setResultadosNombres(resultados);
      if (resultados.length === 1) setDocumentoNombreSeleccionado(resultados[0].documento);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo buscar por apellidos y nombres.');
    } finally {
      setCargando(false);
      actualizarSaldo();
    }
  }

  async function buscarFallecido(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVistaBusqueda('local');
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
      const apellidoValido = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
      if (!apellidoValido.test(paterno)) {
        setError('El apellido paterno debe contener solo texto; puedes ingresar apellidos compuestos, como «De la Cruz».');
        return;
      }
      if (materno) {
        if (!apellidoValido.test(materno)) {
          setError('El apellido materno debe contener solo texto; puedes ingresar apellidos compuestos, como «De la Cruz».');
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
      const respuesta = await servicioPersonas.reniec(persona.documento);
      setReniec(respuesta);

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
  const nombrePersona = persona?.nombreCompleto
    || (nombreDesdeCalificacion && nombreDesdeCalificacion !== '—'
      ? nombreDesdeCalificacion
      : '')
    || persona?.deudas.find((d) => d.razonSocial?.trim())?.razonSocial?.trim()
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
  const registrosTelefonoVisibles = telefono?.registros.filter((registro) =>
    !documentoTelefonoSeleccionado || (registro.documento?.trim() || nombreCompleto(registro.prenombres, registro.apePat, registro.apeMat)) === documentoTelefonoSeleccionado,
  ) ?? [];
  const resultadosNombresFiltrados = resultadosNombres?.filter((resultado) =>
    `${resultado.nombreCompleto} ${resultado.documento}`.toLocaleLowerCase().includes(filtroPersonaNombres.trim().toLocaleLowerCase()),
  ) ?? [];
  return (
    <div className="relative space-y-6" aria-busy={busquedaGlobalCargando || cargando}>
      <Encabezado titulo={tipoConsulta === 'global' ? 'Búsqueda global' : 'Búsqueda por segmento'} bajada="Cada consulta descuenta tokens y queda registrada en la auditoría."
        accion={<div className="flex flex-wrap items-center gap-2">
          {/* Botón temporalmente oculto; conservar para volver a habilitar la guía.
          <Boton type="button" variante="secundario" onClick={() => setMostrarGuia(true)} aria-haspopup="dialog">
            <BookOpen aria-hidden className="size-4" />Cómo usar la consulta
          </Boton>
          */}
          <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={() => {
            if (tipoConsulta === 'global') limpiarBusquedaGlobal();
            else { limpiarBusquedaLocal(); setVistaBusqueda(null); }
          }}>Limpiar</Boton>
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
      {/* Mientras se descarga el PDF o se consulta RENIEC, el fieldset deshabilita los formularios de búsqueda */}
      <fieldset disabled={accionEnCurso} aria-busy={accionEnCurso || undefined} className={`min-w-0 space-y-6 ${accionEnCurso ? 'pointer-events-none select-none' : ''}`}>
      {tipoConsulta === 'global' && <BusquedaGlobalPersonas
        activa
        documentoTelefonoSeleccionado={documentoTelefonoSeleccionado}
        alCambiarCarga={setBusquedaGlobalCargando}
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
          setCategoriaResultados('personas');
          setTipo(tipo);
          setPersona(resultado);
          setConsultado({ tipo, numero: resultado.documento });
          setEntradaDocumento(resultado.documento);
          setReniec(null);
          setError('');
          setVistaBusqueda('global');
        }} />}
      {tipoConsulta === 'global' && busquedaPersona.global.cargandoFicha && !persona && (
        <div className="rounded-xl border border-borde bg-white"><Cargando texto="Cargando tablas de la persona seleccionada..." /></div>
      )}
      <ConsultaIndividual
        activa={tipoConsulta === 'segmento'}
        modo={modo} setModo={setModo} tipo={tipo} setTipo={setTipo}
        entradaDocumento={entradaDocumento} setEntradaDocumento={setEntradaDocumento}
        entradaTelefono={entradaTelefono} setEntradaTelefono={setEntradaTelefono}
        cargando={cargando} bloqueandoCambioModo={bloqueandoCambioModo}
        setError={setError}
        buscarDocumento={buscarDocumento}
        buscarTelefono={async (numero) => {
          // Si el teléfono tiene un solo cliente, se cargan sus datos directamente
          const documentoUnico = await buscarTelefono(numero);
          if (documentoUnico) await cargarClienteTelefono(documentoUnico);
        }}
        apePat={apePat} setApePat={setApePat} apeMat={apeMat} setApeMat={setApeMat}
        nombres={nombres} setNombres={setNombres} buscarPorNombres={buscarPorNombres}
        dniFallecido={dniFallecido} setDniFallecido={setDniFallecido}
        apePatFallecido={apePatFallecido} setApePatFallecido={setApePatFallecido}
        apeMatFallecido={apeMatFallecido} setApeMatFallecido={setApeMatFallecido}
        prenombresFallecido={prenombresFallecido} setPrenombresFallecido={setPrenombresFallecido}
        bloquearNombresFallecido={bloquearNombresFallecido} bloquearDniFallecido={bloquearDniFallecido}
        botonFallecidosDeshabilitado={botonFallecidosDeshabilitado} buscarFallecido={buscarFallecido}
      />
      </fieldset>
      {error && <Aviso tono="error" alCerrar={() => setError('')}>{error}</Aviso>}
      {tipoConsulta === 'segmento' && cargando && (
        <div className="rounded-xl border border-borde bg-white"><Cargando texto={modo === 'documento' ? 'Consultando datos de la persona...' : modo === 'telefono' ? 'Consultando líneas asociadas...' : modo === 'nombres' ? 'Buscando coincidencias...' : 'Consultando registros de fallecidos...'} /></div>
      )}

      {resultadosDeEstaVista && modo === 'documento' && persona && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-texto">{nombrePersona || `${DOCUMENTOS[consultado?.tipo ?? 'DNI'].etiqueta} ${persona.documento}`}</h2>
              {nombrePersona && <p className="numeros mt-0.5 text-sm text-gris">{DOCUMENTOS[consultado?.tipo ?? 'DNI'].etiqueta} {persona.documento}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Boton variante="primario" className="shadow-md hover:-translate-y-0.5 hover:shadow-lg" onClick={exportarPdf} cargando={cargandoPdf} disabled={consultaEnCurso}><FileDown className="size-4" />Descargar PDF</Boton>
              {consultado?.tipo === 'DNI' && !reniec && <Boton variante="secundario" className="!border-2 !border-azul !bg-white shadow-sm hover:-translate-y-0.5 hover:!bg-azul-10 hover:shadow-md" onClick={consultarReniec} cargando={cargandoReniec} disabled={consultaEnCurso}><IdCard className="size-4 text-rojo" />Ver datos RENIEC</Boton>}
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
                { id: 'personas', texto: 'Personas', icono: <UserRound className="size-4" /> },
                { id: 'telefonos', texto: 'Teléfonos', icono: <Phone className="size-4" /> },
                { id: 'laboral', texto: 'Sueldos', icono: <Briefcase className="size-4" /> },
                { id: 'deudas', texto: 'Deudas', icono: <Banknote className="size-4" /> },
                { id: 'calificaciones', texto: 'Calificación', icono: <Gauge className="size-4" /> },
                { id: 'lineas', texto: 'Líneas de crédito', icono: <CreditCard className="size-4" /> },
                { id: 'fallecidos', texto: 'Fallecidos', icono: <HeartCrack className="size-4" /> },
              ]}
            />
            {tipoConsulta === 'global' && busquedaGlobalCargando
              ? <div className="rounded-xl border border-borde bg-white"><Cargando texto="Cargando datos de la persona seleccionada..." /></div>
              : categoriaResultados === 'fallecidos'
                ? consultado?.tipo === 'DNI'
                  ? <Seccion titulo="Fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={persona.fallecidos?.length ?? 0}>
                    <Tabla columnas={columnasFallecidos} filas={persona.fallecidos ?? []} clave={(r) => r.dni} vacio="No registra fallecimiento." />
                  </Seccion>
                  : <p className="text-sm text-gris">La consulta de fallecidos está disponible para DNI.</p>
                : categoriaResultados === 'personas'
                  ? <SeccionPersonas filas={persona.personas} />
                : categoriaResultados === 'telefonos'
                  ? <SeccionesResultado s={persona} categoria="telefonos" />
                : <SeccionesResultado s={persona} categoria={categoriaResultados} ocultarTelefonos />}
          </> : <>
            <SeccionesResultado s={persona} ocultarTelefonos />
            {consultado?.tipo === 'DNI' && <Seccion titulo="Fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={persona.fallecidos?.length ?? 0}>
              <Tabla columnas={columnasFallecidos} filas={persona.fallecidos ?? []} clave={(r) => r.dni} vacio="No registra fallecimiento." />
            </Seccion>}
            {tipoConsulta === 'segmento' && <>
              <SeccionPersonas filas={persona.personas} />
              <SeccionesResultado s={persona} categoria="telefonos" />
            </>}
          </>}
        </div>
      )}

      {tipoConsulta === 'segmento' && resultadosDeEstaVista && modo === 'nombres' && resultadosNombres && (
        resultadosNombres.length ? <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-gris">{fNumero(resultadosNombres.length)} coincidencias encontradas</p>
            {resultadosNombres.length > 1 && <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={() => { setFiltroPersonaNombres(''); setMostrarPersonasNombres(true); }}>
              <UserRound className="size-4" />{documentoNombreSeleccionado ? 'Cambiar persona' : 'Filtrar y elegir persona'}
            </Boton>}
          </div>
          {mostrarPersonasNombres && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (!consultaEnCurso && e.target === e.currentTarget) setMostrarPersonasNombres(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="personas-nombres-local-titulo" className="flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-borde bg-white shadow-xl">
              <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
                <div><h3 id="personas-nombres-local-titulo" className="font-semibold text-texto">Elegir persona</h3><p className="mt-1 text-xs text-gris">El apellido paterno «{apePat}» ya está aplicado. Filtra por apellido materno, nombres o documento; al elegir, verás sus datos filtrados por documento. {fNumero(resultadosNombres.length)} coincidencias.</p></div>
                <button type="button" aria-label="Cerrar" disabled={consultaEnCurso} onClick={() => setMostrarPersonasNombres(false)} className="rounded-lg p-2 text-gris hover:bg-fondo hover:text-texto disabled:opacity-50"><X className="size-4" /></button>
              </header>
              <div className="border-b border-borde p-4">
                <div className="flex gap-2">
                  <label className="relative block min-w-0 flex-1"><span className="sr-only">Filtrar por apellido materno, nombres o documento</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input autoFocus disabled={consultaEnCurso} value={filtroPersonaNombres} onChange={(e) => setFiltroPersonaNombres(e.target.value)} className="input input--icono disabled:cursor-not-allowed disabled:bg-fondo" placeholder="Apellido materno, nombres o documento" /></label>
                  <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={() => setFiltroPersonaNombres('')}>Limpiar</Boton>
                </div>
              </div>
              <ul className="min-h-0 divide-y divide-borde overflow-y-auto">
                {resultadosNombresFiltrados.map((resultado) => <li key={resultado.documento}>
                  <button type="button" disabled={consultaEnCurso} aria-pressed={resultado.documento === documentoNombreSeleccionado} onClick={() => { setDocumentoNombreSeleccionado(resultado.documento); setMostrarPersonasNombres(false); }} className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-azul disabled:opacity-50 ${resultado.documento === documentoNombreSeleccionado ? 'bg-azul-10 ring-1 ring-inset ring-azul/30' : 'hover:bg-azul-10/50'}`}>
                    <span className="flex min-w-0 items-center gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-texto">{resultado.nombreCompleto}</span><span className="mt-0.5 block text-xs text-gris">Documento {fTexto(resultado.documento)}</span></span>{resultado.documento === documentoNombreSeleccionado && <Check aria-label="Persona seleccionada" className="size-4 shrink-0 text-azul" />}</span>
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
                <SeccionesResultado s={seleccionado} ocultarTelefonos />
                <SeccionPersonas filas={seleccionado.personas} />
                <SeccionesResultado s={seleccionado} categoria="telefonos" />
              </div>
            ) : <Vacio icono={<UserRound className="size-5" />} titulo="Selecciona una persona">Elige una coincidencia para ver su información completa. Los datos se filtrarán por su documento.</Vacio>;
          })()}
        </div> : <Vacio icono={<UserRound className="size-5" />} titulo="No encontramos coincidencias">
          Prueba con otra combinación de apellidos y nombres.
        </Vacio>
      )}

      {resultadosDeEstaVista && modo === 'telefono' && telefono && (
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
          {tipoConsulta === 'global' && <Pestanas<CategoriaResultados>
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
              { id: 'personas', texto: 'Personas', icono: <UserRound className="size-4" /> },
            ]}
          />}
          {tipoConsulta === 'global' && categoriaResultados !== 'telefonos' ? busquedaGlobalCargando ? (
            <div className="rounded-xl border border-borde bg-white"><Cargando texto="Cargando datos del cliente..." /></div>
          ) : persona ? (
            categoriaResultados === 'fallecidos'
              ? consultado?.tipo === 'DNI'
                ? <Seccion titulo="Fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={persona.fallecidos?.length ?? 0}>
                  <Tabla columnas={columnasFallecidos} filas={persona.fallecidos ?? []} clave={(r) => r.dni} vacio="No registra fallecimiento." />
                </Seccion>
                : <p className="text-sm text-gris">La consulta de fallecidos está disponible para DNI.</p>
              : categoriaResultados === 'personas'
                ? <SeccionPersonas filas={persona.personas} />
              : <SeccionesResultado s={persona} categoria={categoriaResultados} ocultarTelefonos />
          ) : <Vacio icono={<UserRound className="size-5" />} titulo="Elige un cliente del teléfono">
            Selecciona un cliente en «Filtrar y elegir cliente» para consultar sus datos en esta pestaña.
          </Vacio> : <>
              <div className="flex flex-wrap items-center gap-2">
                {tipoConsulta === 'segmento' && clientesTelefono.length > 1 && <Boton type="button" variante="secundario" disabled={consultaEnCurso} onClick={() => { setFiltroClienteTelefono(''); setMostrarClientesTelefono(true); }}><UserRound className="size-4" />{documentoTelefonoSeleccionado ? 'Cambiar cliente' : 'Filtrar clientes'}</Boton>}
                {clientesTelefono.length > 1 && documentoTelefonoSeleccionado && <Boton type="button" variante="fantasma" disabled={consultaEnCurso} onClick={() => {
                setDocumentoTelefonoSeleccionado(null);
                setPersona(null);
                setConsultado(null);
                setReniec(null);
                if (tipoConsulta === 'global') {
                  setMostrarResultadosPorTab(false);
                  setCategoriaResultados('telefonos');
                }
              }}>Limpiar filtro</Boton>}
              </div>
              {tipoConsulta === 'segmento' && mostrarClientesTelefono && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (!consultaEnCurso && e.target === e.currentTarget) setMostrarClientesTelefono(false); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="clientes-telefono-tab-titulo" className="flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-borde bg-white shadow-xl">
                  <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
                    <div><h3 id="clientes-telefono-tab-titulo" className="font-semibold text-texto">Elige el cliente del teléfono</h3><p className="mt-1 text-xs text-gris">Filtra por nombre o documento. Al elegir un cliente, se cerrará esta ventana y verás sus líneas filtradas por documento. Se encontraron {clientesTelefono.length} clientes/documentos asociados.</p></div>
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
                      <button type="button" disabled={consultaEnCurso} aria-pressed={cliente.clave === documentoTelefonoSeleccionado} onClick={() => {
                        setDocumentoTelefonoSeleccionado(cliente.documento?.trim() || cliente.clave);
                        setMostrarClientesTelefono(false);
                        if (cliente.documento?.trim()) void cargarClienteTelefono(cliente.documento);
                        else { setPersona(null); setConsultado(null); setReniec(null); }
                      }} className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-azul disabled:cursor-not-allowed disabled:opacity-60 ${cliente.clave === documentoTelefonoSeleccionado ? 'bg-azul-10 ring-1 ring-inset ring-azul/30' : 'hover:bg-azul-10/50'}`}>
                        <span className="flex min-w-0 items-center gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-texto">{cliente.nombre}</span><span className="mt-0.5 block text-xs text-gris">Documento {fTexto(cliente.documento)} · {fPeriodo(cliente.periodo)}</span></span>{cliente.clave === documentoTelefonoSeleccionado && <Check aria-label="Cliente seleccionado" className="size-4 shrink-0 text-azul" />}</span>
                      </button>
                    </li>)}
                    {!clientesTelefonoFiltrados.length && <li className="px-5 py-8 text-center text-sm text-gris">No hay clientes que coincidan con el filtro.</li>}
                  </ul>
                </section>
              </div>}
              <Seccion titulo="Líneas encontradas" icono={<Phone className="size-[18px]" />} cantidad={registrosTelefonoVisibles.length}>
                {busquedaGlobalCargando ? <Cargando texto="Cargando datos del cliente..." /> : <>
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
              </>}
              </Seccion>
              {/* Segmento: datos del cliente elegido del teléfono */}
              {tipoConsulta === 'segmento' && documentoTelefonoSeleccionado && (cargandoClienteTelefono
                ? <div className="rounded-xl border border-borde bg-white"><Cargando texto="Cargando datos del cliente..." /></div>
                : persona && <div className="space-y-4 border-t border-borde pt-5">
                  <div>
                    <h2 className="text-lg font-semibold text-texto">{nombrePersona || `${DOCUMENTOS[consultado?.tipo ?? 'DNI'].etiqueta} ${persona.documento}`}</h2>
                    <p className="numeros mt-0.5 text-sm text-gris">{DOCUMENTOS[consultado?.tipo ?? 'DNI'].etiqueta} {persona.documento}</p>
                  </div>
                  <Resumen s={persona} />
                  <SeccionesResultado s={persona} ocultarTelefonos />
                  {consultado?.tipo === 'DNI' && <Seccion titulo="Fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={persona.fallecidos?.length ?? 0}>
                    <Tabla columnas={columnasFallecidos} filas={persona.fallecidos ?? []} clave={(r) => r.dni} vacio="No registra fallecimiento." />
                  </Seccion>}
                  <SeccionPersonas filas={persona.personas} />
                  <SeccionesResultado s={persona} categoria="telefonos" />
                </div>)}
          </>}
        </div>
      )}

      {tipoConsulta === 'segmento' && resultadosDeEstaVista && modo === 'fallecidos' && resultadoFallecido && (
        <div className="space-y-3">
          <Seccion titulo="Registros de fallecidos" icono={<HeartCrack className="size-[18px]" />} cantidad={resultadoFallecido.fallecidos.length}>
            <Tabla columnas={columnasFallecidos} filas={resultadoFallecido.fallecidos} clave={(fila, i) => `${fila.dni}-${i}`} vacio="No se encontraron registros con esos filtros." />
          </Seccion>
          {resultadoFallecido.hayMasResultados && <Aviso tono="alerta">Se muestran hasta 200 coincidencias. Agrega más datos para precisar la búsqueda.</Aviso>}
        </div>
      )}

      {tipoConsulta === 'segmento' && !cargando && !error && modo === 'documento' && (!resultadosDeEstaVista || !persona) && (
        <Vacio icono={<UserSearch className="size-5" />} titulo="Escribe un documento para empezar">
          Verás deudas, líneas de crédito, calificaciones, información laboral y teléfonos.
        </Vacio>
      )}
      {tipoConsulta === 'segmento' && !cargando && !error && modo === 'telefono' && (!resultadosDeEstaVista || !telefono) && (
        <Vacio icono={<Phone className="size-5" />} titulo="Escribe un teléfono para empezar">
          Verás los registros asociados al número consultado.
        </Vacio>
      )}
      {tipoConsulta === 'segmento' && !cargando && !error && modo === 'nombres' && BUSQUEDA_NOMBRES_DISPONIBLE && (!resultadosDeEstaVista || !resultadosNombres) && (
        <Vacio icono={<UserRound className="size-5" />} titulo="Escribe un nombre y apellido para empezar">
          Ingresa el apellido paterno y materno. Los nombres son opcionales y ayudan a afinar la búsqueda.
        </Vacio>
      )}
      {tipoConsulta === 'segmento' && !cargando && !error && modo === 'fallecidos' && (!resultadosDeEstaVista || !resultadoFallecido) && (
        <Vacio icono={<HeartCrack className="size-5" />} titulo="Busca registros de fallecidos">
          Ingresa un DNI o el apellido paterno junto con otro dato para consultar.
        </Vacio>
      )}
    </div>
  );
}
