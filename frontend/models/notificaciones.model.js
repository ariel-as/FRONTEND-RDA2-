import { api } from './api.model.js';

// Normaliza una notificación sin suponer un único nombre de campo para "leída".
function normalizar(n = {}) {
  return {
    id: n.id,
    // El backend no envía título: se usa tipoNombre (V vencimiento, P promoción, L pedido listo, K lote por caducar, S stock mínimo).
    titulo: n.tipoNombre || '',
    tipo: n.tipo || '',
    mensaje: n.mensaje || '',
    fecha: n.fechaEnvio || null,
    leida: n.leida === true || n.leida === 'S' || n.estado === 'L'
  };
}

export const notificacionesModel = {
  async listar(params = { limit: 20 }) {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
    const res = await api.get(`/notificaciones${sp.toString() ? `?${sp}` : ''}`, { requiereSesion: true });
    const lista = (Array.isArray(res) ? res : (res?.data || [])).map(normalizar);
    lista.noLeidas = Number.isFinite(Number(res?.noLeidas)) ? Number(res.noLeidas) : lista.filter((x) => !x.leida).length;
    lista.pagination = res?.pagination;
    return lista;
  },
  marcarLeida: (id) => api.patch(`/notificaciones/${encodeURIComponent(id)}/leida`, {}, { requiereSesion: true })
};
