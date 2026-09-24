/**
 * Gráficas del dashboard — espejo de Charts.jsx web (recharts) con
 * react-native-gifted-charts. Mismo color, datos y títulos; la leyenda
 * se dibuja a mano debajo (en móvil no hay hover/tooltip).
 */
import { View, Text, StyleSheet } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES } from '../../theme/tokens';

const COLORS = ['#0E6B47', '#F5A623', '#E74C3C', '#2D7FF9', '#6bfe9c', '#004393', '#85d7ab', '#bec9c0'];

function Marcador({ children, color }) {
  const { colores } = useTheme();
  return (
    <View style={estilos.leyendaItem}>
      <View style={[estilos.leyendaDot, { backgroundColor: color }]} />
      <Text style={[estilos.leyendaTxt, { color: colores.gris }]}>{children}</Text>
    </View>
  );
}

function Leyenda({ items }) {
  return (
    <View style={estilos.leyenda}>
      {items.map((it) => (
        <Marcador key={it.l} color={it.c}>
          {it.l}
        </Marcador>
      ))}
    </View>
  );
}

function ChartBox({ title, children, leyenda }) {
  const { colores } = useTheme();
  return (
    <View style={[estilos.chart, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
      <Text style={[estilos.chartTitle, { color: colores.tinta }]}>{title}</Text>
      {children}
      {leyenda}
    </View>
  );
}

function Vacio() {
  const { colores } = useTheme();
  return <Text style={[estilos.vacio, { color: colores.gris }]}>Sin datos</Text>;
}

function arrValue(v) {
  const n = Number(v) || 0;
  return Math.round(n * 100) / 100;
}

export function RevenueLineChart({ data, title }) {
  if (!data || Object.keys(data).length === 0) return <Vacio />;
  const entradas = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, d]) => ({
      mes,
      facturacion: arrValue(d.facturacion),
      comisiones: arrValue(d.comisiones),
    }));
  const fact = entradas.map((d) => ({ value: d.facturacion, label: d.mes }));
  const com = entradas.map((d) => ({ value: d.comisiones, label: d.mes }));
  const maxV = Math.max(1, ...entradas.flatMap((d) => [d.facturacion, d.comisiones]));

  return (
    <ChartBox title={title} leyenda={<Leyenda items={[{ c: '#0E6B47', l: 'Facturación' }, { c: '#F5A623', l: 'Comisiones' }]} />}>
      <LineChart
        data={fact}
        data2={com}
        color="#0E6B47"
        color2="#F5A623"
        dataPointsColor="#0E6B47"
        dataPointsColor2="#F5A623"
        dataPointsRadius={3}
        dataPointsRadius2={3}
        curvature={0.2}
        height={240}
        maxValue={Math.ceil(maxV * 1.1)}
        noOfSections={4}
        rulesType="dashed"
        rulesColor="#eeeeee"
        xAxisLabelTextStyle={{ fontSize: 11 }}
        yAxisTextStyle={{ fontSize: 12 }}
        initialSpacing={10}
        endSpacing={12}
      />
    </ChartBox>
  );
}

export function ReservationsPieChart({ completadas, canceladas, noShow, pendientes, title }) {
  const total = completadas + canceladas + noShow + pendientes;
  if (total === 0) return <Vacio />;
  const nombres = [
    { name: 'Completadas', value: completadas },
    { name: 'Canceladas', value: canceladas },
    { name: 'No Show', value: noShow },
    { name: 'Pendientes', value: pendientes },
  ].filter((d) => d.value > 0);
  const chartData = nombres.map((d, i) => ({ value: d.value, color: COLORS[i % COLORS.length] }));
  const leyenda = nombres.map((d, i) => ({
    c: COLORS[i % COLORS.length],
    l: `${d.name} ${((d.value / total) * 100).toFixed(0)}%`,
  }));

  return (
    <ChartBox title={title} leyenda={<Leyenda items={leyenda} />}>
      <View style={estilos.pieWrap}>
        <PieChart data={chartData} radius={90} donut innerRadius={45} strokeColor="#ffffff" strokeWidth={2} />
      </View>
    </ChartBox>
  );
}

export function RevenueBarChart({ data, title }) {
  if (!data || Object.keys(data).length === 0) return <Vacio />;
  const chartData = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, d]) => ({ value: d.tickets || 0, label: mes }));
  const maxV = Math.max(1, ...chartData.map((d) => d.value));

  return (
    <ChartBox title={title}>
      <BarChart
        data={chartData}
        barWidth={22}
        frontColor="#0E6B47"
        roundedTop
        height={240}
        maxValue={Math.ceil(maxV * 1.15)}
        noOfSections={4}
        rulesType="dashed"
        rulesColor="#eeeeee"
        xAxisLabelTextStyle={{ fontSize: 11 }}
        yAxisTextStyle={{ fontSize: 12 }}
        initialSpacing={10}
        endSpacing={12}
      />
    </ChartBox>
  );
}

export function RestaurantPerformanceChart({ data, title }) {
  if (!data || Object.keys(data).length === 0) return <Vacio />;
  const items = Object.entries(data)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10)
    .map(([id, d]) => ({
      nombre: d.nombre || id.slice(0, 8),
      completadas: d.completadas,
      canceladas: d.canceladas,
      noShow: d.noShow,
    }));
  const maxV = Math.max(1, ...items.map((d) => d.completadas + d.canceladas + d.noShow));
  const stackData = items.map((d) => ({
    label: d.nombre,
    stacks: [
      { value: d.completadas, color: '#0E6B47' },
      { value: d.canceladas, color: '#F5A623' },
      { value: d.noShow, color: '#E74C3C' },
    ],
  }));

  return (
    <ChartBox
      title={title}
      leyenda={
        <Leyenda
          items={[
            { c: '#0E6B47', l: 'Completadas' },
            { c: '#F5A623', l: 'Canceladas' },
            { c: '#E74C3C', l: 'No Show' },
          ]}
        />
      }
    >
      <BarChart
        stackData={stackData}
        horizontal
        barWidth={16}
        height={280}
        maxValue={Math.ceil(maxV * 1.1)}
        noOfSections={4}
        rulesType="dashed"
        rulesColor="#eeeeee"
        yAxisLabelWidth={110}
        yAxisTextStyle={{ fontSize: 11 }}
        xAxisLabelTextStyle={{ fontSize: 11 }}
        initialSpacing={10}
        endSpacing={12}
      />
    </ChartBox>
  );
}

const estilos = StyleSheet.create({
  chart: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 19.2,
    marginBottom: 19.2,
  },
  chartTitle: {
    fontSize: 15.2,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
    marginBottom: 12.8,
  },
  vacio: {
    fontFamily: FUENTES.texto,
    fontSize: 14.72,
    paddingVertical: 8,
  },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  leyendaDot: { width: 10, height: 10, borderRadius: 5 },
  leyendaTxt: { fontSize: 12, fontFamily: FUENTES.texto },
  pieWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 240 },
});
