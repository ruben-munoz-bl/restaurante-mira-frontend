/**
 * Editor de la carta en la app (M09, espejo de src/components/dashboard/CartaEditor.jsx):
 * categorías y platos con precio, descripción, foto, alérgenos y disponibilidad.
 * Lee GET /v1/cartas/:id/editar y guarda con PUT /v1/cartas/:id (empresa dueña o admin).
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { getCartaEditar, guardarCarta } from '../../services/cartaApi.js';
import { ALERGENOS } from '../../models/restaurantModel.js';
import { categoriaVacia, platoVacio, mover, validarCarta, paraGuardar, aFormulario } from '../../models/cartaModel.js';
import { OpBtnPrimary, OpBtnGhost, OpField, OpInput } from './DashboardUi.jsx';
import { useOpStyles } from './OpTokens';
import { Simbolo } from '../shell/Simbolo';

const ERRORES = {
  errSinCategorias: 'Añade al menos una categoría.',
  errMaxCategorias: 'Máximo 30 categorías.',
  errMaxPlatosTotal: 'Máximo 300 platos en total.',
  errMaxPlatos: 'Máximo 60 platos por categoría.',
  errNombreCategoria: 'Nombre obligatorio (máx. 60).',
  errNombrePlato: 'Nombre obligatorio (máx. 80).',
  errDescripcion: 'Máximo 300 caracteres.',
  errPrecio: 'Precio entre 0,01 y 999,99 € (2 decimales).',
  errFoto: 'Debe ser una URL https.',
  errAlergenos: 'Alérgeno no válido.',
};

export default function CartaEditor({ restauranteId }) {
  const { s, op } = useOpStyles();
  const [abierto, setAbierto] = useState(false);
  const [cats, setCats] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return undefined;
    let vivo = true;
    setCats(null); setError('');
    getCartaEditar(restauranteId)
      .then((c) => { if (vivo) setCats(aFormulario(c?.categorias)); })
      .catch((e) => {
        if (!vivo) return;
        setCats([]);
        setError(e?.status === 403 ? 'No tienes permiso para editar esta carta.' : e?.message || 'No se pudo cargar la carta.');
      });
    return () => { vivo = false; };
  }, [abierto, restauranteId]);

  const cambiar = (fn) => { setCats(fn); setErrores({}); setAviso(''); };
  const setCat = (i, campo, v) => cambiar((p) => p.map((c, k) => (k === i ? { ...c, [campo]: v } : c)));
  const setPlato = (i, j, campo, v) => cambiar((p) => p.map((c, k) => (k !== i ? c : { ...c, platos: c.platos.map((x, m) => (m === j ? { ...x, [campo]: v } : x)) })));
  const err = (ruta) => (errores[ruta] ? <Text style={estilos.error}>{ERRORES[errores[ruta]]}</Text> : null);

  async function guardar() {
    const e = validarCarta(cats);
    setErrores(e); setError(''); setAviso('');
    if (Object.keys(e).length) { setError('Revisa los campos marcados.'); return; }
    setGuardando(true);
    try {
      const c = await guardarCarta(restauranteId, paraGuardar(cats));
      setCats(aFormulario(c?.categorias));
      setAviso('Carta guardada.');
    } catch (e2) {
      setError(e2?.status === 400 ? 'El servidor ha rechazado la carta: revisa los datos.'
        : e2?.status === 403 ? 'No tienes permiso para editar esta carta.' : e2?.message || 'No se pudo guardar.');
    } finally { setGuardando(false); }
  }

  function borrarCategoria(i) {
    Alert.alert('Borrar categoría', '¿Borrar esta categoría y sus platos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => cambiar((p) => p.filter((_, k) => k !== i)) },
    ]);
  }

  const icono = (nombre, label, onPress, disabled) => (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}
      style={[estilos.icono, { borderColor: op.outlineVariant, opacity: disabled ? 0.35 : 1 }]}>
      <Simbolo name={nombre} size={16} color={op.onVariant} />
    </Pressable>
  );

  return (
    <View style={s.panel} testID="carta-editor">
      <Pressable onPress={() => setAbierto((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: abierto }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Simbolo name="menu_book" size={18} color={op.primary} />
        <Text style={[s.panelTitle, { flex: 1 }]}>Carta del restaurante</Text>
        <Simbolo name={abierto ? 'expand_less' : 'expand_more'} size={18} color={op.onVariant} />
      </Pressable>

      {abierto && !cats ? <Text style={{ color: op.onVariant, marginTop: 8 }}>Cargando…</Text> : null}

      {abierto && cats ? (
        <View style={{ marginTop: 10, gap: 12 }}>
          {err('carta')}
          {cats.map((c, i) => (
            <View key={c.id || c._k || `n${i}`} style={[estilos.categoria, { borderColor: op.outlineVariant }]}>
              <View style={estilos.fila}>
                <OpField label="Categoría" style={{ flexBasis: 160 }}>
                  <OpInput value={c.nombre} maxLength={60} onChangeText={(v) => setCat(i, 'nombre', v)} />
                </OpField>
                {icono('arrow_upward', 'Subir', () => cambiar((p) => mover(p, i, -1)), i === 0)}
                {icono('arrow_downward', 'Bajar', () => cambiar((p) => mover(p, i, 1)), i === cats.length - 1)}
                {icono('delete', 'Borrar categoría', () => borrarCategoria(i))}
              </View>
              {err(`c${i}.nombre`)}{err(`c${i}.platos`)}

              {c.platos.map((p, j) => {
                const r = `c${i}.p${j}`;
                return (
                  <View key={p.id || p._k || `n${j}`} style={[estilos.plato, { borderTopColor: op.outlineVariant }]}>
                    <View style={estilos.fila}>
                      <OpField label="Plato *" style={{ flexBasis: 160 }}>
                        <OpInput value={p.nombre} maxLength={80} onChangeText={(v) => setPlato(i, j, 'nombre', v)} />
                      </OpField>
                      <OpField label="Precio (€) *" style={{ flexBasis: 90, flexGrow: 0 }}>
                        <OpInput value={p.precio} keyboardType="decimal-pad" onChangeText={(v) => setPlato(i, j, 'precio', v)} />
                      </OpField>
                    </View>
                    {err(`${r}.nombre`)}{err(`${r}.precio`)}
                    <OpField label="Descripción">
                      <OpInput value={p.descripcion} maxLength={300} multiline onChangeText={(v) => setPlato(i, j, 'descripcion', v)} />
                    </OpField>
                    {err(`${r}.descripcion`)}
                    <OpField label="Foto (URL https)">
                      <OpInput value={p.foto} placeholder="https://" keyboardType="url" onChangeText={(v) => setPlato(i, j, 'foto', v)} />
                    </OpField>
                    {err(`${r}.foto`)}
                    <Text style={[s.opFieldLabel, { marginTop: 4 }]}>Alérgenos</Text>
                    <View style={estilos.chips}>
                      {ALERGENOS.map((a) => {
                        const on = p.alergenos.includes(a.key);
                        return (
                          <Pressable key={a.key} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                            onPress={() => setPlato(i, j, 'alergenos', on ? p.alergenos.filter((x) => x !== a.key) : [...p.alergenos, a.key])}
                            style={[estilos.chip, { borderColor: on ? op.primary : op.outlineVariant, backgroundColor: on ? op.primary : 'transparent' }]}>
                            <Text style={{ fontSize: 12, color: on ? '#fff' : op.onVariant }}>{a.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={[estilos.fila, { justifyContent: 'space-between' }]}>
                      <View style={[estilos.fila, { gap: 6 }]}>
                        <Switch value={p.disponible} onValueChange={(v) => setPlato(i, j, 'disponible', v)} />
                        <Text style={{ color: op.onVariant }}>Disponible</Text>
                      </View>
                      {icono('delete', 'Borrar plato', () => cambiar((x) => x.map((cc, k) => (k !== i ? cc : { ...cc, platos: cc.platos.filter((_, m) => m !== j) }))))}
                    </View>
                  </View>
                );
              })}
              <OpBtnGhost small onPress={() => cambiar((p) => p.map((cc, k) => (k === i ? { ...cc, platos: [...cc.platos, platoVacio()] } : cc)))}>
                + Añadir plato
              </OpBtnGhost>
            </View>
          ))}

          {error ? <Text style={estilos.error} accessibilityLiveRegion="polite">{error}</Text> : null}
          {aviso ? <Text style={{ color: '#065f46', fontWeight: '700' }} accessibilityLiveRegion="polite">{aviso}</Text> : null}
          <View style={estilos.fila}>
            <OpBtnGhost onPress={() => cambiar((p) => [...p, categoriaVacia()])}>+ Añadir categoría</OpBtnGhost>
            <OpBtnPrimary onPress={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar carta'}</OpBtnPrimary>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' },
  categoria: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  plato: { borderTopWidth: 1, borderStyle: 'dashed', paddingTop: 8, gap: 6 },
  icono: { borderWidth: 1, borderRadius: 8, padding: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  error: { color: '#b42318', fontSize: 12 },
});
