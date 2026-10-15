/**
 * Hook — ubicación en la app (G03), solo en primer plano: expo-location deja de
 * enviar posiciones cuando la app pasa a segundo plano (eso llegará con G06).
 * La posición vive en memoria y no se envía ni se guarda.
 */
import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { leerConsentimiento, guardarConsentimiento, posicionVisible } from '../models/ubicacionModel.js';
import { iniciarSeguimiento } from '../services/seguimientoUbicacion.js';

export default function useUbicacion() {
  const [consentimiento, setConsentimiento] = useState(() => leerConsentimiento(globalThis.localStorage));
  const [posicion, setPosicion] = useState(null);
  const [error, setError] = useState('');
  const activa = consentimiento.estado === 'aceptado';

  useEffect(() => {
    if (!activa) { setPosicion(null); setError(''); return undefined; }
    let vigente = true;
    const parar = iniciarSeguimiento(Location, {
      sigueActiva: () => vigente,
      onPosicion: (coords) => { setPosicion(posicionVisible(coords)); setError(''); },
      onError: setError,
    });
    return () => { vigente = false; parar(); };
  }, [activa]);

  const decidir = useCallback((estado) => setConsentimiento(guardarConsentimiento(globalThis.localStorage, estado)), []);

  return {
    consentimiento,
    activa,
    posicion,
    error,
    aceptar: useCallback(() => decidir('aceptado'), [decidir]),
    rechazar: useCallback(() => decidir('rechazado'), [decidir]),
  };
}
