import { CLAVES, leerLocal, escribirLocal } from './storage.model.js';

export const CANTIDAD_MAXIMA = 20;
export const CANTIDAD_MAXIMA_PLAN = 1;

export function esPlan(linea) {
  return linea?.tipo === 'plan';
}
function maximoDe(linea) {
  const base = esPlan(linea) ? CANTIDAD_MAXIMA_PLAN : CANTIDAD_MAXIMA;
  const stock = Number.isFinite(Number(linea?.stock)) ? Number(linea.stock) : base;
  return Math.max(1, Math.min(base, stock));
}

export function obtenerCarrito() {
  const carrito = leerLocal(CLAVES.carrito, []);
  return Array.isArray(carrito) ? carrito : [];
}
export function guardarCarrito(carrito) {
  return escribirLocal(CLAVES.carrito, carrito);
}
export function vaciarCarrito() {
  guardarCarrito([]);
  return [];
}
export function contarArticulos(carrito = obtenerCarrito()) {
  return carrito.reduce((total, item) => total + item.cantidad, 0);
}
export function agregarProducto(producto, cantidad = 1) {
  const carrito = obtenerCarrito();
  const existente = carrito.find((item) => String(item.id) === String(producto.id));
  const base = {
    id: String(producto.id),
    nombre: producto.nombre,
    precio: Number(producto.precio),
    porcentajeIva: producto.porcentajeIva,
    imagen: producto.imagen || '',
    tipo: producto.tipo || 'producto',
    membresiaId: producto.membresiaId || (producto.tipo === 'plan' ? String(producto.id) : undefined),
    stock: producto.stock
  };
  if (existente) {
    if (base.stock != null) existente.stock = base.stock;
    if (base.membresiaId) existente.membresiaId = base.membresiaId;
    existente.cantidad = Math.min(maximoDe(existente), existente.cantidad + cantidad);
  } else {
    carrito.push({ ...base, cantidad: Math.min(maximoDe(base), Math.max(1, cantidad)) });
  }
  guardarCarrito(carrito);
  return carrito;
}
export function eliminarProducto(id) {
  const carrito = obtenerCarrito().filter((item) => String(item.id) !== String(id));
  guardarCarrito(carrito);
  return carrito;
}
export function cambiarCantidad(id, cantidad) {
  const carrito = obtenerCarrito();
  const item = carrito.find((linea) => String(linea.id) === String(id));
  if (!item) return carrito;
  const nuevaCantidad = Math.min(maximoDe(item), Math.max(0, Number(cantidad) || 0));
  if (nuevaCantidad === 0) return eliminarProducto(id);
  item.cantidad = nuevaCantidad;
  guardarCarrito(carrito);
  return carrito;
}
export function calcularSubtotal(producto, cantidad) {
  return Number(producto.precio) * Number(cantidad);
}
export function calcularSubtotalTotal(carrito = obtenerCarrito()) {
  return carrito.reduce((total, item) => total + calcularSubtotal(item, item.cantidad), 0);
}
export function calcularTotal(carrito = obtenerCarrito()) {
  return calcularSubtotalTotal(carrito);
}
export function formatearPrecio(valor) {
  return `$${Number(valor || 0).toFixed(2)}`;
}
function notificarCambio(carritoActual) {
  window.dispatchEvent(new CustomEvent('carrito:actualizado', { detail: { articulos: contarArticulos(carritoActual) } }));
}
export const carrito = {
  agregar(producto, cantidad) { const r = agregarProducto(producto, cantidad); notificarCambio(r); return r; },
  eliminar(id) { const r = eliminarProducto(id); notificarCambio(r); return r; },
  cambiar(id, cantidad) { const r = cambiarCantidad(id, cantidad); notificarCambio(r); return r; },
  vaciar() { const r = vaciarCarrito(); notificarCambio(r); return r; },
  obtener: obtenerCarrito,
  contar: contarArticulos,
  subtotal: calcularSubtotalTotal,
  total: calcularTotal
};
