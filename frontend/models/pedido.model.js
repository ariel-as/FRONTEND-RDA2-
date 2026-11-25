import { api } from './api.model.js';
import { carrito, guardarCarrito } from './carrito.model.js';

function ajustarPorConflicto(detalles) {
  const lista = Array.isArray(detalles) ? detalles : (Array.isArray(detalles?.detalles) ? detalles.detalles : []);
  const actuales = carrito.obtener();
  const ajustes = [];
  lista.forEach((detalle) => {
    const id = detalle?.productoId ?? detalle?.id;
    if (id === undefined || id === null) return;
    const productoId = String(id);
    const item = actuales.find((l) => String(l.id) === productoId);
    if (!item) return;
    const crudo = detalle.disponible ?? detalle.cantidadDisponible ?? detalle.stock ?? 0;
    const disponible = typeof crudo === 'boolean'
      ? (crudo ? Math.max(0, Number(detalle.cantidadDisponible ?? item.cantidad ?? 0)) : 0)
      : Math.max(0, Number(crudo) || 0);
    if (disponible <= 0) carrito.eliminar(productoId);
    else carrito.cambiar(productoId, Math.min(item.cantidad, disponible));
    ajustes.push({ productoId, nombre: detalle.nombre || item.nombre, disponible });
  });
  if (ajustes.length) {
    const actualizados = carrito.obtener().map((linea) => {
      const ajuste = ajustes.find((a) => a.productoId === String(linea.id));
      return ajuste ? { ...linea, stock: ajuste.disponible } : linea;
    });
    guardarCarrito(actualizados);
  }
  return ajustes;
}


export async function confirmarCompra(carritoItems, pago = {}) {
  const productos = carritoItems.filter((i) => i.tipo !== 'plan');
  const planes = carritoItems.filter((i) => i.tipo === 'plan');
  let pedido = null;
  const inscripciones = [];
  const errores = [];
  const confirmadas = [];

  if (productos.length) {
    try {
      pedido = await api.post('/pedidos', {
        metodoPago: pago.metodoPago || 'EF',
        refTransferencia: pago.metodoPago === 'TR' ? (pago.refTransferencia || undefined) : undefined,
        items: productos.map((p) => ({ productoId: String(p.id), cantidad: Number(p.cantidad) }))
      }, { requiereSesion: true });
      confirmadas.push(...productos.map((p) => String(p.id)));
    } catch (error) {
      if (error.status === 401) throw error;
      const ajustes = error.status === 409 ? ajustarPorConflicto(error.detalles) : [];
      errores.push({ tipo: 'pedido', mensaje: error.mensaje, detalles: error.detalles, ajustes, error });
    }
  }

  for (const plan of planes) {
    try {
      const ins = await api.post('/inscripciones', { membresiaId: String(plan.membresiaId || plan.id) }, { requiereSesion: true });
      inscripciones.push(ins);
      confirmadas.push(String(plan.id));
    } catch (error) {
      if (error.status === 401) throw error;
      errores.push({ tipo: 'inscripcion', plan: plan.nombre, mensaje: error.mensaje, detalles: error.detalles, error });
    }
  }

  return { pedido, inscripciones, errores, confirmadas };
}

export async function misPedidos(page = 1, limit = 10) {
  return api.get(`/pedidos/mis-pedidos?page=${page}&limit=${limit}`, { requiereSesion: true });
}

export async function numeroPedidoCliente(id) {
  if (!id) return null;
  const limite = 100;
  let pagina = 1;
  let totalPaginas = 1;
  let vistos = 0;
  while (pagina <= totalPaginas && pagina <= 50) {
    const res = await misPedidos(pagina, limite);
    const lista = res?.data || res?.pedidos || res || [];
    if (!Array.isArray(lista)) return null;
    const total = Number(res?.pagination?.total) || lista.length;
    const indice = lista.findIndex((p) => String(p.id) === String(id));
    if (indice !== -1) return total - vistos - indice;
    totalPaginas = Number(res?.pagination?.totalPages) || 1;
    vistos += lista.length;
    pagina += 1;
  }
  return null;
}
export async function misInscripciones() {
  return api.get('/inscripciones/mis-inscripciones', { requiereSesion: true });
}
export async function cancelarPedido(id) {
  return api.patch(`/pedidos/${String(id)}/cancelar`, {}, { requiereSesion: true });
}
