/**
 * Auditoría (cliente): validación/saneado de eventos, cola por lotes,
 * formateador de breakdown, periodos en UTC, estado en la URL y catálogo
 * alineado con el backend.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanearEvento, crearCola, MAX_LOTE, detectarDispositivo, normalizarPeriodo, formatearBreakdown,
  etiquetaCubo, leerEstadoUrl, escribirEstadoUrl, diffCambios, limpiarDatos,
} from '../src/services/auditoriaCore.js';
import { TIPOS, CATEGORIAS, colorTipo, etiquetaTipo } from '../src/components/ops/auditoriaCatalog.js';

test('saneado: sin PII, máx. 15 claves, textos a 512 y cambios planos', () => {
  const datos = { email: 'a@b.com', telefono: '600', password: 'x', nota: 'llámame al +34 600 123 456', ok: 'paella' };
  for (let i = 0; i < 20; i++) datos[`k${i}`] = i;
  const e = sanearEvento({ tipo: 'busqueda', datos, mensajeError: 'x'.repeat(900), cambios: [{ campo: 'saldo', antes: 1, despues: { n: 2 } }] });
  assert.equal(e.datos.email, undefined);
  assert.equal(e.datos.telefono, undefined);
  assert.equal(e.datos.password, undefined);
  assert.equal(e.datos.nota, '[oculto]');
  assert.equal(e.datos.ok, 'paella');
  assert.ok(Object.keys(e.datos).length <= 15);
  assert.equal(e.mensajeError.length, 512);
  assert.deepEqual(e.cambios, [{ campo: 'saldo', antes: 1, despues: '{"n":2}' }]);
  assert.equal(limpiarDatos({}), undefined);
  assert.equal(limpiarDatos({ desde: '2026-10-05T00:00:00.000Z' }).desde, '2026-10-05T00:00:00.000Z');
});

test('saneado: descarta duraciones < 50 ms y limita el scroll a 1 cada 2 s', () => {
  assert.equal(sanearEvento({ tipo: 'busqueda', meta: { duracionMs: 10 } }), null);
  assert.ok(sanearEvento({ tipo: 'busqueda', meta: { duracionMs: 120 } }));
  const ultimosScroll = new Map();
  const s = { tipo: 'scroll_profundidad', sesionId: 'a' };
  assert.ok(sanearEvento(s, { ahora: 0, ultimosScroll }));
  assert.equal(sanearEvento(s, { ahora: 1500, ultimosScroll }), null);
  assert.ok(sanearEvento(s, { ahora: 2100, ultimosScroll }));
  assert.ok(sanearEvento({ ...s, sesionId: 'b' }, { ahora: 1500, ultimosScroll }), 'otra sesión no se frena');
});

test('cola: lotes de como mucho 100, orden conservado y reintento al principio', () => {
  const cola = crearCola();
  for (let i = 0; i < 250; i++) cola.meter({ i });
  const l1 = cola.sacarLote();
  assert.equal(l1.length, MAX_LOTE);
  assert.equal(l1[0].i, 0);
  cola.devolver(l1); // fallo de red: vuelve delante
  assert.equal(cola.sacarLote()[0].i, 0);
  assert.equal(cola.sacarLote().length, 100);
  assert.equal(cola.sacarLote().length, 50);
  assert.equal(cola.sacarLote(), null);
});

test('cola: acotada para no crecer sin límite sin red', () => {
  const cola = crearCola({ maxPendientes: 10 });
  for (let i = 0; i < 25; i++) cola.meter({ i });
  assert.equal(cola.tamano(), 10);
  assert.equal(cola.sacarLote()[0].i, 15);
});

test('dispositivo: móvil, tablet y escritorio', () => {
  assert.equal(detectarDispositivo({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/605.1', ancho: 390, alto: 844, touch: true }).tipo, 'mobile');
  assert.equal(detectarDispositivo({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0) Safari/605.1', ancho: 820, alto: 1180, touch: true }).os, 'iPadOS');
  const pc = detectarDispositivo({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Edg/130.0', ancho: 1920, alto: 1080 });
  assert.deepEqual([pc.tipo, pc.os, pc.navegador], ['desktop', 'Windows', 'Edge']);
});

test('periodos a UTC: día, semana ISO (lunes), mes y todo', () => {
  const ahora = new Date('2026-10-07T23:30:00Z'); // miércoles
  assert.equal(normalizarPeriodo('dia', ahora).desde.toISOString(), '2026-10-07T00:00:00.000Z');
  assert.equal(normalizarPeriodo('semana', ahora).desde.toISOString(), '2026-10-05T00:00:00.000Z');
  assert.equal(normalizarPeriodo('semana', new Date('2026-10-04T10:00:00Z')).desde.toISOString(), '2026-09-28T00:00:00.000Z', 'domingo pertenece a la semana del lunes anterior');
  assert.equal(normalizarPeriodo('mes', ahora).desde.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(normalizarPeriodo('todo', ahora).desde.getTime(), 0);
  assert.equal(normalizarPeriodo('inventado', ahora).periodo, 'mes');
  assert.deepEqual(['dia', 'semana', 'mes', 'todo'].map((p) => normalizarPeriodo(p, ahora).granularidad), ['hora', 'dia', 'dia', 'mes']);
});

test('etiquetas de cubo de la serie', () => {
  assert.equal(etiquetaCubo('2026-W41'), 'S41');
  assert.equal(etiquetaCubo('2026-10-07T13:00'), '13h');
  assert.match(etiquetaCubo('2026-10-07'), /07/);
});

test('breakdown: etiquetas y colores del catálogo, "—" sin base y fila Otros', () => {
  const r = formatearBreakdown(
    { total: 10, items: [{ valor: 'busqueda', n: 6, pct: 60 }, { valor: 'sin dato', n: 1, pct: 10 }], resto: 3 },
    { etiqueta: etiquetaTipo, color: colorTipo },
  );
  assert.equal(r.filas[0].etiqueta, 'Búsqueda');
  assert.equal(r.filas[0].pct, '60 %');
  assert.equal(r.filas[0].color, CATEGORIAS.busqueda.color);
  assert.equal(r.filas[1].etiqueta, 'sin dato');
  assert.deepEqual([r.filas[2].etiqueta, r.filas[2].n, r.filas[2].pct], ['Otros', 3, '30 %']);
  const vacio = formatearBreakdown({ total: 0, items: [{ valor: 'x', n: 0, pct: null }] });
  assert.equal(vacio.vacio, true);
  assert.equal(vacio.filas[0].pct, '—');
});

test('estado de la vista en la URL: ida y vuelta, ignora claves ajenas', () => {
  const hash = escribirEstadoUrl('#/admin', { seccion: 'auditoria', periodo: 'semana', tipos: 'login_exitoso', fuente: '', otra: 'x' });
  assert.equal(hash, '#/admin?seccion=auditoria&periodo=semana&tipos=login_exitoso');
  assert.deepEqual(leerEstadoUrl(hash), { seccion: 'auditoria', periodo: 'semana', tipos: 'login_exitoso' });
  assert.deepEqual(leerEstadoUrl('#/admin'), {});
});

test('diffCambios solo incluye los campos que cambian', () => {
  assert.deepEqual(
    diffCambios({ nombre: 'A', aforo: 6, ciudad: 'BCN' }, { nombre: 'A', aforo: 8, telefono: '93' }),
    [{ campo: 'aforo', antes: 6, despues: 8 }, { campo: 'telefono', antes: null, despues: '93' }],
  );
});

test('catálogo: incluye los tipos obligatorios y todos tienen categoría válida', () => {
  const obligatorios = ['login_exitoso', 'scroll_profundidad', 'mapa_marcador_pulsado', 'favorito_añadido', 'reserva_no_show',
    'negocio_rechazado', 'invitación_aceptada', 'promo_pulsada', 'admin_acceso_denegado', 'export_auditoria', 'interaccion'];
  for (const t of obligatorios) assert.ok(TIPOS[t], `falta ${t}`);
  for (const [t, v] of Object.entries(TIPOS)) assert.ok(CATEGORIAS[v.categoria], `${t} sin categoría`);
});
