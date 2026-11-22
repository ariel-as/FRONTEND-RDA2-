/*
 * Servicios de la fase 2 que el frontend ya sabe usar, con su estado en el
 * backend publicado en Render. Revisado el 2026-11-21 con peticiones GET de
 * solo lectura: ninguna ruta nueva de la sección 5 respondía (todas 404), y
 * PATCH /pedidos/:id/estado todavía solo acepta P→R y P/R→X.
 *
 * Cuando el backend publique un servicio, se cambia aquí a true y la interfaz
 * correspondiente aparece sin tocar las pantallas.
 */
export const FUNCIONES_SERVIDOR = {
  // PATCH /pedidos/:id/estado con estado C (convertir en venta, con `pagos`) y E (entregado).
  pedidosConversion: false,
  // GET /notificaciones y PATCH /notificaciones/:id/leida (campana del panel y de la web).
  notificaciones: false
};

export function funcionDisponible(clave) {
  return FUNCIONES_SERVIDOR[clave] === true;
}
