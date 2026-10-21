'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Building2, Check, ClipboardList, FileSpreadsheet, Search, UserSearch, Users } from 'lucide-react';
import { useSesion } from '@/modulos/sesion/proveedor';
import { Aviso } from '@/components/ui';

const TONOS_ACCESO: Record<string, { fondo: string; borde: string; icono: string; texto: string }> = {
  '/personas': { fondo: 'bg-[#EEEDFE]', borde: 'border-[#CECBF6]', icono: 'bg-[#CECBF6]/70 text-[#534AB7]', texto: 'text-[#534AB7]' },
  '/empresas': { fondo: 'bg-[#E1F5EE]', borde: 'border-[#9FE1CB]', icono: 'bg-[#9FE1CB]/70 text-[#0F6E56]', texto: 'text-[#0F6E56]' },
  '/personas/masiva': { fondo: 'bg-[#FAEEDA]', borde: 'border-[#FAC775]', icono: 'bg-[#FAC775]/70 text-[#854F0B]', texto: 'text-[#854F0B]' },
  '/admin/usuarios': { fondo: 'bg-[#FAECE7]', borde: 'border-[#F5C4B3]', icono: 'bg-[#F5C4B3]/70 text-[#993C1D]', texto: 'text-[#993C1D]' },
  '/admin/auditoria': { fondo: 'bg-[#F1EFE8]', borde: 'border-[#D3D1C7]', icono: 'bg-[#D3D1C7]/70 text-[#5F5E5A]', texto: 'text-[#5F5E5A]' },
};

export default function Inicio() {
  const { usuario, esAdmin, saldo } = useSesion();
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState('');

  function buscar(e: FormEvent) {
    e.preventDefault();
    const v = texto.replace(/\s/g, '');
    if (/^\d{8}$/.test(v)) router.push(`/personas?dni=${v}`);
    else if (/^(10|15|16|17|20)\d{9}$/.test(v)) router.push(`/empresas?ruc=${v}`);
    else if (/^9\d{8}$/.test(v)) router.push(`/personas?telefono=${v}`);
    else setAviso('Escribe un DNI (8 dígitos), un RUC (11 dígitos) o un celular (9 dígitos).');
  }

  const accesos = [
    { href: '/personas', titulo: 'Personas', texto: 'Consulta por DNI o teléfono, con RENIEC, deudas, líneas, laboral y teléfonos.', icono: UserSearch },
    { href: '/empresas', titulo: 'Empresas', texto: 'Consulta por RUC o razón social.', icono: Building2 },
    { href: '/personas/masiva', titulo: 'Carga masiva', texto: 'Hasta 10 000 documentos en un Excel.', icono: FileSpreadsheet },
    ...(esAdmin ? [
      { href: '/admin/usuarios', titulo: 'Usuarios y tokens', texto: 'Crea cuentas, asigna roles y tokens.', icono: Users },
      { href: '/admin/auditoria', titulo: 'Auditoría', texto: 'Quién consultó qué y cuándo.', icono: ClipboardList },
    ] : []),
  ];
  const accesosPrincipales = accesos.slice(0, 3);
  const accesosAdmin = accesos.slice(3);

  return (
    <div className="space-y-8">
      <section className="aparecer relative isolate overflow-hidden rounded-2xl border border-borde bg-[#f3f6fb] px-5 py-6 text-texto sm:px-8 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)] lg:items-center lg:gap-10">
        <div className="pointer-events-none absolute -right-20 -top-32 -z-10 size-80 rounded-full bg-azul/5 blur-3xl" aria-hidden />
        <div>
          <p className="text-sm font-medium text-azul">Hola, {usuario?.nombreCompleto.split(' ')[0]}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-texto sm:text-3xl">¿Qué quieres consultar hoy?</h1>
          <form onSubmit={buscar} className="mt-5 flex max-w-2xl flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">DNI, RUC o celular</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-azul" aria-hidden />
              <input
                value={texto} onChange={(e) => { setTexto(e.target.value); setAviso(''); }} inputMode="numeric" autoFocus
                placeholder="DNI, RUC o celular"
                className="numeros h-13 w-full rounded-xl border border-borde bg-white pl-12 pr-4 text-base text-texto placeholder:text-gris/70 focus:outline-none focus:ring-4 focus:ring-azul/10"
              />
            </label>
            <button className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-xl bg-azul px-6 font-semibold text-white transition hover:bg-azul-oscuro focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/20">Buscar<ArrowRight className="size-4" /></button>
          </form>
          {saldo && !saldo.ilimitado && <p className="mt-3 text-xs text-gris">Te quedan {saldo.saldo.toLocaleString('es-PE')} tokens. Cada consulta descuenta tokens.</p>}
        </div>
        <div className="mt-6 rounded-xl border border-borde bg-white p-4 sm:p-5 lg:mt-0">
          <p className="text-sm font-semibold text-texto">Busca con cualquiera de estos datos</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['DNI', '8 dígitos', 'bg-azul-10 text-azul'],
              ['RUC', '11 dígitos', 'bg-[#fdeaea] text-peligro'],
              ['Celular', '9 dígitos', 'bg-verde-10 text-verde'],
            ].map(([tipo, detalle, tono]) => (
              <li key={tipo} className="flex items-center gap-3 rounded-lg bg-fondo/70 px-3 py-2.5">
                <span className={`min-w-14 rounded-md px-2 py-1 text-center text-xs font-bold ${tono}`}>{tipo}</span>
                <span className="text-sm text-gris">{detalle}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {aviso && <Aviso tono="alerta" alCerrar={() => setAviso('')}>{aviso}</Aviso>}

      <section aria-label="Accesos principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accesosPrincipales.map(({ href, titulo, texto: t, icono: Icono }, i) => {
          const tono = TONOS_ACCESO[href];
          return <Link key={href} href={href} style={{ animationDelay: `${i * 50}ms` }}
            className={`aparecer group flex min-h-40 flex-col justify-between rounded-xl border p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/30 ${tono.fondo} ${tono.borde}`}>
            <span className="flex items-start justify-between gap-3">
              <span className={`grid size-11 place-items-center rounded-xl ${tono.icono}`}><Icono className="size-5" aria-hidden /></span>
              <span className={`grid size-8 place-items-center rounded-full bg-white/70 transition group-hover:translate-x-0.5 ${tono.texto}`}><ArrowRight className="size-4" aria-hidden /></span>
            </span>
            <span className="mt-5 block">
              <span className="block text-base font-semibold text-texto">{titulo}</span>
              <span className="mt-1 block max-w-sm text-sm leading-5 text-gris">{t}</span>
            </span>
          </Link>;
        })}
      </section>
      {accesosAdmin.length > 0 && <section aria-labelledby="accesos-admin">
        <h2 id="accesos-admin" className="mb-3 text-sm font-semibold text-texto">Administración</h2>
        <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
          {accesosAdmin.map(({ href, titulo, texto: t, icono: Icono }) => {
            const tono = TONOS_ACCESO[href];
            return <Link key={href} href={href} className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:brightness-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/30 ${tono.fondo} ${tono.borde}`}>
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tono.icono}`}><Icono className="size-[18px]" aria-hidden /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-texto">{titulo}</span><span className="mt-0.5 block text-xs text-gris">{t}</span></span>
              <ArrowRight className={`size-4 shrink-0 transition group-hover:translate-x-0.5 ${tono.texto}`} aria-hidden />
            </Link>;
          })}
        </div>
      </section>}

      <section aria-labelledby="guia-inicio" className="aparecer overflow-hidden rounded-xl border border-borde bg-white shadow-tarjeta">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borde px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-azul">Guía rápida</p>
            <h2 id="guia-inicio" className="mt-1 text-lg font-semibold text-texto">Cómo usar el sistema</h2>
            <p className="mt-1 text-sm text-gris">Sigue estos pasos para consultar información y obtener tus resultados.</p>
          </div>
          <span className="grid size-10 place-items-center rounded-lg bg-azul-10 text-azul"><Check className="size-5" aria-hidden /></span>
        </div>

        <ol className="grid divide-y divide-borde sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <li className="p-5 sm:p-6">
            <span className="grid size-9 place-items-center rounded-lg bg-azul-10 text-azul"><Search className="size-[18px]" aria-hidden /></span>
            <p className="mt-4 text-sm font-semibold text-texto">1. Busca un dato</p>
            <p className="mt-1 text-sm leading-6 text-gris">Escribe un DNI de 8 dígitos, un RUC de 11 o un celular de 9. El buscador te llevará al tipo de consulta correspondiente.</p>
            <p className="mt-3 rounded-lg bg-fondo px-3 py-2 text-xs font-medium text-texto">También puedes buscar personas por apellidos y nombres.</p>
          </li>
          <li className="p-5 sm:p-6">
            <span className="grid size-9 place-items-center rounded-lg bg-verde-10 text-verde"><UserSearch className="size-[18px]" aria-hidden /></span>
            <p className="mt-4 text-sm font-semibold text-texto">2. Revisa los resultados</p>
            <p className="mt-1 text-sm leading-6 text-gris">Consulta las secciones disponibles, como deudas, líneas de crédito, teléfonos e información laboral. Para una búsqueda por nombres, selecciona a la persona para ver su detalle.</p>
            <p className="mt-3 rounded-lg bg-verde-10 px-3 py-2 text-xs font-medium text-verde">Cada consulta individual descuenta tokens.</p>
          </li>
          <li className="p-5 sm:p-6">
            <span className="grid size-9 place-items-center rounded-lg bg-[#fdeaea] text-rojo"><FileSpreadsheet className="size-[18px]" aria-hidden /></span>
            <p className="mt-4 text-sm font-semibold text-texto">3. Procesa listas en Excel</p>
            <p className="mt-1 text-sm leading-6 text-gris">En Carga masiva, agrega documentos en columna, elige qué información incluir y genera el archivo con los resultados.</p>
            <Link href="/personas/masiva" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-azul hover:underline">Ir a carga masiva <ArrowRight className="size-4" aria-hidden /></Link>
          </li>
        </ol>
        <p className="border-t border-borde bg-fondo/70 px-5 py-3 text-xs leading-5 text-gris sm:px-6">Las consultas quedan registradas en la auditoría. Puedes revisar tu saldo de tokens en el menú de usuario.</p>
      </section>
    </div>
  );
}
