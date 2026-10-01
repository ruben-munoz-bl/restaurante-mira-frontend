/** OpsFinanzas — agregados mensuales con datos REALES de tickets. */
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getOpsOverview, descargarCSV, csvReservas, mensajeErrorFirestore, nombreRestauranteDe, getReservasGlobales } from './opsData.js';
import { OpsLineChart } from './OpsCharts.jsx';
import { useOpsStyles, MONO } from './OpsTokens';
import { OpsCard, OpsBtn, OpsEmpty, OpsError, OpsTabla, OpsTd, OpsTr } from './OpsUi';

const COLS = [
  { titulo: 'Mes', w: 92 },
  { titulo: 'Tickets', w: 80, derecha: true },
  { titulo: 'Facturación real', w: 140, derecha: true },
  { titulo: 'Comisión real', w: 140, derecha: true },
];

function euros(n, dec = 2) {
  return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function OpsFinanzas() {
  const { s } = useOpsStyles();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
          setError(mensajeErrorFirestore(e, 'reservas/tickets'));
          setCargando(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function exportar() {
    try {
      const lista = await getReservasGlobales({ limite: 500 });
      const c = csvReservas(lista);
      descargarCSV('reporte-fiscal.csv', c.cabeceras, c.filas);
    } catch (e) {
      setError(mensajeErrorFirestore(e, 'reservas'));
    }
  }

  if (cargando) return <OpsCard estado={{ titulo: 'Cargando finanzas…' }} />;
  if (error && !datos) {
    return (
      <OpsCard estado={{ titulo: 'Error' }}>
        <OpsError>{error}</OpsError>
      </OpsCard>
    );
  }

  const porMes = {};
  datos.serie.forEach((d) => {
    const k = d.fecha.slice(0, 7);
    if (!porMes[k]) porMes[k] = { facturacion: 0, comisiones: 0, tickets: 0, reservas: 0 };
    porMes[k].comisiones = Math.round((porMes[k].comisiones + (d.comisiones || 0)) * 100) / 100;
    porMes[k].facturacion = Math.round((porMes[k].facturacion + (d.facturacion || 0)) * 100) / 100;
    porMes[k].tickets += d.tickets || 0;
    porMes[k].reservas += d.reservas || 0;
  });
  const meses = Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b));
  const facturacionTotal = Number(datos.kpis.facturacionTotal) || 0;
  const comisionTotal = Number(datos.kpis.comisionTotal) || 0;
  const comisionPct = Number(datos.kpis.comisionPct) || 8;

  return (
    <View style={{ gap: 20 }}>
      <OpsCard
        titulo="Finanzas & Comisiones"
        sub={`Datos reales de tickets · comisión ${comisionPct}% · últimos 14 días`}
        right={
          <OpsBtn sm icono="file_present" onPress={exportar}>
            Exportar Reporte Fiscal
          </OpsBtn>
        }
        alerta={error}
      >
        <View style={s.metrics3}>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Comisiones (real)</Text>
            <Text style={s.metricValue}>€{euros(comisionTotal)}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Facturación bruta (real)</Text>
            <Text style={s.metricValue}>€{euros(facturacionTotal, 0)}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Asistencia</Text>
            <Text style={s.metricValue}>{datos.kpis.asistenciaPct}%</Text>
          </View>
        </View>
        <OpsLineChart serie={datos.serie} modo="meses" />
      </OpsCard>

      <OpsCard titulo="Detalle mensual">
        <OpsTabla cols={COLS}>
          {meses.map(([m, d]) => (
            <OpsTr key={m}>
              <OpsTd w={COLS[0].w}>
                <Text style={[s.tdTxt, { fontWeight: '700' }]}>{m}</Text>
              </OpsTd>
              <OpsTd w={COLS[1].w} derecha>
                <Text style={[s.tdTxt, s.num, { fontFamily: MONO }]}>{d.tickets}</Text>
              </OpsTd>
              <OpsTd w={COLS[2].w} derecha>
                <Text style={[s.tdTxt, s.num, { fontFamily: MONO }]}>€{euros(d.facturacion, 0)}</Text>
              </OpsTd>
              <OpsTd w={COLS[3].w} derecha>
                <Text style={[s.tdTxt, s.num, { fontFamily: MONO }]}>€{euros(d.comisiones)}</Text>
              </OpsTd>
            </OpsTr>
          ))}
          {meses.length === 0 ? (
            <OpsTr>
              <OpsTd w={COLS.reduce((a, c) => a + c.w, 0)} centro>
                <OpsEmpty>Sin movimientos.</OpsEmpty>
              </OpsTd>
            </OpsTr>
          ) : null}
        </OpsTabla>
        <Text style={[s.muted, { marginTop: 10 }]}>
          Feed usado: {datos.feed.length} últimas reservas ({datos.feed.map((r) => nombreRestauranteDe(r)).slice(0, 3).join(', ')}
          {datos.feed.length > 3 ? '…' : ''}).
        </Text>
      </OpsCard>
    </View>
  );
}
