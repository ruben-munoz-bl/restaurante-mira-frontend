import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { CLARO, OSCURO } from '../mobile/src/theme/tokens.js';
import * as avisosModel from '../mobile/src/models/avisosOfertasModel.js';
import { ofertaParaLlegada } from '../mobile/src/models/accesoLlegada.js';
import { pestanaActiva, rutaDesdePath } from '../mobile/src/components/shell/rutas.js';
import { construirBody, normalizarRespuesta, MAX_MENSAJE } from '../mobile/src/services/aiPayload.js';
import es from '../mobile/src/i18n/es.js';
import ca from '../mobile/src/i18n/ca.js';
import en from '../mobile/src/i18n/en.js';
const tic = () => new Promise(r => setImmediate(r));
const traducir = (k, idioma = 'es') => k.split('.').reduce((v, p) => v?.[p], { es, ca, en }[idioma]);
const fuente = path => readFileSync(new URL(`../mobile/src/${path}`, import.meta.url), 'utf8');
function cargar(path, bindings = {}) {
  const source = fuente(path).replace(/^import[\s\S]*?;\r?\n/gm, '');
  const module = { exports: {} };
  const ctx = vm.createContext({ module, exports: module.exports, console, setTimeout, clearTimeout, AbortController, ...bindings });
  vm.runInContext(transformSync(source, { loader: 'jsx', format: 'cjs' }).code, ctx);
  return { ...module.exports, ctx };
}
function montar(path, bindings = {}, props = {}) {
  const estados = [], refs = [], efectos = [], memo = [], relojes = new Set();
  let indice = 0;
  const crear = (type, props, ...children) => typeof type === 'function'
    ? type({ ...props, children }) : ({ type, props: { ...props, children } });
  const primitivas = Object.fromEntries(['View', 'Text', 'Pressable', 'Image', 'Modal', 'ScrollView', 'TextInput', 'KeyboardAvoidingView', 'Animated', 'BlurView', 'LinearGradient', 'AppShell', 'LogoCircular', 'Simbolo', 'Grupo', 'IconoAtras', 'IconoMenu', 'IconoCerrar', 'IconoTema', 'IconoMapa', 'IconoMensaje', 'IconoFlecha', 'IconoPersona', 'IconoRejilla', 'IconoSalir', 'IconoCorazon', 'IconoBusqueda', 'IconoCalendario'].map(n => [n, n]));
  const mod = cargar(path, {
    ...primitivas,
    React: { createElement: crear, Fragment: 'Fragment' }, es, ca, en,
    IMG: {}, FUENTES: {}, RADIO: {},
    StyleSheet: { create: o => o, absoluteFill: {} },
    Platform: { OS: 'android' },
    useT: () => traducir, useI18n: () => ({ lang: 'es', available: { es: 'Español', ca: 'Català', en: 'English' }, setLang() {} }),
    useTheme: () => ({ colores: CLARO }),
    useRef(v) { const i = indice++; return refs[i] ||= { current: v }; },
    useState(v) { const i = indice++; if (!(i in estados)) estados[i] = typeof v === 'function' ? v() : v; return [estados[i], n => { estados[i] = typeof n === 'function' ? n(estados[i]) : n; }]; },
    useEffect(fn, deps) { const i = indice++; if (!efectos[i] || !deps || deps.some((d, j) => d !== efectos[i].deps[j])) { efectos[i]?.limpiar?.(); efectos[i] = { fn, deps, pendiente: true }; } },
    useMemo(fn, deps) { const i = indice++; if (!memo[i] || deps.some((d, j) => d !== memo[i].deps[j])) memo[i] = { value: fn(), deps }; return memo[i].value; },
    useCallback: fn => fn,
    setInterval(fn) { relojes.add(fn); return fn; }, clearInterval(fn) { relojes.delete(fn); },
    setTimeout() { return 1; }, clearTimeout() {},
    ...bindings,
  });
  return {
    ctx: mod.ctx,
    render() { indice = 0; const tree = mod.default(props); for (const e of efectos) if (e?.pendiente) { e.pendiente = false; e.limpiar = e.fn(); } return tree; },
    reloj() { for (const fn of relojes) fn(); },
    cerrar() { for (const e of efectos) e?.limpiar?.(); },
  };
}
function nodos(tree, tipo) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === tipo ? [tree] : []), ...(tree.props?.children || []).flat(Infinity).flatMap(c => nodos(c, tipo))];
}
const contenido = tree => nodos(tree, 'Text').flatMap(n => n.props.children.flat(Infinity)).filter(x => typeof x === 'string' || typeof x === 'number').join(' ');
const boton = (tree, texto) => nodos(tree, 'Pressable').find(n => contenido(n).includes(texto));
const plano = style => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity).filter(Boolean) : [style]));
const restaurante = { restaurante: { id: 'r1', nombre: 'Prueba', partner: true }, oferta: { id: 'o1', titulo: 'Oferta' }, nivel: { distancia: 20, texto: 'Llegaste' }, distanciaM: 10 };

test('BUG-139: foreground consulta quieto cada 30s, cancela al salir y comparte dedup con background', async () => {
  const storage = new Map();
  const persistencia = cargar('services/sesionesAvisos.js', {
    ...avisosModel, AsyncStorage: { getItem: async k => storage.get(k) ?? null, setItem: async (k, v) => storage.set(k, v) },
  });
  let ahora = new Date(2026, 9, 16, 12).getTime();
  class Reloj extends Date { static now() { return ahora; } }
  const llamadas = { cerca: 0, post: 0, notificar: 0 };
  const posicion = { lat: 41, lng: 2 };
  const h = montar('hooks/useAvisosOfertas.js', {
    ...avisosModel, debeConsultar: (u, p) => avisosModel.debeConsultar(u, p, ahora), Date: Reloj, AppState: { currentState: 'active' },
    useUbicacion: () => ({ activa: true, posicion }),
    ofertasCerca: async () => { llamadas.cerca++; return [restaurante]; },
    registrarAviso: async () => { llamadas.post++; },
    notificarLocal: async () => { llamadas.notificar++; },
    seleccionarAvisos: persistencia.seleccionarAvisos, alVolverAPrimerPlano: () => () => {},
  }, traducir);
  h.render(); await tic(); h.render();
  assert.deepEqual(llamadas, { cerca: 1, post: 1, notificar: 1 });
  ahora += 30000; h.reloj(); await tic(); h.render();
  assert.deepEqual(llamadas, { cerca: 2, post: 1, notificar: 1 });
  assert.equal((await persistencia.seleccionarAvisos([restaurante])).length, 0, 'el otro consumidor ya lo encuentra visto');
  const concurrentes = await Promise.all([persistencia.seleccionarAvisos([{ ...restaurante, restaurante: { id: 'r2' } }]), persistencia.seleccionarAvisos([{ ...restaurante, restaurante: { id: 'r2' } }])]);
  assert.equal(concurrentes.flat().length, 1);
  h.cerrar(); ahora += 30000; h.reloj(); await tic(); assert.equal(llamadas.cerca, 2);
});

function contraste(a, b) {
  const lum = hex => hex.match(/\w\w/g).map(v => parseInt(v, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test('BUG-141: MiraClub cambia la superficie con el tema y el saldo tiene contraste >=4.5', () => {
  for (const colores of [CLARO, OSCURO]) {
    const h = montar('components/DailyStreakPopup.jsx', { useTheme: () => ({ colores }) }, { racha: { dias: 3 }, saldo: 1234, yaReclamado: true });
    const tree = h.render();
    assert.ok(nodos(tree, 'View').some(n => plano(n.props.style).backgroundColor === colores.papel && plano(n.props.style).maxWidth === 720));
    const saldo = nodos(tree, 'Text').find(n => n.props.children.includes(1234));
    assert.ok(saldo);
    assert.ok(contraste(plano(saldo.props.style).color, colores.fondoSuave) >= 4.5);
    for (const [fg, bg] of [[colores.tinta, colores.papel], [colores.verde, colores.verdeSuave], [colores.gris, colores.verdeSuave], [colores.dorado, colores.verdeSuave]]) assert.ok(contraste(fg, bg) >= 4.5, `${fg}/${bg}`);
    h.cerrar();
  }
});

test('BUG-142: barra renderizada marca exactamente una pestaña, también en oscuro', () => {
  let path = '/reservas';
  const destinos = [];
  const h = montar('components/BottomNav.jsx', {
    pestanaActiva, usePathname: () => path, useRouter: () => ({ push: p => destinos.push(p) }),
    useTheme: () => ({ colores: OSCURO }), useAuthContext: () => ({ favoritos: [] }), useSafeAreaInsets: () => ({ bottom: 0 }), useBreakpoint: () => ({ esMovil: true }),
  });
  for (const [ruta, label] of [['/reservas', 'Reservas'], ['/mapa', 'Mapa'], ['/puntos/historial', 'Perfil']]) {
    path = ruta; const tree = h.render();
    const seleccionadas = nodos(tree, 'Pressable').filter(n => n.props.accessibilityState?.selected);
    assert.equal(seleccionadas.length, 1); assert.equal(seleccionadas[0].props.accessibilityLabel, label);
    assert.equal(plano(seleccionadas[0].props.style({ pressed: false })).borderColor, OSCURO.verde);
  }
  boton(h.render(), 'Mapa').props.onPress(); assert.deepEqual(destinos, ['/mapa']);
});

test('BUG-143: QR visible tras respuesta aunque llegue otra posición; navega a llegada y desaparece sin ubicación', async () => {
  let posicion = { lat: 41, lng: 2 };
  let resolver;
  const rutas = [];
  const h = montar('components/AccesoLlegada.jsx', {
    ...avisosModel, ofertaParaLlegada, AppState: { currentState: 'active' },
    useUbicacion: () => ({ activa: true, posicion }), ofertasCerca: () => new Promise(r => { resolver = r; }),
    alVolverAPrimerPlano: () => () => {}, useRouter: () => ({ push: r => rutas.push(r) }), btnCta: () => ({}),
  }, { restauranteId: 'r1' });
  h.render(); posicion = { lat: 41.00001, lng: 2 }; h.render();
  resolver([restaurante]); await tic();
  const tree = h.render(); boton(tree, 'Mostrar QR').props.onPress();
  assert.equal(rutas[0].pathname, '/llegada'); assert.equal(rutas[0].params.id, 'r1');
  posicion = null; assert.equal(h.render(), null); h.cerrar();
});

test('BUG-144: chat confirma solo al tocar; reintenta la misma clave y se vacía al cambiar de cuenta', async () => {
  let uid = 'A', clave = 0;
  const peticiones = [];
  const h = montar('app/mira.js', {
    useAuthContext: () => ({ usuario: { uid } }), MAX_MENSAJE, normalizarRespuesta,
    nuevaClaveTurno: () => `clave-${++clave}`,
    enviarTurno: turno => new Promise((resolve, reject) => peticiones.push({ turno, resolve, reject })),
  });
  h.render(); let tree = h.render();
  nodos(tree, 'TextInput')[0].props.onChangeText('Reserva una mesa'); tree = h.render();
  boton(tree, 'Enviar').props.onPress(); h.render();
  assert.equal(peticiones.length, 1); assert.equal(peticiones[0].turno.confirmId, undefined);
  peticiones[0].resolve({ reply: '¿Reservamos?', needsConfirm: { confirmId: '12345678-1234-4234-9234-123456789012', summary: 'Mesa para dos' } });
  await tic(); tree = h.render(); assert.match(contenido(tree), /Mesa para dos/); assert.equal(peticiones.length, 1);
  boton(tree, 'Confirmar').props.onPress(); h.render();
  assert.equal(peticiones[1].turno.confirmId, '12345678-1234-4234-9234-123456789012');
  assert.notEqual(peticiones[1].turno.idempotencyKey, peticiones[0].turno.idempotencyKey);
  peticiones[1].reject(Object.assign(Error('sin red'), { status: 503 })); await tic(); tree = h.render();
  boton(tree, 'Reintentar').props.onPress(); h.render();
  assert.equal(peticiones[2].turno.idempotencyKey, peticiones[1].turno.idempotencyKey);
  uid = 'B'; h.render(); tree = h.render(); assert.doesNotMatch(contenido(tree), /Reserva una mesa|Mesa para dos/);
  assert.equal(peticiones[2].turno.signal.aborted, true);
  peticiones[2].resolve({ reply: 'Respuesta privada A' }); await tic(); assert.doesNotMatch(contenido(h.render()), /privada A/);
  h.cerrar();
});

test('BUG-144: cancelar no confirma; parar y desmontar ignoran respuestas tardías', async () => {
  const peticiones = [];
  const h = montar('app/mira.js', { useAuthContext: () => ({ usuario: null }), MAX_MENSAJE, normalizarRespuesta, nuevaClaveTurno: () => 'clave', enviarTurno: turno => new Promise(resolve => peticiones.push({ turno, resolve })) });
  h.render(); let tree = h.render(); nodos(tree, 'TextInput')[0].props.onChangeText('Hola'); tree = h.render(); boton(tree, 'Enviar').props.onPress(); tree = h.render();
  boton(tree, 'Parar').props.onPress(); peticiones[0].resolve({ reply: 'Tardía' }); await tic(); tree = h.render(); assert.doesNotMatch(contenido(tree), /Tardía/);
  nodos(tree, 'TextInput')[0].props.onChangeText('Otra'); tree = h.render(); boton(tree, 'Enviar').props.onPress();
  peticiones[1].resolve({ needsConfirm: { confirmId: '12345678-1234-4234-9234-123456789012', summary: 'Cambiar reserva' } }); await tic(); tree = h.render();
  boton(tree, 'Cancelar').props.onPress(); assert.equal(peticiones.length, 2); assert.doesNotMatch(contenido(h.render()), /Cambiar reserva/);
  h.cerrar();
});

test('BUG-144: servicio llama a /v1/ai/agent con señal, auth opcional y UUID; conserva 429', async () => {
  const llamadas = [];
  const mod = cargar('services/aiApi.js', { Crypto: { randomUUID: () => 'uuid' }, construirBody, TIMEOUT_MS: 35000,
    api: { post: async (...args) => { llamadas.push(args); return { reply: 'Hola' }; } } });
  await mod.enviarTurno({ message: 'Hola', lang: 'ca', idempotencyKey: 'reintento' });
  assert.equal(llamadas[0][0], '/v1/ai/agent'); assert.equal(llamadas[0][1].lang, 'ca');
  assert.equal(llamadas[0][2].auth, 'opcional'); assert.equal(llamadas[0][2].headers['Idempotency-Key'], 'reintento');
  assert.ok(llamadas[0][2].signal instanceof AbortSignal);
  mod.ctx.api.post = async () => { throw Object.assign(Error('límite'), { status: 429 }); };
  await assert.rejects(mod.enviarTurno({ message: 'Hola' }), e => e.status === 429);
});

test('BUG-145: menú agrupa accesos y marca MIRA; filas>=48 y conserva la navegación inferior', () => {
  const rutas = [];
  const h = montar('components/shell/BarraMovil.jsx', {
    rutaDesdePath, useAuthContext: () => ({ usuario: { uid: 'A' }, perfil: {}, noLeidos: 2, esAdmin: false }), useStreak: () => ({ puntosSaldo: 123 }),
    useRouter: () => ({ canGoBack: () => true, push: r => rutas.push(r) }), usePathname: () => '/mira', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
    Animated: { Value: class {}, timing: () => ({ start() {} }), View: 'View' },
  });
  let tree = h.render(); nodos(tree, 'Pressable').find(n => n.props.accessibilityLabel === 'Abrir menú').props.onPress(); tree = h.render();
  for (const texto of ['Explorar', 'Tu espacio', 'Preferencias', 'Mis reservas', 'MIRA SI']) assert.ok(contenido(tree).includes(texto), texto);
  const mira = boton(tree, 'MIRA SI'); assert.equal(mira.props.accessibilityState.selected, true);
  assert.ok(plano(mira.props.style({ pressed: false })).minHeight >= 48);
  boton(tree, 'Mis reservas').props.onPress(); assert.deepEqual(rutas, ['/reservas']); assert.equal(nodos(h.render(), 'Modal')[0].props.visible, false);
  h.cerrar();
});

test('BUG-140/144: no queda mojibake en mobile/src y los nuevos textos existen en es/ca/en', () => {
  function revisar(dir) {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const url = new URL(f.name + (f.isDirectory() ? '/' : ''), dir);
      if (f.isDirectory()) revisar(url);
      else if (/\.(jsx?|tsx?)$/.test(f.name)) assert.doesNotMatch(readFileSync(url, 'utf8'), /â|Ã|Â|�/, url.pathname);
    }
  }
  revisar(new URL('../mobile/src/', import.meta.url));
  for (const lang of ['es', 'ca', 'en']) for (const key of ['apk.verQR', 'apk.mira', 'apk.chat.confirmar', 'apk.chat.error', 'apk.personal']) assert.equal(typeof traducir(key, lang), 'string');
});

test('BUG-144: http nativo mantiene auth obligatoria, admite anónimo solo con auth opcional y transmite abort', async () => {
  const llamadas = [];
  const mod = cargar('services/httpClient.js', {
    __DEV__: false, process: { env: {} }, FormData,
    fetch: async (url, opts) => { llamadas.push({ url, opts }); return { ok: true, status: 200, text: async () => '{"reply":"Hola"}' }; },
  });
  mod.ctx.getToken = async () => null;
  await assert.rejects(mod.api.get('/v1/users/me'), e => e.status === 401 && e.noSession);
  assert.equal(llamadas.length, 0);
  const ctl = new AbortController();
  await mod.api.post('/v1/ai/agent', { message: 'Hola' }, { auth: 'opcional', signal: ctl.signal });
  assert.equal(llamadas[0].opts.headers.Authorization, undefined);
  assert.equal(llamadas[0].opts.signal, ctl.signal);
  mod.ctx.getToken = async () => 'token-A';
  await mod.api.post('/v1/ai/agent', { message: 'Hola' }, { auth: 'opcional' });
  assert.equal(llamadas[1].opts.headers.Authorization, 'Bearer token-A');
});

test('BUG-139: cambio de plano durante la escritura no marca avisos que nadie llegó a mostrar', async () => {
  const storage = new Map();
  let vigente = true;
  let interrumpir = true;
  const mod = cargar('services/sesionesAvisos.js', {
    ...avisosModel, AsyncStorage: {
      getItem: async k => storage.get(k) ?? null,
      setItem: async (k, v) => { storage.set(k, v); if (interrumpir) { vigente = false; interrumpir = false; } },
    },
  });
  assert.equal((await mod.seleccionarAvisos([restaurante], 3, () => vigente)).length, 0);
  assert.equal((await mod.seleccionarAvisos([restaurante])).length, 1);
});

test('BUG-139: tarea de fondo usa favoritos persistidos y los mismos vistos que foreground', async () => {
  const storage = new Map([
    ['ubicacion', JSON.stringify({ estado: 'aceptado', version: 1 })],
    ['mira:ubicacionFondo', JSON.stringify({ activo: true })],
    [avisosModel.CLAVE_FAVS_AVISOS, '["r1"]'],
  ]);
  const AsyncStorage = { getItem: async k => storage.get(k) ?? null, setItem: async (k, v) => storage.set(k, v) };
  const persistencia = cargar('services/sesionesAvisos.js', { ...avisosModel, AsyncStorage });
  const llamadas = { cerca: 0, notificar: 0, post: 0 };
  let tarea;
  const AppState = { currentState: 'active' };
  cargar('services/ubicacionFondo.js', {
    ...avisosModel, AsyncStorage, AppState, es, ca, en, CLAVE_UBICACION: 'ubicacion', VERSION_CONSENTIMIENTO: 1,
    TaskManager: { defineTask: (_nombre, fn) => { tarea = fn; } }, Location: {}, debeConsultar: () => true,
    ofertasCerca: async () => { llamadas.cerca++; return [{ ...restaurante, restaurante: { id: 'r1', nombre: 'Favorito' } }]; },
    registrarAviso: async () => { llamadas.post++; }, notificarLocal: async () => { llamadas.notificar++; },
    seleccionarAvisos: persistencia.seleccionarAvisos,
  });
  const evento = { data: { locations: [{ coords: { latitude: 41, longitude: 2 } }] } };
  await tarea(evento); assert.equal(llamadas.cerca, 0, 'foreground lo gestiona el hook');
  AppState.currentState = 'background'; await tarea(evento); await tarea(evento);
  assert.deepEqual(llamadas, { cerca: 2, notificar: 1, post: 1 });
  assert.equal((await persistencia.seleccionarAvisos([restaurante])).length, 0);
  assert.doesNotMatch(storage.get(avisosModel.CLAVE_SESIONES), /lat|lng/);
});
