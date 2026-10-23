/**
 * Escáner de QR de llegada en la app (G10): el restaurante escanea el QR del
 * cliente con la cámara (o pega el código), lo valida con
 * POST /v1/visitas/validar (v1.) o reservations/checkin (r1.).
 * Las reservas muestran el cliente y el pedido que devuelve la API.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../../services/httpClient.js';
import { ESTADOS, normalizarCodigo, estadoDesdeError, aLlegada, agregarLlegada } from '../../models/escanerModel.js';
import { esQrReserva, validarQrLlegada, mensajeErrorReserva } from '../../models/checkinReservaModel.js';
import { OpBtnPrimary, OpBtnGhost } from './DashboardUi.jsx';
import { useOpStyles } from './OpTokens';
import { Simbolo } from '../shell/Simbolo';

const LISTA_MS = 10000;
const MENSAJES = {
  [ESTADOS.OK]: 'Llegada confirmada. Aplica la oferta en la cuenta.',
  [ESTADOS.CADUCADO]: 'Este QR ha caducado. Pide al cliente que genere uno nuevo.',
  [ESTADOS.YA_USADO]: 'Este QR ya se ha usado.',
  [ESTADOS.OTRO_RESTAURANTE]: 'Este QR es de otro restaurante.',
  [ESTADOS.INVALIDO]: 'El código no es válido.',
  [ESTADOS.ERROR_RED]: 'No se pudo conectar. Reintenta.',
};
const ETIQUETA = { confirmada: 'Canjeada', pendiente: 'Pendiente', caducada: 'Caducada' };

export default function EscanerLlegadas({ restauranteId }) {
  const { s, op } = useOpStyles();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [camara, setCamara] = useState(false);
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [manual, setManual] = useState('');
  const [llegadas, setLlegadas] = useState([]);
  const [errorLista, setErrorLista] = useState(false);
  const leido = useRef(false);
  const enCurso = useRef(false);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  const cargarLista = useCallback(async () => {
    if (!restauranteId) return;
    try {
      const d = await api.get(`/v1/visitas/restaurante?restauranteId=${encodeURIComponent(String(restauranteId))}`);
      if (!montado.current) return;
      setLlegadas((Array.isArray(d?.data) ? d.data : []).map(aLlegada).filter(Boolean));
      setErrorLista(false);
    } catch {
      if (montado.current) setErrorLista(true);
    }
  }, [restauranteId]);

  // La lista se recarga sola para ver llegar al cliente y que pase a «Canjeada».
  useEffect(() => {
    cargarLista();
    const id = setInterval(cargarLista, LISTA_MS);
    return () => clearInterval(id);
  }, [cargarLista]);

  const validar = useCallback(async (codigo) => {
    if (enCurso.current) return;
    const limpio = normalizarCodigo(codigo);
    if (!limpio) { setResultado({ estado: ESTADOS.INVALIDO }); return; }
    const esReserva = esQrReserva(limpio);
    enCurso.current = true;
    setValidando(true);
    setResultado(null);
    try {
      const r = await validarQrLlegada(api, limpio);
      if (!montado.current) return;
      if (esReserva) {
        setResultado({ estado: ESTADOS.OK, reserva: r.reserva, cliente: r.cliente, puntosPedido: r.puntosPedido });
        return;
      }
      const llegada = aLlegada({ ...r?.visita, cliente: r?.cliente });
      if (montado.current && llegada) setLlegadas((prev) => agregarLlegada(prev, llegada));
      setResultado({
        estado: ESTADOS.OK,
        cliente: r?.cliente,
        texto: r?.aplicar?.texto || null,
        descuentoPct: r?.aplicar?.descuentoPct ?? null,
      });
    } catch (e) {
      if (montado.current) setResultado(esReserva
        ? { estado: 'error_reserva', mensaje: mensajeErrorReserva(e) }
        : { estado: estadoDesdeError(e) });
    } finally {
      enCurso.current = false;
      if (montado.current) { setValidando(false); cargarLista(); }
    }
  }, [cargarLista]);

  async function abrirCamara() {
    setResultado(null);
    const p = permiso?.granted ? permiso : await pedirPermiso();
    if (!p?.granted) { setResultado({ estado: ESTADOS.ERROR_RED, sinPermiso: true }); return; }
    leido.current = false;
    setCamara(true);
  }

  function alLeer({ data }) {
    if (leido.current) return; // la cámara dispara varias veces con el mismo QR
    leido.current = true;
    setCamara(false);
    validar(data);
  }

  const ok = resultado?.estado === ESTADOS.OK;
  const reserva = resultado?.reserva;
  const detalle = ok
    ? [resultado.cliente?.nombre, resultado.texto, resultado.descuentoPct != null ? `${resultado.descuentoPct} % de descuento` : null].filter(Boolean).join(' · ')
    : '';
  return (
    <View style={s.panel} testID="escaner-llegadas">
      <View style={estilos.cabecera}>
        <Simbolo name="qr_code_scanner" size={18} color={op.primary} />
        <Text style={[s.panelTitle, { flex: 1 }]}>Escáner de QR</Text>
      </View>
      <Text style={{ color: op.onVariant, fontSize: 12, marginBottom: 10 }}>
        Escanea el QR del cliente para confirmar su reserva y ver el pedido, o aplicar su oferta de llegada.
      </Text>

      {camara ? (
        <View style={estilos.camaraCaja}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={alLeer}
          />
          <View style={estilos.marco} pointerEvents="none" />
        </View>
      ) : null}

      {resultado ? (
        <View style={[estilos.resultado, { backgroundColor: ok ? '#e3f6ec' : '#fdecec' }]}>
          <Text style={[estilos.resultadoTxt, { color: ok ? '#0b5a3a' : '#9b1c1c' }]}>
            {resultado.sinPermiso ? 'Sin permiso de cámara. Escribe el código a mano.'
              : resultado.mensaje || (reserva ? 'Llegada de la reserva confirmada.' : MENSAJES[resultado.estado])}
          </Text>
          {detalle ? <Text style={estilos.detalle}>{detalle}</Text> : null}
          {reserva ? (
            <View testID="checkin-reserva">
              <Text style={estilos.detalle}>{reserva.codigo} · {reserva.fecha} · {reserva.hora} · {reserva.comensales} comensales</Text>
              {reserva.pedido ? (
                <View style={estilos.pedido}>
                  <Text style={estilos.pedidoTitulo}>Pedido anticipado</Text>
                  {reserva.pedido.lineas.map((l) => (
                    <Text key={l.platoId} style={estilos.pedidoLinea}>{l.cantidad} × {l.nombre} · {Number(l.subtotal).toFixed(2)} €</Text>
                  ))}
                  <Text style={estilos.pedidoTitulo}>Total: {Number(reserva.pedido.total).toFixed(2)} €</Text>
                </View>
              ) : <Text style={estilos.detalle}>Sin pedido anticipado.</Text>}
              {resultado.puntosPedido === 50 ? <Text style={estilos.detalle}>+50 puntos para el cliente por su pedido anticipado.</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={estilos.botones}>
        {camara ? (
          <OpBtnGhost onPress={() => setCamara(false)}>Detener cámara</OpBtnGhost>
        ) : (
          <OpBtnPrimary onPress={abrirCamara} disabled={validando}>
            <Simbolo name="photo_camera" size={16} color="#ffffff" /> {validando ? 'Validando…' : resultado ? 'Escanear otro' : 'Abrir cámara'}
          </OpBtnPrimary>
        )}
      </View>

      <Text style={[s.opFieldLabel, { marginTop: 12 }]}>Código manual</Text>
      <View style={estilos.manual}>
        <TextInput
          value={manual}
          onChangeText={setManual}
          placeholder="Pega aquí el código del QR"
          placeholderTextColor={op.outline}
          autoCapitalize="none"
          autoCorrect={false}
          style={[s.opInput, { flex: 1 }]}
        />
        <OpBtnGhost onPress={() => validar(manual)} disabled={validando || !manual.trim()}>Validar</OpBtnGhost>
      </View>

      <Text style={[s.panelTitle, { marginTop: 16, fontSize: 13 }]}>Llegadas de hoy</Text>
      {errorLista ? <Text style={{ color: op.error, fontSize: 12 }}>No se pudo cargar la lista de llegadas.</Text> : null}
      {!errorLista && llegadas.length === 0 ? (
        <Text style={{ color: op.onVariant, fontSize: 12, paddingVertical: 8 }}>Todavía no ha llegado nadie con QR.</Text>
      ) : null}
      {llegadas.map((v) => (
        <View key={v.id} style={[estilos.fila, { borderBottomColor: op.surfaceLow }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: op.onSurface, fontWeight: '600' }}>{v.cliente || v.texto || 'Oferta de llegada'}</Text>
            <Text style={{ color: op.onVariant, fontSize: 11 }}>
              {v.descuentoPct != null ? `${v.descuentoPct} % · ` : ''}
              {v.hora ? new Date(v.hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          {ETIQUETA[v.estado] ? (
            <Text style={{ fontWeight: '700', color: v.estado === 'confirmada' ? op.primary : op.onVariant }}>{ETIQUETA[v.estado]}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  camaraCaja: { height: 300, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', marginBottom: 10 },
  marco: { position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '15%', borderWidth: 3, borderColor: '#ffffff', borderRadius: 16 },
  resultado: { padding: 12, borderRadius: 10, marginBottom: 10 },
  resultadoTxt: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  detalle: { marginTop: 6, textAlign: 'center', color: '#0b3d2a' },
  pedido: { marginTop: 10, gap: 6 },
  pedidoTitulo: { color: '#0b3d2a', fontWeight: '700' },
  pedidoLinea: { color: '#0b3d2a' },
  botones: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  manual: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
});
