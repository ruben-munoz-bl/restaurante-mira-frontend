/**
 * Store — conversación con el agente MIRA.
 *
 * Plantilla de useInviteStore: create((set, get) => ({...})), default export,
 * y los errores NO viven en el store (write = console.error + throw / info).
 *
 * Idempotencia: la clave va PEGADA al mensaje del usuario, no en un state
 * del componente, así un reintento del mismo turno reutiliza la clave
 * (mismo patrón que la caché de useDailyLogin.js).
 */
import { create } from 'zustand';
import { enviarTurno } from '../services/aiApi.js';
import {
  buildHistory,
  nuevaIdempotencyKey,
  normalizarRespuesta,
  MAX_MENSAJE,
} from '../services/aiPayload.js';
import { desdeError } from '../services/aiErrors.js';

const SALUDO = {
  id: 'm-saludo',
  role: 'model',
  content:
    'Hola, soy MIRA. Dime qué quieres: buscar un sitio, mirar una ficha, reservar mesa o consultar tus puntos.',
};

let contador = 0;
const nuevoId = () => `m-${Date.now().toString(36)}-${(contador += 1)}`;

const esUsuario = (m) => m && m.role === 'user';

export const useMiraStore = create((set, get) => ({
  abierto: false,
  mensajes: [SALUDO],
  enviando: false,
  error: null,
  confirmPendiente: null,
  /** Último turno fallido, para el botón "Reintentar". */
  ultimoFallido: null,
  /** AbortController de la petición en vuelo (botón "Parar"). */
  abortController: null,

  abrir: () => set({ abierto: true }),
  cerrar: () => set({ abierto: false }),
  alternar: () => set((s) => ({ abierto: !s.abierto })),

  /** Nueva conversación: fuera error, confirmación pendiente y reintento. */
  limpiar: () =>
    set({ mensajes: [SALUDO], error: null, confirmPendiente: null, ultimoFallido: null, enviando: false }),

  /** Botón "Parar": aborta la petición en vuelo sin pintar error. */
  parar: () => {
    get().abortController?.abort();
    set({ enviando: false, abortController: null });
  },

  _turno: async (mio, texto, confirmId) => {
    const ctl = new AbortController();
    set({ enviando: true, error: null, abortController: ctl });

    try {
      const crudo = await enviarTurno({
        message: texto,
        history: buildHistory(get().mensajes.filter((m) => m.id !== mio.id)),
        confirmId,
        idempotencyKey: mio.idempotencyKey,
        signal: ctl.signal,
      });
      const r = normalizarRespuesta(crudo);
      set((s) => ({
        mensajes: [...s.mensajes, { id: nuevoId(), role: 'model', content: r.reply, acciones: r.actions }],
        confirmPendiente: r.needsConfirm,
        ultimoFallido: null,
        enviando: false,
        abortController: null,
      }));
      return r;
    } catch (err) {
      const info = desdeError(err);
      if (!info.abortado) console.error('MIRA: fallo al enviar el turno:', err);
      set({
        error: info.abortado ? null : info,
        ultimoFallido: info.abortado ? get().ultimoFallido : { id: mio.id, confirmId },
        enviando: false,
        abortController: null,
      });
      return null;
    }
  },

  /**
   * Turno normal.
   * @param {string} texto mensaje del usuario
   * @param {object} [opts]
   * @param {string} [opts.confirmId] uuid de needsConfirm (paso de confirmación)
   * @param {boolean}[opts.sinBubla] no añade burbuja de usuario (reintento)
   */
  enviar: async (texto, opts = {}) => {
    const limpio = String(texto ?? '').trim().slice(0, MAX_MENSAJE);
    if (!limpio || get().enviando) return null;

    const mio = { id: nuevoId(), role: 'user', content: limpio, idempotencyKey: nuevaIdempotencyKey() };
    if (!opts.sinBubla) set((s) => ({ mensajes: [...s.mensajes, mio] }));

    return get()._turno(mio, limpio, opts.confirmId ?? null);
  },

  /**
   * Confirmar una mutación. Idempotency-Key NUEVA: el backend exige clave
   * distinta por paso, aunque sea la misma reserva (plan backend §8).
   */
  confirmar: async () => {
    const pendiente = get().confirmPendiente;
    if (!pendiente || get().enviando) return null;
    set({ confirmPendiente: null });
    return get().enviar('Sí, confirmo', { confirmId: pendiente.confirmId });
  },

  /** El usuario reniega: se descarta la tarjeta, sin llamar a la API. */
  cancelarConfirmacion: () => set({ confirmPendiente: null }),

  /** Reintenta el último turno fallido reutilizando SU clave de idempotencia. */
  reintentar: async () => {
    const previo = get().ultimoFallido;
    const mio = previo && get().mensajes.find((m) => m.id === previo.id);
    if (!mio || get().enviando) return null;
    return get()._turno(mio, mio.content, previo.confirmId ?? null);
  },

  /** Envía un mensaje sin pasarlo por el composer (chips, botones de tarjeta). */
  sugerir: (texto) => get().enviar(texto),
}));

export default useMiraStore;