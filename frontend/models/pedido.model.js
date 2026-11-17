import { api } from './api.model.js';

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
      errores.push({ tipo: 'pedido', mensaje: error.mensaje, detalles: error.detalles, error });
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
export async function misInscripciones() {
  return api.get('/inscripciones/mis-inscripciones', { requiereSesion: true });
}
export async function cancelarPedido(id) {
  return api.patch(`/pedidos/${String(id)}/cancelar`, {}, { requiereSesion: true });
}
