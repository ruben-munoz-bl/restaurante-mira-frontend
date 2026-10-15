/**
 * Arranque del seguimiento de ubicación en la app (G03), sin React para poder
 * probarlo con node --test. `Location` es expo-location (inyectado).
 * Cada espera (permiso, servicios, suscripción) vuelve a comprobar sigueActiva():
 * si el usuario desactivó mientras tanto, no arranca nada y los avisos tardíos se
 * ignoran. Devuelve la función que para el seguimiento.
 */
export function iniciarSeguimiento(Location, { sigueActiva, onPosicion, onError }) {
  let parado = false;
  let suscripcion = null;
  const activo = () => !parado && sigueActiva();

  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!activo()) return;
      if (status !== 'granted') { onError('errorPermiso'); return; }
      const servicios = await Location.hasServicesEnabledAsync();
      if (!activo()) return;
      if (!servicios) { onError('errorNoDisponible'); return; }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (l) => { if (activo()) onPosicion(l.coords); },
        () => { if (activo()) onError('errorNoDisponible'); },
      );
      // Llegó tarde: el usuario ya desactivó mientras se creaba la suscripción.
      if (activo()) suscripcion = sub; else sub.remove();
    } catch {
      if (activo()) onError('errorDesconocido');
    }
  })();

  return () => { parado = true; suscripcion?.remove(); suscripcion = null; };
}
