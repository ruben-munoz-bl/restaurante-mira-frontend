import { AppShell } from '../components/shell/AppShell';
import { Placeholder } from '../components/shell/Placeholder';

export default function Recuperar() {
  return (
    <AppShell>
      <Placeholder titulo="Recuperar contraseña" descripcion="Envío de email de recuperación (Fase 4)." />
    </AppShell>
  );
}
