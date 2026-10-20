'use client';
import { useCallback, useEffect, useState } from 'react';
import { IdCard, Phone, UserRound, UserSearch } from 'lucide-react';
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

type Modo = 'documento' | 'telefono' | 'nombres';

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
          ]}
        />
      </div>

      <Tarjeta>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-azul-10 text-azul">
            {modo === 'documento' ? <IdCard className="size-5" /> : modo === 'telefono' ? <Phone className="size-5" /> : <UserRound className="size-5" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-texto">
              {modo === 'documento' ? 'Buscar por documento' : modo === 'telefono' ? 'Buscar por teléfono' : 'Buscar por apellidos y nombres'}
            </h2>
            <p className="mt-0.5 text-xs text-gris">
              {modo === 'documento' ? 'Selecciona el tipo e ingresa el número del documento.' : modo === 'telefono' ? 'Ingresa el celular asociado a la persona.' : 'Esta modalidad estará disponible próximamente.'}
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
          <Vacio icono={<UserRound className="size-5" />} titulo="Búsqueda por apellidos y nombres: próximamente">
            Esta búsqueda aún no está disponible en el sistema. Mientras tanto, consulta por DNI o por teléfono.
          </Vacio>
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
    </div>
  );
}
