import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { estadoVisible, SONDEO_MS } from '../src/models/llegadaModel.js';

// Ejecuta los hooks reales con las primitivas de React y el reloj controlados.
// Permite mantener un GET pendiente mientras cambia la visita o se desmonta.
function montar(archivo) {
  const estados = [], refs = [], efectos = [], temporizadores = new Map();
  let indice = 0, siguienteTimer = 0, respuesta, errorCreacion;
  const llamadas = [];
  const contexto = {
    Date,
    useState(inicial) {
      const i = indice++;
      if (!(i in estados)) estados[i] = typeof inicial === 'function' ? inicial() : inicial;
      return [estados[i], v => { estados[i] = typeof v === 'function' ? v(estados[i]) : v; }];
    },
    useRef(inicial) { const i = indice++; return refs[i] ||= { current: inicial }; },
    useCallback(fn) { indice++; return fn; },
    useEffect(fn, deps) {
      const i = indice++;
      if (!efectos[i] || deps.some((d, j) => d !== efectos[i].deps[j])) {
        efectos[i]?.limpiar?.();
        efectos[i] = { deps, ejecutar: fn };
      }
    },
    setInterval(fn, ms) { const id = ++siguienteTimer; temporizadores.set(id, { fn, ms }); return id; },
    clearInterval(id) { temporizadores.delete(id); },
    crearVisita: async () => { if (errorCreacion) throw errorCreacion; return respuesta; },
    verVisita(id) { return new Promise((resolve, reject) => llamadas.push({ id, resolve, reject })); },
    estadoVisible, SONDEO_MS,
  };
  vm.createContext(contexto);
  const codigo = readFileSync(new URL(archivo, import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export default function useLlegada', 'function useLlegada');
  vm.runInContext(codigo, contexto);
  return {
    llamadas,
    rechazarCreacion(e) { errorCreacion = e; },
    render() {
      indice = 0;
      const resultado = contexto.useLlegada('r1', { lat: 41, lng: 2 });
      for (const e of efectos) if (e?.ejecutar) { const fn = e.ejecutar; delete e.ejecutar; e.limpiar = fn(); }
      return resultado;
    },
    responder(id) { respuesta = { visita: { id, estado: 'pendiente', caducaEn: new Date(Date.now() + 900000).toISOString() }, qr: `qr-${id}` }; },
    async tick() { for (const t of [...temporizadores.values()]) if (t.ms === SONDEO_MS) t.fn(); await Promise.resolve(); },
    desmontar() { for (const e of efectos) e?.limpiar?.(); },
  };
}
const vaciar = async () => { await Promise.resolve(); await Promise.resolve(); };

for (const plataforma of ['src', 'mobile/src']) {
  test(`${plataforma}: un GET lento no solapa sondeos y una respuesta antigua no pisa un QR nuevo`, async () => {
    const h = montar(`../${plataforma}/hooks/useLlegada.js`);
    h.responder('vieja'); h.render(); await vaciar();
    let ui = h.render();
    await h.tick(); await h.tick();
    assert.equal(h.llamadas.length, 1);
    h.responder('nueva'); await ui.pedir(); ui = h.render();
    assert.equal(ui.visita.id, 'nueva');
    h.llamadas[0].resolve({ id: 'vieja', estado: 'confirmada' }); await vaciar();
    ui = h.render();
    assert.equal(ui.visita.id, 'nueva'); assert.equal(ui.qr, 'qr-nueva');
    await h.tick(); assert.equal(h.llamadas[1].id, 'nueva');
    h.desmontar();
  });
  for (const status of [401, 403, 404, 500]) {
    test(`${plataforma}: GET ${status} retira QR si es terminal y reintenta si es temporal`, async () => {
      const h = montar(`../${plataforma}/hooks/useLlegada.js`);
      h.responder('v1'); h.render(); await vaciar(); h.render();
      await h.tick(); h.llamadas[0].reject({ status }); await vaciar();
      const ui = h.render();
      assert.equal(ui.fase, status === 500 ? 'qr' : status === 401 ? 'sinSesion' : 'error');
      assert.equal(ui.qr, status === 500 ? 'qr-v1' : '');
      await h.tick(); assert.equal(h.llamadas.length, status === 500 ? 2 : 1);
      h.desmontar();
    });
  }
}

for (const plataforma of ['src', 'mobile/src']) {
  for (const [status, fase] of [[422, 'lejos'], [401, 'sinSesion'], [404, 'sinOferta'], [503, 'noDisponible']]) {
    test(`${plataforma}: POST ${status} conserva la fase de error contratada`, async () => {
      const h = montar(`../${plataforma}/hooks/useLlegada.js`);
      h.rechazarCreacion({ status, data: { error: status === 422 ? 'LEJOS' : 'ERROR', distanciaM: 72 } });
      h.render(); await vaciar();
      const ui = h.render();
      assert.equal(ui.fase, fase);
      if (status === 422) assert.equal(ui.distanciaM, 72);
      assert.equal(ui.qr, '');
      h.desmontar();
    });
  }
}
