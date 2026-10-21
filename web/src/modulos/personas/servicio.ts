// Servicio de personas: consulta por DNI, por telefono y datos RENIEC.
import { api } from '@/lib/api';
import type { TipoDocumento } from './documentos';
import type { FiltrosFallecidos, ResultadoFallecidos, ResultadoNombre, ResultadoPersona, ResultadoReniec, ResultadoTelefono } from './tipos';

export const servicioPersonas = {
  porDocumento: (tipoDocumento: TipoDocumento, documento: string) =>
    api.post<ResultadoPersona>('api/buscador/buscar', { documento, tipoDocumento }),
  porTelefono: (telefono: string) => api.post<ResultadoTelefono>('api/buscador/buscar-telefono', { telefono }),
  porNombres: (apePat: string, apeMat: string, nombres: string) =>
    api.post<ResultadoNombre[]>('api/buscador/buscar-nombres', { apePat, apeMat: apeMat || null, nombres: nombres || null }),
  reniec: (dni: string) => api.get<ResultadoReniec>(`api/buscador/reniec/${encodeURIComponent(dni)}`),
  buscarFallecidos: (filtros: FiltrosFallecidos) =>
    api.post<ResultadoFallecidos>('api/buscador/buscar-fallecidos', filtros),
};
