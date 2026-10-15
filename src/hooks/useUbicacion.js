/**
 * Hook — ubicación del usuario en la web (G03). Solo sigue la posición con la
 * página abierta y con el consentimiento aceptado; la posición vive en memoria
 * y no se envía ni se guarda (los avisos por distancia, G06, la usarán después).
 */
import { useCallback, useEffect, useState } from 'react';
import { leerConsentimiento, guardarConsentimiento, claveErrorUbicacion, posicionVisible } from '../models/ubicacionModel.js';

function almacenamiento() {
  try { return window.localStorage; } catch { return null; }
}

export default function useUbicacion() {
  const [consentimiento, setConsentimiento] = useState(() => leerConsentimiento(almacenamiento()));
  const [posicion, setPosicion] = useState(null);
  const [error, setError] = useState('');
  const activa = consentimiento.estado === 'aceptado';

  useEffect(() => {
    if (!activa) { setPosicion(null); setError(''); return undefined; }
    if (!navigator.geolocation) { setError('errorNoSoportado'); return undefined; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setPosicion(posicionVisible(p.coords)); setError(''); },
      (e) => setError(claveErrorUbicacion(e.code)),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [activa]);

  const decidir = useCallback((estado) => setConsentimiento(guardarConsentimiento(almacenamiento(), estado)), []);

  return {
    consentimiento,
    activa,
    posicion,
    error,
    aceptar: useCallback(() => decidir('aceptado'), [decidir]),
    rechazar: useCallback(() => decidir('rechazado'), [decidir]),
  };
}
