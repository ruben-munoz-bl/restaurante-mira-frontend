/**
 * Ops data — agregados del panel operativo calculados con datos REALES de Firestore.
 * Coste por carga del dashboard: ~500 lecturas (reservas) + 200 (tickets) + 2 counts
 * + 2 queries pequeñas (contactos/negocios pendientes). Solo lo abre un admin.
 */
import { collection, getDocs, getCountFromServer, query, orderBy, limit, doc, updateDoc, addDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../../services/firebase.js';
import { listarPendientes } from '../../services/incidenciaApi.js';
import { listarNegociosPendientes } from '../../services/negocioApi.js';

export const PRECIO_MEDIO_PAX = 18; // convenio del frontend (FloatingReservation)
export const COMISION_BASE = 0.08; // 8% comisión base MIRA

export function comisionEstimada(comensales) {
  return Math.round(Number(comensales || 0) * PRECIO_MEDIO_PAX * COMISION_BASE * 100) / 100;
}

function fechaDeDoc(d) {
  const dObj = d.createdAt?.toDate ? d.createdAt.toDate() : null;
  if (dObj && !Number.isNaN(dObj.getTime())) return dObj;
  const f = d.fecha ? new Date(`${d.fecha}T${d.hora || '12:00'}`) : null;
  return f && !Number.isNaN(f.getTime()) ? f : null;
}

function diaISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function nombreRestauranteDe(r) {
  return r.nombreRestaurante || r.restauranteNombre || r.restaurantName || '—';
}

export function idRestauranteDe(r) {
  return r.restaurantId || r.restauranteId || 'unknown';
}

function antiguedadCorta(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

/** Cambia el estado de una reserva (operador). Las reglas solo permiten 'cancelada'. */
export async function updateReservationStatus(reservaId, estado) {
  await updateDoc(doc(getDb(), 'reservas', reservaId), { estado, updatedAt: serverTimestamp() });
  return { updated: true, estado };
}

/** Lista usuarios para el operador (requiere lectura admin en reglas). */
export async function listarUsuarios() {
  const snap = await getDocs(collection(getDb(), 'usuarios'));
  return snap.docs.map((d) => ({
    uid: d.id,
    nombre: d.data().nombre,
    email: d.data().email,
    tipo: d.data().tipo,
    saldoPuntos: d.data().saldoPuntos || 0,
  }));
}

/** Abona puntos manualmente + movimiento de auditoría. */
export async function abonarPuntos(uid, cantidad, motivo) {
  const db = getDb();
  await updateDoc(doc(db, 'usuarios', uid), { saldoPuntos: increment(cantidad) });
  await addDoc(collection(db, 'puntos_movimientos'), {
    uid, tipo: 'ajuste_admin', puntos: cantidad,
    descripcion: motivo,
    createdAt: serverTimestamp(),
  });
  return { updated: true };
}

/** Traduce un error de Firestore a mensaje accionable en español. */
export function mensajeErrorFirestore(e, coleccion) {
  const m = String(e?.message || e || '');
  if (/permission|insufficient|permiso denegado/i.test(m)) {
    return `Sin permiso en '${coleccion}'. Verifica que el documento admins/{TU_UID} existe en Firestore (proyecto restaurante-mira-18e0c) y que el ID coincide con tu UID de Authentication.`;
  }
  return m;
}

/** Carga todo lo necesario para el Dashboard General (tolera fallos parciales). */
export async function getOpsOverview() {
  const db = getDb();
  const avisos = [];
  const r = await Promise.allSettled([
    getDocs(query(collection(db, 'reservas'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(db, 'tickets'), orderBy('createdAt', 'desc'), limit(200))),
    getCountFromServer(collection(db, 'restaurants')),
    getCountFromServer(collection(db, 'usuarios')),
    listarPendientes().catch(() => []),
    listarNegociosPendientes().catch(() => []),
  ]);
  const nombres = ['reservas', 'tickets', 'restaurants', 'usuarios', 'contactos', 'negocios'];
  r.forEach((x, i) => {
    if (x.status === 'rejected') avisos.push(nombres[i]);
  });

  const reservas = r[0].status === 'fulfilled' ? r[0].value.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  const tickets = r[1].status === 'fulfilled' ? r[1].value.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  const nRest = r[2].status === 'fulfilled' ? r[2].value.data().count : 0;
  const nUsu = r[3].status === 'fulfilled' ? r[3].value.data().count : 0;
  const pendientes = r[4].status === 'fulfilled' ? r[4].value : [];
  const negocios = r[5].status === 'fulfilled' ? r[5].value : [];

  const hoy = new Date();
  const hoyISO = diaISO(hoy);
  const hace7 = new Date(hoy.getTime() - 7 * 86400000);
  const hace7ISO = diaISO(hace7);

  const porEstado = { confirmada: 0, pendiente: 0, completada: 0, cancelada: 0, no_show: 0 };
  reservas.forEach((r) => {
    const e = r.estado || 'pendiente';
    if (porEstado[e] == null) porEstado[e] = 0;
    porEstado[e] += 1;
  });
  const activas = reservas.filter((r) => r.estado !== 'cancelada');
  const asistidas = reservas.filter((r) => r.estado === 'completada').length;
  const asistenciaPct = activas.length ? Math.round((asistidas / activas.length) * 1000) / 10 : 0;

  const comisionReal = tickets.reduce((s, t) => s + (Number(t.importeComision) || 0), 0);
  const comisionEst = reservas
    .filter((r) => r.estado !== 'cancelada')
    .reduce((s, r) => s + comisionEstimada(r.comensales), 0);
  const comisionTotal = Math.round((comisionReal + comisionEst) * 100) / 100;

  // Serie diaria últimos 14 días (reservas + comisiones est.)
  const serie = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoy.getTime() - i * 86400000);
    const iso = diaISO(d);
    const delDia = reservas.filter((r) => {
      const f = fechaDeDoc(r);
      return f && diaISO(f) === iso && r.estado !== 'cancelada';
    });
    serie.push({
      fecha: iso,
      etiqueta: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      reservas: delDia.length,
      pax: delDia.reduce((s, r) => s + (Number(r.comensales) || 0), 0),
      comisiones: Math.round(delDia.reduce((s, r) => s + comisionEstimada(r.comensales), 0) * 100) / 100,
    });
  }

  // Ocupación por servicio (comida 13–16h / cena 20–23h), últimos 7 días
  const ultimos7 = reservas.filter((r) => {
    const f = fechaDeDoc(r);
    return f && diaISO(f) >= hace7ISO && r.estado !== 'cancelada';
  });
  const horaDe = (r) => Number(String(r.hora || '0').split(':')[0]);
  const comida = ultimos7.filter((r) => horaDe(r) >= 13 && horaDe(r) < 17);
  const cena = ultimos7.filter((r) => horaDe(r) >= 20 && horaDe(r) < 24);
  const paxComida = comida.reduce((s, r) => s + (Number(r.comensales) || 0), 0);
  const paxCena = cena.reduce((s, r) => s + (Number(r.comensales) || 0), 0);

  // Top restaurantes por cubiertos de HOY
  const porRest = {};
  reservas.forEach((r) => {
    if (r.estado === 'cancelada') return;
    const key = idRestauranteDe(r);
    if (!porRest[key]) porRest[key] = { id: key, nombre: nombreRestauranteDe(r), paxHoy: 0, reservasHoy: 0, comisionEst: 0 };
    const f = fechaDeDoc(r);
    if (f && diaISO(f) === hoyISO) {
      porRest[key].paxHoy += Number(r.comensales) || 0;
      porRest[key].reservasHoy += 1;
      porRest[key].comisionEst = Math.round((porRest[key].comisionEst + comisionEstimada(r.comensales)) * 100) / 100;
    }
  });
  const top = Object.values(porRest)
    .filter((x) => x.reservasHoy > 0)
    .sort((a, b) => b.paxHoy - a.paxHoy)
    .slice(0, 5);

  // Incidencias: contactos pendientes (críticas = no-show/cargo) + negocios
  const criticas = pendientes.filter((p) =>
    /no-show|cargo|disputa|cobro/i.test(`${p.motivo || ''} ${p.mensaje || ''}`),
  ).length;
  const incidenciasPreview = [
    ...pendientes.slice(0, 3).map((p) => ({ kind: 'contacto', ...p })),
    ...negocios.slice(0, Math.max(0, 3 - Math.min(3, pendientes.length))).map((n) => ({ kind: 'negocio', ...n })),
  ].slice(0, 3);

  const feed = reservas.slice(0, 8).map((r) => ({
    ...r,
    nombreRest: nombreRestauranteDe(r),
    comision: Math.round(comisionEstimada(r.comensales) * 100) / 100,
    antiguedad: antiguedadCorta(r.createdAt),
  }));

  return {
    avisos,
    kpis: {
      reservasTotal: reservas.length,
      asistenciaPct,
      restaurantesActivos: nRest,
      incidenciasPendientes: pendientes.length + negocios.length,
      criticas,
      usuariosTotal: nUsu,
      comisionTotal,
    },
    serie,
    porEstado,
    ocupacion: {
      comida: { reservas: comida.length, pax: paxComida },
      cena: { reservas: cena.length, pax: paxCena },
    },
    incidenciasPreview,
    pendientesTotal: pendientes.length,
    negociosTotal: negocios.length,
    top,
    feed,
  };
}

/** Reservas globales con filtros (admin). */
export async function getReservasGlobales({ q = '', estado = '', limite = 100 } = {}) {
  const db = getDb();
  const snap = await getDocs(query(collection(db, 'reservas'), orderBy('createdAt', 'desc'), limit(500)));
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nq = q.trim().toLowerCase();
  if (nq) {
    list = list.filter((r) =>
      [r.codigo, r.usuarioEmail, r.usuarioNombre, nombreRestauranteDe(r), r.fecha]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(nq),
    );
  }
  if (estado) list = list.filter((r) => (r.estado || 'pendiente') === estado);
  return list.slice(0, limite);
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Descarga un CSV en el navegador (facturas / reporte fiscal). */
export function descargarCSV(nombre, cabeceras, filas) {
  const lineas = [cabeceras.map(csvCell).join(';'), ...filas.map((f) => f.map(csvCell).join(';'))];
  const blob = new Blob([`﻿${lineas.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function csvReservas(list) {
  return {
    cabeceras: ['id', 'codigo', 'restaurante', 'cliente', 'email', 'fecha', 'hora', 'comensales', 'estado', 'comision_est'],
    filas: list.map((r) => [
      r.id, r.codigo || '', nombreRestauranteDe(r), r.usuarioNombre || '', r.usuarioEmail || '',
      r.fecha || '', r.hora || '', r.comensales ?? '', r.estado || '', comisionEstimada(r.comensales),
    ]),
  };
}
