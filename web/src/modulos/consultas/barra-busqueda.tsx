'use client';
// Barra de busqueda principal de las consultas individuales.
// - prefijo: elemento a la izquierda del campo (p. ej. el selector de tipo de documento).
// - numerica: solo deja escribir numeros; longitudMaxima: corta lo que exceda.
import { Search } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Boton } from '@/components/ui';
import clsx from 'clsx';

export function BarraBusqueda({
  etiqueta, placeholder, valorInicial = '', validar, alBuscar, alCambiarValor, cargando, numerica = true, longitudMaxima, prefijo,
  mayusculas = false, sinEspacios = false,
}: {
  etiqueta: string; placeholder: string; valorInicial?: string; numerica?: boolean; cargando?: boolean;
  longitudMaxima?: number; prefijo?: ReactNode; mayusculas?: boolean; sinEspacios?: boolean;
  validar: (v: string) => string | null; alBuscar: (v: string) => void; alCambiarValor: (v: string) => void;
}) {
  const valor = valorInicial;
  const [error, setError] = useState('');

  function cambiar(texto: string) {
    let v = numerica ? texto.replace(/\D/g, '') : sinEspacios ? texto.replace(/\s/g, '') : texto;
    if (mayusculas) v = v.toUpperCase();
    if (longitudMaxima) v = v.slice(0, longitudMaxima);
    alCambiarValor(v);
    setError('');
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = valor.trim();
    const problema = validar(limpio);
    setError(problema ?? '');
    if (!problema) alBuscar(limpio);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row sm:items-start" noValidate>
      {prefijo}
      <label className="relative flex-1">
        <span className="sr-only">{etiqueta}</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-gris" aria-hidden />
        <input
          value={valor} onChange={(e) => cambiar(e.target.value)} maxLength={longitudMaxima}
          inputMode={numerica ? 'numeric' : 'text'} placeholder={placeholder} aria-invalid={Boolean(error) || undefined}
          autoComplete="off"
          className={clsx(
            'input input--busqueda numeros h-10 pl-11 text-base',
            error && 'input--error',
          )}
        />
        {error && <span className="mt-1 block text-xs text-peligro">{error}</span>}
      </label>
      <Boton type="submit" cargando={cargando} className="h-10 px-6">Consultar</Boton>
    </form>
  );
}
