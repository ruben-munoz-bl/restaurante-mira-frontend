/**
 * Model — incidencias sobre la colección `contactos`.
 * Al enviar logueado se guarda uid/email/estado 'pendiente'.
 * El cliente ve las suyas; el admin (tipo='admin' en usuarios) ve pendientes y resuelve.
 * Costes: todo son queries pequeñas o escrituras unitarias, nada de full-scans.
 */
import { collection, addDoc, getDocs, getDoc, doc, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from './firebase.js';

/** ¿Es admin? Revisa `usuarios/{uid}.tipo === 'admin'`. */
export async function esAdmin(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(getDb(), 'usuarios', uid));
    return snap.exists() && snap.data().tipo === 'admin';
  } catch {
    return false;
  }
}

/** Mis incidencias: por uid. */
export async function listarMisIncidencias({ uid }) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(getDb(), 'contactos'), where('uid', '==', uid)));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (b.creado?.seconds ?? 0) - (a.creado?.seconds ?? 0));
  return list;
}

/** Cola de pendientes para el admin (1 query). */
export async function listarPendientes() {
  const snap = await getDocs(query(collection(getDb(), 'contactos'), where('estado', '==', 'pendiente')));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.creado?.seconds ?? 0) - (b.creado?.seconds ?? 0));
  return list;
}

/** Marcar resuelta (solo admin, lo refuerzan las reglas). */
export async function resolverIncidencia(id) {
  await updateDoc(doc(getDb(), 'contactos', id), { estado: 'resuelta' });
}
