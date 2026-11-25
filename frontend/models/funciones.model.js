/*
 * Servicios de la fase 2 que el frontend ya sabe usar, con su estado en el
 * backend publicado en Render. Desde el 2026-11-22 la fase 2 está publicada (RESPUESTAS_BACKEND_PARA_FRONTEND.md):
 * todas las rutas nuevas responden 401 sin token y los pedidos aceptan C y E.
 *
 * Cuando el backend publique un servicio, se cambia aquí a true y la interfaz
 * correspondiente aparece sin tocar las pantallas.
 */
export const FUNCIONES_SERVIDOR = {
  // PATCH /pedidos/:id/estado con estado C (convertir en venta, con `pagos`) y E (entregado).
  pedidosConversion: true,
  // GET /notificaciones y PATCH /notificaciones/:id/leida (campana del panel y de la web).
  notificaciones: true
};

export function funcionDisponible(clave) {
  return FUNCIONES_SERVIDOR[clave] === true;
}
