/**
 * Controller — data test de reservas.
 *
 * Crea N usuarios de prueba reales (Firebase Auth + perfil `usuarios/{uid}`
 * con preferencias, vía API) y les hace 1 reserva real cada uno contra mira-api.
 *
 * Reglas del test:
 * - Secuencial con pausa entre pasos: sin saturar Auth ni la API.
 * - PARA ante el primer error (sin reintentos); el log dice en qué falló.
 * - Identidades ALEATORIAS: nombres de persona reales («Ana García») y
 *   correo en demo-mira.es con número único (ana.garcia4829@demo-mira.es).
 *   Si un correo generado ya existe, se entra con él y se sigue.
 * - Todo ocurre en la app secundaria `mira-data-test` (otra instancia de
 *   Firebase): la sesión de la persona que ejecuta el test NO se toca ni se
 *   cierra. Las llamadas a la API llevan el Bearer de cada usuario de prueba.
 * Las Views reciben todo por props.
 */
import { useState, useRef } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirebaseAppDataTest } from '../services/firebase.js';
import { guardarPerfil } from '../services/perfilApi.js';
import { crearReserva, SLOTS } from '../services/reservaApi.js';
import { ALERGIAS } from '../models/restaurantModel.js';

export const TOTAL_USUARIOS = 10; // valor por defecto; el número de usuarios es configurable
export const MAX_USUARIOS = 999; // tope por seguridad (≈2,5 s de pausa por usuario)
export const PASSWORD_TEST = 'TestMira123';
const DOMINIO = 'demo-mira.es';
const PAUSA_MS = 1200;
// Nombres y apellidos reales (en español) para las identidades aleatorias.
const NOMBRES = [
  'Ana', 'Lucía', 'María', 'Carmen', 'Sofía', 'Laura', 'Elena', 'Paula', 'Sara', 'Nerea',
  'Daniel', 'Carlos', 'Pablo', 'Jorge', 'Miguel', 'David', 'Hugo', 'Álvaro', 'Martín', 'Diego',
];
const APELLIDOS = [
  'García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández', 'Ruiz', 'Díaz', 'Moreno',
  'Álvarez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco',
];

function pausa(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Minúsculas sin tildes, para que el correo sea siempre válido. */
function paraCorreo(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Identidad aleatoria: nombre y apellidos reales + número de 4 dígitos único
 * en el correo (ana.garcia4829@demo-mira.es). `usados` evita repetir números
 * dentro de la misma tirada.
 */
function nuevaIdentidad(usados) {
  let numero;
  do {
    numero = String(Math.floor(Math.random() * 9000) + 1000);
  } while (usados.has(numero));
  usados.add(numero);
  const nombre = NOMBRES[Math.floor(Math.random() * NOMBRES.length)];
  const apellido = APELLIDOS[Math.floor(Math.random() * APELLIDOS.length)];
  return {
    nombre: `${nombre} ${apellido}`,
    email: `${paraCorreo(nombre)}.${paraCorreo(apellido)}${numero}@${DOMINIO}`,
  };
}

/** Fisher–Yates: mezcla una copia de la lista. */
function barajar(lista) {
  const a = [...lista];
  for (let k = a.length - 1; k > 0; k -= 1) {
    const j = Math.floor(Math.random() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

/** Preferencias determinísticas por índice: el informe las grafica. */
function preferenciasDe(i) {
  return {
    vegano: i % 4 === 0,
    vegetariano: i % 4 === 1,
    sinGluten: i % 5 === 0,
    alergias: i % 3 === 0 ? [ALERGIAS[i % ALERGIAS.length]] : [],
  };
}

function isoLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Todos los días (inclusive) entre dos fechas YYYY-MM-DD; si estáninvertidas, se ordenan. Máx. 366. */
function listaDias(desdeISO, hastaISO) {
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

/**
 * Slot por día y hora: reparte por días y franjas para no saturar un hueco
 * (aforo).
 * `fechaElegida` admite:
 *   null              → se reparten en hoy, +1 y +2 días;
 *   'YYYY-MM-DD'      → todas las reservas van a ese día;
 *   { desde, hasta }  → rango: `plan` trae los días y las franjas MEZCLADOS
 *                       (aleatorios, sin orden); sin plan, se usa el rango en
 *                       orden secuencial (reserva de seguridad).
 */
function slotDe(i, fechaElegida = null, plan = null) {
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
      // Días y franjas al azar: ni el día ni la hora siguen un orden fijo.
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
  return {
    fecha,
    hora,
    comensales: 1 + (i % 4),
  };
}

/** App y Auth secundarias: crear/entrar aquí no toca la sesión principal. */
function auth() {
  return getAuth(getFirebaseAppDataTest());
}

/** Alta (o reentrada si el email ya existe) + perfil con preferencias. */
async function altaUsuario(i, identidad) {
  const { nombre, email } = identidad;
  const perfil = {
    tipo: 'cliente',
    nombre,
    email,
    lang: 'es',
    plataforma: 'web',
    preferencias: preferenciasDe(i),
  };
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth(), email, PASSWORD_TEST);
    await updateProfile(cred.user, { displayName: nombre });
  } catch (e) {
    if (e.code !== 'auth/email-already-in-use') throw e;
    cred = await signInWithEmailAndPassword(auth(), email, PASSWORD_TEST);
  }
  const token = await cred.user.getIdToken();
  await guardarPerfil(cred.user.uid, perfil, token);
  return { uid: cred.user.uid, email: cred.user.email, displayName: nombre, token };
}

export function useDataTest() {
  const [estado, setEstado] = useState('inactivo'); // inactivo | corriendo | completado | parado | detenido
  const [log, setLog] = useState([]);
  const [resumen, setResumen] = useState(null); // { creados, reservas }
  const enMarcha = useRef(false);
  const cancelado = useRef(false);

  const corriendo = estado === 'corriendo';

  function detener() {
    cancelado.current = true;
  }

  /**
   * Lanza una tirada de N usuarios con su reserva.
   * `fechaElegida`: null (reparto hoy/+1/+2) | 'YYYY-MM-DD' (día concreto)
   *                 | { desde, hasta } (rango: los días salen AL AZAR).
   */
  async function ejecutar(restaurante, fechaElegida = null, total = TOTAL_USUARIOS) {
    // Número de usuarios de esta tirada: 1..MAX_USUARIOS (por defecto, 10).
    const n = Math.max(1, Math.min(MAX_USUARIOS, Math.floor(Number(total) || TOTAL_USUARIOS)));
    if (enMarcha.current || !restaurante?.id) return;
    enMarcha.current = true;
    cancelado.current = false;
    setEstado('corriendo');
    setLog([]);
    setResumen({ creados: 0, reservas: 0, total: n });

    let estadoFinal = 'completado';
    let creados = 0;
    let reservas = 0;
    const anotar = (entrada) => setLog((prev) => [...prev, entrada]);
    const guardar = () => setResumen({ creados, reservas, total: n });
    // Rango: días y franjas se mezclan UNA vez por tirada → elección aleatoria.
    const plan = fechaElegida?.desde && fechaElegida?.hasta
      ? { dias: barajar(listaDias(fechaElegida.desde, fechaElegida.hasta)), horas: barajar(SLOTS) }
      : null;
    const identidades = new Set();

    for (let i = 1; i <= n; i += 1) {
      if (cancelado.current) {
        estadoFinal = 'detenido';
        anotar({ ok: false, texto: '■ Test detenido a mano.' });
        break;
      }
      const identidad = nuevaIdentidad(identidades);
      const email = identidad.email;
      try {
        const usuario = await altaUsuario(i, identidad);
        creados += 1;
        anotar({ ok: true, texto: `[${i}/${n}] ${email} · cuenta creada ✓` });
        guardar();

        await pausa(PAUSA_MS);
        if (cancelado.current) {
          estadoFinal = 'detenido';
          anotar({ ok: false, texto: '■ Test detenido a mano.' });
          guardar();
          break;
        }

        const { fecha, hora, comensales } = slotDe(i, fechaElegida, plan);
        const r = await crearReserva({
          restaurante,
          usuario,
          fecha,
          hora,
          comensales,
          comentarios: `Data test ${i}/${n}`,
          token: usuario.token,
          // El data test SÍ puede reservar en fechas pasadas (para rellenar
          // paneles históricos); si mira-api también lo rechaza, el error sale
          // en el registro y el test para aquí.
          permitirPasado: true,
        });
        reservas += 1;
        anotar({
          ok: true,
          texto: `[${i}/${n}] ${email} · reserva ${r.codigo} · ${fecha} ${hora} · ${comensales} pax ✓`,
        });
        guardar();
        await pausa(PAUSA_MS);
      } catch (e) {
        estadoFinal = 'parado';
        anotar({
          ok: false,
          texto: `✕ [${i}/${n}] ${email}: ${e.message} — test parado aquí (sin reintentos).`,
        });
        guardar();
        break;
      }
    }

    setEstado(estadoFinal);
    enMarcha.current = false;
    try {
      // Solo la app secundaria: la sesión de quien ejecuta el test no se toca.
      await signOut(auth());
    } catch {
      /* ya no había sesión en la app de test */
    }
  }

  return { estado, log, resumen, corriendo, ejecutar, detener };
}
