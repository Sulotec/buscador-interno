// Tipos del modulo personas (mismo contrato que la API del Buscador).
import type { Deuda, LineaCredito, Calificacion, Sueldo, Movil } from "@/modulos/consultas/tipos";

export interface ResultadoPersona {
  esDniValido: boolean; documento: string;
  deudas: Deuda[]; lineasCredito: LineaCredito[]; calificaciones: Calificacion[]; sueldos: Sueldo[]; moviles: Movil[];
}

export interface ResultadoTelefono { telefono: string; documentosAsociados: number; registros: Movil[] }

export interface ResultadoNombre {
  documento: string; nombreCompleto: string;
  deudas: Deuda[]; lineasCredito: LineaCredito[]; calificaciones: Calificacion[]; sueldos: Sueldo[]; moviles: Movil[];
}

export interface ReniecPersona {
  nuDni?: string; apePaterno?: string; apeMaterno?: string; apCasada?: string; preNombres?: string; sexo?: string;
  feNacimiento?: string; nuEdad?: string; estadoCivil?: string; gradoInstruccion?: string; estatura?: string;
  donaOrganos?: string; feEmision?: string; feCaducidad?: string; feInscripcion?: string; deRestriccion?: string;
  desDireccion?: string; distDireccion?: string; provDireccion?: string; depaDireccion?: string; distrito?: string;
  provincia?: string; departamento?: string; nomPadre?: string; nomMadre?: string; feFallecimiento?: string;
  observacion?: string;
}

export interface ResultadoReniec {
  dni: string; encontrado: boolean;
  datos: { foto?: string; firma?: string; listaAni?: ReniecPersona[] } | null;
}

export interface FiltrosFallecidos {
  dni?: string | null; apePat?: string | null; apeMat?: string | null; prenombres?: string | null;
}

export interface RegistroFallecido {
  dni: string; apePat?: string | null; apeMat?: string | null; prenombres?: string | null;
  deRestriccion?: string | null; fechaNacimiento?: string | null; fechaFallecimiento?: string | null;
}

export interface ResultadoFallecidos {
  fallecidos: RegistroFallecido[]; hayMasResultados: boolean;
}
