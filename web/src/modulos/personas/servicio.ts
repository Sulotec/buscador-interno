// Servicio de personas: consulta por DNI, por telefono y datos RENIEC.
import { api } from '@/lib/api';
import type { TipoDocumento } from './documentos';
import type { ResultadoPersona, ResultadoReniec, ResultadoTelefono } from './tipos';

export const servicioPersonas = {
  porDocumento: (tipoDocumento: TipoDocumento, documento: string) =>
    api.post<ResultadoPersona>('api/buscador/buscar', { documento, tipoDocumento }),
  porTelefono: (telefono: string) => api.post<ResultadoTelefono>('api/buscador/buscar-telefono', { telefono }),
  reniec: (dni: string) => api.get<ResultadoReniec>(`api/buscador/reniec/${encodeURIComponent(dni)}`),
};
