/**
 * Controller — hook que orquesta estado, Model y Views.
 * Siempre por lotes de TAMANO_PAGINA (27) con scroll infinito:
 * - Sin filtros (Relevancia/Valoración): el API devuelve 27 + cursor.
 * - Con filtros u orden global: se trae el conjunto UNA vez, pero la UI solo
 *   muestra 27 y carga otros 27 al acercarse al final (mismo resultado que
 *   antes de migrar, sin pintar cientos de cards de golpe).
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  fetchPrimeraPagina,
  fetchSiguientePagina,
  fetchRestaurants,
  fetchRestaurantePorId,
  contarRestaurantes,
  TAMANO_PAGINA,
} from '../services/restaurantApi.js';
import { filterRestaurants, sortRestaurants, necesitaCargaTotal } from '../services/filterService.js';
import { completarRestaurante, dietaActiva, accesibilidadActiva, ZONAS_CATALUNA, COCINAS } from '../models/restaurantModel.js';
import { centroDeZona } from '../services/cityCenters.js';

const FILTROS_INICIALES = {
  q: '',
  precio: '',
  cocina: '',
  zona: '',
  distanciaMax: '',
  orden: 'Relevancia',
  dia: '',
  franja: '',
  hora: '',
};

export function useRestaurantController({ dieta = null, accesibilidad = null } = {}) {
  const [datos, setDatos] = useState([]); // docs cargados (tanda(s) o todo)
  const [modo, setModo] = useState('pagina'); // pagina | todo
  const [cursor, setCursor] = useState(null);
  const [hayMasApi, setHayMasApi] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  /** Cuántos de `filtrados` están pintados (siempre múltiplo de 27 tras cargar). */
  const [paginaVisible, setPaginaVisible] = useState(TAMANO_PAGINA);
  const [total, setTotal] = useState(0); // count() barato, 1 vez
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  // Sin geolocalización: la distancia es al punto más céntrico de su ciudad.
  const [seleccionado, setSeleccionado] = useState(null); // Restaurant | null (modal detalle)
  const [libro, setLibro] = useState(null); // Restaurant | null (modal carta libro)
  const [ignorarDieta, setIgnorarDieta] = useState(false); // ver todo igual (solo sesión)
  const reqId = useRef(0); // evita que una carga vieja pise a la nueva
  const cargandoRef = useRef(false); // evita doble tanda si el centinela dispara 2 veces

  // Total barato (agregado) + recarga con Reintentar.
  useEffect(() => {
    let vivo = true;
    contarRestaurantes()
      .then((n) => {
        if (vivo) setTotal(n);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [intento]);

  // Carga: sin filtros → portada paginada API (27 + cursor);
  // con filtros u orden global → conjunto entero UNA vez (la UI pinta de 27 en 27).
  useEffect(() => {
    let vivo = true;
    const id = ++reqId.current;
    const dietaEfectiva = ignorarDieta ? null : dieta;
    const accEfectiva = ignorarDieta ? null : accesibilidad;
    const traerTodo = necesitaCargaTotal({ ...filtros, dieta: dietaEfectiva, accesibilidad: accEfectiva });

    setEstado('cargando');
    setError('');
    setCursor(null);
    setHayMasApi(!traerTodo);
    setCargandoMas(false);
    setPaginaVisible(TAMANO_PAGINA);
    setModo(traerTodo ? 'todo' : 'pagina');

    const p = traerTodo
      ? fetchRestaurants().then((items) => ({ items, cursor: null, terminado: true }))
      : fetchPrimeraPagina();

    p.then((pg) => {
        if (!vivo || id !== reqId.current) return;
        setCursor(pg.cursor);
        setHayMasApi(!pg.terminado && !traerTodo);
        setDatos(pg.items);
        setEstado('listo');
      })
      .catch((e) => {
        if (!vivo || id !== reqId.current) return;
        setError(e.message);
        setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [filtros, intento, dieta, accesibilidad, ignorarDieta]);

  /**
   * Siguiente tanda del scroll infinito (siempre +27):
   * - modo pagina: pide la página siguiente al API.
   * - modo todo (ya está en memoria): solo desvela otros 27.
   */
  const cargarMas = useCallback(async () => {
    if (cargandoRef.current || cargandoMas) return;
    cargandoRef.current = true;
    try {
      if (modo === 'todo') {
        setPaginaVisible((p) => p + TAMANO_PAGINA);
        return;
      }
      if (!hayMasApi || !cursor) return;
      setCargandoMas(true);
      const pg = await fetchSiguientePagina(cursor);
      setCursor(pg.cursor);
      setHayMasApi(!pg.terminado);
      setDatos((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        return [...prev, ...pg.items.filter((r) => !ids.has(r.id))];
      });
      setPaginaVisible((p) => p + TAMANO_PAGINA);
    } catch {
      setHayMasApi(false);
    } finally {
      cargandoRef.current = false;
      setCargandoMas(false);
    }
  }, [modo, hayMasApi, cargandoMas, cursor]);

  /** Un restaurante por id: de memoria si está, si no 1 lectura. Estable para effects. */
  const obtenerRestaurante = useCallback(
    async (id) => {
      const hallado = datos.find((r) => String(r.id) === String(id));
      if (hallado) return completarRestaurante(hallado, centroDeZona(hallado.zona));
      const crudo = await fetchRestaurantePorId(id);
      return crudo ? completarRestaurante(crudo, centroDeZona(crudo.zona)) : null;
    },
    [datos],
  );

  /** Actualiza un solo campo del filtro (lo usa SearchBar en cada onChange). */
  function actualizarFiltro(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  /** Atajo del Hero: elige cocina y baja al buscador. */
  function elegirCocina(cocina) {
    setFiltros((prev) => ({ ...prev, cocina }));
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
  }

  function recargar() {
    setIntento((i) => i + 1);
  }

  // Distancia al centro de su ciudad (sin geolocalización); acento y media siempre.
  const conDistancia = useMemo(
    () => datos.map((r) => completarRestaurante(r, centroDeZona(r.zona))),
    [datos],
  );

  // Opciones: catálogo estático + valores reales de lo ya cargado.
  const cocinasDisponibles = useMemo(() => {
    const set = new Set([...COCINAS, ...datos.map((r) => r.cocina).filter(Boolean)]);
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [datos]);
  const zonasDisponibles = useMemo(
    () =>
      [...new Set([...ZONAS_CATALUNA, ...datos.map((r) => r.zona).filter(Boolean)])].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [datos],
  );

  const filtrados = useMemo(() => {
    const dietaEfectiva = ignorarDieta ? null : dieta;
    const accEfectiva = ignorarDieta ? null : accesibilidad;
    const base = filterRestaurants(conDistancia, { ...filtros, dieta: dietaEfectiva, accesibilidad: accEfectiva });
    return sortRestaurants(base, filtros.orden);
  }, [conDistancia, filtros, dieta, accesibilidad, ignorarDieta]);

  // Lo que se pinta: SIEMPRE de 27 en 27 (con o sin filtros).
  const visibles = useMemo(
    () => filtrados.slice(0, Math.max(TAMANO_PAGINA, paginaVisible)),
    [filtrados, paginaVisible],
  );

  const hayMas =
    modo === 'todo'
      ? visibles.length < filtrados.length
      : hayMasApi || visibles.length < filtrados.length;

  // Locales ocultos SOLO por preferencias (dieta o accesibilidad). Se comparan
  // con y sin ellas para el aviso.
  const ocultosDieta = useMemo(() => {
    if ((!dietaActiva(dieta) && !accesibilidadActiva(accesibilidad)) || ignorarDieta) return 0;
    const sinPrefs = filterRestaurants(conDistancia, { ...filtros, dieta: null, accesibilidad: null });
    return Math.max(0, sinPrefs.length - filtrados.length);
  }, [conDistancia, filtros, dieta, accesibilidad, ignorarDieta, filtrados.length]);

  // Nota: la dieta es preferencia de perfil (se cambia en Mi cuenta),
  // no filtro del buscador: no entra en hayFiltrosActivos ni lo borra Limpiar.
  const hayFiltrosActivos =
    filtros.q !== '' ||
    filtros.precio !== '' ||
    filtros.cocina !== '' ||
    filtros.zona !== '' ||
    filtros.distanciaMax !== '' ||
    filtros.orden !== 'Relevancia' ||
    filtros.dia !== '' ||
    filtros.franja !== '' ||
    filtros.hora !== '';

  return {
    filtros,
    filtrados,
    visibles,
    todos: conDistancia, // sin filtrar (para favoritos y comparador)
    total: total || datos.length, // si el count falla sin red, usa lo cargado
    modo,
    hayMas,
    cargandoMas,
    cargarMas,
    estado,
    error,
    geoEstado: 'centro',
    distanciaDisponible: true,
    cocinasDisponibles,
    zonasDisponibles,
    seleccionado,
    libro,
    ocultosDieta,
    ignorarDieta,
    hayFiltrosActivos,
    actualizarFiltro,
    elegirCocina,
    limpiarFiltros,
    recargar,
    abrirDetalle: setSeleccionado,
    cerrarDetalle: () => setSeleccionado(null),
    abrirCarta: setLibro,
    cerrarCarta: () => setLibro(null),
    verTodosIgual: () => setIgnorarDieta(true),
    obtenerRestaurante,
  };
}
