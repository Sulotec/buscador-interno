// Tipos de documento de la consulta individual: los mismos que valida la API (campo tipoDocumento).
export type TipoDocumento = 'DNI' | 'CE' | 'RUC' | 'PASAPORTE';

export interface ConfigDocumento {
  etiqueta: string;
  patron: RegExp;
  soloNumeros: boolean;
  longitudMaxima: number;
  descripcion: string;
}

export const DOCUMENTOS: Record<TipoDocumento, ConfigDocumento> = {
  DNI: { etiqueta: 'DNI', patron: /^[0-9]{8}$/, soloNumeros: true, longitudMaxima: 8, descripcion: '8 dígitos' },
  CE: { etiqueta: 'CE', patron: /^[0-9]{9}$/, soloNumeros: true, longitudMaxima: 9, descripcion: '9 dígitos' },
  RUC: { etiqueta: 'RUC', patron: /^[0-9]{11}$/, soloNumeros: true, longitudMaxima: 11, descripcion: '11 dígitos' },
  PASAPORTE: { etiqueta: 'Pasaporte', patron: /^[A-Za-z0-9]{6,12}$/, soloNumeros: false, longitudMaxima: 12, descripcion: 'entre 6 y 12 letras o números' },
};

export const TIPOS_DOCUMENTO = (Object.keys(DOCUMENTOS) as TipoDocumento[]).map((id) => ({ id, etiqueta: DOCUMENTOS[id].etiqueta }));

export const esTipoDocumento = (v: string | null): v is TipoDocumento => v !== null && v in DOCUMENTOS;

export function validarDocumento(tipo: TipoDocumento, valor: string): string | null {
  const c = DOCUMENTOS[tipo];
  if (!valor) return `Escribe el ${c.etiqueta}.`;
  return c.patron.test(valor) ? null : `El ${c.etiqueta} debe tener ${c.descripcion}.`;
}
