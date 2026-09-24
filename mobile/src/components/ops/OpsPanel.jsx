/**
 * OpsPanel — Panel de Control Operativo & Revenue (solo admin).
 * Shell: drawer lateral + header + secciones. Los datos los carga cada sección.
 * Sin cambios: si no hay sesión -> aviso; si no es admin -> aviso (la ruta hace la redirección).
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { listarPendientes } from '../../services/incidenciaApi.js';
import OpsDashboard from './OpsDashboard.jsx';
import OpsReservas from './OpsReservas.jsx';
import OpsIncidencias from './OpsIncidencias.jsx';
import OpsRestaurantes from './OpsRestaurantes.jsx';
import OpsFinanzas from './OpsFinanzas.jsx';
import OpsUsuarios from './OpsUsuarios.jsx';
import OpsAjustes from './OpsAjustes.jsx';
import { useOpsStyles } from './OpsTokens';
import { OpsCard, OpsBtn, OpsInput, OpsAvatar } from './OpsUi';
import { Simbolo } from '../shell/Simbolo';

const SECCIONES = [
  { id: 'dashboard', nombre: 'Dashboard General', icono: 'dashboard' },
  { id: 'restaurantes', nombre: 'Gestión Restaurantes', icono: 'restaurant' },
  { id: 'reservas', nombre: 'Reservas Globales', icono: 'calendar_month', live: true },
  { id: 'finanzas', nombre: 'Finanzas & Comisiones', icono: 'payments' },
  { id: 'incidencias', nombre: 'Incidencias & Soporte', icono: 'report_problem', badgeCrit: true },
  { id: 'usuarios', nombre: 'Usuarios & Comensales', icono: 'group' },
  { id: 'ajustes', nombre: 'Ajustes & Auditoría', icono: 'settings' },
];

export default function OpsPanel({ usuario, esAdmin, perfil, tema, onCambiarTema }) {
  const { s, op } = useOpsStyles();
  const [seccion, setSeccion] = useState('dashboard');
  const [drawer, setDrawer] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [criticas, setCriticas] = useState(0);

  useEffect(() => {
    if (!esAdmin) return undefined;
    let vivo = true;
    listarPendientes()
      .then((l) => {
        if (vivo) {
          setCriticas(l.filter((p) => /no-show|cargo|disputa|cobro/i.test(`${p.motivo || ''} ${p.mensaje || ''}`)).length);
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [esAdmin]);

  if (!usuario?.uid) {
    return (
      <View style={[s.shell, { padding: 16 }]}>
        <OpsCard estado={{ titulo: 'Sesión requerida' }}>
          <Text style={s.muted}>Inicia sesión para acceder al panel operativo.</Text>
        </OpsCard>
      </View>
    );
  }
  if (!esAdmin) {
    return (
      <View style={[s.shell, { padding: 16 }]}>
        <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <OpsCard titulo="Sin acceso" sub="Este panel es solo para operadores (allowlist de admins).">
            <OpsBtn tipo="primary" sm onPress={() => setSeccion('dashboard')}>
              Entendido
            </OpsBtn>
          </OpsCard>
        </View>
      </View>
    );
  }

  const nombre = perfil?.nombre || usuario.displayName || usuario.email || 'Operador';
  const inicial = (nombre.trim().charAt(0) || 'O').toUpperCase();

  function ir(id) {
    setSeccion(id);
    setDrawer(false);
  }

  return (
    <View style={s.shell}>
      {/* Drawer lateral (equivalente a sidebar hover en web) */}
      {drawer ? (
        <Pressable style={s.drawerOverlay} onPress={() => setDrawer(false)}>
          <View style={s.drawer} onStartShouldSetResponder={() => true}>
            <View>
              <View style={s.brand}>
                <View style={[s.avatar, { width: 32, height: 32, borderRadius: 8 }]}>
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>M</Text>
                </View>
                <View>
                  <Text style={s.brandName}>MIRA</Text>
                  <Text style={s.brandSub}>OPERATOR HUB</Text>
                </View>
              </View>
              <Text style={s.navLabel}>PLATAFORMA GLOBAL</Text>
              <View style={s.nav}>
                {SECCIONES.map((sec) => (
                  <Pressable
                    key={sec.id}
                    onPress={() => ir(sec.id)}
                    accessibilityState={{ selected: seccion === sec.id }}
                    style={[s.navItem, seccion === sec.id ? s.navItemActivo : null]}
                  >
                    <View style={s.navItemIzq}>
                      <Simbolo
                        name={sec.icono}
                        size={18}
                        color={seccion === sec.id ? '#ffffff' : op.onVariant}
                      />
                      <Text style={seccion === sec.id ? s.navItemTxtActivo : s.navItemTxt} numberOfLines={1}>
                        {sec.nombre}
                      </Text>
                    </View>
                    {sec.live ? <View style={s.dotLive} accessibilityLabel="En directo" /> : null}
                    {sec.badgeCrit && criticas > 0 ? (
                      <Text style={[s.badge, s.badgeCrit]}>{criticas} críticas</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={s.sideFoot}>
              <View style={s.sys}>
                <Text style={{ fontSize: 12, color: op.onVariant }}>API mira-api</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: op.primary }}>LIVE</Text>
              </View>
              <View style={s.themeRow}>
                <Text style={{ fontSize: 12, color: op.onVariant }}>Modo visual</Text>
                <Pressable style={s.themeBtn} onPress={onCambiarTema} accessibilityLabel="Cambiar tema">
                  <Simbolo name={tema === 'oscuro' ? 'dark_mode' : 'light_mode'} size={14} color={op.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: op.primary }}>
                    {tema === 'oscuro' ? 'Oscuro' : 'Claro'}
                  </Text>
                </Pressable>
              </View>
              <View style={s.userbox}>
                <OpsAvatar txt={inicial} />
                <View style={{ minWidth: 0, flex: 1 }}>
                  <Text style={s.userboxNombre} numberOfLines={1}>
                    {nombre}
                  </Text>
                  <Text style={s.userboxMail} numberOfLines={1}>
                    {usuario.email}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={{ flex: 1 }}>
        {/* Header barra */}
        <View style={s.header}>
          <Pressable style={s.iconBtn} onPress={() => setDrawer((v) => !v)} accessibilityLabel="Abrir menú">
            <Simbolo name="menu" size={20} color={op.onSurface} />
          </Pressable>
          <View style={s.searchCaja}>
            <Simbolo name="search" size={16} style={s.searchIcon} color={op.outline} />
            <OpsInput
              value={busqueda}
              onChangeText={setBusqueda}
              onSubmit={() => busqueda.trim() && setSeccion('reservas')}
              placeholder="Buscar restaurante, reserva #ID, comensal…"
              style={s.searchInput}
            />
          </View>
          <View style={s.headerSpacer} />
          <Pressable style={s.iconBtn} onPress={() => ir('incidencias')} accessibilityLabel="Notificaciones">
            <Simbolo name="notifications" size={20} color={op.onSurface} />
            {criticas > 0 ? <View style={s.pingDot} /> : null}
          </Pressable>
          <View style={s.profile}>
            <OpsAvatar txt={inicial} />
            <View>
              <Text style={s.profileNombre} numberOfLines={1}>
                {nombre}
              </Text>
              <Text style={s.profileRol}>Master Operator</Text>
            </View>
          </View>
        </View>

        {/* Contenido de la sección */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
          {seccion === 'dashboard' ? <OpsDashboard /> : null}
          {seccion === 'restaurantes' ? <OpsRestaurantes /> : null}
          {seccion === 'reservas' ? <OpsReservas busquedaInicial={busqueda} /> : null}
          {seccion === 'finanzas' ? <OpsFinanzas /> : null}
          {seccion === 'incidencias' ? <OpsIncidencias /> : null}
          {seccion === 'usuarios' ? <OpsUsuarios /> : null}
          {seccion === 'ajustes' ? <OpsAjustes usuario={usuario} tema={tema} onCambiarTema={onCambiarTema} /> : null}
        </ScrollView>
      </View>
    </View>
  );
}
