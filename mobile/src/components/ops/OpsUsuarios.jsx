/** OpsUsuarios — comensales: puntos (±) y racha diaria (± días / quitar login de hoy). */
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import {
  mensajeErrorFirestore,
  listarUsuarios,
  abonarPuntos,
  ajustarRacha,
  deshacerLoginHoy,
} from './opsData.js';
import { useOpsStyles } from './OpsTokens';
import { OpsCard, OpsBtn, OpsInput, OpsField, OpsModal, OpsModalTitulo, OpsError, OpsSuccess, OpsEmpty } from './OpsUi';

function Titulo({ children }) {
  const { s } = useOpsStyles();
  return (
    <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: s.muted?.color || undefined }}>
      {children}
    </Text>
  );
}

export default function OpsUsuarios() {
  const { s } = useOpsStyles();
  const [lista, setLista] = useState([]);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [modal, setModal] = useState(null);
  const [cant, setCant] = useState('');
  const [motivo, setMotivo] = useState('');
  const [rachaOk, setRachaOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    listarUsuarios()
      .then((u) => {
        if (vivo) {
          setLista(u);
          setCargando(false);
        }
      })
      .catch((e) => {
        if (vivo) {
          setError(mensajeErrorFirestore(e, 'usuarios'));
          setCargando(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, []);

  const filtrados = lista.filter(
    (u) => !q.trim() || [u.nombre, u.email].filter(Boolean).join(' ').toLowerCase().includes(q.trim().toLowerCase()),
  );

  function patchUser(uid, patch) {
    setLista((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...patch } : u)));
    setModal((prev) => (prev && prev.uid === uid ? { ...prev, ...patch } : prev));
  }

  function cerrarModal() {
    setModal(null);
    setCant('');
    setMotivo('');
    setRachaOk(false);
  }

  async function aplicarPuntos() {
    if (!modal || cant === '' || !Number.isFinite(Number(cant))) return;
    const n = Number(cant);
    if (!Number.isInteger(n)) {
      setError('Los puntos deben ser un número entero (usa negativos para restar).');
      return;
    }
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const res = await abonarPuntos(modal.uid, n, motivo.trim() || `Ajuste admin (${n > 0 ? '+' : ''}${n})`);
      patchUser(modal.uid, { saldoPuntos: res?.nuevoSaldo ?? (modal.saldoPuntos || 0) + n });
      setOk(`Saldo actualizado: ${res?.nuevoSaldo ?? (modal.saldoPuntos || 0) + n} pts`);
      setCant('');
      setMotivo('');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function sumarRacha(delta) {
    if (!modal || guardando) return;
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const res = await ajustarRacha(modal.uid, delta);
      const dias = res?.rachaLogin?.dias;
      if (typeof dias === 'number') {
        patchUser(modal.uid, { rachaLoginDias: dias, yaReclamadoHoy: Boolean(res.rachaLogin.yaReclamado) });
        setOk(`Racha: ${dias} día${dias === 1 ? '' : 's'}`);
      }
      setRachaOk(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function quitarLoginHoy() {
    if (!modal || guardando) return;
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const res = await deshacerLoginHoy(modal.uid);
      const dias = res?.rachaLogin?.dias;
      if (typeof dias === 'number') {
        patchUser(modal.uid, { rachaLoginDias: dias, yaReclamadoHoy: Boolean(res.rachaLogin.yaReclamado) });
      }
      setOk(
        res?.estabaReclamadoHoy
          ? 'Login de hoy deshecho. Puede volver a reclamarlo.'
          : 'No había login de hoy; racha intacta (último login = ayer).',
      );
      setRachaOk(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <OpsCard titulo={`Usuarios & Comensales (${filtrados.length})`} sub="Puntos (añadir/restar) y racha diaria de login">
      <OpsError>{error}</OpsError>
      <OpsSuccess>{ok}</OpsSuccess>
      <View style={s.toolbar}>
        <OpsInput value={q} onChangeText={setQ} placeholder="Nombre o email…" style={{ flexGrow: 1, minWidth: 200 }} />
      </View>
      {cargando ? <OpsEmpty cargando /> : null}
      {!cargando && filtrados.length === 0 ? <OpsEmpty>Sin usuarios.</OpsEmpty> : null}
      <View style={s.list}>
        {filtrados.slice(0, 100).map((u) => (
          <View key={u.uid} style={s.listItem}>
            <View style={s.listItemCuerpo}>
              <Text style={s.listItemTitulo} numberOfLines={1}>
                {u.nombre || '(sin nombre)'}
              </Text>
              <Text style={s.muted} numberOfLines={1}>
                {u.email} · {u.saldoPuntos || 0} pts · {u.tipo || 'cliente'} · 🔥 {u.rachaLoginDias || 0}d
                {u.yaReclamadoHoy ? ' · hoy ✓' : ''}
              </Text>
            </View>
            <OpsBtn tipo="primary" sm onPress={() => setModal(u)}>
              Gestionar
            </OpsBtn>
          </View>
        ))}
      </View>

      <OpsModal visible={Boolean(modal)} onClose={cerrarModal}>
        <OpsModalTitulo sub={`${modal?.email || ''} · ${modal?.saldoPuntos || 0} pts · racha ${modal?.rachaLoginDias || 0}/7${
          modal?.yaReclamadoHoy ? ' · reclamado hoy' : ' · sin reclamar hoy'
        }`}>
          {modal?.nombre || modal?.email || ''}
        </OpsModalTitulo>

        <View style={{ height: 14 }} />
        <View style={{ gap: 8, marginBottom: 16 }}>
          <Titulo>PUNTOS</Titulo>
          <OpsField label="Cantidad (negativo = restar)">
            <OpsInput value={cant} onChangeText={setCant} placeholder="p. ej. 50 o -20" keyboardType="numeric" />
          </OpsField>
          <OpsField label="Motivo">
            <OpsInput value={motivo} onChangeText={setMotivo} placeholder="Compensación, promo…" />
          </OpsField>
          <View style={[s.modalActions, { marginTop: 0 }]}>
            <OpsBtn tipo="primary" sm onPress={aplicarPuntos} disabled={guardando || cant === ''}>
              Aplicar puntos
            </OpsBtn>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Titulo>RACHA DIARIA</Titulo>
          <View style={[s.modalActions, { marginTop: 0, flexWrap: 'wrap' }]}>
            <OpsBtn sm disabled={guardando || (modal?.rachaLoginDias || 0) <= 0} onPress={() => sumarRacha(-1)}>
              − 1 día
            </OpsBtn>
            <OpsBtn tipo="primary" sm disabled={guardando || (modal?.rachaLoginDias || 0) >= 7} onPress={() => sumarRacha(1)}>
              + 1 día
            </OpsBtn>
            <OpsBtn sm disabled={guardando || (modal?.rachaLoginDias || 0) >= 7} onPress={() => sumarRacha(7 - (modal?.rachaLoginDias || 0))}>
              Poner a 7
            </OpsBtn>
            <OpsBtn sm disabled={guardando || (modal?.rachaLoginDias || 0) <= 0} onPress={() => sumarRacha(-(modal?.rachaLoginDias || 0))}>
              Reset a 0
            </OpsBtn>
            <OpsBtn tipo="danger" sm disabled={guardando} onPress={quitarLoginHoy}>
              Quitar login de hoy
            </OpsBtn>
          </View>
        </View>

        {rachaOk ? <Text style={[s.muted, { marginTop: 10 }]}>Racha actualizada.</Text> : null}

        <View style={s.modalActions}>
          <OpsBtn sm onPress={cerrarModal}>
            Cerrar
          </OpsBtn>
        </View>
      </OpsModal>
    </OpsCard>
  );
}
