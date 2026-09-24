/** OpsDashboard — vista "Dashboard General", con datos reales (espejo del web). */
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getOpsOverview, nombreRestauranteDe, descargarCSV, csvReservas, mensajeErrorFirestore } from './opsData.js';
import { OpsLineChart, OpsDonut, OpsHBars } from './OpsCharts.jsx';
import { resolverIncidencia } from '../../services/incidenciaApi.js';
import { aprobarNegocio, rechazarNegocio } from '../../services/negocioApi.js';
import { useOpsStyles, MONO } from './OpsTokens';
import { OpsCard, OpsBtn, OpsPill, OpsStatusPill, OpsEmpty, OpsError, OpsTabla, OpsTd, OpsTr, OpsSeg } from './OpsUi';
import { Simbolo } from '../shell/Simbolo';

const COLS_TOP = [
  { titulo: 'Restaurante', w: 180 },
  { titulo: 'Cubiertos hoy', w: 100, derecha: true },
  { titulo: 'Comisión real', w: 110, derecha: true },
  { titulo: 'Reservas', w: 90, derecha: true },
];

function euros(n) {
  return `${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function antiguedad(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

/** Card KPI (.ops-kpi). */
function Kpi({ label, icono, iconoCls, valor, peligro, pill, pillTipo, subIzq, subDer, barPct, barCls }) {
  const { s } = useOpsStyles();
  return (
    <View style={s.kpi}>
      <View style={s.kpiTop}>
        <Text style={s.kpiLabel}>{label}</Text>
        <Simbolo name={icono} size={20} style={[s.kpiIcon, iconoCls === 'green' ? s.kpiIconGreen : iconoCls === 'red' ? s.kpiIconRed : iconoCls === 'blue' ? s.kpiIconBlue : null]} />
      </View>
      <Text style={[s.kpiValue, peligro ? s.kpiValueDanger : null]}>{valor}</Text>
      <View style={s.kpiTrend}>
        <OpsPill tipo={pillTipo}>{pill}</OpsPill>
      </View>
      <View style={s.kpiSub}>
        <Text style={s.kpiSubTxt}>{subIzq}</Text>
        <Text style={s.kpiSubStrong}>{subDer}</Text>
      </View>
      <View style={s.bar}>
        <View
          style={[
            s.barFill,
            barCls === 'blue' ? s.barFillBlue : barCls === 'red' ? s.barFillRed : null,
            { width: `${Math.max(0, Math.min(100, barPct || 0))}%` },
          ]}
        />
      </View>
    </View>
  );
}

export default function OpsDashboard() {
  const { s, op } = useOpsStyles();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [granularidad, setGranularidad] = useState('dias');
  const [resolviendo, setResolviendo] = useState('');

  useEffect(() => {
    let vivo = true;
    getOpsOverview()
      .then((d) => {
        if (vivo) {
          setDatos(d);
          setCargando(false);
        }
      })
      .catch((e) => {
        if (vivo) {
          setError(mensajeErrorFirestore(e, 'reservas'));
          setCargando(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function quitar(item, accion) {
    setError('');
    setResolviendo(item.id);
    try {
      if (accion === 'rechazar') await rechazarNegocio(item.id);
      else if (item.kind === 'negocio') await aprobarNegocio(item.id);
      else await resolverIncidencia(item.id);
      setDatos((prev) => ({
        ...prev,
        incidenciasPreview: prev.incidenciasPreview.filter((x) => x.id !== item.id),
        kpis: { ...prev.kpis, incidenciasPendientes: Math.max(0, prev.kpis.incidenciasPendientes - 1) },
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setResolviendo('');
    }
  }

  if (cargando) {
    return <OpsCard estado={{ titulo: 'Cargando operativa…', sub: 'Agregando reservas, restaurantes e incidencias.' }} />;
  }
  if (error && !datos) {
    return (
      <OpsCard estado={{ titulo: 'No se pudo cargar el panel' }}>
        <OpsError>{error}</OpsError>
      </OpsCard>
    );
  }

  const { kpis, serie, porEstado, ocupacion, incidenciasPreview, top, feed, avisos = [] } = datos;
  const estadosDonut = [
    { nombre: 'Confirmadas', valor: (porEstado.confirmada || 0) + (porEstado.completada || 0), color: '#0e6b47' },
    { nombre: 'Pendientes', valor: porEstado.pendiente || 0, color: '#6bfe9c' },
    { nombre: 'Canceladas', valor: porEstado.cancelada || 0, color: '#c9a227' },
    { nombre: 'No-show', valor: porEstado.no_show || 0, color: '#ba1a1a' },
  ];
  const totalPax = serie.reduce((a, d) => a + d.pax, 0);
  const facturacionTotal = Number(kpis.facturacionTotal) || 0;
  const comisionTotal = Number(kpis.comisionTotal) || 0;
  const mediaComensal = Number(kpis.mediaComensal) || 0;
  const comisionPct = Number(kpis.comisionPct) || 8;
  const ticketPromedio = Number(kpis.ticketPromedio) || 0;
  const ticketsTotal = Number(kpis.ticketsTotal) || 0;
  const altas7d = Number(kpis.altas7d) || 0;

  return (
    <View style={{ gap: 20 }}>
      <OpsError>{error}</OpsError>
      {avisos.length > 0 ? (
        <OpsError>
          Sin permiso de lectura en: {avisos.join(', ')}. Se muestra el resto con datos reales. Pide al admin de Firebase que añada
          lectura de operador en las reglas (ver firestore.rules del repo).
        </OpsError>
      ) : null}

      {/* Hero */}
      <View style={s.hero}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View style={s.liveChip}>
              <View style={s.dotLive} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: op.primary }}>MIRA Enterprise HQ</Text>
            </View>
            <Text style={s.sync}>· Sincronización en vivo</Text>
          </View>
          <Text style={s.heroTitle}>Panel de Control Operativo & Revenue</Text>
          <Text style={s.heroP}>
            Visión global en tiempo real de reservas, comisiones reales y estado de la red gastronómica.
          </Text>
        </View>
        <View style={s.actions}>
          <OpsBtn
            icono="download"
            onPress={() => {
              const c = csvReservas(feed);
              descargarCSV('facturas.csv', c.cabeceras, c.filas);
            }}
          >
            Descargar Facturas
          </OpsBtn>
          <OpsBtn
            icono="file_present"
            onPress={() => {
              const c = csvReservas(feed);
              descargarCSV('reporte-fiscal.csv', c.cabeceras, c.filas);
            }}
          >
            Exportar Reporte Fiscal
          </OpsBtn>
        </View>
      </View>

      {/* KPIs */}
      <View style={s.kpis}>
        <Kpi
          label="Ingresos brutos (tickets)"
          icono="euro"
          valor={`€${euros(facturacionTotal)}`}
          pill={`${ticketsTotal} tickets`}
          subIzq="Ticket medio"
          subDer={`€${euros(ticketPromedio)}`}
          barPct={ticketsTotal ? 100 : 0}
        />
        <Kpi
          label="Comisión MIRA (real)"
          icono="receipt_long"
          valor={`€${euros(comisionTotal)}`}
          pill={`${comisionPct}% base`}
          subIzq="Media comensal"
          subDer={`€${euros(mediaComensal)}`}
          barPct={facturacionTotal ? 100 : 0}
        />
        <Kpi
          label="Reservas Globales"
          icono="event_available"
          iconoCls="green"
          valor={kpis.reservasTotal.toLocaleString('es-ES')}
          pill={`${kpis.asistenciaPct}% asistencia`}
          subIzq="Tasa asistencia"
          subDer={`${kpis.asistenciaPct}%`}
          barPct={Math.min(100, kpis.asistenciaPct)}
        />
        <Kpi
          label="Restaurantes Activos"
          icono="storefront"
          iconoCls="blue"
          valor={`${kpis.restaurantesActivos.toLocaleString('es-ES')} locales`}
          pill={`${altas7d} altas 7d`}
          pillTipo="info"
          subIzq="Cubiertos 14 días"
          subDer={`${totalPax.toLocaleString('es-ES')} pax`}
          barPct={kpis.restaurantesActivos ? 100 : 0}
          barCls="blue"
        />
        <Kpi
          label="Disputas & Soporte"
          icono="warning"
          iconoCls="red"
          valor={`${kpis.incidenciasPendientes} Pendientes`}
          peligro
          pill={`${kpis.criticas} críticas`}
          pillTipo="warn"
          subIzq="Por revisar"
          subDer={String(kpis.incidenciasPendientes)}
          barPct={Math.min(100, kpis.incidenciasPendientes * 10)}
          barCls="red"
        />
        <Kpi
          label="Comunidad MIRA"
          icono="loyalty"
          iconoCls="green"
          valor={`${kpis.usuariosTotal.toLocaleString('es-ES')} users`}
          pill="puntos MIRA"
          pillTipo="info"
          subIzq="Comensales"
          subDer="red activa"
          barPct={kpis.usuariosTotal ? 100 : 0}
        />
      </View>

      {/* Gráfica + donut */}
      <View style={s.grid}>
        <OpsCard
          titulo="Evolución de Comisiones y Facturación Bruta"
          sub="Comida (13–15h) y cena (20–22h) · últimos 14 días · datos reales de tickets"
          right={
            <OpsSeg
              valor={granularidad}
              onChange={setGranularidad}
              opciones={[
                { valor: 'horas', etiqueta: 'Horas' },
                { valor: 'dias', etiqueta: 'Días' },
                { valor: 'meses', etiqueta: 'Meses' },
              ]}
            />
          }
        >
          <View style={s.metrics3}>
            <View style={s.metric}>
              <View style={s.metricLabel}>
                <View style={[s.metricDot, { backgroundColor: '#0e6b47' }]} />
                <Text>Comisiones MIRA (real)</Text>
              </View>
              <Text style={s.metricValue}>€{euros(comisionTotal)}</Text>
            </View>
            <View style={s.metric}>
              <View style={s.metricLabel}>
                <View style={[s.metricDot, { backgroundColor: '#004393' }]} />
                <Text>Cubiertos 14 días</Text>
              </View>
              <Text style={s.metricValue}>{totalPax.toLocaleString('es-ES')}</Text>
            </View>
            <View style={s.metric}>
              <View style={s.metricLabel}>
                <View style={[s.metricDot, { backgroundColor: '#006d37' }]} />
                <Text>Asistencia</Text>
              </View>
              <Text style={s.metricValue}>{kpis.asistenciaPct}%</Text>
            </View>
          </View>
          <OpsLineChart serie={serie} modo={granularidad} />
        </OpsCard>

        <OpsCard
          titulo="Estado de Reservas"
          sub="Distribución real por estado"
          right={<Simbolo name="devices" size={20} color={op.outline} />}
        >
          <OpsDonut segmentos={estadosDonut} centro={kpis.reservasTotal} centroSub="PAX" />
          <View style={{ backgroundColor: op.surfaceLow, borderRadius: 8, padding: 12, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: op.onVariant, textTransform: 'uppercase', letterSpacing: 0.55 }}>
                Ocupación por servicio (7 días)
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: op.primary }}>Capacidad sala</Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <OpsHBars
                filas={[
                  { nombre: 'Comida (13:00 - 15:00)', valor: ocupacion.comida.pax, texto: `${ocupacion.comida.pax} pax`, clase: '' },
                  { nombre: 'Cena (20:00 - 22:00)', valor: ocupacion.cena.pax, texto: `${ocupacion.cena.pax} pax (pico)`, clase: 'blue' },
                ]}
              />
            </View>
          </View>
        </OpsCard>
      </View>

      {/* Incidencias + Top */}
      <View style={s.grid}>
        <OpsCard
          titulo="● Incidencias & Disputas Operativas"
          right={kpis.criticas > 0 ? <OpsPill tipo="warn">{kpis.criticas} críticas de atención inmediata</OpsPill> : null}
        >
          <View style={s.incList}>
            {incidenciasPreview.length === 0 ? <OpsEmpty>Sin incidencias pendientes. Todo en orden.</OpsEmpty> : null}
            {incidenciasPreview.map((it) => (
              <View key={`${it.kind}-${it.id}`} style={s.inc}>
                <View style={s.incMain}>
                  <Simbolo
                    name={it.kind === 'negocio' ? 'loyalty' : 'credit_card_off'}
                    size={20}
                    style={[s.incIcon, it.kind === 'negocio' ? s.incIconGrey : s.incIconRed]}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.incTitulo}>
                      <Text style={s.incTitulo}>{it.nombre || it.nombreRestaurante || 'Incidencia'}</Text>
                      <OpsPill tipo="warn">{it.kind === 'negocio' ? 'Nuevo local' : it.motivo || 'Soporte'}</OpsPill>
                    </View>
                    <Text style={s.incTexto}>
                      {it.kind === 'negocio'
                        ? `${it.ciudad || ''} · ${(it.categorias || []).join(', ')} · propuesta de empresa pendiente de revisión.`
                        : (it.mensaje || '').slice(0, 140)}
                    </Text>
                    <View style={s.incMeta}>
                      <Text style={{ fontSize: 11, color: op.onVariant }}>{it.email || ''}</Text>
                      <Text style={{ fontSize: 11, color: op.onVariant }}>·</Text>
                      <Text style={{ fontSize: 11, color: op.onVariant }}>{antiguedad(it.creado)}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.incAcciones}>
                  <OpsBtn tipo="primary" sm disabled={resolviendo === it.id} onPress={() => quitar(it, 'aprobar')}>
                    {it.kind === 'negocio' ? 'Aprobar' : 'Resolver'}
                  </OpsBtn>
                  {it.kind === 'negocio' ? (
                    <OpsBtn sm disabled={resolviendo === it.id} onPress={() => quitar(it, 'rechazar')}>
                      Rechazar
                    </OpsBtn>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          <View style={s.cardFoot}>
            <Text style={s.muted}>{kpis.incidenciasPendientes} totales pendientes</Text>
          </View>
        </OpsCard>

        <OpsCard
          titulo="Top Cubiertos de Hoy & Auditoría"
          sub={`Comisiones reales de tickets emitidos hoy · ${comisionPct}% sobre el importe pagado`}
        >
          <OpsTabla cols={COLS_TOP}>
            {top.length === 0 ? (
              <OpsTr>
                <OpsTd w={COLS_TOP.reduce((a, c) => a + c.w, 0)} centro>
                  <OpsEmpty>Sin servicio hoy todavía.</OpsEmpty>
                </OpsTd>
              </OpsTr>
            ) : null}
            {top.map((t) => (
              <OpsTr key={t.id}>
                <OpsTd w={COLS_TOP[0].w}>
                  <View style={s.restCell}>
                    <Text style={s.restIni}>{(t.nombre || '?').slice(0, 2).toUpperCase()}</Text>
                    <Text style={[s.tdTxt, { fontWeight: '700' }]} numberOfLines={1}>
                      {t.nombre}
                    </Text>
                  </View>
                </OpsTd>
                <OpsTd w={COLS_TOP[1].w} derecha>
                  <Text style={[s.tdTxt, s.num, { fontFamily: MONO }]}>{t.paxHoy} pax</Text>
                </OpsTd>
                <OpsTd w={COLS_TOP[2].w} derecha>
                  <Text style={[s.tdTxt, s.num, { fontFamily: MONO }]}>€{euros(t.comisionHoy)}</Text>
                </OpsTd>
                <OpsTd w={COLS_TOP[3].w} derecha>
                  <Text style={[s.tdTxt, s.num, { fontFamily: MONO }]}>{t.reservasHoy}</Text>
                </OpsTd>
              </OpsTr>
            ))}
          </OpsTabla>
          <View style={s.cardFoot}>
            <Text style={s.muted}>Red global operacional</Text>
          </View>
        </OpsCard>
      </View>

      {/* Feed en vivo */}
      <OpsCard
        titulo="● Feed de Reservas en Tiempo Real (Live Ops)"
        right={<OpsPill>Flujo de reservas activo</OpsPill>}
      >
        <View style={s.feed}>
          {feed.length === 0 ? <OpsEmpty>Sin reservas registradas todavía.</OpsEmpty> : null}
          {feed.map((r) => (
            <View key={r.id} style={s.feedCard}>
              <View style={s.feedTop}>
                <Text style={s.feedId}>#{r.codigo || String(r.id).slice(0, 6).toUpperCase()}</Text>
                <OpsStatusPill tipo={r.estado === 'cancelada' || r.estado === 'no_show' ? 'danger' : r.estado === 'pendiente' ? 'info' : 'ok'}>
                  {r.estado === 'completada'
                    ? 'Completada'
                    : r.estado === 'cancelada'
                      ? 'Cancelada'
                      : r.estado === 'no_show'
                        ? 'No-show'
                        : r.estado === 'confirmada'
                          ? 'Confirmada'
                          : 'Pendiente'}
                </OpsStatusPill>
              </View>
              <View>
                <Text style={s.feedName} numberOfLines={1}>
                  {r.usuarioNombre || r.usuarioEmail || 'Comensal'}
                </Text>
                <Text style={s.feedRest} numberOfLines={1}>
                  {nombreRestauranteDe(r)}
                </Text>
                <View style={s.feedMeta}>
                  <Simbolo name="schedule" size={14} color={op.onVariant} />
                  <Text style={{ fontSize: 12, color: op.onVariant }}>
                    {r.fecha} {r.hora}
                  </Text>
                  <Text style={{ fontSize: 12, color: op.onVariant }}>·</Text>
                  <Simbolo name="group" size={14} color={op.onVariant} />
                  <Text style={{ fontSize: 12, color: op.onVariant }}>{r.comensales} pax</Text>
                </View>
              </View>
              <View style={s.feedFoot}>
                <Text style={{ fontSize: 12, color: op.onVariant }}>
                  {r.comisionReal ? 'Comisión real:' : 'Comisión (pendiente ticket):'}
                </Text>
                <Text style={s.feedFootStrong}>{r.comisionReal ? `+€${Number(r.comision).toFixed(2)}` : '—'}</Text>
              </View>
            </View>
          ))}
        </View>
      </OpsCard>
    </View>
  );
}
