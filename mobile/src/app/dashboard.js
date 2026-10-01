/**
 * Panel de restaurante ('#/dashboard') — guarda de sesión (sin usuario → /login)
 * y redirect de admin (el web lo hacía en Dashboard.jsx con
 * window.location.hash='#/admin'; aquí vive en la ruta). Monta el Operator Hub
 * dentro de AppShell.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import Dashboard from '../components/dashboard/Dashboard.jsx';
import { useAuthContext } from '../context/AuthContext';

export default function DashboardRoute() {
  const router = useRouter();
  const auth = useAuthContext();
  const usuario = auth.usuario;
  const cargando = auth.cargandoSesion;
  const esAdmin = auth.esAdmin;

  useEffect(() => {
    if (cargando) return;
    if (!usuario) router.replace('/login');
    else if (esAdmin) router.replace('/admin');
  }, [cargando, usuario, esAdmin, router]);

  if (cargando) return null;
  if (!usuario || esAdmin) return null;

  return (
    <AppShell>
      <Dashboard usuario={usuario} />
    </AppShell>
  );
}
