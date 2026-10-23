'use client';
// Administracion de usuarios: busqueda, alta, estado, roles, tokens y cierre de sesiones.
import { Coins, KeyRound, LogOut, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Boton, Chip, Encabezado, Modal, Paginacion, Tabla, Tarjeta, type Columna } from '@/components/ui';
import { ErrorApi } from '@/lib/api';
import { fNumero } from '@/lib/formato';
import { FormularioClave, FormularioCrear, FormularioRoles, FormularioTokens } from './formularios';
import { servicioAdmin } from './servicio';
import type { Pagina, RolListado, UsuarioListado } from './tipos';

type Dialogo = { tipo: 'crear' } | { tipo: 'roles' | 'tokens' | 'clave'; usuario: UsuarioListado } | null;

export function AdminUsuarios() {
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(15);
  const [datos, setDatos] = useState<Pagina<UsuarioListado> | null>(null);
  const [roles, setRoles] = useState<RolListado[]>([]);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const cargar = useCallback(() => {
    servicioAdmin.usuarios(busqueda, pagina, tamano).then(setDatos)
      .catch((e) => setAviso({ tono: 'error', texto: e instanceof ErrorApi ? e.message : 'No se pudo cargar la lista.' }));
  }, [busqueda, pagina, tamano]);
  useEffect(cargar, [cargar]);
  useEffect(() => { servicioAdmin.roles().then(setRoles).catch(() => setRoles([])); }, []);

  function terminar(texto: string) { setDialogo(null); setAviso({ tono: 'exito', texto }); cargar(); }

  async function accion(u: UsuarioListado, hacer: () => Promise<void>, exito: string) {
    setOcupado(u.id);
    try { await hacer(); setAviso({ tono: 'exito', texto: exito }); cargar(); }
    catch (e) { setAviso({ tono: 'error', texto: e instanceof ErrorApi ? e.message : 'No se pudo completar la acción.' }); }
    finally { setOcupado(null); }
  }

  const columnas: Columna<UsuarioListado>[] = [
    { titulo: 'Usuario', celda: (u) => {
      const iniciales = u.nombreCompleto.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
      return <div className="flex min-w-56 items-center gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-azul-10 text-xs font-bold text-azul">{iniciales || u.usuario.slice(0, 2).toUpperCase()}</span>
        <span className="min-w-0"><span className="block truncate font-semibold text-texto">{u.nombreCompleto}</span><span className="mt-0.5 block truncate text-xs text-gris">@{u.usuario}{u.correo ? ` · ${u.correo}` : ''}</span></span>
      </div>;
    } },
    { titulo: 'Roles', celda: (u) => <div className="flex max-w-64 flex-wrap gap-1.5">{u.roles.length ? u.roles.map((r) => <Chip key={r} tono={r.toUpperCase() === 'ADMIN GENERAL' ? 'peligro' : 'azul'}>{r}</Chip>) : <span className="text-xs text-gris">Sin roles</span>}</div> },
    { titulo: 'Tokens disponibles', celda: (u) => <span className="inline-flex items-center gap-2 rounded-md bg-fondo px-2.5 py-1.5 font-semibold text-texto"><Coins className="size-4 text-ambar" />{fNumero(u.saldoTokens)}</span>, derecha: true },
    { titulo: 'Estado', celda: (u) => <span className={u.estado === 1 ? 'inline-flex items-center gap-2 text-sm font-medium text-verde' : 'inline-flex items-center gap-2 text-sm font-medium text-gris'}><span className={`size-2 rounded-full ${u.estado === 1 ? 'bg-verde' : 'bg-gris/50'}`} />{u.estado === 1 ? 'Activo' : 'Inactivo'}</span> },
    {
      titulo: 'Acciones', derecha: true,
      celda: (u) => (
        <div className="flex min-w-max justify-end gap-1.5">
          <Boton variante="secundario" className="h-9 px-2.5 text-xs" title="Administrar roles" onClick={() => setDialogo({ tipo: 'roles', usuario: u })}><ShieldCheck className="size-4" /><span className="hidden xl:inline">Roles</span></Boton>
          <Boton variante="secundario" className="h-9 px-2.5 text-xs" title="Administrar tokens" onClick={() => setDialogo({ tipo: 'tokens', usuario: u })}><Coins className="size-4" /><span className="hidden xl:inline">Tokens</span></Boton>
          <Boton variante="secundario" className="h-9 px-2.5 text-xs" title="Definir contraseña nueva" onClick={() => setDialogo({ tipo: 'clave', usuario: u })}><KeyRound className="size-4" /><span className="hidden xl:inline">Clave</span></Boton>
          <Boton variante="fantasma" className="h-9 px-2" title="Cerrar sus sesiones" aria-label={`Cerrar sesiones de ${u.usuario}`} cargando={ocupado === u.id}
            onClick={() => accion(u, () => servicioAdmin.cerrarSesiones(u.id), `Se cerraron las sesiones de ${u.usuario}.`)}><LogOut className="size-4" /></Boton>
          <Boton variante={u.estado === 1 ? 'peligro' : 'secundario'} className="h-9 px-3 text-xs"
            onClick={() => accion(u, () => servicioAdmin.cambiarEstado(u.id, u.estado !== 1), u.estado === 1 ? `${u.usuario} quedó inactivo.` : `${u.usuario} quedó activo.`)}>
            {u.estado === 1 ? 'Desactivar' : 'Activar'}
          </Boton>
        </div>
      ),
    },
  ];

  return (
    <>
      <Encabezado titulo="Usuarios y tokens" bajada="Crea cuentas, asigna roles y recarga tokens. Todo queda en la auditoría."
        accion={<Boton onClick={() => setDialogo({ tipo: 'crear' })}><UserPlus className="size-4" />Nuevo usuario</Boton>} />
      {aviso && <div className="mb-4"><Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>{aviso.texto}</Aviso></div>}
      <Tarjeta className="mb-4" titulo={
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-texto"><Search className="size-4 text-azul" />Buscar usuarios</h2>
          <p className="mt-1 text-xs font-normal text-gris">Filtra por nombre, nombre de usuario o correo electrónico.</p>
        </div>
      }>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={(e) => { e.preventDefault(); setPagina(1); setBusqueda(texto); }} role="search" aria-label="Buscar usuarios">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" aria-hidden />
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre, usuario o correo" aria-label="Buscar por nombre, usuario o correo"
              className="h-10 w-full rounded-lg border border-borde bg-white pl-9 pr-3 text-sm transition-colors placeholder:text-gris focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/15" />
          </div>
          <Boton type="submit" variante="secundario" className="w-full sm:w-auto"><Search className="size-4" />Buscar</Boton>
        </form>
      </Tarjeta>

      <Tarjeta sinRelleno className="overflow-hidden" titulo={
        <div className="flex min-w-48 flex-col gap-1">
          <h2 className="text-base font-semibold text-texto">Directorio de usuarios</h2>
          <p className="text-xs font-normal text-gris">{datos ? `${datos.total.toLocaleString('es-PE')} cuentas registradas` : 'Cuentas, permisos y saldo disponible'}</p>
        </div>
      }>
        {datos ? <>
          <Tabla columnas={columnas} filas={datos.items} clave={(u) => u.id} vacio="No hay usuarios con esa búsqueda." paginacion={false} />
          <Paginacion pagina={pagina} tamano={tamano} total={datos.total} alCambiar={setPagina}
            opcionesTamano={[10, 15, 25, 50]} alCambiarTamano={(nuevoTamano) => { setTamano(nuevoTamano); setPagina(1); }} />
        </> : <p className="px-5 py-8 text-center text-sm text-gris">Cargando usuarios…</p>}
      </Tarjeta>

      <Modal abierto={dialogo?.tipo === 'crear'} titulo="Nuevo usuario" alCerrar={() => setDialogo(null)} ancho="max-w-2xl">
        <FormularioCrear roles={roles} alTerminar={terminar} />
      </Modal>
      <Modal abierto={dialogo?.tipo === 'roles'} titulo={dialogo?.tipo === 'roles' ? `Roles de ${dialogo.usuario.usuario}` : ''} alCerrar={() => setDialogo(null)}>
        {dialogo?.tipo === 'roles' && <FormularioRoles usuario={dialogo.usuario} roles={roles} alTerminar={terminar} />}
      </Modal>
      <Modal abierto={dialogo?.tipo === 'tokens'} titulo={dialogo?.tipo === 'tokens' ? `Tokens de ${dialogo.usuario.usuario}` : ''} alCerrar={() => setDialogo(null)} ancho="max-w-2xl">
        {dialogo?.tipo === 'tokens' && <FormularioTokens usuario={dialogo.usuario} alTerminar={terminar} />}
      </Modal>
      <Modal abierto={dialogo?.tipo === 'clave'} titulo={dialogo?.tipo === 'clave' ? `Contraseña de ${dialogo.usuario.usuario}` : ''} alCerrar={() => setDialogo(null)}>
        {dialogo?.tipo === 'clave' && <FormularioClave usuario={dialogo.usuario} alTerminar={terminar} />}
      </Modal>
      <p className="mt-4 flex items-center gap-2 text-xs text-gris"><KeyRound className="size-3.5" />Las contraseñas no se ven aquí: cada persona crea la suya con el enlace del correo, o un administrador le define una con «Clave».</p>
    </>
  );
}
