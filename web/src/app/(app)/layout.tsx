'use client';
import { ProveedorSesion } from '@/modulos/sesion/proveedor';
import { ProveedorEstadoConsultas } from '@/modulos/consultas/estado';
import { ProveedorEstadoCarga } from '@/modulos/masiva/estado';
import { Shell } from '@/components/layout/shell';

export default function LayoutAplicacion({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorSesion>
      <ProveedorEstadoConsultas>
        <ProveedorEstadoCarga>
          <Shell>{children}</Shell>
        </ProveedorEstadoCarga>
      </ProveedorEstadoConsultas>
    </ProveedorSesion>
  );
}
