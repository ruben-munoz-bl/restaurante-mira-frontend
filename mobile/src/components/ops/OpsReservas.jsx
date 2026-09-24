/** OpsReservas — reservas globales: buscar, filtrar y cambiar estado. */
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import {
  getReservasGlobales,
  nombreRestauranteDe,
  descargarCSV,
  csvReservas,
  mensajeErrorFirestore,
  updateReservationStatus,
} from './opsData.js';
import { useOpsStyles, MONO } from './OpsTokens';
import { OpsCard, OpsBtn, OpsInput, OpsSeg, OpsEmpty, OpsError, OpsStatusPill, OpsTabla, OpsTd, OpsTr, OpsCode } from './OpsUi';

const ESTADOS = ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_show'];

const COLS = [
  { titulo: 'Código', w: 92 },
  { titulo: 'Cliente', w: 150 },
  { titulo: 'Restaurante', w: 140 },
  { titulo: 'Fecha', w: 106 },
  { titulo: 'Pax', w: 48, derecha: true },
  { titulo: 'Estado', w: 96 },
  { titulo: 'Acciones', w: 300 },
];

export default function OpsReservas({ busquedaInicial = '' }) {
  const { s, op } = useOpsStyles();
  const [q, setQ] = useState(busquedaInicial);
  const [estado, setEstado] = useState('');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actuando, setActuando] = useState('');

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      setLista(await getReservasGlobales({ q, estado }));
    } catch (e) {
      setError(mensajeErrorFirestore(e, 'reservas'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setQ(busquedaInicial), [busquedaInicial]);

  async function cambiar(id, nuevo) {
    setError('');
    setActuando(id);
    try {
      await updateReservationStatus(id, nuevo);
      setLista((prev) => prev.map((r) => (r.id === id ? { ...r, estado: nuevo } : r)));
    } catch (e) {
      setError(e.message);
    } finally {
      setActuando('');
    }
  }

  const pillTipo = (r) =>
    r.estado === 'cancelada' || r.estado === 'no_show' ? 'danger' : r.estado === 'pendiente' ? 'info' : 'ok';

  return (
    <OpsCard
      titulo="Reservas Globales"
      sub={`${lista.length} reservas · confirmar, completar, no-show o cancelar`}
      right={
        <OpsBtn
          sm
          icono="download"
          onPress={() => {
            const c = csvReservas(lista);
            descargarCSV('reservas.csv', c.cabeceras, c.filas);
          }}
        >
          Exportar CSV
        </OpsBtn>
      }
    >
      <View style={s.toolbar}>
        <OpsInput
          value={q}
          onChangeText={setQ}
          onSubmit={cargar}
          placeholder="Código, cliente, email, restaurante…"
          style={{ flexGrow: 1, minWidth: 200 }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <OpsSeg
            valor={estado}
            onChange={setEstado}
            opciones={[{ valor: '', etiqueta: 'Todos' }, ...ESTADOS.map((e) => ({ valor: e, etiqueta: e }))]}
          />
          <OpsBtn tipo="primary" sm onPress={cargar}>
            Buscar
          </OpsBtn>
        </View>
      </View>

      <OpsError>{error}</OpsError>
      {cargando ? (
        <OpsEmpty cargando />
      ) : lista.length === 0 ? (
        <OpsEmpty>Sin resultados.</OpsEmpty>
      ) : (
        <OpsTabla cols={COLS}>
          {lista.map((r) => (
            <OpsTr key={r.id}>
              <OpsTd w={COLS[0].w}>
                <OpsCode>{r.codigo || String(r.id).slice(0, 8)}</OpsCode>
              </OpsTd>
              <OpsTd w={COLS[1].w}>
                <Text style={s.tdTxt} numberOfLines={1}>
                  {r.usuarioNombre || r.usuarioEmail || '—'}
                </Text>
                <Text style={s.muted} numberOfLines={1}>
                  {r.usuarioEmail || ''}
                </Text>
              </OpsTd>
              <OpsTd w={COLS[2].w}>
                <Text style={s.tdTxt} numberOfLines={1}>
                  {nombreRestauranteDe(r)}
                </Text>
              </OpsTd>
              <OpsTd w={COLS[3].w}>
                <Text style={[s.tdTxt, { fontFamily: MONO }]}>
                  {r.fecha} {r.hora}
                </Text>
              </OpsTd>
              <OpsTd w={COLS[4].w} derecha>
                <Text style={[s.tdTxt, s.num]}>{r.comensales}</Text>
              </OpsTd>
              <OpsTd w={COLS[5].w}>
                <OpsStatusPill tipo={pillTipo(r)}>{r.estado || 'pendiente'}</OpsStatusPill>
              </OpsTd>
              <OpsTd w={COLS[6].w} style={{ paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  <OpsBtn sm disabled={actuando === r.id} onPress={() => cambiar(r.id, 'confirmada')}>
                    Confirmar
                  </OpsBtn>
                  <OpsBtn sm disabled={actuando === r.id} onPress={() => cambiar(r.id, 'completada')}>
                    Completar
                  </OpsBtn>
                  <OpsBtn sm disabled={actuando === r.id} onPress={() => cambiar(r.id, 'no_show')}>
                    No-show
                  </OpsBtn>
                  <OpsBtn sm disabled={actuando === r.id} onPress={() => cambiar(r.id, 'cancelada')}>
                    Cancelar
                  </OpsBtn>
                </View>
              </OpsTd>
            </OpsTr>
          ))}
        </OpsTabla>
      )}
      <Text style={[s.muted, { color: op.onVariant, marginTop: 8 }]}>Desliza la tabla en horizontal para ver todas las columnas.</Text>
    </OpsCard>
  );
}
