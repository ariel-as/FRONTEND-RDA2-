import { usuarioActual, codigosRol } from './sesion.model.js';

/*
 * Permisos del panel. El backend de la fase 2 devuelve en /auth/me una lista
 * `permisos` con textos `grupo:accion` (por ejemplo `caja:abrir`). El frontend
 * solo los usa para armar una interfaz clara: quien protege de verdad es el
 * servidor.
 *
 * Reglas:
 * - ADM puede todo.
 * - Un permiso de grupo (`pedidos`) se cumple con cualquier `pedidos:<accion>`.
 * - Un permiso concreto (`pedidos:convertir`) se cumple con el mismo texto,
 *   con `pedidos:*` o con `*`.
 * - Si el servidor todavía no envía `permisos`, solo ADM tiene acceso.
 */

export function esAdm(usuario = usuarioActual()) {
  if (!usuario) return false;
  const codigos = codigosRol(usuario);
  return codigos.includes('ADM') || (!codigos.length && usuario.rol === 'admin');
}

export function permisosUsuario(usuario = usuarioActual()) {
  return Array.isArray(usuario?.permisos) ? usuario.permisos.map((p) => String(p).trim()).filter(Boolean) : null;
}

export function servidorEnviaPermisos(usuario = usuarioActual()) {
  return permisosUsuario(usuario) !== null;
}

function cumple(lista, permiso) {
  const texto = String(permiso || '').trim();
  if (!texto) return true;
  if (lista.includes('*')) return true;
  const [grupo, accion] = texto.split(':');
  if (!accion) return lista.some((p) => p === grupo || p.startsWith(`${grupo}:`));
  return lista.includes(texto) || lista.includes(`${grupo}:*`);
}

// `permiso` puede ser un texto o una lista (basta con cumplir uno).
export function puede(permiso, usuario = usuarioActual()) {
  if (!usuario) return false;
  if (esAdm(usuario)) return true;
  if (permiso === null || permiso === undefined || permiso === '') return true;
  const lista = permisosUsuario(usuario);
  if (!lista) return false;
  const opciones = Array.isArray(permiso) ? permiso : [permiso];
  return opciones.some((p) => cumple(lista, p));
}
