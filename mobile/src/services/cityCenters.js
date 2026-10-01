/**
 * Punto más céntrico de cada ciudad (sin usar la ubicación del usuario).
 * Se usa para centrar el mapa por zona y como referencia de distancia.
 * Coordenadas: plazas centrales (Plaça Catalunya, Plaça de la Font,
 * Plaça Independència, Plaça de la Paeria).
 */
export const CENTRO_CATALUNA = { lat: 41.6, lng: 1.8, zoom: 8 };

export const CENTROS_CIUDAD = {
  'Barcelona, Spain': { lat: 41.3879, lng: 2.1699, zoom: 13, nombre: 'Barcelona' },
  'Tarragona, Spain': { lat: 41.1189, lng: 1.2445, zoom: 13, nombre: 'Tarragona' },
  'Girona, Spain': { lat: 41.9794, lng: 2.8214, zoom: 13, nombre: 'Girona' },
  'Lleida, Spain': { lat: 41.6148, lng: 0.6256, zoom: 13, nombre: 'Lleida' },
};

/**
 * Centro para una zona (o Cataluña si no hay coincidencia).
 * @param {string} zona
 */
export function centroDeZona(zona) {
  if (zona && CENTROS_CIUDAD[zona]) return CENTROS_CIUDAD[zona];
  // Acepta también "Barcelona" sin ", Spain"
  if (zona) {
    const clave = Object.keys(CENTROS_CIUDAD).find(
      (k) => k.toLowerCase().startsWith(String(zona).toLowerCase().split(',')[0].trim()),
    );
    if (clave) return CENTROS_CIUDAD[clave];
  }
  return CENTRO_CATALUNA;
}
