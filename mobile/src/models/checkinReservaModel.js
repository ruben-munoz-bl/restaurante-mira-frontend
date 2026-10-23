/** M11: el servidor valida la firma; la app solo distingue el prefijo. */
/** @param {unknown} qr */
export const esQrReserva = (qr) => typeof qr === 'string' && qr.startsWith('r1.');

/**
 * @param {{post: (ruta: string, cuerpo: {qr: string}) => Promise<any>}} api
 * @param {string} qr
 */
export function validarQrLlegada(api, qr) {
  return api.post(esQrReserva(qr) ? '/v1/reservations/checkin' : '/v1/visitas/validar', { qr });
}

/**
 * Los tres errores 409 de reservas tienen causas y mensajes distintos.
 * @param {{status?: number, data?: {error?: string}} | null | undefined} error
 */
export function mensajeErrorReserva(error) {
  /** @type {Record<string, string>} */
  const mensajes = {
    QR_INVALIDO: 'El QR de la reserva no es válido.',
    OTRO_RESTAURANTE: 'Esta reserva es de otro restaurante.',
    NOT_FOUND: 'No se ha encontrado la reserva o su cliente.',
    QR_USADO: 'Esta reserva ya se ha presentado. Su QR ya está usado.',
    RESERVA_CANCELADA: 'La reserva está cancelada. No se puede confirmar la llegada.',
    FUERA_DE_FECHA: 'Este QR solo se puede usar el día de la reserva (hora de Madrid).',
    RESERVAS_QR_NO_CONFIGURADO: 'El check-in de reservas no está disponible. Contacta con el responsable.',
    FORBIDDEN: 'Tu cuenta no tiene permiso para confirmar reservas.',
  };
  if (error?.status === 401) return 'La sesión ha caducado. Vuelve a iniciar sesión.';
  return mensajes[error?.data?.error || ''] || 'No se pudo confirmar la llegada. Reintenta.';
}
