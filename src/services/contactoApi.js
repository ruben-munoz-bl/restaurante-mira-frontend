/**
 * Model — formulario de contacto vía API.
 */
import { api } from './httpClient.js';

export async function enviarContacto({ nombre, email, motivo, mensaje }) {
  try {
    await api.post(
      '/v1/contactos',
      {
        nombre: String(nombre || '').trim(),
        email: String(email || '').trim(),
        motivo,
        mensaje: String(mensaje || '').trim(),
      },
      { auth: false },
    );
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      throw new Error('No se pudo enviar el mensaje. Inténtalo de nuevo.');
    }
    throw new Error('No se pudo enviar el mensaje. Inténtalo de nuevo.');
  }
}
