import { api } from './api.model.js';

// Normaliza una notificación sin suponer un único nombre de campo para "leída".
function normalizar(n = {}) {
  return {
    id: n.id,
    titulo: n.titulo || n.asunto || '',
    mensaje: n.mensaje || n.descripcion || n.texto || '',
    fecha: n.fecha || n.createdAt || n.fechaCreacion || null,
    leida: n.leida === true || n.leida === 'S' || Boolean(n.fechaLectura)
  };
}

export const notificacionesModel = {
  async listar(params = { limit: 20 }) {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
    const res = await api.get(`/notificaciones${sp.toString() ? `?${sp}` : ''}`, { requiereSesion: true });
    const lista = Array.isArray(res) ? res : (res?.data || []);
    return lista.map(normalizar);
  },
  marcarLeida: (id) => api.patch(`/notificaciones/${encodeURIComponent(id)}/leida`, {}, { requiereSesion: true })
};
