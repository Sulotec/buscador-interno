'use client';

import clsx from 'clsx';
import { type FormEvent } from 'react';
import { HeartCrack, IdCard, Phone, UserRound, UserSearch } from 'lucide-react';
import { Boton, Pestanas, Tarjeta, Vacio } from '@/components/ui';
import { BarraBusqueda } from '@/modulos/consultas/barra-busqueda';
import { SelectorDocumento } from '@/modulos/personas/selector-documento';
import { DOCUMENTOS, validarDocumento, type TipoDocumento } from '@/modulos/personas/documentos';

type Modo = 'documento' | 'telefono' | 'nombres' | 'fallecidos';
export const BUSQUEDA_NOMBRES_DISPONIBLE = true;
function limpiarApellido(texto: string): string {
  const primeraPalabra = texto.trimStart().split(/\s+/)[0] || '';
  return primeraPalabra.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
}

function limpiarApellidoCompuesto(texto: string): string {
  return texto.replace(/[^\p{L}\p{M}\s'’\-]/gu, '').replace(/\s{2,}/g, ' ').trimStart();
}

function limpiarNombres(texto: string): string {
  return texto
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trimStart();
}

type Props = {
  activa: boolean;
  modo: Modo;
  setModo: (modo: Modo) => void;
  tipo: TipoDocumento;
  setTipo: (tipo: TipoDocumento) => void;
  entradaDocumento: string;
  setEntradaDocumento: (valor: string) => void;
  entradaTelefono: string;
  setEntradaTelefono: (valor: string) => void;
  cargando: boolean;
  bloqueandoCambioModo: boolean;
  setError: (error: string) => void;
  buscarDocumento: (tipo: TipoDocumento, numero: string) => Promise<void>;
  buscarTelefono: (numero: string) => Promise<void>;
  apePat: string;
  setApePat: (valor: string) => void;
  apeMat: string;
  setApeMat: (valor: string) => void;
  nombres: string;
  setNombres: (valor: string) => void;
  buscarPorNombres: () => Promise<void>;
  dniFallecido: string;
  setDniFallecido: (valor: string) => void;
  apePatFallecido: string;
  setApePatFallecido: (valor: string) => void;
  apeMatFallecido: string;
  setApeMatFallecido: (valor: string) => void;
  prenombresFallecido: string;
  setPrenombresFallecido: (valor: string) => void;
  bloquearNombresFallecido: boolean;
  bloquearDniFallecido: boolean;
  botonFallecidosDeshabilitado: boolean;
  buscarFallecido: (evento: FormEvent<HTMLFormElement>) => void;
};

export function ConsultaIndividual({
  activa, modo, setModo, tipo, setTipo, entradaDocumento, setEntradaDocumento,
  entradaTelefono, setEntradaTelefono, cargando, bloqueandoCambioModo,
  setError, buscarDocumento, buscarTelefono,
  apePat, setApePat, apeMat, setApeMat, nombres, setNombres, buscarPorNombres,
  dniFallecido, setDniFallecido, apePatFallecido, setApePatFallecido,
  apeMatFallecido, setApeMatFallecido, prenombresFallecido, setPrenombresFallecido,
  bloquearNombresFallecido, bloquearDniFallecido, botonFallecidosDeshabilitado, buscarFallecido,
}: Props) {
  return (
    <>
      {activa && <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gris">¿Qué dato deseas consultar?</p>
        </div>
        {bloqueandoCambioModo && <p role="status" className="text-xs font-medium text-azul">{cargando ? 'La búsqueda está en curso. Espera a que termine para cambiar de pestaña.' : 'La consulta de la ficha personal está en curso. Espera a que termine para cambiar de pestaña.'}</p>}
        <Pestanas<Modo>
          valor={modo} deshabilitadas={bloqueandoCambioModo}
          alCambiar={(m) => { if (bloqueandoCambioModo) return; setModo(m); setError(''); }}
          opciones={[
            { id: 'documento', texto: 'Documento', icono: <IdCard className="size-4" /> },
            { id: 'telefono', texto: 'Teléfono', icono: <Phone className="size-4" /> },
            { id: 'nombres', texto: 'Apellidos y nombres', icono: <UserRound className="size-4" /> },
            { id: 'fallecidos', texto: 'Fallecidos', icono: <HeartCrack className="size-4" /> },
          ]}
        >
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
              {modo === 'documento' ? 'Selecciona el tipo e ingresa el número del documento.' : modo === 'telefono' ? 'Ingresa el celular asociado a la persona.' : modo === 'fallecidos' ? 'Consulta en la base de datos interna si el DNI registra una fecha de fallecimiento.' : 'Ingresa ambos apellidos; los nombres son opcionales para afinar la búsqueda.'}
            </p>
          </div>
        </div>
        {modo === 'documento' && (
          <BarraBusqueda key={`doc-${tipo}`} etiqueta={DOCUMENTOS[tipo].etiqueta}
            placeholder={`${DOCUMENTOS[tipo].etiqueta}: ${DOCUMENTOS[tipo].descripcion}`} valorInicial={entradaDocumento} alCambiarValor={setEntradaDocumento} cargando={cargando}
            numerica={DOCUMENTOS[tipo].soloNumeros} longitudMaxima={DOCUMENTOS[tipo].longitudMaxima} mayusculas sinEspacios
            iconoAccion={<IdCard className="size-4" />}
            prefijo={<SelectorDocumento valor={tipo} disabled={cargando} alCambiar={(t) => { setTipo(t); setError(''); }} />}
            validar={(v) => validarDocumento(tipo, v)} alBuscar={(v) => buscarDocumento(tipo, v)} />
        )}
        {modo === 'telefono' && (
          <BarraBusqueda key="tel" etiqueta="Teléfono" placeholder="Celular de 9 dígitos" valorInicial={entradaTelefono} alCambiarValor={setEntradaTelefono} cargando={cargando}
            longitudMaxima={9} iconoAccion={<Phone className="size-4" />}
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
                Ape. paterno <span className="font-normal text-gris">(obligatorio; admite varias palabras)</span>
              </span>
              <span className="relative block">
                <UserRound aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                <input
                  value={apePat}
                  onChange={(e) => { setApePat(limpiarApellidoCompuesto(e.target.value)); setError(''); }}
                  onKeyDown={(e) => { if (e.key.length === 1 && /\d/.test(e.key)) e.preventDefault(); }}
                  disabled={cargando} maxLength={50} minLength={2} required placeholder="Ej. García" className="input input--icono h-10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-texto">
                Ape. materno <span className="font-normal text-gris">(obligatorio; admite varias palabras)</span>
              </span>
              <span className="relative block">
                <UserRound aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gris" />
                <input
                  value={apeMat}
                  onChange={(e) => { setApeMat(limpiarApellidoCompuesto(e.target.value)); setError(''); }}
                  onKeyDown={(e) => { if (e.key.length === 1 && /\d/.test(e.key)) e.preventDefault(); }}
                  disabled={cargando} maxLength={50} minLength={2} required placeholder="Ej. López" className="input input--icono h-10 disabled:cursor-not-allowed disabled:opacity-60"
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
            <Boton type="submit" disabled={cargando || apePat.trim().length < 2 || apeMat.trim().length < 2}><UserRound className="size-4" />Consultar</Boton>
              <p className="col-span-full text-xs text-gris">Completa ambos apellidos con al menos 2 letras. Se aceptan apellidos compuestos, como «De la Cruz»; los nombres son opcionales.</p>
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
                  Ape. paterno {bloquearNombresFallecido ? <span className="font-normal text-gris/70">(bloqueado)</span> : <span className="font-normal text-gris">(una palabra)</span>}
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
                  Ape. materno {bloquearNombresFallecido ? <span className="font-normal text-gris/70">(bloqueado)</span> : <span className="font-normal text-gris">(una palabra)</span>}
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
              <Boton type="submit" disabled={botonFallecidosDeshabilitado}>
                <HeartCrack className="size-4" />Consultar
              </Boton>
            </form>
          </div>
        )}
      </Tarjeta>
        </Pestanas>
      </div>
      </>}
    </>
  );
}
