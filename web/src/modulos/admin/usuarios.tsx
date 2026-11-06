'use client';
// Administracion de usuarios: busqueda, alta, estado, roles, tokens y cierre de sesiones.
import { AtSign, Coins, KeyRound, LogOut, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Boton, Chip, Modal, Paginacion, Tabla, type Columna } from '@/components/ui';
import { ErrorApi } from '@/lib/api';
import { fNumero, fTexto } from '@/lib/formato';
import { Avatar, BuscadorPanel, CabeceraAdmin, Panel } from './diseno';
import { FormularioClave, FormularioCrear, FormularioRoles, FormularioTokens } from './formularios';
import { servicioAdmin } from './servicio';
import type { Pagina, RolListado, UsuarioListado } from './tipos';

type Dialogo = { tipo: 'crear' } | { tipo: 'roles' | 'tokens' | 'clave'; usuario: UsuarioListado } | null;

const esAdminGeneral = (u: UsuarioListado) => u.roles.some((r) => r.toUpperCase() === 'ADMIN GENERAL');

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
    { titulo: 'Usuario', celda: (u) => (
      <div className="flex min-w-56 items-center gap-3">
        <Avatar nombre={u.nombreCompleto} alterno={u.usuario} admin={esAdminGeneral(u)} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-texto">{fTexto(u.nombreCompleto)}</span>
          <span className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-gris"><AtSign aria-hidden className="size-3 shrink-0" />{u.usuario}{u.correo ? ` · ${u.correo}` : ''}</span>
        </span>
      </div>
    ) },
    { titulo: 'Roles', celda: (u) => (
      <div className="flex max-w-64 flex-wrap gap-1.5">
        {u.roles.length
          ? u.roles.map((r) => <Chip key={r} tono={r.toUpperCase() === 'ADMIN GENERAL' ? 'peligro' : 'azul'}><ShieldCheck aria-hidden className="size-3" />{r}</Chip>)
          : <span className="text-xs text-gris">Sin roles</span>}
      </div>
    ) },
    { titulo: 'Tokens', derecha: true, celda: (u) => esAdminGeneral(u)
      ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-azul-10 px-2.5 py-1.5 text-xs font-bold text-azul"><Coins aria-hidden className="size-3.5" />Ilimitados</span>
      : <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAEEDA] px-2.5 py-1.5 font-bold text-[#854F0B]"><Coins aria-hidden className="size-3.5" />{fNumero(u.saldoTokens)}</span> },
    { titulo: 'Estado', celda: (u) => <Chip tono={u.estado === 1 ? 'verde' : 'neutro'}><span className={`size-1.5 rounded-full ${u.estado === 1 ? 'bg-verde' : 'bg-gris/60'}`} />{u.estado === 1 ? 'Activo' : 'Inactivo'}</Chip> },
    {
      titulo: 'Acciones', derecha: true,
      celda: (u) => (
        <div className="flex min-w-max items-center justify-end gap-1.5">
          <Boton variante="secundario" className="h-9 min-w-9 px-2.5 text-xs" title="Administrar roles" onClick={() => setDialogo({ tipo: 'roles', usuario: u })}><ShieldCheck className="size-4" /><span className="hidden xl:inline">Roles</span></Boton>
          <Boton variante="secundario" className="h-9 min-w-9 px-2.5 text-xs" title="Administrar tokens" onClick={() => setDialogo({ tipo: 'tokens', usuario: u })}><Coins className="size-4" /><span className="hidden xl:inline">Tokens</span></Boton>
          <Boton variante="secundario" className="h-9 min-w-9 px-2.5 text-xs" title="Definir contraseña nueva" onClick={() => setDialogo({ tipo: 'clave', usuario: u })}><KeyRound className="size-4" /><span className="hidden xl:inline">Clave</span></Boton>
          <Boton variante="secundario" className="size-9 px-0" title="Cerrar sus sesiones" aria-label={`Cerrar sesiones de ${u.usuario}`} cargando={ocupado === u.id}
            onClick={() => accion(u, () => servicioAdmin.cerrarSesiones(u.id), `Se cerraron las sesiones de ${u.usuario}.`)}><LogOut className="size-4" /></Boton>
          <Boton variante={u.estado === 1 ? 'peligro' : 'secundario'} className="h-9 w-[6.5rem] px-0 text-xs"
            onClick={() => accion(u, () => servicioAdmin.cambiarEstado(u.id, u.estado !== 1), u.estado === 1 ? `${u.usuario} quedó inactivo.` : `${u.usuario} quedó activo.`)}>
            {u.estado === 1 ? 'Desactivar' : 'Activar'}
          </Boton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CabeceraAdmin titulo="Usuarios y tokens" descripcion="Crea cuentas, asigna roles y recarga tokens. Todo queda registrado en la auditoría."
        accion={<Boton className="shadow-md hover:-translate-y-0.5 hover:shadow-lg" onClick={() => setDialogo({ tipo: 'crear' })}><UserPlus className="size-4" />Nuevo usuario</Boton>} />

      {aviso && <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>{aviso.texto}</Aviso>}

      <Panel sinRelleno icono={Users} titulo="Directorio de usuarios" cantidad={datos?.total}
        accion={<BuscadorPanel valor={texto} alCambiar={setTexto} alBuscar={() => { setPagina(1); setBusqueda(texto); }} placeholder="Nombre, usuario o correo" etiqueta="Buscar usuarios" />}>
        {datos ? <>
          <Tabla columnas={columnas} filas={datos.items} clave={(u) => u.id} vacio="No hay usuarios con esa búsqueda." paginacion={false} className="[&_td]:align-middle" />
          <Paginacion pagina={pagina} tamano={tamano} total={datos.total} alCambiar={setPagina}
            opcionesTamano={[10, 15, 25, 50]} alCambiarTamano={(nuevoTamano) => { setTamano(nuevoTamano); setPagina(1); }} />
        </> : <p className="px-5 py-8 text-center text-sm text-gris">Cargando usuarios…</p>}
      </Panel>

      <p className="flex items-center gap-2 text-xs text-gris"><KeyRound className="size-3.5 shrink-0" />Las contraseñas no se ven aquí: cada persona crea la suya con el enlace del correo, o un administrador le define una con «Clave».</p>

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
    </div>
  );
}
