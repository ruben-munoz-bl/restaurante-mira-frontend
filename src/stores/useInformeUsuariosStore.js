/**
 * Store — preferencias del informe de usuarios (filtros, columnas, orden…).
 *
 * Persistido en localStorage (zustand/persist): NO escribe en la BD.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FILTROS_DEFECTO } from '../components/ops/informeUsuarios.js';

const PREFS_DEFECTO = {
  filtros: FILTROS_DEFECTO,
  columnas: ['nombre', 'email', 'tipo', 'plataforma', 'creado', 'ultimoLoginDate', 'saldoPuntos', 'preferencias'],
  orden: { campo: 'nombre', asc: true },
  formato: 'pdf',
  enmascarar: false,
  simulado: false,
};

const useInformeUsuariosStore = create(
  persist(
    (set) => ({
      ...PREFS_DEFECTO,

      setFiltro: (k, v) => set((s) => ({ filtros: { ...s.filtros, [k]: v } })),
      toggleColumna: (id) => set((s) => ({
        columnas: s.columnas.includes(id) ? s.columnas.filter((c) => c !== id) : [...s.columnas, id],
      })),
      setOrden: (campo) => set((s) => ({
        orden: { campo, asc: s.orden.campo === campo ? !s.orden.asc : true },
      })),
      setPref: (k, v) => set({ [k]: v }),
      restablecer: () => set({ ...PREFS_DEFECTO }),
    }),
    {
      name: 'mira-informe-usuarios',
      version: 2,
      // v1 guardaba un historial de exportaciones; ahora la trazabilidad la hace el backend.
      migrate: ({ historial, ...resto } = {}) => resto,
    },
  ),
);

export default useInformeUsuariosStore;
