// Tipos del modulo admin (mismo contrato que la API del Buscador).

export interface Pagina<T> { items: T[]; total: number; pagina: number; tamano: number }

// DNI bloqueado para consulta (lista negra)
// Nunca se borra: al desbloquear queda activo = false con quién, cuándo y por qué
export interface RegistroListaNegra {
  id: number; documento: string; motivo: string; codUsuario: number | null; usuario: string; fechaUtc: string;
  activo: boolean; usuarioQuito: string | null; motivoQuito: string | null; fechaQuitoUtc: string | null;
}

export type VistaListaNegra = 'bloqueados' | 'historial';

export interface ResultadoListaNegra { agregados: string[]; yaBloqueados: string[]; invalidos: string[] }

export interface UsuarioListado {
  id: number; usuario: string; nombreCompleto: string; correo: string | null; estado: number; roles: string[];
  saldoTokens: number;
}

export interface RolListado { codigoRol: number; rol: string; descripcion: string | null }

export interface CrearUsuario {
  nombres: string; apePat: string; apeMat?: string | null; usuarioLogin: string; correo?: string | null;
  dni?: string | null; telefono?: string | null; codRoles: number[]; tokensIniciales: number; clave?: string | null;
}

export interface UsuarioCreado { codUsuario: number; usuarioLogin: string; invitacionEnviada: boolean }

export interface MovimientoToken {
  codMovimiento: number; codUsuario: number; tipo: number; cantidad: number; saldoResultante: number;
  accion: string; detalle: string | null; codUsuarioAccion: number | null; fecha: string;
}

export interface RegistroAuditoria {
  codAuditoria: number; fecha: string; codUsuario: number | null; usuario: string; accion: string;
  entidad: string | null; entidadId: string | null; detalle: string | null; ip: string | null; exito: boolean;
}
