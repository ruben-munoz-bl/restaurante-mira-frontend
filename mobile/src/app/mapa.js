/**
 * Ruta /mapa — espejo de '#/mapa' del web (Mapa dentro del chrome global).
 */
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import Mapa from '../components/Mapa';

export default function MapaPantalla() {
  const router = useRouter();

  function verDetalle(r) {
    router.push({ pathname: '/detalle', params: { id: String(r.id) } });
  }

  return (
    <AppShell>
      <Mapa onVerDetalle={verDetalle} />
    </AppShell>
  );
}
