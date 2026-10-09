/**
 * Lógica pura del data test (sin Firebase ni React): fechas, franjas e
 * importes. Separada de useDataTest para poder testearla con `node --test`.
 */
import { SLOTS } from '../services/reservaApi.js';

export function isoLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Todos los días (inclusive) entre dos fechas YYYY-MM-DD; si están invertidas, se ordenan. Máx. 366. */
export function listaDias(desdeISO, hastaISO) {
  const a = new Date(`${desdeISO}T00:00:00`);
  const b = new Date(`${hastaISO}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return [];
  let ini = a;
  let fin = b;
  if (fin < ini) { ini = b; fin = a; }
  const dias = [];
  const cur = new Date(ini);
  while (cur <= fin && dias.length < 366) {
    dias.push(isoLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dias;
}

/** Fisher–Yates: mezcla una copia de la lista. */
export function barajar(lista, rnd = Math.random) {
  const a = [...lista];
  for (let k = a.length - 1; k > 0; k -= 1) {
    const j = Math.floor(rnd() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

/**
 * Slot por día y hora: reparte por días y franjas para no saturar un hueco
 * (aforo).
 * `fechaElegida` admite:
 *   null              → se reparten en hoy, +1 y +2 días;
 *   'YYYY-MM-DD'      → todas las reservas van a ese día (también pasado);
 *   { desde, hasta }  → rango (también pasado): `plan` trae los días y las
 *                       franjas MEZCLADOS; sin plan, el rango en orden.
 */
export function slotDe(i, fechaElegida = null, plan = null) {
  const idx = i - 1;
  let fecha;
  let hora;
  if (typeof fechaElegida === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaElegida)) {
    fecha = fechaElegida;
    hora = SLOTS[idx % SLOTS.length];
  } else if (fechaElegida?.desde && fechaElegida?.hasta) {
    const dias = plan?.dias?.length ? plan.dias : listaDias(fechaElegida.desde, fechaElegida.hasta);
    const horas = plan?.horas?.length ? plan.horas : SLOTS;
    if (dias.length) {
      fecha = dias[idx % dias.length];
      hora = horas[idx % horas.length];
    }
  }
  if (!fecha) {
    const dia = new Date();
    dia.setDate(dia.getDate() + (i % 3));
    fecha = isoLocal(dia);
    hora = SLOTS[idx % SLOTS.length];
  }
  return { fecha, hora, comensales: 1 + (i % 4) };
}

export function esPasada(fecha, hoy = new Date()) {
  return fecha < isoLocal(hoy);
}

/**
 * Gasto por comensal según el tramo de precio del restaurante (en €).
 * Sin tramo conocido se trata como '€€'.
 */
export const GASTO_POR_PAX = {
  '€': [12, 22],
  '€€': [22, 40],
  '€€€': [45, 85],
  '€€€€': [80, 150],
};

/**
 * Importe aleatorio pero lógico del ticket de una mesa: cada comensal gasta
 * dentro del rango de su tramo, la cena sale un 15% más cara que la comida y
 * se redondea a 0,10 € como un TPV.
 */
export function importeTicket(restaurante, comensales, hora = '14:00', rnd = Math.random) {
  const [min, max] = GASTO_POR_PAX[restaurante?.precio] || GASTO_POR_PAX['€€'];
  const pax = Math.max(1, Number(comensales) || 1);
  const cena = Number(String(hora).slice(0, 2)) >= 17 ? 1.15 : 1;
  let total = 0;
  for (let k = 0; k < pax; k += 1) total += min + rnd() * (max - min);
  return Math.round(total * cena * 10) / 10;
}
