/**
 * Panel operativo ('#/admin') — guarda de sesión (sin usuario → /login)
 * y monta el Operator Hub (OpsPanel) dentro de AppShell. Las reglas de
 * «sin acceso» (no admin) las aplica el propio OpsPanel, como en el web.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import OpsPanel from '../components/ops/OpsPanel.jsx';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

export default function AdminRoute() {
  const router = useRouter();
  const auth = useAuthContext();
  const usuario = auth.usuario;
  const cargando = auth.cargandoSesion;
  const esAdmin = auth.esAdmin;
  const perfil = auth.perfil;
  const { tema, alternarTema } = useTheme();

  useEffect(() => {
    if (cargando) return;
    if (!usuario) router.replace('/login');
  }, [cargando, usuario, router]);

  if (cargando) return null;
  if (!usuario) return null;

  return (
    <AppShell>
      <OpsPanel
        usuario={usuario}
        esAdmin={esAdmin}
        perfil={perfil}
        tema={tema}
        onCambiarTema={alternarTema}
      />
    </AppShell>
  );
}
