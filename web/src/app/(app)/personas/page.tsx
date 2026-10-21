'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, HeartCrack, IdCard, Phone, UserRound, UserSearch } from 'lucide-react';
import { BarraBusqueda } from '@/modulos/consultas/barra-busqueda';
import { useEstadoConsultas } from '@/modulos/consultas/estado';
import { FichaReniec } from '@/modulos/personas/ficha-reniec';
import { Operadora, Resumen, Seccion, SeccionesResultado, colMoviles } from '@/modulos/consultas/resultados';
import { useSesion } from '@/modulos/sesion/proveedor';
import { Aviso, Boton, Cargando, Encabezado, Pestanas, Tabla, Tarjeta, Vacio } from '@/components/ui';
import { ErrorApi } from '@/lib/api';
import { servicioPersonas } from '@/modulos/personas/servicio';
import { DOCUMENTOS, esTipoDocumento, validarDocumento, type TipoDocumento } from '@/modulos/personas/documentos';
import { SelectorDocumento } from '@/modulos/personas/selector-documento';
import { fFecha, fNumero, fPeriodo, fTexto, nombreCompleto } from '@/lib/formato';
import type { RegistroFallecido, ResultadoFallecidos, ResultadoNombre } from '@/modulos/personas/tipos';

type Modo = 'documento' | 'telefono' | 'nombres' | 'fallecidos';

const columnasFallecidos = [
  { titulo: 'DNI', celda: (r: RegistroFallecido) => <span className="numeros font-semibold">{fTexto(r.dni)}</span> },
  { titulo: 'Ape. paterno', celda: (r: RegistroFallecido) => fTexto(r.apePat) },
  { titulo: 'Ape. materno', celda: (r: RegistroFallecido) => fTexto(r.apeMat) },
  { titulo: 'Prenombres', celda: (r: RegistroFallecido) => fTexto(r.prenombres) },
  { titulo: 'Restricción', celda: (r: RegistroFallecido) => fTexto(r.deRestriccion) },
  { titulo: 'Nacimiento', celda: (r: RegistroFallecido) => fFecha(r.fechaNacimiento) },
  { titulo: 'Fallecimiento', celda: (r: RegistroFallecido) => <span className="font-semibold text-peligro">{fFecha(r.fechaFallecimiento)}</span> },
];

export default function Personas() {
  const { actualizarSaldo } = useSesion();
  const {
    modoPersona: modo, setModoPersona: setModo, tipoDocumento: tipo, setTipoDocumento: setTipo,
    entradaDocumento, setEntradaDocumento, entradaTelefono, setEntradaTelefono,
    persona, setPersona, consultado, setConsultado, reniec, setReniec, telefono, setTelefono,
  } = useEstadoConsultas();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [cargandoReniec, setCargandoReniec] = useState(false);
  const [apePat, setApePat] = useState('');
  const [apeMat, setApeMat] = useState('');
  const [nombres, setNombres] = useState('');
  const [resultadosNombres, setResultadosNombres] = useState<ResultadoNombre[] | null>(null);
  const [documentoNombreSeleccionado, setDocumentoNombreSeleccionado] = useState('');
  const [dniFallecido, setDniFallecido] = useState('');
  const [apePatFallecido, setApePatFallecido] = useState('');
  const [apeMatFallecido, setApeMatFallecido] = useState('');
  const [prenombresFallecido, setPrenombresFallecido] = useState('');
  const [resultadoFallecido, setResultadoFallecido] = useState<ResultadoFallecidos | null>(null);

  const buscarDocumento = useCallback(async (t: TipoDocumento, numero: string) => {
    setModo('documento');
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
    setModo('telefono');
    setError('');
    setTelefono(null);
    setEntradaTelefono(numero);
    setCargando(true);
    try {
      setTelefono(await servicioPersonas.porTelefono(numero));
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
    setCargando(true);
    try {
      setResultadosNombres(await servicioPersonas.porNombres(apePat.trim(), apeMat.trim(), nombres.trim()));
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
    if (dni && !/^\d{8}$/.test(dni)) {
      setError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    if (!dni && (paterno.length < 2 || (!materno && !prenombres))) {
      setError('Ingresa un DNI o el apellido paterno y al menos otro dato.');
      return;
    }
    setError('');
    setResultadoFallecido(null);
    setCargando(true);
    try {
      setResultadoFallecido(await servicioPersonas.buscarFallecidos({
        dni: dni || null, apePat: paterno || null, apeMat: materno || null, prenombres: prenombres || null,
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

  return (
    <div className="space-y-6">
      <Encabezado titulo="Consulta de personas" bajada="Cada consulta descuenta tokens y queda registrada en la auditoría." />
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gris">¿Qué dato deseas consultar?</p>
        <Pestanas<Modo>
          valor={modo} alCambiar={(m) => { setModo(m); setError(''); }}
          opciones={[
            { id: 'documento', texto: 'Documento', icono: <IdCard className="size-4" /> },
            { id: 'telefono', texto: 'Teléfono', icono: <Phone className="size-4" /> },
            { id: 'nombres', texto: 'Apellidos y nombres', icono: <UserRound className="size-4" /> },
            { id: 'fallecidos', texto: 'Fallecidos', icono: <HeartCrack className="size-4" /> },
          ]}
        />
      </div>

      <Tarjeta>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-azul-10 text-azul">
            {modo === 'documento' ? <IdCard className="size-5" /> : modo === 'telefono' ? <Phone className="size-5" /> : modo === 'fallecidos' ? <HeartCrack className="size-5" /> : <UserRound className="size-5" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-texto">
              {modo === 'documento' ? 'Buscar por documento' : modo === 'telefono' ? 'Buscar por teléfono' : modo === 'fallecidos' ? 'Verificar fallecimiento' : 'Buscar por apellidos y nombres'}
            </h2>
            <p className="mt-0.5 text-xs text-gris">
              {modo === 'documento' ? 'Selecciona el tipo e ingresa el número del documento.' : modo === 'telefono' ? 'Ingresa el celular asociado a la persona.' : modo === 'fallecidos' ? 'Consulta si RENIEC informa una fecha de fallecimiento para el DNI.' : 'Ingresa el apellido paterno y completa los demás datos para afinar la búsqueda.'}
            </p>
          </div>
        </div>
        {modo === 'documento' && (
          <BarraBusqueda key={`doc-${tipo}`} etiqueta={DOCUMENTOS[tipo].etiqueta}
            placeholder={`${DOCUMENTOS[tipo].etiqueta}: ${DOCUMENTOS[tipo].descripcion}`} valorInicial={entradaDocumento} alCambiarValor={setEntradaDocumento} cargando={cargando}
            numerica={DOCUMENTOS[tipo].soloNumeros} longitudMaxima={DOCUMENTOS[tipo].longitudMaxima} mayusculas sinEspacios
            prefijo={<SelectorDocumento valor={tipo} alCambiar={(t) => { setTipo(t); setError(''); }} />}
            validar={(v) => validarDocumento(tipo, v)} alBuscar={(v) => buscarDocumento(tipo, v)} />
        )}
        {modo === 'telefono' && (
          <BarraBusqueda key="tel" etiqueta="Teléfono" placeholder="Celular de 9 dígitos" valorInicial={entradaTelefono} alCambiarValor={setEntradaTelefono} cargando={cargando}
            validar={(v) => (/^\d{9}$/.test(v) ? null : 'El teléfono debe tener 9 dígitos.')} alBuscar={buscarTelefono} />
        )}
        {modo === 'nombres' && (
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_auto] lg:items-end" onSubmit={(e) => { e.preventDefault(); void buscarPorNombres(); }}>
            <label className="block">
              <span className=" mb-1.5 block text-sm font-medium text-texto">Apellido paterno</span>
              <span className="relative block">
                <UserRound aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                <input value={apePat} onChange={(e) => setApePat(e.target.value)} maxLength={50} required placeholder="Ej. García" className="input input--icono h-10" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-texto">Apellido materno</span>
              <span className="relative block">
                <UserRound aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                <input value={apeMat} onChange={(e) => setApeMat(e.target.value)} maxLength={50} placeholder="Ej. López (opcional)" className="input input--icono h-10" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-texto">Nombres</span>
              <span className="relative block">
                <UserSearch aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                <input value={nombres} onChange={(e) => setNombres(e.target.value)} maxLength={100} placeholder="Ej. Ana María (opcional)" className="input input--icono h-10" />
              </span>
            </label>
            <Boton type="submit" cargando={cargando} disabled={apePat.trim().length < 2}><UserSearch className="size-4" />Buscar</Boton>
          </form>
        )}
        {modo === 'fallecidos' && (
          <div>
            <p className="mb-3 text-sm text-gris">Busca por DNI o filtra por apellidos y prenombres.</p>
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-end" onSubmit={buscarFallecido}>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-sm font-medium text-texto">DNI <span className="font-normal text-gris">(opcional)</span></span>
                <span className="relative block">
                  <IdCard aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                  <input value={dniFallecido} onChange={(e) => setDniFallecido(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    inputMode="numeric" maxLength={8} placeholder="8 dígitos" className="input input--icono h-10" />
                </span>
              </label>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-sm font-medium text-texto">Apellido paterno</span>
                <span className="relative block"><UserRound aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                  <input value={apePatFallecido} onChange={(e) => setApePatFallecido(e.target.value)} maxLength={50} placeholder="Ej. García" className="input input--icono h-10" />
                </span>
              </label>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-sm font-medium text-texto">Apellido materno</span>
                <span className="relative block"><UserRound aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                  <input value={apeMatFallecido} onChange={(e) => setApeMatFallecido(e.target.value)} maxLength={50} placeholder="Ej. López" className="input input--icono h-10" />
                </span>
              </label>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-sm font-medium text-texto">Prenombres</span>
                <span className="relative block"><UserSearch aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                  <input value={prenombresFallecido} onChange={(e) => setPrenombresFallecido(e.target.value)} maxLength={100} placeholder="Ej. Ana María" className="input input--icono h-10" />
                </span>
              </label>
              <Boton type="submit" cargando={cargando} disabled={dniFallecido.length > 0 && dniFallecido.length !== 8}><HeartCrack className="size-4" />Consultar</Boton>
            </form>
          </div>
        )}
      </Tarjeta>

      {error && <Aviso tono="error" alCerrar={() => setError('')}>{error}</Aviso>}
      {cargando && <Cargando />}

      {modo === 'documento' && persona && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-texto">{nombrePersona || `${DOCUMENTOS[consultado?.tipo ?? 'DNI'].etiqueta} ${persona.documento}`}</h2>
              {nombrePersona && <p className="numeros mt-0.5 text-sm text-gris">{DOCUMENTOS[consultado?.tipo ?? 'DNI'].etiqueta} {persona.documento}</p>}
            </div>
            {consultado?.tipo === 'DNI' && !reniec && <Boton variante="secundario" onClick={consultarReniec} cargando={cargandoReniec}><IdCard className="size-4" />Ver datos RENIEC</Boton>}
          </div>
          {consultado?.tipo === 'DNI' && !persona.esDniValido && <Aviso tono="alerta">El DNI no figura como válido en las fuentes consultadas.</Aviso>}
          {reniec && <FichaReniec r={reniec} />}
          <Resumen s={persona} />
          <SeccionesResultado s={persona} />
        </div>
      )}

      {modo === 'nombres' && resultadosNombres && (
        resultadosNombres.length ? <div className="space-y-6">
          <p className="text-sm font-medium text-gris">{fNumero(resultadosNombres.length)} coincidencias encontradas</p>
          <div className="max-w-2xl">
            <label htmlFor="coincidencia-persona" className="mb-1.5 block text-sm font-medium text-texto">Selecciona una persona</label>
            <span className="relative block">
              <select id="coincidencia-persona" value={documentoNombreSeleccionado} onChange={(e) => setDocumentoNombreSeleccionado(e.target.value)}
                className="selector-documento__select focus-control w-full cursor-pointer appearance-none rounded-xl border-2 border-borde bg-white p-2 pr-10 text-sm font-semibold text-texto transition-colors hover:border-azul-25 focus:border-azul focus:outline-none">
                <option value="">Elige entre {fNumero(resultadosNombres.length)} coincidencias</option>
                {resultadosNombres.map((resultado) => (
                  <option className="selector-documento__opcion" key={resultado.documento} value={resultado.documento}>{resultado.nombreCompleto} · {resultado.documento}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-azul" aria-hidden />
            </span>
          </div>
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
          <Seccion titulo="Líneas encontradas" icono={<Phone className="size-[18px]" />} cantidad={telefono.registros.length}>
            <div className="divide-y divide-borde sm:hidden">
              {telefono.registros.map((registro, indice) => (
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
              {!telefono.registros.length && <p className="px-5 py-8 text-center text-sm text-gris">No se encontraron registros para este número.</p>}
            </div>
            <div className="hidden sm:block">
              <Tabla columnas={colMoviles} filas={telefono.registros} clave={(m, i) => `${m.documento}-${i}`} vacio="No se encontraron registros para este número." />
            </div>
          </Seccion>
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

      {!cargando && !error && modo === 'documento' && !persona && (
        <Vacio icono={<UserSearch className="size-5" />} titulo="Escribe un documento para empezar">
          Verás deudas, líneas de crédito, calificaciones, información laboral y teléfonos.
        </Vacio>
      )}
      {!cargando && !error && modo === 'telefono' && !telefono && (
        <Vacio icono={<Phone className="size-5" />} titulo="Escribe un teléfono para empezar">
          Verás los registros asociados al número consultado.
        </Vacio>
      )}
      {!cargando && !error && modo === 'nombres' && !resultadosNombres && (
        <Vacio icono={<UserRound className="size-5" />} titulo="Escribe un nombre y apellido para empezar">
          Ingresa al menos el apellido paterno. Puedes añadir el apellido materno y los nombres para afinar la búsqueda.
        </Vacio>
      )}
      {!cargando && !error && modo === 'fallecidos' && !resultadoFallecido && (
        <Vacio icono={<HeartCrack className="size-5" />} titulo="Busca registros de fallecidos">
          Ingresa un DNI o el apellido paterno junto con otro dato para consultar.
        </Vacio>
      )}
    </div>
  );
}
