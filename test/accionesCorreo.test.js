import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { accionSegunMode, leerAccionCorreo } from '../src/services/accionesCorreo.js';
import es from '../src/i18n/es.js';
import ca from '../src/i18n/ca.js';
import en from '../src/i18n/en.js';

test('mode elige verificación, reset compatible, recuperación o acción no soportada', () => {
  for (const mode of [null, undefined, '', 'resetPassword']) assert.equal(accionSegunMode(mode), 'resetPassword');
  assert.equal(accionSegunMode('verifyEmail'), 'verifyEmail');
  assert.equal(accionSegunMode('recoverEmail'), 'recoverEmail');
  assert.equal(accionSegunMode('signIn'), 'desconocida');
});

test('lee mode y oobCode en search, hash y enlaces antiguos sin mode', () => {
  for (const location of [
    { search: '?mode=verifyEmail&oobCode=a%2Bb', hash: '#/restablecer' },
    { hash: '#/restablecer?mode=verifyEmail&oobCode=a%2Bb' },
    { search: '?mode=verifyEmail', hash: '#/restablecer?oobCode=a%2Bb' },
  ]) assert.deepEqual(leerAccionCorreo(location), { accion: 'verifyEmail', oobCode: 'a+b' });
  assert.deepEqual(leerAccionCorreo({ search: '?oobCode=antiguo' }), { accion: 'resetPassword', oobCode: 'antiguo' });
  assert.deepEqual(leerAccionCorreo({ hash: '#/restablecer?mode=verifyEmail&oobCode=hash', search: '?mode=resetPassword&oobCode=search' }), { accion: 'verifyEmail', oobCode: 'hash' });
  assert.deepEqual(leerAccionCorreo(), { accion: 'resetPassword', oobCode: '' });
});

const codigo = transformSync(readFileSync(new URL('../src/components/Restablecer.jsx', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export default function', 'function'), { loader: 'jsx' }).code;
const tic = () => new Promise(r => setImmediate(r));
function montar({ mode = 'verifyEmail', code = 'codigo', error, idioma = 'es' } = {}) {
  const estados = [], refs = [], efectos = [];
  const llamadas = { verificar: [], reset: [], confirmar: [] };
  let indice = 0;
  const t = key => key.split('.').reduce((o, k) => o?.[k], { es, ca, en }[idioma]);
  const ctx = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    es, ca, en, leerAccionCorreo,
    window: { location: { hash: `#/restablecer?${mode === null ? '' : `mode=${mode}&`}oobCode=${code}` } },
    useT: () => t,
    useState(inicial) { const i = indice++; if (!(i in estados)) estados[i] = inicial; return [estados[i], v => { estados[i] = typeof v === 'function' ? v(estados[i]) : v; }]; },
    useRef(inicial) { const i = indice++; return refs[i] ||= { current: inicial }; },
    useEffect(fn, deps) { const i = indice++; if (!efectos[i] || deps.some((d, j) => d !== efectos[i].deps[j])) { efectos[i]?.limpiar?.(); efectos[i] = { fn, deps, pendiente: true }; } },
    verificarCorreo: async c => { llamadas.verificar.push(c); if (error) throw { code: error }; },
    verificarCodigoReset: async c => { llamadas.reset.push(c); return 'ana@example.com'; },
    confirmarNuevaContrasena: async (c, pass) => llamadas.confirmar.push([c, pass]),
    enmascararEmail: () => 'a•••@example.com',
  });
  vm.runInContext(codigo, ctx);
  function render() { indice = 0; const tree = ctx.Restablecer(); for (const e of efectos) if (e?.pendiente) { e.pendiente = false; e.limpiar = e.fn(); } return tree; }
  return { llamadas, render, repetirEfectos() { for (const e of efectos) if (e) { e.limpiar?.(); e.limpiar = e.fn(); } } };
}
function nodos(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...(tree.props?.children || []).flat(Infinity).flatMap(c => nodos(c, type))];
}

test('verifyEmail aplica el código una sola vez bajo repetición de efectos, sin formulario de contraseña', async () => {
  const h = montar(); h.render(); h.repetirEfectos(); await tic(); const tree = h.render();
  assert.deepEqual(h.llamadas.verificar, ['codigo']);
  assert.deepEqual(h.llamadas.reset, []);
  assert.equal(nodos(tree, 'form').length, 0);
  assert.match(JSON.stringify(tree), /Correo verificado/);
  assert.ok(nodos(tree, 'a').some(n => n.props.href === '#/login'));
  assert.ok(nodos(tree, 'a').some(n => n.props.href === '#/'));
});

for (const [error, texto] of [['auth/invalid-action-code', 'no es válido'], ['auth/expired-action-code', 'ha caducado'], ['auth/network-request-failed', 'No se ha podido']]) {
  test(`verifyEmail ${error}: error y sin formulario de reset`, async () => {
    const h = montar({ error }); h.render(); await tic(); const tree = h.render();
    assert.match(JSON.stringify(tree), new RegExp(texto));
    assert.equal(nodos(tree, 'form').length, 0);
    assert.deepEqual(h.llamadas.reset, []);
    assert.equal(nodos(tree, 'div').filter(n => n.props.role === 'alert').length, 1);
  });
}

for (const mode of ['resetPassword', null]) {
  test(`reset ${mode}: conserva validación y confirmación de contraseña`, async () => {
    const h = montar({ mode }); h.render(); await tic(); let tree = h.render();
    assert.deepEqual(h.llamadas.verificar, []);
    assert.deepEqual(h.llamadas.reset, ['codigo']);
    assert.equal(nodos(tree, 'form').length, 1);
    for (const input of nodos(tree, 'input')) input.props.onChange({ target: { value: 'nueva1234' } });
    tree = h.render(); await nodos(tree, 'form')[0].props.onSubmit({ preventDefault() {} });
    assert.deepEqual(h.llamadas.confirmar, [['codigo', 'nueva1234']]);
    assert.match(JSON.stringify(h.render()), /Contraseña cambiada correctamente/);
  });
}

test('sin código, recoverEmail y mode desconocido no se envían al reset ni aplican códigos', async () => {
  for (const opciones of [{ code: '' }, { mode: 'recoverEmail' }, { mode: 'signIn' }]) {
    const h = montar(opciones); h.render(); await tic(); const tree = h.render();
    assert.equal(nodos(tree, 'form').length, 0);
    assert.deepEqual(h.llamadas.verificar, []);
    assert.deepEqual(h.llamadas.reset, []);
  }
});

test('la confirmación de correo se traduce en es, ca y en', async () => {
  for (const [idioma, texto] of [['es', 'Correo verificado'], ['ca', 'Correu verificat'], ['en', 'Email verified']]) {
    const h = montar({ idioma }); h.render(); await tic(); assert.ok(JSON.stringify(h.render()).includes(texto));
  }
});

for (const plataforma of ['src', 'mobile/src']) {
  test(`${plataforma}: registro y reenvío de verificación continúan al inicio, el reset conserva su URL`, async () => {
    const correos = [], resets = [], aplicados = [];
    const usuario = { uid: 'u1', email: 'ana@example.com' };
    const auth = { currentUser: usuario };
    const ctx = vm.createContext({
      window: { location: { origin: 'https://mira.example' } },
      process: { env: { EXPO_PUBLIC_WEB_URL: 'https://mira.example/' } },
      getAuth: () => auth, getFirebaseAuth: () => auth, getFirebaseApp: () => ({}),
      createUserWithEmailAndPassword: async () => ({ user: usuario }), updateProfile: async () => {},
      guardarPerfil: async () => {}, track() {},
      sendEmailVerification: async (user, settings) => correos.push({ user, url: settings.url }),
      sendPasswordResetEmail: async (_auth, _email, settings) => resets.push(settings.url),
      applyActionCode: async (a, c) => aplicados.push([a, c]),
    });
    const source = readFileSync(new URL(`../${plataforma}/services/authApi.js`, import.meta.url), 'utf8')
      .replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/export /g, '');
    vm.runInContext(source, ctx);
    await ctx.crearCuenta({ nombre: 'Ana', email: usuario.email, password: 'prueba123' });
    await ctx.enviarVerificacionEmail('ca');
    assert.deepEqual(correos.map(x => x.url), ['https://mira.example/#/', 'https://mira.example/#/']);
    assert.ok(correos.every(x => x.user === usuario));
    await ctx.recuperarContrasena(usuario.email);
    assert.deepEqual(resets, ['https://mira.example/#/restablecer']);
    if (plataforma === 'src') {
      await ctx.verificarCorreo('codigo-firebase');
      assert.deepEqual(aplicados, [[auth, 'codigo-firebase']]);
    }
  });
}
