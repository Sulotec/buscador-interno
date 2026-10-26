'use client';

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { ResultadoEmpresa } from '@/modulos/empresas/tipos';
import type { ResultadoFallecidos, ResultadoNombre, ResultadoPersona, ResultadoReniec, ResultadoTelefono } from '@/modulos/personas/tipos';
import type { TipoDocumento } from '@/modulos/personas/documentos';

type ModoPersona = 'documento' | 'telefono' | 'nombres' | 'fallecidos';
type ModoEmpresa = 'ruc' | 'razon';
type TipoBusquedaGlobalPersona = TipoDocumento | 'telefono' | 'nombres' | 'fallecidos';
type ResultadoBusquedaGlobalPersona =
  | { tipo: 'documento'; valor: ResultadoPersona }
  | { tipo: 'telefono'; valor: ResultadoTelefono }
  | { tipo: 'nombres'; valor: ResultadoNombre[] }
  | null;
type FichaPersonaGlobal = { tipo: TipoDocumento; valor: ResultadoPersona };
type DatosBusquedaPersona = {
  vista: 'global' | 'local' | null;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  resultadosNombres: ResultadoNombre[] | null;
  documentoNombreSeleccionado: string;
  dniFallecido: string;
  apellidoPaternoFallecido: string;
  apellidoMaternoFallecido: string;
  prenombresFallecido: string;
  resultadoFallecido: ResultadoFallecidos | null;
  documentoTelefonoSeleccionado: string | null;
  categoriaResultados: string;
  mostrarResultadosPorTab: boolean;
  cargandoLocal: boolean;
  global: {
    tipo: TipoBusquedaGlobalPersona;
    documentos: Record<TipoDocumento, string>;
    dniFallecido: string;
    telefono: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    nombres: string;
    resultado: ResultadoBusquedaGlobalPersona;
    resultadosPorTipo: Partial<Record<TipoBusquedaGlobalPersona, ResultadoBusquedaGlobalPersona>>;
    personaNombreSeleccionada: string;
    personasNombreSeleccionadas: Partial<Record<TipoBusquedaGlobalPersona, string>>;
    fichasPorTipo: Partial<Record<TipoBusquedaGlobalPersona, FichaPersonaGlobal>>;
    telefonoSeleccionado: string | null;
    cargando: boolean;
  };
};

type EstadoConsultas = {
  modoPersona: ModoPersona;
  setModoPersona: (modo: ModoPersona) => void;
  tipoDocumento: TipoDocumento;
  setTipoDocumento: (tipo: TipoDocumento) => void;
  entradaDocumento: string;
  setEntradaDocumento: (entrada: string) => void;
  entradaTelefono: string;
  setEntradaTelefono: (entrada: string) => void;
  persona: ResultadoPersona | null;
  setPersona: (resultado: ResultadoPersona | null) => void;
  consultado: { tipo: TipoDocumento; numero: string } | null;
  setConsultado: (entrada: { tipo: TipoDocumento; numero: string } | null) => void;
  reniec: ResultadoReniec | null;
  setReniec: (resultado: ResultadoReniec | null) => void;
  telefono: ResultadoTelefono | null;
  setTelefono: (resultado: ResultadoTelefono | null) => void;
  busquedaPersona: DatosBusquedaPersona;
  setBusquedaPersona: Dispatch<SetStateAction<DatosBusquedaPersona>>;
  modoEmpresa: ModoEmpresa;
  setModoEmpresa: (modo: ModoEmpresa) => void;
  entradaRuc: string;
  setEntradaRuc: (entrada: string) => void;
  entradaRazon: string;
  setEntradaRazon: (entrada: string) => void;
  empresaRuc: ResultadoEmpresa | null;
  setEmpresaRuc: (resultado: ResultadoEmpresa | null) => void;
  consultaRuc: string;
  setConsultaRuc: (valor: string) => void;
  empresaRucSinDatos: boolean;
  setEmpresaRucSinDatos: (valor: boolean) => void;
  empresaRazon: ResultadoEmpresa | null;
  setEmpresaRazon: (resultado: ResultadoEmpresa | null) => void;
  consultaRazon: string;
  setConsultaRazon: (valor: string) => void;
  empresaRazonSinDatos: boolean;
  setEmpresaRazonSinDatos: (valor: boolean) => void;
};

const ContextoConsultas = createContext<EstadoConsultas | null>(null);

export function ProveedorEstadoConsultas({ children }: { children: ReactNode }) {
  const [modoPersona, setModoPersona] = useState<ModoPersona>('documento');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DNI');
  const [entradaDocumento, setEntradaDocumento] = useState('');
  const [entradaTelefono, setEntradaTelefono] = useState('');
  const [persona, setPersona] = useState<ResultadoPersona | null>(null);
  const [consultado, setConsultado] = useState<{ tipo: TipoDocumento; numero: string } | null>(null);
  const [reniec, setReniec] = useState<ResultadoReniec | null>(null);
  const [telefono, setTelefono] = useState<ResultadoTelefono | null>(null);
  const [busquedaPersona, setBusquedaPersona] = useState<DatosBusquedaPersona>({
    vista: null,
    apellidoPaterno: '', apellidoMaterno: '', nombres: '', resultadosNombres: null, documentoNombreSeleccionado: '',
    dniFallecido: '', apellidoPaternoFallecido: '', apellidoMaternoFallecido: '', prenombresFallecido: '', resultadoFallecido: null,
    documentoTelefonoSeleccionado: null, categoriaResultados: 'telefonos', mostrarResultadosPorTab: false, cargandoLocal: false,
    global: { tipo: 'DNI', documentos: { DNI: '', CE: '', RUC: '', PASAPORTE: '' }, dniFallecido: '', telefono: '', apellidoPaterno: '', apellidoMaterno: '', nombres: '', resultado: null, resultadosPorTipo: {}, personaNombreSeleccionada: '', personasNombreSeleccionadas: {}, fichasPorTipo: {}, telefonoSeleccionado: null, cargando: false },
  });
  const [modoEmpresa, setModoEmpresa] = useState<ModoEmpresa>('ruc');
  const [entradaRuc, setEntradaRuc] = useState('');
  const [entradaRazon, setEntradaRazon] = useState('');
  const [empresaRuc, setEmpresaRuc] = useState<ResultadoEmpresa | null>(null);
  const [consultaRuc, setConsultaRuc] = useState('');
  const [empresaRucSinDatos, setEmpresaRucSinDatos] = useState(false);
  const [empresaRazon, setEmpresaRazon] = useState<ResultadoEmpresa | null>(null);
  const [consultaRazon, setConsultaRazon] = useState('');
  const [empresaRazonSinDatos, setEmpresaRazonSinDatos] = useState(false);

  return (
    <ContextoConsultas.Provider value={{
      modoPersona, setModoPersona, tipoDocumento, setTipoDocumento, entradaDocumento, setEntradaDocumento,
      entradaTelefono, setEntradaTelefono,
      persona, setPersona, consultado, setConsultado, reniec, setReniec, telefono, setTelefono,
      busquedaPersona, setBusquedaPersona,
      modoEmpresa, setModoEmpresa, entradaRuc, setEntradaRuc, entradaRazon, setEntradaRazon,
      empresaRuc, setEmpresaRuc, consultaRuc, setConsultaRuc, empresaRucSinDatos, setEmpresaRucSinDatos,
      empresaRazon, setEmpresaRazon, consultaRazon, setConsultaRazon, empresaRazonSinDatos, setEmpresaRazonSinDatos,
    }}>
      {children}
    </ContextoConsultas.Provider>
  );
}

export function useEstadoConsultas() {
  const estado = useContext(ContextoConsultas);
  if (!estado) throw new Error('useEstadoConsultas debe usarse dentro de ProveedorEstadoConsultas.');
  return estado;
}
