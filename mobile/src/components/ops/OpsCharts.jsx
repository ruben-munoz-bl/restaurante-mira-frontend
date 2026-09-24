/**
 * Gráficas del panel Ops — con gifted-charts (la del web usaba SVG propio):
 * OpsLineChart (evolución reservas + comisiones), OpsDonut (distribución)
 * y OpsHBars (ocupación por servicio, barras con Views).
 */
import { View, Text } from 'react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { useOpsStyles, MONO } from './OpsTokens';
import { OpsEmpty } from './OpsUi';

const VERDE = '#0e6b47';
const VERDE_CLARO = '#006d37';
const AZUL = '#004393';

/**
 * Evolución: reservas (línea + área) y comisiones (línea punteada azul,
 * escalada a su propio máximo como el SVG del web). `modo` agrupa por meses.
 */
export function OpsLineChart({ serie, modo = 'dias' }) {
  const { s, op } = useOpsStyles();
  if (!serie?.length) return <OpsEmpty>Sin datos todavía.</OpsEmpty>;

  let datos = serie;
  if (modo === 'meses') {
    const porMes = {};
    serie.forEach((r) => {
      const k = r.fecha.slice(0, 7);
      if (!porMes[k]) porMes[k] = { fecha: k, etiqueta: k.slice(5), reservas: 0, comisiones: 0 };
      porMes[k].reservas += r.reservas;
      porMes[k].comisiones = Math.round((porMes[k].comisiones + r.comisiones) * 100) / 100;
    });
    datos = Object.values(porMes);
  }
  if (modo === 'horas') {
    return (
      <OpsEmpty>La vista por horas usa los slots de reserva (13–15h y 20–22h) en la sección Reservas.</OpsEmpty>
    );
  }

  const maxR = Math.max(1, ...datos.map((d) => d.reservas));
  const maxC = Math.max(1, ...datos.map((d) => Number(d.comisiones) || 0));
  const paso = Math.max(1, Math.ceil(datos.length / 6));

  const data = datos.map((d, i) => ({
    value: d.reservas,
    label: i % paso === 0 ? String(d.etiqueta ?? d.fecha) : '',
    labelWidth: 54,
  }));
  // Comisiones normalizadas a la escala de reservas (la web dibujaba dos escalas).
  const data2 = datos.map((d) => ({ value: Math.round(((Number(d.comisiones) || 0) / maxC) * maxR) }));

  const pico = datos.reduce((m, d, i) => (d.reservas > (datos[m]?.reservas ?? -1) ? i : m), 0);

  return (
    <View>
      <LineChart
        data={data}
        data2={data2}
        color={VERDE}
        color2={AZUL}
        dataPointsColor={VERDE}
        dataPointsRadius={2.6}
        hideDataPoints2
        areaChart
        curvature={0.2}
        startFillColor={VERDE}
        endFillColor="transparent"
        startOpacity={0.32}
        endOpacity={0}
        rulesType="dashed"
        rulesColor={op.surfaceHighest}
        noOfSections={4}
        maxValue={maxR}
        initialSpacing={10}
        endSpacing={8}
        spacing={datos.length > 1 ? 240 / (datos.length - 1) : 40}
        xAxisLabelTextStyle={{ fontSize: 9, color: op.onVariant, textAlign: 'center' }}
        yAxisTextStyle={{ fontSize: 9, color: op.onVariant }}
        yAxisColor="transparent"
        xAxisColor={op.outlineVariant}
        hideRules={false}
        showVerticalLines
        verticalLinesColor={op.surfaceHighest}
        pointerConfig={{
          pointerStripColor: VERDE,
          pointerStripWidth: 1,
          pointerColor: VERDE,
          radius: 4,
        }}
      />
      <View style={s.xlabels}>
        <Text style={{ fontSize: 11, color: op.onVariant, fontFamily: MONO }}>
          Pico: {datos[pico]?.etiqueta ?? datos[pico]?.fecha} · {datos[pico]?.reservas} res
        </Text>
        <Text style={{ fontSize: 11, color: op.onVariant, fontFamily: MONO }}>reservas / comisiones</Text>
      </View>
      <Text style={[s.muted, { marginTop: 6 }]}>
        Último punto: {datos[datos.length - 1]?.reservas ?? 0} reservas ·{' '}
        {Number(datos[datos.length - 1]?.comisiones || 0).toFixed(2)} € com. real.
      </Text>
    </View>
  );
}

/** Donut de distribución (.ops-donut-wrap). */
export function OpsDonut({ segmentos, centro, centroSub }) {
  const { s, op } = useOpsStyles();
  const total = segmentos.reduce((a, x) => a + x.valor, 0);
  if (!total) return <OpsEmpty>Sin datos todavía.</OpsEmpty>;

  const chartData = segmentos.map((x) => ({
    value: x.valor,
    color: x.color,
    text: '',
    textColor: 'transparent',
  }));

  return (
    <View style={s.donutWrap}>
      <View style={{ width: 144, height: 144, alignItems: 'center', justifyContent: 'center' }}>
        <PieChart
          data={chartData}
          radius={64}
          innerRadius={44}
          donut
          strokeColor={op.surfaceContainer}
          strokeWidth={2}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: op.onSurface }}>{centro}</Text>
              <Text style={{ fontSize: 11, color: op.onVariant, textTransform: 'uppercase' }}>{centroSub}</Text>
            </View>
          )}
        />
      </View>
      <View style={s.legend}>
        {segmentos.map((x) => (
          <View key={x.nombre} style={s.legendRow}>
            <View style={s.legendIzq}>
              <View style={[s.legendDot, { backgroundColor: x.color }]} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: op.onSurface }}>{x.nombre}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: op.onSurface, fontFamily: MONO }}>
              {Math.round((x.valor / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Barras horizontales (.ops-bar) — ocupación por servicio. */
export function OpsHBars({ filas }) {
  const { s, op } = useOpsStyles();
  if (!filas?.length) return <OpsEmpty>Sin datos todavía.</OpsEmpty>;
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <View style={{ gap: 12 }}>
      {filas.map((f) => (
        <View key={f.nombre}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: op.onSurface }}>{f.nombre}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: op.onSurface, fontFamily: MONO }}>{f.texto}</Text>
          </View>
          <View style={[s.bar, { height: 8, marginTop: 0 }]}>
            <View
              style={[
                s.barFill,
                f.clase === 'blue' ? s.barFillBlue : f.clase === 'red' ? s.barFillRed : null,
                { width: `${Math.round((f.valor / max) * 100)}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export { VERDE, VERDE_CLARO, AZUL };
