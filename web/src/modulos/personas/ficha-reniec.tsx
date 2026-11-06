'use client';
// Ficha personal (datos de RENIEC) en un popup con formato de documento: cabecera, datos de identificación y firma.
import type { ReactNode } from 'react';
import { HeartCrack, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { Modal } from '@/components/ui';
import { esVacio, fTexto, nombreCompleto } from '@/lib/formato';
import type { ResultadoReniec } from './tipos';

// ancho: ocupa toda la fila de la grilla; destacado: texto más grande (p. ej. el nombre)
// nota: explicación corta debajo del valor, para que se entienda qué significa
function Dato({ titulo, valor, children, ancho, destacado, nota }:
  { titulo: string; valor?: string | null; children?: ReactNode; ancho?: boolean; destacado?: boolean; nota?: ReactNode }) {
  return (
    <div className={clsx('min-w-0', ancho && 'col-span-full')}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gris">{titulo}</dt>
      <dd className={clsx('mt-0.5 break-words uppercase text-texto', destacado ? 'text-base font-bold' : 'text-sm')}>{children ?? fTexto(valor)}</dd>
      {nota && <p className="mt-0.5 text-[11px] leading-4 text-gris">{nota}</p>}
    </div>
  );
}

// "NINGUNA" (o "SIN RESTRICCION") significa que el DNI está en regla; cualquier otro valor es una restricción real.
const sinRestriccion = (v?: string | null) => !esVacio(v) && /^(ninguna|sin restricci[oó]n(es)?)$/i.test(v!.trim());

function notaRestriccion(v?: string | null): string | undefined {
  if (esVacio(v)) return undefined;
  return sinRestriccion(v)
    ? 'El DNI está vigente y no tiene impedimentos registrados.'
    : 'El DNI tiene una restricción registrada (p. ej. cancelado, caducado o con un trámite pendiente). Verifica su estado antes de usarlo.';
}

// Grilla de datos: 2 columnas en celular, 3 en pantallas medianas en adelante
function Grilla({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={clsx('grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3', className)}>{children}</dl>;
}

function Seccion({ numero, titulo, derecha, children }:
  { numero: string; titulo: string; derecha?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="flex items-stretch bg-azul text-white">
        <span className="grid w-10 shrink-0 place-items-center bg-black/15 text-xs font-bold">{numero}</span>
        <span className="flex-1 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em]">{titulo}</span>
        {derecha && <span className="hidden items-center px-4 text-[11px] font-normal opacity-90 sm:flex">{derecha}</span>}
      </h3>
      <div className="border border-t-0 border-borde bg-white">{children}</div>
    </section>
  );
}

function Biometrico({ titulo, src }: { titulo: string; src: string | null }) {
  return (
    <figure className="flex flex-col border border-borde">
      <div className="grid h-36 place-items-center p-3">
        {src
          ? <img src={src} alt={titulo} className="max-h-full max-w-full object-contain" />
          : <span className="text-xs text-gris">No disponible</span>}
      </div>
      <figcaption className="border-t border-borde bg-[#f5f7fb] py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-azul">
        {titulo}
      </figcaption>
    </figure>
  );
}

function ContenidoReniec({ r }: { r: ResultadoReniec }) {
  const p = r.datos?.listaAni?.[0];
  if (!r.encontrado || !p) {
    return <p className="py-6 text-center text-sm text-gris">No se encontraron datos para el DNI {r.dni}.</p>;
  }
  const imagen = (b64?: string) => (b64 ? (b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`) : null);
  const foto = imagen(r.datos?.foto);
  const firma = imagen(r.datos?.firma);
  const fallecido = !esVacio(p.feFallecimiento);
  // Solo es alerta si hay una restricción real (no "NINGUNA")
  const restriccion = !esVacio(p.deRestriccion) && !sinRestriccion(p.deRestriccion);
  const dni = p.nuDni ?? r.dni;
  const emitido = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' });
  const ubicacion = [p.distDireccion ?? p.distrito, p.provDireccion ?? p.provincia, p.depaDireccion ?? p.departamento]
    .filter((x) => !esVacio(x)).join(' / ');
  const vigencia = [p.feEmision, p.feCaducidad].map((x) => fTexto(x)).join('  a  ');

  return (
    <div className="space-y-5">
      {/* Cabecera del documento */}
      <header>
        <h2 className="text-2xl font-bold tracking-wide text-texto">FICHA PERSONAL DE REGISTRO</h2>
        <p className="mt-0.5 text-xs text-gris">Datos de identificación registrados para la persona consultada</p>
        <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-borde pt-2 text-[11px] text-gris">
          <span className="numeros">Documento consultado: DNI {dni}</span>
          <span className="numeros">Emitido: {emitido}</span>
        </div>
      </header>

      {(fallecido || restriccion) && (
        <div className="flex flex-wrap gap-2">
          {fallecido && <span className="inline-flex items-center gap-1.5 rounded-md bg-[#A32D2D] px-2.5 py-1 text-xs font-bold text-white"><HeartCrack aria-hidden className="size-3.5" />Fallecido el {p.feFallecimiento}</span>}
          {restriccion && <span className="inline-flex items-center gap-1.5 rounded-md bg-[#B45309] px-2.5 py-1 text-xs font-bold text-white"><ShieldAlert aria-hidden className="size-3.5" />{p.deRestriccion}</span>}
        </div>
      )}

      <Seccion numero="I" titulo="Datos de identificación">
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-6">
          <div className="shrink-0 self-center sm:self-start">
            {foto
              ? <img src={foto} alt={`Foto de DNI ${dni}`} className="h-44 w-36 border border-borde bg-white object-cover p-1" />
              : <div className="grid h-44 w-36 place-items-center border border-dashed border-borde text-xs text-gris">Sin foto</div>}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            {/* Nombre y documento arriba, separados del resto */}
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-borde pb-3">
              <Dato titulo="Apellidos y nombres" valor={nombreCompleto(p.apePaterno, p.apeMaterno, p.preNombres)} destacado />
              <Dato titulo="Documento de identidad"><span className="numeros text-base font-bold text-azul">DNI {dni}</span></Dato>
            </div>
            <Grilla>
              {!esVacio(p.apCasada) && <Dato titulo="Apellido de casada" valor={p.apCasada} />}
              <Dato titulo="Sexo" valor={p.sexo} />
              <Dato titulo="Edad" valor={esVacio(p.nuEdad) ? null : `${p.nuEdad} años`} />
              <Dato titulo="Fecha de nacimiento" valor={p.feNacimiento} />
              <Dato titulo="Estado civil" valor={p.estadoCivil} />
              <Dato titulo="Grado de instrucción" valor={p.gradoInstruccion} />
              <Dato titulo="Estatura" valor={esVacio(p.estatura) ? null : /^\d+([.,]\d+)?$/.test(p.estatura!.trim()) ? `${p.estatura!.trim()} cm` : p.estatura} />
            </Grilla>
          </div>
        </div>
      </Seccion>

      <Seccion numero="II" titulo="Filiación y domicilio">
        <Grilla className="p-4">
          <Dato titulo="Nombre del padre" valor={p.nomPadre} />
          <Dato titulo="Nombre de la madre" valor={p.nomMadre} />
          <Dato titulo="Distrito / Provincia / Departamento" valor={ubicacion || null} />
          <Dato titulo="Domicilio declarado" valor={p.desDireccion} ancho />
        </Grilla>
      </Seccion>

      <Seccion numero="III" titulo="Datos del documento">
        <Grilla className="p-4">
          <Dato titulo="Fecha de inscripción" valor={p.feInscripcion} />
          <Dato titulo="Emisión / Caducidad">{vigencia}</Dato>
          <Dato titulo="Restricciones" valor={p.deRestriccion} nota={notaRestriccion(p.deRestriccion)} />
          <Dato titulo="Donación de órganos" valor={p.donaOrganos} />
          {fallecido && <Dato titulo="Fecha de fallecimiento" valor={p.feFallecimiento} />}
        </Grilla>
      </Seccion>

      <Seccion numero="IV" titulo="Verificación biométrica">
        <div className="grid gap-3 p-3 sm:grid-cols-3">
          <Biometrico titulo="Firma del titular" src={firma} />
          <Biometrico titulo="Huella dactilar derecha" src={imagen(r.datos?.hDerecha)} />
          <Biometrico titulo="Huella dactilar izquierda" src={imagen(r.datos?.hIzquierda)} />
        </div>
      </Seccion>

      {!esVacio(p.observacion) && (
        <Seccion numero="V" titulo="Observaciones">
          <p className="p-4 text-sm uppercase text-texto">{p.observacion}</p>
        </Seccion>
      )}
    </div>
  );
}

export function ModalReniec({ r, abierto, alCerrar }: { r: ResultadoReniec | null; abierto: boolean; alCerrar: () => void }) {
  return (
    <Modal abierto={abierto && !!r} titulo="Ficha personal de registro" alCerrar={alCerrar} ancho="max-w-4xl" sinEncabezado>
      {r && <ContenidoReniec r={r} />}
    </Modal>
  );
}
