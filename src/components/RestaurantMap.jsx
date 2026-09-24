/**
 * Mapa Leaflet del restaurante + parkings cercanos (react-leaflet).
 * - Marker rojo restaurante, markers azules parkings
 * - Marker seleccionado resaltado (borde dorado)
 * - fitBounds automático con padding 40px, maxZoom 16
 * - Atribución OSM + Geoapify (requerida en plan gratis)
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function crearIcono(color, selected) {
  const size = selected ? 34 : 28;
  const border = selected ? '3px solid #f59e0b' : '2px solid #fff';
  return L.divIcon({
    className: '',
    html: `<span style="display:inline-grid;place-items:center;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 1px 6px rgba(0,0,0,0.35);transition:all .2s;"><span style="width:${selected ? 12 : 10}px;height:${selected ? 12 : 10}px;border-radius:50%;background:#fff;display:block"></span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

const iconoRestaurante = crearIcono('#d92d20', false);
const iconoParking = crearIcono('#2563eb', false);
const iconoParkingSeleccionado = crearIcono('#2563eb', true);

function esLatLngValido(p) {
  return Array.isArray(p)
    && Number.isFinite(Number(p[0]))
    && Number.isFinite(Number(p[1]));
}

function FitBounds({ puntos }) {
  const map = useMap();
  useEffect(() => {
    const validos = puntos.filter(esLatLngValido);
    if (!validos.length) return;
    try {
      if (validos.length === 1) {
        map.setView(validos[0], 15);
      } else {
        map.fitBounds(validos, { padding: [40, 40], maxZoom: 16 });
      }
      setTimeout(() => {
        try { map.invalidateSize(); } catch { /* mapa ya desmontado */ }
      }, 100);
    } catch { /* contenedor aún no listo */ }
  }, [map, puntos]);
  return null;
}

function FlyToPunto({ punto }) {
  const map = useMap();
  useEffect(() => {
    if (punto && esLatLngValido(punto)) {
      try { map.flyTo(punto, 16, { duration: 0.8 }); } catch { /* noop */ }
    }
  }, [map, punto]);
  return null;
}

export default function RestaurantMap({ restaurant, parkings = [], selectedIndex, onMapReady }) {
  const t = useT(TRADS);
  const coords = restaurant?.coords;
  const mapRef = useRef(null);

  useEffect(() => {
    if (onMapReady && mapRef.current) onMapReady(mapRef.current);
  }, [onMapReady]);

  const centroValido = coords
    && Number.isFinite(Number(coords.lat))
    && Number.isFinite(Number(coords.lng));
  if (!centroValido) return null;

  const centro = [Number(coords.lat), Number(coords.lng)];
  const parkingsValidos = parkings.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lon)));
  const puntos = [centro, ...parkingsValidos.map((p) => [Number(p.lat), Number(p.lon)])];
  const seleccionado = selectedIndex != null ? parkingsValidos[selectedIndex] : null;

  return (
    <div className="restaurant-map" role="application" aria-label={`${t('otros.mapaPorZonas')} — ${restaurant.nombre}`}>
      <MapContainer
        center={centro}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | POIs by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={centro} icon={iconoRestaurante}>
          <Popup>
            <strong>{restaurant.nombre}</strong>
            <br />
            {restaurant.direccion || restaurant.ciudad || ''}
          </Popup>
        </Marker>
        {parkingsValidos.map((p, i) => (
          <Marker
            key={p.id}
            position={[Number(p.lat), Number(p.lon)]}
            icon={i === selectedIndex ? iconoParkingSeleccionado : iconoParking}
          >
            <Popup>
              <strong>{p.nombre}</strong>
              <br />
              {p.direccion}
              <br />
              {p.gratuito === 'yes' ? t('otros.gratis') : t('otros.pago')}
              {p.tipo !== '—' ? ` · ${p.tipo}` : ''}
              {p.distanciaMetros != null ? ` · ${p.distanciaMetros} m` : ''}
            </Popup>
          </Marker>
        ))}
        <FitBounds puntos={puntos} />
        {seleccionado && <FlyToPunto punto={[Number(seleccionado.lat), Number(seleccionado.lon)]} />}
      </MapContainer>
    </div>
  );
}
