'use client';
import { useCallback, useEffect, useState } from 'react';
import { Building2, Hash } from 'lucide-react';
import { BarraBusqueda } from '@/modulos/consultas/barra-busqueda';
import { useEstadoConsultas } from '@/modulos/consultas/estado';
import { Resumen, SeccionesResultado } from '@/modulos/consultas/resultados';
import { useSesion } from '@/modulos/sesion/proveedor';
import { Aviso, Cargando, Encabezado, Pestanas, Tarjeta, Vacio } from '@/components/ui';
import { ErrorApi } from '@/lib/api';
import { servicioEmpresas } from '@/modulos/empresas/servicio';

type Modo = 'ruc' | 'razon';

export default function Empresas() {
  const { actualizarSaldo } = useSesion();
  const {
    modoEmpresa: modo, setModoEmpresa: setModo, entradaRuc: ruc, setEntradaRuc: setRuc, entradaRazon: razon, setEntradaRazon: setRazon,
    empresaRuc, setEmpresaRuc, consultaRuc, setConsultaRuc, empresaRucSinDatos, setEmpresaRucSinDatos,
    empresaRazon, setEmpresaRazon, consultaRazon, setConsultaRazon, empresaRazonSinDatos, setEmpresaRazonSinDatos,
  } = useEstadoConsultas();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const empresa = modo === 'ruc' ? empresaRuc : empresaRazon;
  const consulta = modo === 'ruc' ? consultaRuc : consultaRazon;
  const sinDatos = modo === 'ruc' ? empresaRucSinDatos : empresaRazonSinDatos;


  const buscar = useCallback(async (m: Modo, valor: string) => {
    setModo(m);
    setError(''); setCargando(true);
    const guardarEmpresa = m === 'ruc' ? setEmpresaRuc : setEmpresaRazon;
    const guardarConsulta = m === 'ruc' ? setConsultaRuc : setConsultaRazon;
    const guardarSinDatos = m === 'ruc' ? setEmpresaRucSinDatos : setEmpresaRazonSinDatos;
    guardarEmpresa(null); guardarSinDatos(false); guardarConsulta(valor);
    if (m === 'ruc') setRuc(valor); else setRazon(valor);
    try {
      const r = m === 'ruc' ? await servicioEmpresas.porRuc(valor) : await servicioEmpresas.porRazonSocial(valor);
      if (!r) guardarSinDatos(true); else guardarEmpresa(r);
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 404) guardarSinDatos(true);
      else setError(e instanceof ErrorApi ? e.message : 'No se pudo realizar la consulta.');
    } finally {
      setCargando(false);
      actualizarSaldo();
    }
  }, [actualizarSaldo, setModo, setRuc, setRazon, setEmpresaRuc, setEmpresaRazon, setConsultaRuc, setConsultaRazon, setEmpresaRucSinDatos, setEmpresaRazonSinDatos]);

  useEffect(() => {
    const ruc = new URLSearchParams(location.search).get('ruc');
    if (ruc) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
      queueMicrotask(() => buscar('ruc', ruc));
    }
  }, [buscar]);

  const vacia = empresa && !empresa.deudas.length && !empresa.lineasCredito.length && !empresa.calificaciones.length && !empresa.sueldos.length && !empresa.moviles.length;

  return (
    <div className="space-y-6">
      <Encabezado titulo="Consulta de empresas" bajada="Busca por RUC o por razón social. Cada consulta queda registrada en la auditoría." />
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gris">¿Qué dato deseas consultar?</p>
        <Pestanas<Modo> valor={modo} alCambiar={(m) => { setModo(m); setError(''); }}
          opciones={[{ id: 'ruc', texto: 'RUC', icono: <Hash className="size-4" /> }, { id: 'razon', texto: 'Razón social', icono: <Building2 className="size-4" /> }]} />
      </div>

      <Tarjeta>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-azul-10 text-azul">
            {modo === 'ruc' ? <Hash className="size-5" /> : <Building2 className="size-5" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-texto">{modo === 'ruc' ? 'Buscar por RUC' : 'Buscar por razón social'}</h2>
            <p className="mt-0.5 text-xs text-gris">
              {modo === 'ruc' ? 'Ingresa el RUC de 11 dígitos de la empresa.' : 'Escribe el nombre de la empresa para encontrar sus registros.'}
            </p>
          </div>
        </div>
        {modo === 'ruc' ? (
          <BarraBusqueda key="ruc" etiqueta="RUC" placeholder="RUC de 11 dígitos" valorInicial={ruc} alCambiarValor={setRuc} cargando={cargando}
            validar={(v) => (/^(10|15|16|17|20)\d{9}$/.test(v) ? null : 'El RUC debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20.')}
            alBuscar={(v) => buscar('ruc', v)} />
        ) : (
          <BarraBusqueda key="razon" etiqueta="Razón social" placeholder="Nombre de la empresa" valorInicial={razon} alCambiarValor={setRazon} numerica={false} cargando={cargando}
            validar={(v) => (v.length >= 3 ? null : 'Escribe al menos 3 letras.')} alBuscar={(v) => buscar('razon', v)} />
        )}
      </Tarjeta>

      {error && <Aviso tono="error" alCerrar={() => setError('')}>{error}</Aviso>}
      {cargando && <Cargando />}
      {sinDatos && <Vacio icono={<Building2 className="size-5" />} titulo="Sin resultados">No encontramos información para «{consulta}».</Vacio>}
      {empresa && (vacia
        ? <Vacio icono={<Building2 className="size-5" />} titulo="Sin información registrada">La empresa «{consulta}» no tiene registros en las fuentes consultadas.</Vacio>
        : (
          <div className="space-y-4">
            <h2 className="numeros text-lg font-semibold text-texto">{modo === 'ruc' ? `RUC ${consulta}` : consulta}</h2>
            <Resumen s={empresa} />
            <SeccionesResultado s={empresa} tipadas={false} />
          </div>
        ))}
      {!cargando && !empresa && !sinDatos && !error && (
        <Vacio icono={<Building2 className="size-5" />} titulo="Escribe un RUC o una razón social">Verás deudas, líneas de crédito, calificaciones, trabajadores y teléfonos.</Vacio>
      )}
    </div>
  );
}
