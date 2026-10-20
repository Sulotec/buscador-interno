'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { SECCIONES, type TipoLista } from './documentos';

export type FaseCarga = { tipo: 'lista' } | { tipo: 'subiendo'; porcentaje: number } | { tipo: 'procesando' } | { tipo: 'listo'; nombre: string };
export type EstadoCarga = {
  secciones: string[];
  fuente: 'pegar' | 'archivo';
  texto: string;
  nombreArchivo: string;
  fase: FaseCarga;
  error: string;
};
type EstadosCarga = Record<TipoLista, EstadoCarga>;
type ContextoEstadoCarga = {
  estados: EstadosCarga;
  actualizar: (tipo: TipoLista, cambios: Partial<EstadoCarga>) => void;
};

const estadoInicial = (): EstadoCarga => ({
  secciones: SECCIONES.map((seccion) => seccion.id),
  fuente: 'pegar',
  texto: '',
  nombreArchivo: '',
  fase: { tipo: 'lista' },
  error: '',
});

const ContextoCarga = createContext<ContextoEstadoCarga | null>(null);

export function ProveedorEstadoCarga({ children }: { children: ReactNode }) {
  const [estados, setEstados] = useState<EstadosCarga>({ personas: estadoInicial(), empresas: estadoInicial() });
  const actualizar = useCallback((tipo: TipoLista, cambios: Partial<EstadoCarga>) => {
    setEstados((actuales) => ({ ...actuales, [tipo]: { ...actuales[tipo], ...cambios } }));
  }, []);

  return <ContextoCarga.Provider value={{ estados, actualizar }}>{children}</ContextoCarga.Provider>;
}

export function useEstadoCarga(tipo: TipoLista) {
  const contexto = useContext(ContextoCarga);
  if (!contexto) throw new Error('useEstadoCarga debe usarse dentro de ProveedorEstadoCarga.');
  return { estado: contexto.estados[tipo], actualizar: (cambios: Partial<EstadoCarga>) => contexto.actualizar(tipo, cambios) };
}
