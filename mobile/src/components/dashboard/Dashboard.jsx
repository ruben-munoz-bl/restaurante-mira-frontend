/**
 * Panel de restaurante (Operator Hub) — espejo de Dashboard.jsx web:
 * KPIs, conciliación de tickets, reservas del día con acciones, previsión,
 * directorio y modales de tickets/historial/aforo. Adaptado a móvil:
 * tablas con scroll horizontal, selects y fecha con componentes nativos,
 * drag&drop → selector de archivos y descarga CSV → compartir archivo.
 */
import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Sharing } from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useShell } from '../shell/AppShell';
import { dashboardApi } from '../../services/api.js';
import { proponerNegocio, listarMisNegocios } from '../../services/negocioApi.js';
import { RevenueLineChart, ReservationsPieChart } from './Charts.jsx';
import ReservationActions from './ReservationActions.jsx';
import TicketUpload from './TicketUpload.jsx';
import {
  OpBtnPrimary,
  OpBtnGhost,
  OpLink,
  OpStatus,
  OpField,
  OpInput,
  OpSelect,
  OpModal,
  OpEmpty,
  PuntoPulso,
} from './DashboardUi';
import {
  useOpStyles,
  MONO,
  euro,
  initials,
  isCanceladaLocal,
  estadoToBadge,
} from './OpTokens';
import { AuthPagina, AuthTarjeta, AuthError } from '../ui/Auth';
import { Simbolo } from '../shell/Simbolo';
import { sessionStorage } from '../../lib/storage.js';
import { useT } from '../../i18n/index.jsx';
import { CIUDADES_CATALUNA } from '../../models/restaurantModel.js';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { FUENTES } from '../../theme/tokens';

const TRADS = { es, ca, en };

const EMPTY_REST = {
  nombre: '',
  ciudad: '',
  zona: '',
  direccion: '',
  telefono: '',
  email: '',
  categorias: '',
  precio: '\u20AC\u20AC',
  descripcion: '',
  comisionPct: 10,
};

const PRECIOS = [
  { valor: '\u20AC', etiqueta: '\u20AC' },
  { valor: '\u20AC\u20AC', etiqueta: '\u20AC\u20AC' },
  { valor: '\u20AC\u20AC\u20AC', etiqueta: '\u20AC\u20AC\u20AC' },
];

const FICHA_FIELDS = [
  ['nombre', 'Nombre', 'text'],
  ['direccion', 'Dirección', 'text'],
  ['telefono', 'Teléfono', 'text'],
  ['email', 'Email', 'email'],
  ['ciudad', 'Ciudad', 'select'],
  ['precio', 'Rango precio', 'text'],
  ['cocina', 'Cocina', 'text'],
  ['comisionPct', 'Comisión %', 'number'],
];

const TIPOS_LOTES = ['.pdf', '.csv', '.xml', 'image/*'];

// Anchos de columna de las tablas (scroll horizontal).
const COLS_RESERVAS = [86, 210, 54, 84, 150, 118]; // = 702
const COLS_DIRECTORIO = [176, 130, 122, 122, 100, 88, 110]; // = 848
const COLS_TICKETS = [88, 88, 150, 92, 118, 96, 120]; // = 752

function Th({ w, children, centro, derecha }) {
  const { s } = useOpStyles();
  const alinear = derecha ? 'flex-end' : centro ? 'center' : 'flex-start';
  return (
    <View style={[s.thVista, { width: w, alignItems: alinear }]}>
      <Text style={[s.thTxt, { textAlign: derecha ? 'right' : centro ? 'center' : 'left' }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

function Td({ w, children, centro, derecha, style }) {
  const { s } = useOpStyles();
  const alinear = derecha ? 'flex-end' : centro ? 'center' : 'flex-start';
  return <View style={[s.td, { width: w, alignItems: alinear }, style]}>{children}</View>;
}

function Tabla({ minWidth, children }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderRadius: 6.4 }} contentContainerStyle={{ minWidth }}>
      <View style={{ width: minWidth }}>{children}</View>
    </ScrollView>
  );
}

export default function Dashboard({ usuario }) {
  const t = useT(TRADS);
  const { scrollRef } = useShell();
  const { s, op } = useOpStyles();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noRestaurant, setNoRestaurant] = useState(false);
  const [pendingNegocio, setPendingNegocio] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRest, setNewRest] = useState({ ...EMPTY_REST });
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showFicha, setShowFicha] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [showAllReservas, setShowAllReservas] = useState(false);
  const [dirFilter, setDirFilter] = useState('todos');
  const [showHistorial, setShowHistorial] = useState(false);
  const [showAforoModal, setShowAforoModal] = useState(false);
  const [aforoLimit, setAforoLimit] = useState('12');
  const [selectedMonth, setSelectedMonth] = useState('este-mes');
  const [fechaFiltro, setFechaFiltro] = useState(() => new Date().toISOString().split('T')[0]);
  const [fechaTexto, setFechaTexto] = useState(() => new Date().toISOString().split('T')[0]);
  const [filtroTodas, setFiltroTodas] = useState(false);
  const [listaRests, setListaRests] = useState([]);
  const [showRestDropdown, setShowRestDropdown] = useState(false);
  const [loadingRestList, setLoadingRestList] = useState(false);

  useEffect(() => {
    setFechaTexto(fechaFiltro);
  }, [fechaFiltro]);

  async function refreshRestList(currentId) {
    setLoadingRestList(true);
    try {
      const l = await dashboardApi.listMyRestaurants(currentId || data?.restaurante?.id);
      setListaRests(l);
    } catch (e) {
      console.warn('refreshRestList', e);
    } finally {
      setLoadingRestList(false);
    }
  }

  function toggleRestDropdown() {
    const next = !showRestDropdown;
    setShowRestDropdown(next);
    if (next) refreshRestList(data?.restaurante?.id);
  }

  useEffect(() => {
    if (!usuario?.uid) return;
    try {
      if (sessionStorage.getItem('mira_abrir_crear')) {
        sessionStorage.removeItem('mira_abrir_crear');
        setShowCreateForm(true);
      }
    } catch {
      /* ignore */
    }
  }, [usuario]);

  useEffect(() => {
    if (!usuario?.uid) return;
    let vivo = true;
    setLoading(true);
    const cargarExtra = (restId) => {
      dashboardApi
        .listMyRestaurants(restId)
        .then((l) => {
          if (vivo) setListaRests(l);
        })
        .catch((err) => console.warn('listMyRestaurants', err));
      if (restId) {
        try {
          sessionStorage.setItem('mira_rest_activo', restId);
        } catch {
          /* ignore */
        }
      }
    };
    dashboardApi
      .getMyRestaurant()
      .then((d) => {
        if (vivo) {
          setData(d);
          setFormData(d.restaurante);
          setLoading(false);
          cargarExtra(d.restaurante.id);
        }
      })
      .catch((e) => {
        if (!vivo) return;
        const msg = e.message || 'Error al cargar';
        if (msg.includes('Restaurante no encontrado')) {
          listarMisNegocios(usuario.uid)
            .then((negocios) => {
              if (!vivo) return;
              const pendiente = negocios.find((n) => n.estado === 'pendiente');
              if (pendiente) setPendingNegocio(pendiente);
              else setNoRestaurant(true);
              setLoading(false);
              cargarExtra(null);
            })
            .catch(() => {
              if (vivo) {
                setNoRestaurant(true);
                setLoading(false);
                cargarExtra(null);
              }
            });
        } else {
          setError(msg);
          setLoading(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, [usuario]);

  async function handleSwitchRest(id) {
    if (!id || id === data?.restaurante?.id) return;
    setShowRestDropdown(false);
    setLoading(true);
    setError('');
    try {
      const d = await dashboardApi.getMyRestaurant(id);
      setData(d);
      setFormData(d.restaurante);
      setEditing(false);
      setShowFicha(false);
      try {
        sessionStorage.setItem('mira_rest_activo', id);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await dashboardApi.updateRestaurant(data.restaurante.id, formData);
      setData((prev) => ({ ...prev, restaurante: { ...prev.restaurante, ...formData } }));
      setEditing(false);
      setShowFicha(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReservationChange(reservaId, action) {
    setData((prev) => {
      if (!prev) return prev;
      const newEstado =
        action === 'confirmar' ? 'completada' : action === 'completada' ? 'completada' : action === 'no_show' ? 'no_show' : 'cancelada';
      const map = (arr) => (arr || []).map((r) => (r.id === reservaId ? { ...r, estado: newEstado } : r));
      return {
        ...prev,
        proximasReservas: map(prev.proximasReservas),
        reservasHoy: map(prev.reservasHoy),
        stats: {
          ...prev.stats,
          reservasCompletadas: newEstado === 'completada' ? (prev.stats.reservasCompletadas || 0) + 1 : prev.stats.reservasCompletadas,
          reservasNoShow: newEstado === 'no_show' ? (prev.stats.reservasNoShow || 0) + 1 : prev.stats.reservasNoShow,
        },
      };
    });
  }

  async function handleExportLiquidacion() {
    if (!data) return;
    let list = data.ticketsRecientes || [];
    if (selectedMonth === '90d') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      list = list.filter((tk) => {
        const d = tk.createdAt?.toDate ? tk.createdAt.toDate() : new Date(tk.fecha || Date.now());
        return d >= cutoff;
      });
    } else if (selectedMonth === 'anio') {
      const y = new Date().getFullYear();
      list = list.filter((tk) => {
        const d = tk.createdAt?.toDate ? tk.createdAt.toDate() : new Date(tk.fecha || Date.now());
        return d.getFullYear() === y;
      });
    }
    const rows = list.map((tk) => ({
      fecha: tk.fecha || (tk.createdAt?.toDate ? tk.createdAt.toDate().toISOString().split('T')[0] : ''),
      codigo: tk.codigoReserva || tk.id.slice(0, 6),
      total: tk.totalPagado || 0,
      comision:
        tk.importeComision != null ? tk.importeComision : Math.round((tk.totalPagado || 0) * (comisionPct / 100) * 100) / 100,
      neto:
        tk.netoRestaurante != null
          ? tk.netoRestaurante
          : Math.round(((tk.totalPagado || 0) - (tk.importeComision != null ? tk.importeComision : (tk.totalPagado || 0) * (comisionPct / 100))) * 100) / 100,
      cliente: tk.clienteNombre || tk.restauranteNombre || '',
    }));
    const header = ['Fecha', 'Codigo', 'Cliente', 'Total', `Comision ${comisionPct}%`, 'Neto', 'Asistio'];
    const csv = [
      header.join(';'),
      ...rows.map((r) => [r.fecha, r.codigo, `"${r.cliente}"`, r.total.toFixed(2), r.comision.toFixed(2), r.neto.toFixed(2), 'si'].join(';')),
    ].join('\n');
    const nombre = `liquidacion-${(data.restaurante.nombre || 'restaurante').replace(/\s+/g, '_')}-${selectedMonth}-${
      new Date().toISOString().split('T')[0]
    }.csv`;
    try {
      const uri = `${FileSystem.cacheDirectory}${nombre}`;
      await FileSystem.writeAsStringAsync(uri, '\uFEFF' + csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/csv',
          dialogTitle: nombre,
          UTI: 'public.comma-separated-values-text',
        });
      }
    } catch (e) {
      Alert.alert('MIRA', e?.message || 'No se pudo exportar la liquidación');
    }
  }

  async function handleSaveAforo() {
    setSaving(true);
    try {
      await dashboardApi.updateRestaurant(data.restaurante.id, { maxReservasPorHora: Number(aforoLimit) });
      setData((prev) => ({
        ...prev,
        restaurante: { ...prev.restaurante, maxReservasPorHora: Number(aforoLimit) },
      }));
      setShowAforoModal(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRestaurant() {
    if (!newRest.nombre || !newRest.ciudad || !newRest.zona || !newRest.direccion || !newRest.categorias) {
      setError('Campos obligatorios incompletos');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const categoriasArr = newRest.categorias.split(',').map((s) => s.trim()).filter(Boolean);
      await proponerNegocio({ usuario, datos: { ...newRest, categorias: categoriasArr } });
      setCreateSuccess(true);
      setTimeout(() => {
        setShowCreateForm(false);
        setCreateSuccess(false);
        setNewRest({ ...EMPTY_REST });
        if (data) {
          dashboardApi
            .listMyRestaurants(data?.restaurante?.id)
            .then((l) => setListaRests(l))
            .catch(() => {});
          return;
        }
        setLoading(true);
        dashboardApi
          .getMyRestaurant()
          .then((d) => {
            setData(d);
            setFormData(d.restaurante);
            setNoRestaurant(false);
            setLoading(false);
          })
          .catch(() => {
            listarMisNegocios(usuario.uid)
              .then((negocios) => {
                const pendiente = negocios.find((n) => n.estado === 'pendiente');
                if (pendiente) setPendingNegocio(pendiente);
                else setNoRestaurant(true);
                setLoading(false);
              })
              .catch(() => {
                setNoRestaurant(true);
                setLoading(false);
              });
          });
      }, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function elegirLotes() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: TIPOS_LOTES, multiple: true, copyToCacheDirectory: true });
      if (!res.canceled && res.assets && res.assets.length) {
        Alert.alert('MIRA', `Subida iniciada: ${res.assets.length} ticket(s)`);
        setShowTicketModal(true);
      }
    } catch {
      /* ignore */
    }
  }

  // —— Estados de carga / vacío ——
  if (loading) {
    return (
      <AuthPagina>
        <AuthTarjeta ancho>
          <Text>{t('otros.cargando')}</Text>
        </AuthTarjeta>
      </AuthPagina>
    );
  }
  if (error && !data && !noRestaurant && !pendingNegocio) {
    return (
      <AuthPagina>
        <AuthTarjeta ancho titulo={t('dashboard.miRestaurante')}>
          <AuthError>{error}</AuthError>
        </AuthTarjeta>
      </AuthPagina>
    );
  }
  if (!data && !noRestaurant && !pendingNegocio && !showCreateForm) return null;

  if (pendingNegocio && !showCreateForm && !data) {
    return (
      <AuthPagina ancho>
        <AuthTarjeta ancho style={{ maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <View style={{ padding: 16 }}>
            <View style={estilos.cajaWarn}>
              <Text style={estilos.cajaWarnTitulo}>
                <Simbolo name="schedule" size={18} color="#92400e" /> Tu propuesta está pendiente de aprobación
              </Text>
              <Text style={[estilos.cajaWarnTxt, { marginTop: 5.6 }]}>
                <Text style={{ fontWeight: '800' }}>{pendingNegocio.nombre}</Text> ({pendingNegocio.ciudad}) está siendo
                revisada por un administrador. Te notificaremos cuando sea aprobada.
              </Text>
            </View>
            <View style={{ gap: 4, marginTop: 12 }}>
              <Text style={estilos.datoFila}>
                <Text style={{ fontWeight: '800' }}>Nombre:</Text> {pendingNegocio.nombre}
              </Text>
              <Text style={estilos.datoFila}>
                <Text style={{ fontWeight: '800' }}>Ciudad:</Text> {pendingNegocio.ciudad}
              </Text>
              <Text style={estilos.datoFila}>
                <Text style={{ fontWeight: '800' }}>Dirección:</Text> {pendingNegocio.direccion}
              </Text>
              <Text style={estilos.datoFila}>
                <Text style={{ fontWeight: '800' }}>Cocina:</Text> {(pendingNegocio.categorias || []).join(', ')}
              </Text>
              <Text style={estilos.datoFila}>
                <Text style={{ fontWeight: '800' }}>Precio:</Text> {pendingNegocio.precio}
              </Text>
            </View>
          </View>
        </AuthTarjeta>
      </AuthPagina>
    );
  }

  if (noRestaurant && !showCreateForm && !data) {
    return (
      <AuthPagina ancho>
        <AuthTarjeta ancho style={{ maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: 8 }}>
            <Simbolo name="storefront" size={40} color="#0e6b47" />
            <Text style={estilos.tituloGrande}>Aún no tienes un restaurante registrado</Text>
            <Text style={estilos.subCentro}>
              Crea uno para empezar a gestionar reservas, facturación y rendimiento operativo con el Operator Hub.
            </Text>
            <OpBtnPrimary onPress={() => setShowCreateForm(true)}>
              <Simbolo name="add_business" size={16} color="#ffffff" /> Crear mi restaurante
            </OpBtnPrimary>
          </View>
        </AuthTarjeta>
      </AuthPagina>
    );
  }

  if (showCreateForm) {
    return (
      <AuthPagina ancho>
        <AuthTarjeta ancho style={{ maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <View style={{ gap: 12 }}>
            <Text style={estilos.tituloMedio}>{data ? 'Añadir otro restaurante' : 'Crear restaurante'}</Text>
            {data ? (
              <Text style={estilos.subGrande}>
                Se enviará como nueva propuesta. Tu restaurante actual no cambia hasta que el admin la apruebe.
              </Text>
            ) : null}
            {createSuccess ? (
              <View style={estilos.cajaExito}>
                <Text style={estilos.cajaExitoTxt}>Restaurante creado correctamente</Text>
                <Text style={[estilos.cajaExitoTxt, { fontWeight: '400', marginTop: 4, fontSize: 13.1 }]}>
                  Tu propuesta está pendiente de aprobación por un administrador.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {error ? <AuthError>{error}</AuthError> : null}
                <View style={estilos.gridCampos}>
                  <OpField label="Nombre *">
                    <OpInput value={newRest.nombre} onChangeText={(v) => setNewRest((p) => ({ ...p, nombre: v }))} />
                  </OpField>
                  <OpField label="Ciudad *">
                    <OpSelect
                      value={newRest.ciudad}
                      onChange={(v) => setNewRest((p) => ({ ...p, ciudad: v }))}
                      placeholder="Elige ciudad"
                      opciones={CIUDADES_CATALUNA}
                    />
                  </OpField>
                  <OpField label="Zona *">
                    <OpInput value={newRest.zona} onChangeText={(v) => setNewRest((p) => ({ ...p, zona: v }))} />
                  </OpField>
                  <OpField label="Dirección *">
                    <OpInput value={newRest.direccion} onChangeText={(v) => setNewRest((p) => ({ ...p, direccion: v }))} />
                  </OpField>
                  <OpField label="Teléfono">
                    <OpInput
                      value={newRest.telefono}
                      onChangeText={(v) => setNewRest((p) => ({ ...p, telefono: v }))}
                      keyboardType="phone-pad"
                    />
                  </OpField>
                  <OpField label="Email">
                    <OpInput
                      value={newRest.email}
                      onChangeText={(v) => setNewRest((p) => ({ ...p, email: v }))}
                      keyboardType="email-address"
                    />
                  </OpField>
                  <OpField label="Tipo de cocina *">
                    <OpInput
                      value={newRest.categorias}
                      onChangeText={(v) => setNewRest((p) => ({ ...p, categorias: v }))}
                      placeholder="Italiana, Mexicana..."
                    />
                  </OpField>
                  <OpField label="Rango de precio *">
                    <OpSelect value={newRest.precio} onChange={(v) => setNewRest((p) => ({ ...p, precio: v }))} opciones={PRECIOS} />
                  </OpField>
                </View>
                <OpField label="Descripción">
                  <OpInput
                    value={newRest.descripcion}
                    onChangeText={(v) => setNewRest((p) => ({ ...p, descripcion: v }))}
                    multiline
                  />
                </OpField>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <OpBtnPrimary onPress={handleCreateRestaurant} disabled={creating}>
                    {creating ? t('otros.cargando') : 'Crear restaurante'}
                  </OpBtnPrimary>
                  <OpBtnGhost
                    onPress={() => {
                      setShowCreateForm(false);
                      setError('');
                    }}
                  >
                    Cancelar
                  </OpBtnGhost>
                </View>
              </View>
            )}
          </View>
        </AuthTarjeta>
      </AuthPagina>
    );
  }

  if (!data) return null;

  const { restaurante, stats, proximasReservas, reservasHoy: reservasHoyList = [], ingresosPorMes, ticketsRecientes, finanzas, reservasParaTicket = [] } = data;
  const hoyISO = new Date().toISOString().split('T')[0];
  const hoyLabel = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  // Finanzas persistidas (no texto plano) tiene prioridad sobre cálculo efímero
  const totalFacturacion = finanzas
    ? Number(finanzas.ingresosBrutos || 0)
    : Object.values(ingresosPorMes || {}).reduce((s, d) => s + (d.facturacion || 0), 0);
  const totalComisiones = finanzas ? Number(finanzas.comisiones || 0) : Object.values(ingresosPorMes || {}).reduce((s, d) => s + (d.comisiones || 0), 0);
  const totalTickets = finanzas ? Number(finanzas.totalTickets || 0) : ticketsRecientes.length;
  const reservasNoCanceladas = stats.reservasNoCanceladas || stats.totalReservas - stats.reservasCanceladas || stats.totalReservas;
  const ticketsPendientesSubir = Math.max(0, reservasNoCanceladas - totalTickets);
  const totalComensales =
    finanzas && Number(finanzas.comensalesAtendidos)
      ? Number(finanzas.comensalesAtendidos)
      : (data.reservasHoy?.length ? data.reservasHoy : proximasReservas).reduce((s, r) => s + (Number(r.comensales) || 0), 0) +
        ((stats.reservasCompletadas * 2.2) | 0);
  const baseImponible = totalFacturacion / 1.1;
  const costePorPax = totalComensales ? totalComisiones / totalComensales : 0;
  const ticketMedio = stats.ticketPromedio || (totalTickets ? totalFacturacion / totalTickets : 0);
  const comisionPct = Number(restaurante.comisionPct) || 8;
  const tasaEfec = totalFacturacion > 0 ? Math.round((totalComisiones / totalFacturacion) * 1000) / 10 : 0;
  const pctConciliados = reservasNoCanceladas > 0 ? Math.min(100, Math.round((totalTickets / reservasNoCanceladas) * 1000) / 10) : 0;
  const paxPorTicket = totalTickets > 0 ? totalComensales / totalTickets : 0;
  const aforo = Number(restaurante.aforo) || (Number(restaurante.maxReservasPorHora) > 0 ? Number(restaurante.maxReservasPorHora) * 10 : null);
  const hoyComensales = (reservasHoyList || []).reduce((s, r) => s + (Number(r.comensales) || 0), 0);
  const almuerzo = (reservasHoyList || []).filter((r) => (r.hora || '') < '16:00').reduce((s, r) => s + (Number(r.comensales) || 0), 0);
  const cena = hoyComensales - almuerzo;
  const ocupacion = aforo ? Math.min(100, Math.round((hoyComensales / aforo) * 100)) || 0 : 0;
  const pctAlm = aforo ? Math.round((almuerzo / aforo) * 100) : 0;
  const pctCena = aforo ? Math.round((cena / aforo) * 100) : 0;
  const pctLibre = Math.max(0, 100 - pctAlm - pctCena);

  // Forecast grouping by fecha
  const byDate = {};
  (proximasReservas || []).forEach((r) => {
    const d = r.fecha;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  });
  const capDia = aforo || Number(restaurante.maxReservasPorHora) * 10 || 50;
  const forecastDays = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5)
    .map(([fecha, arr]) => {
      const d = new Date(fecha + 'T00:00:00');
      const dow = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
      const day = d.getDate();
      const pax = arr.reduce((s, r) => s + (Number(r.comensales) || 0), 0);
      const res = arr.length;
      const p = Math.min(100, Math.round((pax / capDia) * 100));
      const tag = p >= 98 ? 'SOLD OUT' : p > 80 ? 'ALTA DEMANDA' : 'DISPONIBLE';
      const tagClass = p >= 98 ? 'soldout' : p > 80 ? 'alta' : '';
      return { dow, day, fecha, res, pax, pct: p, tag, tagClass };
    });
  const forecastToShow = forecastDays;

  const nombreCorto = restaurante.nombre || 'Mi Restaurante';
  const dir = restaurante.direccion_completa || restaurante.direccion || restaurante.direccionCompleta || '-';
  const restId = restaurante.id ? `#RES-${String(restaurante.id).slice(-4).toUpperCase()}` : '#RES-????';

  // Reservas dedup + filtros (espejo de los IIFE del web)
  const allMap = new Map();
  [...(reservasHoyList || []), ...(proximasReservas || [])].forEach((x) => allMap.set(x.id, x));
  const allReservas = Array.from(allMap.values());
  let baseReservas;
  if (filtroTodas) {
    baseReservas = allReservas
      .filter((r) => r.fecha >= hoyISO && !isCanceladaLocal(r.estado))
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  } else if (selectedForecast) {
    baseReservas = allReservas
      .filter((r) => r.fecha === selectedForecast && !isCanceladaLocal(r.estado))
      .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  } else {
    baseReservas = allReservas
      .filter((r) => r.fecha === fechaFiltro && !isCanceladaLocal(r.estado))
      .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  }
  const cntReservas = baseReservas.length;
  const filasReservas = baseReservas.slice(0, showAllReservas ? 50 : 8);
  const visiblesAccion = baseReservas.slice(0, 3);
  const shownReservas = Math.min(showAllReservas ? 50 : 8, cntReservas);
  const paxEnFecha = (data?.proximasReservas || [])
    .concat(data?.reservasHoy || [])
    .filter((r) => r.fecha === fechaFiltro && !isCanceladaLocal(r.estado))
    .reduce((s, r) => s + (Number(r.comensales) || 0), 0);

  return (
    <View style={s.contenedor}>
      <View style={s.hub}>
        {showRestDropdown ? (
          <Pressable
            style={[StyleSheet.absoluteFill, { zIndex: 30 }]}
            onPress={() => setShowRestDropdown(false)}
            accessibilityLabel="Cerrar selector"
          />
        ) : null}

        {/* Top Operational Control Bar */}
        <View style={s.topbar}>
          <View style={s.topbarLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View style={s.liveBadge}>
                <PuntoPulso color={op.secondary} size={6} periodo={1600} />
                <Text style={s.liveBadgeTxt}>Operator Hub Live</Text>
              </View>
              <Text style={{ fontSize: 10.9, color: op.outline }}>/</Text>
              <Text style={{ fontSize: 10.9, fontWeight: '600', color: op.onVariant, fontFamily: FUENTES.textoSemi }}>
                Gestión de Restaurantes &amp; Rendimiento Operativo
              </Text>
            </View>
            <View style={s.topbarMeta}>
              <View style={s.restSelectorWrap}>
                <Pressable onPress={toggleRestDropdown} accessibilityRole="button" style={s.restSelector}>
                  <View style={s.restAvatar}>
                    <Text style={{ fontWeight: '800', fontSize: 12.8, color: op.onPrimary, fontFamily: FUENTES.textoExtra }}>
                      {initials(nombreCorto)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.restName}>
                      <Text style={{ fontWeight: '700', fontSize: 15.2, color: op.onSurface, fontFamily: FUENTES.textoBold }} numberOfLines={1}>
                        {nombreCorto}
                      </Text>
                      <Simbolo name="verified" size={12} color={op.secondary} />
                    </View>
                    <Text style={s.restSub} numberOfLines={1}>
                      ID {restId} · {dir.slice(0, 28)}
                    </Text>
                  </View>
                  <Simbolo name={showRestDropdown ? 'expand_less' : 'unfold_more'} size={16} color={op.onVariant} />
                </Pressable>
                {showRestDropdown ? (
                  <View style={[s.restDropdown, { zIndex: 40 }]}>
                    <Text style={s.restDropdownTitle}>
                      {loadingRestList && listaRests.length === 0 ? 'Cargando…' : `Tus restaurantes (${listaRests.length})`}
                    </Text>
                    {listaRests.length === 0 && !loadingRestList ? <Text style={s.restDropdownEmpty}>Sin restaurantes</Text> : null}
                    {listaRests.map((r) => {
                      const activo = r.id === data.restaurante.id;
                      return (
                        <Pressable
                          key={r.id}
                          onPress={() => handleSwitchRest(r.id)}
                          accessibilityRole="menuitem"
                          accessibilityState={{ selected: activo }}
                          style={[s.restDropdownItem, activo && s.restDropdownItemActive]}
                        >
                          <Simbolo name={activo ? 'check_circle' : 'radio_button_unchecked'} size={16} color={activo ? '#005134' : '#9ca3af'} />
                          <View style={s.restDropdownInfo}>
                            <Text style={s.restDropdownNombre} numberOfLines={1}>
                              {r.nombre || 'Restaurante'}
                            </Text>
                            <Text style={s.restDropdownMeta} numberOfLines={1}>
                              {r.ciudad || '—'} · ID {`#RES-${String(r.id).slice(-4).toUpperCase()}`}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                    {loadingRestList && listaRests.length > 0 ? <Text style={s.restDropdownEmpty}>Actualizando…</Text> : null}
                  </View>
                ) : null}
              </View>
              <View style={s.dateChip}>
                <Simbolo name="date_range" size={16} color={op.onSurface} />
                <OpSelect
                  variant="chip"
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  opciones={[
                    { valor: 'este-mes', etiqueta: `Este mes - ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}` },
                    { valor: '90d', etiqueta: 'Últimos 90 días' },
                    { valor: 'anio', etiqueta: 'Año en curso' },
                  ]}
                />
              </View>
              <View style={s.premiumBadge}>
                <Simbolo name="workspace_premium" size={12} color={op.premiumColor} />
                <Text style={s.premiumBadgeTxt}>{restaurante.activo !== false ? 'Partner Activo' : 'Partner Inactivo'}</Text>
              </View>
            </View>
          </View>
          <View style={s.topbarActions}>
            <OpBtnPrimary onPress={() => setShowTicketModal(true)}>
              <Simbolo name="cloud_upload" size={16} color="#ffffff" /> Cargar Tickets &amp; Facturación
            </OpBtnPrimary>
            <OpBtnGhost onPress={handleExportLiquidacion}>
              <Simbolo name="download" size={16} color={op.onSurface} /> Exportar Liquidación
            </OpBtnGhost>
            <OpBtnGhost onPress={() => setShowFicha((v) => !v)}>
              <Simbolo name="storefront" size={16} color={op.onSurface} /> Ficha
            </OpBtnGhost>
          </View>
        </View>

        {/* Inline Ficha edit (collapsible) */}
        {showFicha ? (
          <View style={[s.panel, editing && s.panelEditing]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 15.2, fontFamily: FUENTES.textoExtra }}>Ficha del restaurante</Text>
              <OpBtnGhost onPress={() => setShowFicha(false)} style={s.btnSinFondo} txtStyle={{ fontSize: 15.2 }}>
                <Simbolo name="close" size={18} color={op.onSurface} />
              </OpBtnGhost>
            </View>
                <View style={[estilos.gridCampos, { marginTop: 8 }]}>
              {FICHA_FIELDS.map(([field, label, tipo]) => (
                <OpField key={field} label={label}>
                  {editing ? (
                    tipo === 'select' ? (
                      <OpSelect value={formData[field] || ''} onChange={(v) => handleEditChange(field, v)} placeholder="Elige ciudad" opciones={CIUDADES_CATALUNA} />
                    ) : (
                      <OpInput
                        value={String(formData[field] ?? '')}
                        onChangeText={(v) => handleEditChange(field, v)}
                        keyboardType={tipo === 'number' ? 'numeric' : tipo === 'email' ? 'email-address' : tipo === 'text' && field === 'telefono' ? 'phone-pad' : 'default'}
                      />
                    )
                  ) : (
                    <Text style={{ fontSize: 13.6, paddingVertical: 5.6, color: op.onSurface, fontFamily: FUENTES.texto }}>
                      {restaurante[field] || '-'}
                    </Text>
                  )}
                </OpField>
              ))}
              <OpField label="Activo">
                {editing ? (
                  <OpSelect
                    value={formData.activo ? 'si' : 'no'}
                    onChange={(v) => handleEditChange('activo', v === 'si')}
                    opciones={[
                      { valor: 'si', etiqueta: 'Sí' },
                      { valor: 'no', etiqueta: 'No' },
                    ]}
                  />
                ) : (
                  <OpStatus cls={restaurante.activo ? 'confirmada' : 'cancelada'}>{restaurante.activo ? 'Activo' : 'Inactivo'}</OpStatus>
                )}
              </OpField>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {editing ? (
                <>
                  <OpBtnPrimary onPress={handleSave} disabled={saving}>
                    {saving ? t('otros.cargando') : 'Guardar'}
                  </OpBtnPrimary>
                  <OpBtnGhost
                    onPress={() => {
                      setEditing(false);
                      setFormData(restaurante);
                    }}
                  >
                    Cancelar
                  </OpBtnGhost>
                </>
              ) : (
                <OpBtnGhost onPress={() => setEditing(true)}>Editar</OpBtnGhost>
              )}
            </View>
          </View>
        ) : null}

        {/* Primary KPIs */}
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <View style={s.kpiHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.kpiLabel}>Ingresos brutos restaurante</Text>
                <Text style={s.kpiSub}>Total generado en sala</Text>
              </View>
              <View style={[s.kpiIcon, s.kpiIcon1]}>
                <Simbolo name="account_balance_wallet" size={18} color={op.primary} />
              </View>
            </View>
            <View style={s.kpiFila}>
              <Text style={s.kpiValue}>{euro(totalFacturacion || stats.totalFacturacion || 0)}</Text>
              <View style={[s.kpiTrend, s.kpiTrendNeutral]}>
                <Text style={{ fontSize: 10.9, fontWeight: '700', color: op.onSurface }}>{totalTickets} tickets</Text>
              </View>
            </View>
            <View style={s.kpiFoot}>
              <Text style={s.kpiFootLabel}>Base imponible sin IVA:</Text>
              <Text style={s.kpiFootVal}>{euro(baseImponible)}</Text>
            </View>
          </View>

          <View style={s.kpiCard}>
            <View style={s.kpiHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.kpiLabel}>Comisión MIRA</Text>
                <Text style={s.kpiSub}>Deducible en liquidación neta · {comisionPct}%</Text>
              </View>
              <View style={[s.kpiIcon, s.kpiIcon2]}>
                <Simbolo name="receipt_long" size={18} color={op.secondary} />
              </View>
            </View>
            <View style={s.kpiFila}>
              <Text style={s.kpiValue}>{euro(totalComisiones || stats.totalComisiones || 0)}</Text>
              <View style={[s.kpiTrend, s.kpiTrendNeutral]}>
                <Text style={{ fontSize: 10.9, fontWeight: '700', color: op.onSurface }}>Tasa efec. {tasaEfec}%</Text>
              </View>
            </View>
            <View style={s.kpiFoot}>
              <Text style={s.kpiFootLabel}>Coste por pax confirmado:</Text>
              <Text style={[s.kpiFootVal, { color: op.secondary }]}>
                {euro(costePorPax)} / comensal
              </Text>
            </View>
          </View>

          <View style={s.kpiCard}>
            <View style={s.kpiHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.kpiLabel}>Total tickets gestionados</Text>
                <Text style={s.kpiSub}>Cuentas cerradas conciliadas</Text>
              </View>
              <View style={[s.kpiIcon, s.kpiIcon3]}>
                <Simbolo name="point_of_sale" size={18} color={op.tertiary} />
              </View>
            </View>
            <View style={s.kpiFila}>
              <Text style={s.kpiValue}>
                {totalTickets} <Text style={s.kpiValueUd}>uds</Text>
              </Text>
              <View style={[s.kpiTrend, s.kpiTrendUp]}>
                <Simbolo name="check_circle" size={12} color={op.onSecondaryContainer} />
                <Text style={{ fontSize: 10.9, fontWeight: '700', color: op.onSecondaryContainer }}>{pctConciliados}% OK</Text>
              </View>
            </View>
            <View style={s.kpiFoot}>
              <Text style={s.kpiFootLabel}>Ticket medio por comanda:</Text>
              <Text style={s.kpiFootVal}>{euro(ticketMedio)}</Text>
            </View>
          </View>

          <View style={s.kpiCard}>
            <View style={s.kpiHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.kpiLabel}>Comensales atendidos</Text>
                <Text style={s.kpiSub}>Pax sentados &amp; facturados</Text>
              </View>
              <View style={[s.kpiIcon, s.kpiIcon4]}>
                <Simbolo name="groups" size={18} color={op.tertiary} />
              </View>
            </View>
            <View style={s.kpiFila}>
              <Text style={s.kpiValue}>
                {totalComensales || 0} <Text style={s.kpiValueUd}>pax</Text>
              </Text>
              <View style={[s.kpiTrend, s.kpiTrendPax]}>
                <Text style={{ fontSize: 10.9, fontWeight: '700', color: '#002112' }}>
                  {totalTickets ? paxPorTicket.toFixed(2) : '—'} pax/res
                </Text>
              </View>
            </View>
            <View style={s.kpiFoot}>
              <Text style={s.kpiFootLabel}>Tickets pendientes:</Text>
              <Text style={[s.kpiFootVal, { fontSize: 10.6 }]}>{ticketsPendientesSubir}</Text>
            </View>
          </View>
        </View>

        {/* Reconciliation */}
        <View style={s.reco}>
          <View style={s.recoHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.recoTitle}>
                Carga y Conciliación de Tickets de Venta <View style={s.recoBadge}><Text style={{ fontSize: 9.9, fontWeight: '700', color: op.onSecondaryContainer }}>Sync Agora / Revo TPV</Text></View>
              </Text>
              <Text style={[s.panelSub, { marginTop: 2.4 }]}>
                Sube los reportes Z, tickets de caja o facturas simplificadas para validar liquidaciones con MIRA Pay y pasarela
                bancaria.
              </Text>
            </View>
            <View style={s.syncChip}>
              <PuntoPulso color={op.secondary} size={7} periodo={1000} />
              <Text style={{ fontSize: 10.9, fontFamily: MONO }}>
                Tickets conciliados: <Text style={{ fontWeight: '800' }}>{totalTickets}</Text>
              </Text>
            </View>
          </View>
          <View style={s.recoGrid}>
            <Pressable onPress={elegirLotes} accessibilityRole="button" style={({ pressed }) => [s.drop, { opacity: pressed ? 0.9 : 1 }]}>
              <View style={s.dropIcon}>
                <Simbolo name="upload_file" size={28} color={op.primary} />
              </View>
              <Text style={s.dropH4}>Arrastra o sube tickets Z, cierres de caja o facturas TPV</Text>
              <Text style={s.dropP}>
                Soporta formatos <Text style={s.monoChico}>.PDF, .CSV, .XML, .JPG, .PNG</Text> (máx. 45MB por lote)
              </Text>
              <View style={s.dropFila}>
                <OpBtnGhost light small>
                  <Simbolo name="folder_open" size={14} color={op.primary} /> Examinar archivos
                </OpBtnGhost>
                <Text style={{ fontSize: 10.9, color: op.outline }}>o pega desde el portapapeles</Text>
              </View>
            </Pressable>
            <View style={s.ledger}>
              <View style={s.ledgerHead}>
                <Text style={{ fontSize: 9.9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: op.onVariant }}>
                  Últimos lotes conciliados
                </Text>
                <OpLink onPress={() => setShowHistorial(true)}>Ver Historial ({ticketsRecientes.length})</OpLink>
              </View>
              {(ticketsRecientes.slice(0, 3).length ? ticketsRecientes.slice(0, 3) : []).length === 0 ? (
                <Text style={{ fontSize: 10.9, color: op.onVariant, padding: 8 }}>Sin tickets conciliados todavía.</Text>
              ) : null}
              {(ticketsRecientes.slice(0, 3).length ? ticketsRecientes.slice(0, 3) : []).map((item) => {
                const nombre = String(item.fileName || item.nombre || '');
                const revisi = String(item.estado).includes('Revisi');
                const icono = nombre.endsWith('.pdf') ? 'picture_as_pdf' : nombre.endsWith('.csv') ? 'table_chart' : 'receipt';
                const iconoColor = revisi ? op.error : nombre.endsWith('.csv') ? op.tertiary : op.primary;
                return (
                  <View key={item.id} style={s.ledgerItem}>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <Simbolo name={icono} size={18} color={iconoColor} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 10.9, fontWeight: '600', fontFamily: MONO }} numberOfLines={1}>
                          {item.fileName || item.nombre || item.codigoReserva || String(item.id || '').slice(0, 8) || 'Ticket'}
                        </Text>
                        <Text style={{ fontSize: 9.9, color: op.outline, fontFamily: FUENTES.texto }}>
                          {item.fecha || (item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : '')}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={{ fontFamily: MONO, fontWeight: '700', fontSize: 11.5 }}>{euro(item.totalPagado ?? item.total ?? 0)}</Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3.2,
                          fontSize: 9.3,
                          paddingVertical: 1.6,
                          paddingHorizontal: 4.8,
                          borderRadius: 4.8,
                          marginTop: 2,
                          backgroundColor: revisi ? '#ffdad6' : op.secondaryContainer,
                        }}
                      >
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: revisi ? '#93000a' : op.onSecondaryContainer }} />
                        <Text style={{ fontSize: 9.3, fontWeight: '700', color: revisi ? '#93000a' : op.onSecondaryContainer }}>
                          {item.estado || 'Conciliado'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Dual: Reservas del Día + Previsión */}
        <View style={s.dual}>
          <View style={s.panel}>
            <View style={s.panelHead}>
              <View style={{ flex: 1 }}>
                <View style={s.panelTitle}>
                  <Text style={{ fontWeight: '700', fontSize: 15.2, color: op.onSurface, fontFamily: FUENTES.textoBold }}>
                    {filtroTodas
                      ? 'Reservas futuras'
                      : `Reservas del ${new Date(fechaFiltro + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}
                  </Text>
                  <Text style={s.panelDate}>
                    {filtroTodas ? `todas · ${stats.totalReservas}` : fechaFiltro === hoyISO ? hoyLabel : fechaFiltro}
                  </Text>
                </View>
                <Text style={s.panelSub}>
                  {filtroTodas
                    ? 'Todas las reservas futuras (puedes cancelar cualquiera)'
                    : 'Filtra por fecha arriba para ver y gestionar cualquier día'}
                </Text>
              </View>
              <View style={[s.syncChip, { alignSelf: 'flex-start' }]}>
                <Simbolo name="cloud_download" size={14} color={op.primary} />
                <Text style={{ fontSize: 10.9, fontWeight: '700', color: op.primary }}>
                  {hoyComensales} hoy · {paxEnFecha} en {fechaFiltro === hoyISO ? 'hoy' : fechaFiltro.slice(5)}
                </Text>
              </View>
            </View>
            <View style={s.occupancy}>
              <View style={s.occupancyHead}>
                <Text style={s.occupancyHeadTxt}>
                  {aforo ? `Ocupación estimada de sala: ${ocupacion}%` : 'Pax de hoy (sin aforo configurado)'}
                </Text>
                <Text style={s.occupancyHeadMono}>
                  {hoyComensales}
                  {aforo ? ` / ${aforo} Asientos` : ' pax'}
                </Text>
              </View>
              <View style={s.bar}>
                <View style={[s.barAlmuerzo, { width: `${pctAlm}%` }]} />
                <View style={[s.barCena, { width: `${pctCena}%` }]} />
                <View style={[s.barLibre, { width: `${pctLibre}%` }]} />
              </View>
              <View style={s.legend}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: op.primary }]} />
                  <Text style={s.legendTxt}>Almuerzo ({almuerzo} pax)</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#4ae183' }]} />
                  <Text style={s.legendTxt}>Cena ({cena} pax)</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: op.outlineVariant }]} />
                  <Text style={s.legendTxt}>Disponible ({aforo ? Math.max(0, aforo - hoyComensales) : '—'} pax)</Text>
                </View>
              </View>
            </View>

            {/* Navegación por fecha — permite ver cualquier día y cancelar */}
            <View style={s.dateNav}>
              <Pressable
                onPress={() => {
                  const d = new Date(fechaFiltro);
                  d.setDate(d.getDate() - 1);
                  setFechaFiltro(d.toISOString().split('T')[0]);
                  setFiltroTodas(false);
                  setSelectedForecast(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Día anterior"
                style={({ pressed }) => [s.dateNavBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Simbolo name="chevron_left" size={16} color={op.onSurface} />
              </Pressable>
              <TextInput
                value={fechaTexto}
                onChangeText={(v) => {
                  setFechaTexto(v);
                  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                    setFechaFiltro(v);
                    setFiltroTodas(false);
                    setSelectedForecast(null);
                  }
                }}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={op.outline}
                maxLength={10}
                style={[s.dateInput, { color: op.onSurface }]}
              />
              <Pressable
                onPress={() => {
                  const d = new Date(fechaFiltro);
                  d.setDate(d.getDate() + 1);
                  setFechaFiltro(d.toISOString().split('T')[0]);
                  setFiltroTodas(false);
                  setSelectedForecast(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Día siguiente"
                style={({ pressed }) => [s.dateNavBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Simbolo name="chevron_right" size={16} color={op.onSurface} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setFechaFiltro(hoyISO);
                  setFiltroTodas(false);
                  setSelectedForecast(null);
                }}
                style={[
                  s.dateChipBtn,
                  fechaFiltro === hoyISO && !filtroTodas ? s.dateChipBtnActive : null,
                  { paddingVertical: 6 },
                ]}
              >
                <Text
                  style={[
                    s.dateChipBtnTxt,
                    fechaFiltro === hoyISO && !filtroTodas ? s.dateChipBtnActiveTxt : null,
                  ]}
                >
                  Hoy
                </Text>
              </Pressable>
              <Pressable onPress={() => setFiltroTodas((v) => !v)} style={[s.dateChipBtn, filtroTodas ? s.dateChipBtnActive : null]}>
                <Text style={[s.dateChipBtnTxt, filtroTodas ? s.dateChipBtnActiveTxt : null]}>
                  {filtroTodas ? 'Filtrar por fecha' : 'Ver todas futuras'}
                </Text>
              </Pressable>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dateChips} contentContainerStyle={{ gap: 4.8 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const iso = d.toISOString().split('T')[0];
                  const count = (data?.proximasReservas || [])
                    .concat(data?.reservasHoy || [])
                    .filter((r) => r.fecha === iso && String(r.estado).toLowerCase() !== 'cancelada').length;
                  const label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                  const activo = fechaFiltro === iso && !filtroTodas;
                  return (
                    <Pressable
                      key={iso}
                      onPress={() => {
                        setFechaFiltro(iso);
                        setFiltroTodas(false);
                        setSelectedForecast(null);
                      }}
                      accessibilityLabel={`${count} reservas`}
                      style={[s.dateChipBtn, activo ? s.dateChipBtnActive : null]}
                    >
                      <Text style={[s.dateChipBtnTxt, activo ? s.dateChipBtnActiveTxt : null]}>
                        {label} {count ? `·${count}` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <Tabla minWidth={sumar(COLS_RESERVAS)}>
              <View style={s.tableHead}>
                <Th w={COLS_RESERVAS[0]}>Hora / ID</Th>
                <Th w={COLS_RESERVAS[1]}>Comensal &amp; Notas</Th>
                <Th w={COLS_RESERVAS[2]} centro>
                  Pax
                </Th>
                <Th w={COLS_RESERVAS[3]}>Mesa</Th>
                <Th w={COLS_RESERVAS[4]}>Estado</Th>
                <Th w={COLS_RESERVAS[5]} derecha>
                  Ticket TPV
                </Th>
              </View>
              {filasReservas.length === 0 ? (
                <View style={s.tr}>
                  <Td w={sumar(COLS_RESERVAS)}>
                    <Text style={s.empty}>
                      Sin reservas {filtroTodas ? 'futuras' : `para ${fechaFiltro}`} —{' '}
                      {filtroTodas
                        ? 'no hay reservas próximas'
                        : `prueba ${fechaFiltro === hoyISO ? 'otro día o "Ver todas futuras"' : 'otra fecha'}`}{' '}
                    </Text>
                  </Td>
                </View>
              ) : (
                filasReservas.map((r) => {
                  const badge = estadoToBadge(r.estado);
                  const mesa = r.mesa || (r.terraza ? 'T-04' : `Mesa ${String(r.id).slice(-2)}`);
                  const comensal = r.usuarioNombre || r.usuarioEmail || r.email || 'Cliente';
                  const codigo = r.codigo || `#BK-${String(r.id).slice(-4).toUpperCase()}`;
                  const ticket = r.ticketTotal != null ? euro(r.ticketTotal) : r.totalPagado != null ? euro(r.totalPagado) : 'Pendiente servicio';
                  const notas = r.comentarios
                    ? r.comentarios.slice(0, 28)
                    : String(r.usuarioEmail || '').includes('vip') || Number(r.comensales) >= 6
                      ? 'MIRA VIP'
                      : 'Sin notas';
                  return (
                    <View key={r.id} style={s.tr}>
                      <Td w={COLS_RESERVAS[0]}>
                        <Text style={[s.mono, { fontWeight: '800', fontSize: 12.5 }]}>{r.hora || '-'}</Text>
                        <Text style={s.monoClaro}>{codigo}</Text>
                      </Td>
                      <Td w={COLS_RESERVAS[1]}>
                        <Text style={{ fontWeight: '700', fontSize: 12.5, fontFamily: FUENTES.textoBold }}>{comensal}</Text>
                        <Text style={{ fontSize: 9.9, color: op.onVariant, fontFamily: FUENTES.texto }} numberOfLines={1}>
                          {notas}
                        </Text>
                      </Td>
                      <Td w={COLS_RESERVAS[2]} centro>
                        <Text style={[s.mono, { fontSize: 12.5 }]}>{r.comensales || 0}</Text>
                      </Td>
                      <Td w={COLS_RESERVAS[3]}>
                        <View style={s.mesa}>
                          <Text style={{ fontSize: 10.6, fontWeight: '700', fontFamily: MONO }}>{mesa}</Text>
                        </View>
                      </Td>
                      <Td w={COLS_RESERVAS[4]}>
                        <OpStatus cls={badge.cls}>{badge.label}</OpStatus>
                      </Td>
                      <Td w={COLS_RESERVAS[5]} derecha>
                        <Text style={[s.mono, { fontWeight: '700', fontSize: 12.5, textAlign: 'right' }]}>
                          {String(ticket).includes('Pendiente') ? (
                            <Text style={{ fontSize: 9.9, color: op.outline, fontWeight: '400' }}>{ticket}</Text>
                          ) : (
                            ticket
                          )}
                        </Text>
                      </Td>
                    </View>
                  );
                })
              )}
            </Tabla>
            <View style={estilos.tablaPie}>
              <Text style={{ fontSize: 10.9, color: op.onVariant, fontFamily: FUENTES.texto, flex: 1 }}>
                Mostrando {shownReservas} de {cntReservas} para {filtroTodas ? 'futuro' : fechaFiltro}
              </Text>
              <OpLink onPress={() => setShowAllReservas((v) => !v)} size={11.5}>
                {showAllReservas ? 'Ver menos' : 'Abrir cuadrante de sala completo'}{' '}
                <Simbolo name={showAllReservas ? 'expand_less' : 'chevron_right'} size={12} color={op.primary} />
              </OpLink>
            </View>
            {/* Acciones rápidas: se muestran para las reservas visibles (cualquier fecha) para poder cancelar/confirmar */}
            {visiblesAccion.length > 0 ? (
              <View style={{ marginTop: 8, gap: 6.4 }}>
                <Text style={{ fontSize: 10.9, fontWeight: '700', color: op.onVariant, fontFamily: FUENTES.textoBold }}>
                  Acción rápida sobre {filtroTodas ? 'próximas' : fechaFiltro}:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6.4 }}>
                  {visiblesAccion.map((r) => (
                    <ReservationActions
                      key={'act-' + r.id}
                      reserva={r}
                      comisionPct={comisionPct}
                      onStatusChange={(id, act) => {
                        handleReservationChange(id, act);
                        if (act === 'confirmar' || act === 'no_show' || act === 'cancelada') {
                          setTimeout(
                            () =>
                              dashboardApi
                                .getMyRestaurant()
                                .then((d) => setData((prev) => ({ ...prev, ...d, restaurante: d.restaurante || prev.restaurante })))
                                .catch(() => {}),
                            400,
                          );
                        }
                      }}
                      t={t}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <View style={s.panel}>
            <View style={s.panelHead}>
              <View style={{ flex: 1 }}>
                <Text style={[s.panelTitle, { fontWeight: '700' }]}>Previsión y Calendario</Text>
                <Text style={s.panelSub}>Próximas reservas reales</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '800', fontSize: 17.6, color: op.primary, fontFamily: FUENTES.textoExtra }}>
                  {stats.totalReservas || 0}
                </Text>
                <Text style={{ fontSize: 9.9, color: op.onVariant, fontFamily: FUENTES.texto }}>{totalComensales || 0} pax acumulados</Text>
              </View>
            </View>
            <View style={s.forecastList}>
              {forecastToShow.map((d) => (
                <Pressable
                  key={d.fecha}
                  onPress={() => setSelectedForecast((prev) => (prev === d.fecha ? null : d.fecha))}
                  style={[s.forecastItem, selectedForecast === d.fecha ? s.forecastItemActivo : null]}
                >
                  <View style={s.forecastIzq}>
                    <View style={s.cal}>
                      <Text style={s.calDay}>{d.dow}</Text>
                      <Text style={s.calNum}>{d.day}</Text>
                    </View>
                    <View style={s.forecastMeta}>
                      <View style={s.forecastTitle}>
                        <Text style={{ fontWeight: '700', fontSize: 12.5, fontFamily: FUENTES.textoBold }}>
                          {d.dow} · {d.fecha}
                        </Text>
                        <View style={[s.tag, d.tagClass === 'soldout' ? s.tagSoldout : s.tagClass === 'alta' ? s.tagAlta : null]}>
                          <Text
                            style={[
                              { fontSize: 9.3, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: FUENTES.textoExtra },
                              d.tagClass === 'soldout'
                                ? { color: '#93000a' }
                                : d.tagClass === 'alta'
                                  ? { color: op.onSecondaryContainer }
                                  : null,
                            ]}
                          >
                            {d.tag}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.forecastSub}>
                        {d.pax} pax confirmados ({d.res} res) · {d.fecha}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 12.5, color: d.pct >= 98 ? op.secondary : op.primary }}>
                      {d.pct}%
                    </Text>
                    <Text style={{ fontFamily: MONO, fontSize: 9.3, color: op.outline }}>{d.res} en espera</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {forecastToShow.length === 0 ? <Text style={s.forecastEmpty}>Sin reservas próximas para prever.</Text> : null}
            {selectedForecast ? (
              <View style={s.filtroBanner}>
                <Text style={s.filtroBannerTxt}>Filtrando reservas por {selectedForecast}</Text>
                <Pressable onPress={() => setSelectedForecast(null)}>
                  <Text style={{ fontWeight: '800', color: op.onSecondaryContainer }}>Quitar ×</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={s.aforoFoot}>
              <Text style={{ fontSize: 10.9, color: op.onVariant, fontFamily: FUENTES.texto }}>Aforo por hora configurable</Text>
              <OpLink
                onPress={() => {
                  setAforoLimit(String(data?.restaurante?.maxReservasPorHora || 12));
                  setShowAforoModal(true);
                }}
                size={11.5}
              >
                Configurar aforos
              </OpLink>
            </View>
          </View>
        </View>

        {/* Directorio & Liquidaciones */}
        <View style={s.directory}>
          <View style={s.dirHead}>
            <View>
              <Text style={s.dirTitulo}>Directorio de Restaurantes &amp; Liquidaciones</Text>
              <Text style={{ fontSize: 10.9, color: op.onVariant, marginTop: 2, fontFamily: FUENTES.texto }}>
                Conmuta de restaurante, supervisa tickets pendientes y verifica retenciones por sede.
              </Text>
            </View>
            <View style={s.dirFilters}>
              <Pressable
                onPress={() => setDirFilter('todos')}
                style={[s.dirFilter, dirFilter === 'todos' ? s.dirFilterActivo : null]}
              >
                <Text style={[s.dirFilterTxt, dirFilter === 'todos' ? s.dirFilterTxtActivo : null]}>
                  Todos ({listaRests.length || 1})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDirFilter('premium')}
                style={[s.dirFilter, dirFilter === 'premium' ? s.dirFilterActivo : null]}
              >
                <Text style={[s.dirFilterTxt, dirFilter === 'premium' ? s.dirFilterTxtActivo : null]}>
                  Activos ({restaurante.activo !== false ? 1 : 0})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDirFilter('incidencias')}
                style={[s.dirFilter, dirFilter === 'incidencias' ? s.dirFilterActivo : null]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3.2 }}>
                  <Text style={[s.dirFilterTxt, dirFilter === 'incidencias' ? s.dirFilterTxtActivo : null]}>
                    Con Incidencias
                  </Text>
                  <View style={{ width: 5.6, height: 5.6, borderRadius: 3, backgroundColor: op.error }} />
                </View>
              </Pressable>
              <Pressable
                onPress={() => setDirFilter('pendiente')}
                style={[s.dirFilter, dirFilter === 'pendiente' ? s.dirFilterActivo : null]}
              >
                <Text style={[s.dirFilterTxt, dirFilter === 'pendiente' ? s.dirFilterTxtActivo : null]}>
                  Pendiente de Tickets ({ticketsPendientesSubir})
                </Text>
              </Pressable>
            </View>
          </View>

          <Tabla minWidth={sumar(COLS_DIRECTORIO)}>
            <View style={s.tableHead}>
              <Th w={COLS_DIRECTORIO[0]}>Restaurante &amp; ID</Th>
              <Th w={COLS_DIRECTORIO[1]}>Ciudad / Zona</Th>
              <Th w={COLS_DIRECTORIO[2]} derecha>
                Ingresos Mes (Bruto)
              </Th>
              <Th w={COLS_DIRECTORIO[3]} derecha>
                Comisión MIRA
              </Th>
              <Th w={COLS_DIRECTORIO[4]} centro>
                Tickets Subidos
              </Th>
              <Th w={COLS_DIRECTORIO[5]} derecha>
                Próx. Reservas
              </Th>
              <Th w={COLS_DIRECTORIO[6]} derecha>
                Acciones
              </Th>
            </View>
            {dirFilter === 'incidencias' ? (
              <View style={s.tr}>
                <Text style={[s.empty, { width: sumar(COLS_DIRECTORIO) }]}>
                  Sin incidencias críticas · Buen trabajo <Simbolo name="verified" size={14} color={op.secondary} />
                </Text>
              </View>
            ) : dirFilter === 'pendiente' && ticketsPendientesSubir <= 0 ? (
              <View style={s.tr}>
                <Text style={[s.empty, { width: sumar(COLS_DIRECTORIO) }]}>
                  Al día — no hay tickets pendientes de subir
                </Text>
              </View>
            ) : (
              <View style={[s.tr, s.dirRowActive]}>
                <Td w={COLS_DIRECTORIO[0]}>
                  <View style={{ flexDirection: 'row', gap: 6.4, alignItems: 'center' }}>
                    <View style={{ width: 7.2, height: 7.2, borderRadius: 4, backgroundColor: op.primary }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', gap: 3.2, alignItems: 'center' }}>
                        <Text
                          style={{
                            fontWeight: '800',
                            fontSize: 12.5,
                            color: op.primary,
                            fontFamily: FUENTES.textoExtra,
                          }}
                          numberOfLines={1}
                        >
                          {nombreCorto}
                        </Text>
                        <Simbolo name="star" size={10} color={op.secondary} />
                      </View>
                      <Text style={s.monoClaro} numberOfLines={1}>
                        {restId} · {restaurante.ciudad || '-'}
                      </Text>
                    </View>
                  </View>
                </Td>
                <Td w={COLS_DIRECTORIO[1]}>
                  <Text style={{ fontSize: 11.5, fontFamily: FUENTES.texto }} numberOfLines={1}>
                    {restaurante.ciudad || '-'}
                    {restaurante.zona ? ` · ${restaurante.zona}` : ''}
                  </Text>
                </Td>
                <Td w={COLS_DIRECTORIO[2]} derecha>
                  <Text style={[s.mono, { fontSize: 12.5 }]}>{euro(totalFacturacion)}</Text>
                </Td>
                <Td w={COLS_DIRECTORIO[3]} derecha>
                  <Text style={[s.mono, { fontSize: 11.5, color: op.secondary }]}>{euro(totalComisiones)}</Text>
                </Td>
                <Td w={COLS_DIRECTORIO[4]} centro>
                  <Text
                    style={{
                      fontFamily: MONO,
                      fontSize: 10.9,
                      fontWeight: '700',
                      backgroundColor: op.surfaceLowest,
                      paddingVertical: 2.4,
                      paddingHorizontal: 6.4,
                      borderRadius: 4.8,
                      overflow: 'hidden',
                    }}
                  >
                    1 / 1
                  </Text>
                </Td>
                <Td w={COLS_DIRECTORIO[5]} derecha>
                  <Text style={{ fontFamily: MONO, fontSize: 11.5 }}>{stats.totalReservas} res.</Text>
                </Td>
                <Td w={COLS_DIRECTORIO[6]} derecha>
                  <OpBtnPrimary small onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
                    Panel Activo
                  </OpBtnPrimary>
                </Td>
              </View>
            )}
          </Tabla>

          <View style={estilos.tablaPie}>
            <Text style={{ fontSize: 10.9, color: op.onVariant, fontFamily: FUENTES.texto }}>
              Mostrando 1 de {listaRests.length || 1} restaurantes
            </Text>
            <View
              style={{
                paddingVertical: 2.4,
                paddingHorizontal: 5.6,
                borderRadius: 4,
                backgroundColor: op.primaryContainer,
              }}
            >
              <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 10.9, color: op.onPrimary }}>1</Text>
            </View>
          </View>

          <View style={{ marginTop: 12, gap: 12 }}>
            <RevenueLineChart data={ingresosPorMes} title={t('dashboard.evolucionIngresos') || 'Evolución ingresos'} />
            <ReservationsPieChart
              completadas={stats.reservasCompletadas}
              canceladas={stats.reservasCanceladas}
              noShow={stats.reservasNoShow}
              pendientes={stats.reservasPendientes}
              title={t('dashboard.distribucionReservas') || 'Distribución reservas'}
            />
          </View>
        </View>

        {/* Pie de consistencia con la web */}
        <Text style={s.piePagina}>
          Operator Hub · MIRA · Consistencia con web: tipografía Plus Jakarta Sans, tokens Operator, glass &amp; shadows
        </Text>

        {/* Modal: cargar tickets */}
        <OpModal visible={showTicketModal} onClose={() => setShowTicketModal(false)} maxWidth={608}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', gap: 9.6, alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 35.2,
                  height: 35.2,
                  borderRadius: 9.6,
                  backgroundColor: op.primaryContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Simbolo name="receipt" size={20} color={op.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 15.2, fontFamily: FUENTES.textoExtra }}>
                  Cargar Tickets &amp; Facturas
                </Text>
                <Text style={{ fontSize: 10.9, color: op.onVariant, fontFamily: FUENTES.texto }}>
                  {nombreCorto} · ID {restId} · Comisión {comisionPct}%
                </Text>
              </View>
            </View>
            <OpBtnGhost onPress={() => setShowTicketModal(false)} style={{ padding: 3.2 }}>
              <Simbolo name="close" size={18} color={op.outline} />
            </OpBtnGhost>
          </View>

          <View style={s.infoBox}>
            <Simbolo name="info" size={20} color={op.primary} style={{ marginTop: 1.6 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoBoxTxt}>
                <Text style={{ fontWeight: '800', fontFamily: FUENTES.textoBold }}>¿Cómo funciona?</Text> Indica el importe
                total pagado por el cliente. Calculamos automáticamente la comisión MIRA del {comisionPct}% y el neto para tu
                liquidación. Marca si el cliente asistió para confirmar la reserva o como no-show.
              </Text>
              <View style={{ flexDirection: 'row', gap: 6.4, flexWrap: 'wrap', marginTop: 4.8 }}>
                <Text
                  style={{
                    backgroundColor: op.surfaceLowest,
                    paddingVertical: 3.2,
                    paddingHorizontal: 7.2,
                    borderRadius: 6.4,
                    borderColor: op.outlineVariant,
                    borderWidth: 1,
                    fontSize: 10.9,
                    color: op.onSurface,
                    fontFamily: FUENTES.texto,
                  }}
                >
                  Ej: 50€ → comisión {euro((50 * comisionPct) / 100)} · neto {euro(50 - (50 * comisionPct) / 100)}
                </Text>
                <Text
                  style={{
                    backgroundColor: op.surfaceLowest,
                    paddingVertical: 3.2,
                    paddingHorizontal: 7.2,
                    borderRadius: 6.4,
                    borderColor: op.outlineVariant,
                    borderWidth: 1,
                    fontSize: 10.9,
                    color: op.onSurface,
                    fontFamily: FUENTES.texto,
                  }}
                >
                  Asistió: <Text style={{ color: op.primary, fontWeight: '700' }}>completada</Text> · No asistió:{' '}
                  <Text style={{ color: op.error, fontWeight: '700' }}>no-show</Text>
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 9.6 }}>
            {reservasParaTicket.length ? (
              reservasParaTicket.slice(0, 12).map((r) => (
                <TicketUpload
                  key={'tk-' + r.id}
                  reserva={r}
                  comisionPct={comisionPct}
                  onUploaded={(id, estado) => {
                    handleReservationChange(id, estado === 'no_show' ? 'no_show' : 'confirmar');
                    dashboardApi
                      .getMyRestaurant()
                      .then((d) => setData((prev) => ({ ...prev, ...d, restaurante: d.restaurante || prev.restaurante })))
                      .catch(() => {});
                  }}
                  t={t}
                />
              ))
            ) : (
              <OpEmpty style={{ padding: 24 }}>
                Todas las reservas activas ya tienen ticket · Las nuevas reservas aparecerán aquí
              </OpEmpty>
            )}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 6.4,
              borderTopWidth: 1,
              borderTopColor: op.surfaceLow,
            }}
          >
            <Text style={{ fontSize: 10.9, color: op.onVariant, fontFamily: FUENTES.texto }}>
              {reservasParaTicket.length} reservas sin ticket · {totalTickets} subidos
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3.2 }}>
              <Simbolo name="lock" size={14} color={op.onVariant} />
              <Text style={{ fontSize: 10.9, color: op.onVariant, fontFamily: FUENTES.texto }}>
                Comisión {comisionPct}% · Liquidación MIRA
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <OpBtnGhost onPress={() => setShowTicketModal(false)}>Cerrar</OpBtnGhost>
          </View>
        </OpModal>

        {/* Modal: historial de tickets */}
        <OpModal visible={showHistorial} onClose={() => setShowHistorial(false)} maxWidth={768}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 15.2, fontFamily: FUENTES.textoExtra }}>
              Historial de Tickets ({ticketsRecientes.length})
            </Text>
            <View style={{ flexDirection: 'row', gap: 6.4 }}>
              <OpBtnGhost small onPress={handleExportLiquidacion}>
                <Simbolo name="download" size={13} color={op.onSurface} /> Exportar CSV
              </OpBtnGhost>
              <OpBtnGhost small onPress={() => setShowHistorial(false)}>
                <Simbolo name="close" size={16} color={op.onSurface} />
              </OpBtnGhost>
            </View>
          </View>
          <ScrollView style={{ maxHeight: 440 }}>
            <Tabla minWidth={sumar(COLS_TICKETS)}>
              <View style={s.tableHead}>
                <Th w={COLS_TICKETS[0]}>Fecha</Th>
                <Th w={COLS_TICKETS[1]}>Código</Th>
                <Th w={COLS_TICKETS[2]}>Cliente</Th>
                <Th w={COLS_TICKETS[3]} derecha>
                  Total
                </Th>
                <Th w={COLS_TICKETS[4]} derecha>
                  Comisión {comisionPct}%
                </Th>
                <Th w={COLS_TICKETS[5]} derecha>
                  Neto
                </Th>
                <Th w={COLS_TICKETS[6]}>Estado</Th>
              </View>
              {ticketsRecientes.length ? (
                ticketsRecientes.map((ti) => (
                  <View key={ti.id} style={s.tr}>
                    <Td w={COLS_TICKETS[0]}>
                      <Text style={[s.monoClaro, { fontSize: 11.5 }]}>
                        {ti.fecha || (ti.createdAt?.toDate ? ti.createdAt.toDate().toLocaleDateString() : '-')}
                      </Text>
                    </Td>
                    <Td w={COLS_TICKETS[1]}>
                      <Text style={s.monoClaro}>{ti.codigoReserva || (ti.id || '').slice(0, 6)}</Text>
                    </Td>
                    <Td w={COLS_TICKETS[2]}>
                      <Text style={{ fontSize: 11.5, fontFamily: FUENTES.texto }} numberOfLines={1}>
                        {ti.clienteNombre || ti.restauranteNombre || '-'}
                      </Text>
                    </Td>
                    <Td w={COLS_TICKETS[3]} derecha>
                      <Text style={[s.mono, { fontSize: 11.5 }]}>{euro(ti.totalPagado || 0)}</Text>
                    </Td>
                    <Td w={COLS_TICKETS[4]} derecha>
                      <Text style={[s.mono, { fontSize: 11.5, color: op.error }]}>
                        {euro(
                          ti.importeComision != null
                            ? ti.importeComision
                            : Math.round((ti.totalPagado || 0) * (comisionPct / 100) * 100) / 100,
                        )}
                      </Text>
                    </Td>
                    <Td w={COLS_TICKETS[5]} derecha>
                      <Text style={[s.mono, { fontSize: 11.5, color: op.primary }]}>
                        {euro(
                          ti.netoRestaurante != null
                            ? ti.netoRestaurante
                            : Math.round(
                                ((ti.totalPagado || 0) -
                                  (ti.importeComision != null
                                    ? ti.importeComision
                                    : (ti.totalPagado || 0) * (comisionPct / 100))) * 100,
                              ) / 100,
                        )}
                      </Text>
                    </Td>
                    <Td w={COLS_TICKETS[6]}>
                      <OpStatus cls={ti.asistio === false ? 'no_show' : 'pagado'}>
                        {ti.asistio === false ? 'No-show' : 'Conciliado'}
                      </OpStatus>
                    </Td>
                  </View>
                ))
              ) : (
                <View style={s.tr}>
                  <OpEmpty style={{ width: sumar(COLS_TICKETS) }}>Sin tickets conciliados aún</OpEmpty>
                </View>
              )}
            </Tabla>
          </ScrollView>
        </OpModal>

        {/* Modal: aforo por hora */}
        <OpModal visible={showAforoModal} onClose={() => setShowAforoModal(false)} maxWidth={448}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 15.2, fontFamily: FUENTES.textoExtra }}>Configurar aforos</Text>
            <OpBtnGhost onPress={() => setShowAforoModal(false)} style={{ padding: 3.2 }}>
              <Simbolo name="close" size={18} color={op.outline} />
            </OpBtnGhost>
          </View>
          <Text style={{ fontSize: 12.5, color: op.onVariant, lineHeight: 18, fontFamily: FUENTES.texto }}>
            Define el máximo de reservas por franja horaria (slots {['13:00', '14:00', '15:00', '20:00', '21:00', '22:00'].join(', ')}
            ). Se guarda en la ficha del restaurante y aplica al control de disponibilidad.
          </Text>
          <OpField label="Máx. reservas por hora">
            <OpInput value={aforoLimit} onChangeText={setAforoLimit} keyboardType="numeric" />
          </OpField>
          <Text
            style={{
              fontSize: 10.9,
              backgroundColor: op.surfaceLow,
              padding: 8,
              borderRadius: 6.4,
              color: op.onSurface,
              fontFamily: FUENTES.texto,
            }}
          >
            Actual: <Text style={{ fontWeight: '800' }}>{data?.restaurante?.maxReservasPorHora || 12} pax/hora</Text> ·
            Nuevo: <Text style={{ fontWeight: '800' }}>{aforoLimit}</Text>
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6.4 }}>
            <OpBtnGhost onPress={() => setShowAforoModal(false)}>Cancelar</OpBtnGhost>
            <OpBtnPrimary onPress={handleSaveAforo} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar aforo'}
            </OpBtnPrimary>
          </View>
        </OpModal>
      </View>
    </View>
  );
}

function sumar(cols) {
  return cols.reduce((a, b) => a + b, 0);
}

const estilos = StyleSheet.create({
  cajaWarn: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
  },
  cajaWarnTxt: { color: '#92400e', fontSize: 13.1, fontFamily: FUENTES.texto, lineHeight: 19 },
  cajaWarnTitulo: { color: '#92400e', fontWeight: '800', fontSize: 13.1, flexDirection: 'row', alignItems: 'center', gap: 6.4, fontFamily: FUENTES.textoExtra },
  datoFila: { fontSize: 13.1, color: '#3f4942', fontFamily: FUENTES.texto },
  tituloGrande: { fontWeight: '800', fontSize: 19.2, fontFamily: FUENTES.textoExtra },
  tituloMedio: { fontWeight: '800', fontSize: 17.6, fontFamily: FUENTES.textoExtra },
  subCentro: { color: '#3f4942', fontSize: 13.6, maxWidth: 480, textAlign: 'center', fontFamily: FUENTES.texto },
  subGrande: { fontSize: 13.1, color: '#3f4942', fontFamily: FUENTES.texto },
  cajaExito: { backgroundColor: '#d1fae5', padding: 16, borderRadius: 12, alignItems: 'center' },
  cajaExitoTxt: { color: '#065f46', fontWeight: '800', fontSize: 13.1, textAlign: 'center', fontFamily: FUENTES.textoBold },
  gridCampos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tablaPie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 9.6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f3ff',
    gap: 8,
    flexWrap: 'wrap',
  },
});
