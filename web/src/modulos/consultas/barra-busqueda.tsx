'use client';
// Barra de busqueda principal de las consultas individuales.
// - prefijo: elemento a la izquierda del campo (p. ej. el selector de tipo de documento).
// - numerica: solo deja escribir numeros; longitudMaxima: corta lo que exceda.
import { Search } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Boton } from '@/components/ui';

export function BarraBusqueda({
  etiqueta, placeholder, valorInicial = '', validar, alBuscar, cargando, numerica = true, longitudMaxima, prefijo,
  mayusculas = false, sinEspacios = false,
}: {
  etiqueta: string; placeholder: string; valorInicial?: string; numerica?: boolean; cargando?: boolean;
  longitudMaxima?: number; prefijo?: ReactNode; mayusculas?: boolean; sinEspacios?: boolean;
  validar: (v: string) => string | null; alBuscar: (v: string) => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [error, setError] = useState('');

  function cambiar(texto: string) {
    let v = numerica ? texto.replace(/\D/g, '') : sinEspacios ? texto.replace(/\s/g, '') : texto;
    if (mayusculas) v = v.toUpperCase();
    if (longitudMaxima) v = v.slice(0, longitudMaxima);
    setValor(v);
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
        <Search className="pointer-events-none absolute left-3.5 top-[22px] size-5 -translate-y-1/2 text-gris" aria-hidden />
        <input
          value={valor} onChange={(e) => cambiar(e.target.value)} maxLength={longitudMaxima}
          inputMode={numerica ? 'numeric' : 'text'} placeholder={placeholder} aria-invalid={Boolean(error) || undefined}
          autoComplete="off"
          className={`numeros h-11 w-full rounded-lg border bg-white pl-11 pr-3 text-base text-texto placeholder:text-gris/60 focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/15 ${error ? 'border-peligro' : 'border-borde'}`}
        />
        {error && <span className="mt-1 block text-xs text-peligro">{error}</span>}
      </label>
      <Boton type="submit" cargando={cargando} className="h-11 px-6">Consultar</Boton>
    </form>
  );
}
