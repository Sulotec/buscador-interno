'use client';
import { Encabezado } from '@/components/ui';
import { CargaMasiva } from '@/modulos/masiva/carga-masiva';

export default function PersonasMasiva() {
  return (
    <>
      <Encabezado titulo="Carga masiva de personas" bajada="Consulta hasta 5 000 documentos por carga y descarga el resultado en Excel; si tu lista es más larga, sigues con los pendientes en un clic. Cada documento descuenta tokens." />
      <CargaMasiva tipo="personas" />
    </>
  );
}
