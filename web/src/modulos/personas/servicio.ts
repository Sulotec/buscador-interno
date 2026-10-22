// Servicio de personas: consulta por DNI, por telefono y datos RENIEC.
import { api, enviarYDescargar } from '@/lib/api';
import type { TipoDocumento } from './documentos';
import type { FiltrosFallecidos, ResultadoFallecidos, ResultadoNombre, ResultadoPersona, ResultadoReniec, ResultadoTelefono } from './tipos';

export const servicioPersonas = {
  porDocumento: (tipoDocumento: TipoDocumento, documento: string) =>
    api.post<ResultadoPersona>('api/buscador/buscar', { documento, tipoDocumento }),
  exportarPdf: (resultado: ResultadoPersona, tipoDocumento: TipoDocumento, nombreCompleto?: string) =>
    enviarYDescargar('api/buscador/exportar-pdf', { ...resultado, tipoDocumento, nombreCompleto }, `ficha-${resultado.documento}.pdf`),
  porTelefono: (telefono: string) => api.post<ResultadoTelefono>('api/buscador/buscar-telefono', { telefono }),
  porNombres: (apePat: string, apeMat: string, nombres: string) =>
    api.post<ResultadoNombre[]>('api/buscador/buscar-nombres', { apePat, apeMat: apeMat || null, nombres: nombres || null }),
  reniec: (dni: string) => api.get<ResultadoReniec>(`api/buscador/reniec/${encodeURIComponent(dni)}`),
  buscarFallecidos: (filtros: FiltrosFallecidos) =>
    api.post<ResultadoFallecidos>('api/buscador/buscar-fallecidos', filtros),
};
