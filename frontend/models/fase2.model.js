import { api } from './api.model.js';

// Rutas de la fase 2 (sección 5 del contrato). Todas piden sesión.
const S = { requiereSesion: true };
const e = encodeURIComponent;
export function consulta(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') sp.set(k, v); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}
const get = (ruta, params) => api.get(`${ruta}${consulta(params)}`, S);
const post = (ruta, body = {}) => api.post(ruta, body, S);
const put = (ruta, body = {}) => api.put(ruta, body, S);
const patch = (ruta, body = {}) => api.patch(ruta, body, S);

export const usuariosModel = {
  listar: (p) => get('/admin/usuarios', p),
  editar: (id, body) => put(`/admin/usuarios/${e(id)}`, body),
  roles: (id, roles) => put(`/admin/usuarios/${e(id)}/roles`, { roles })
};
export const gimnasioModel = {
  leer: () => get('/admin/gimnasio'),
  guardar: (body) => put('/admin/gimnasio', body),
  horario: () => get('/admin/gimnasio/horario'),
  guardarHorario: (dias) => put('/admin/gimnasio/horario', { dias })
};
export const cajaModel = {
  abrir: (body) => post('/admin/caja/turnos', body),
  actual: () => get('/admin/caja/turnos/actual'),
  movimiento: (body) => post('/admin/caja/movimientos', body),
  cuadrar: (id, efectivoContado) => patch(`/admin/caja/turnos/${e(id)}/cuadre`, { efectivoContado }),
  turnos: (p) => get('/admin/caja/turnos', p),
  cierre: (body) => post('/admin/caja/cierres', body),
  cierres: (p) => get('/admin/caja/cierres', p)
};
// Turno abierto hoy: primero se mira la lista del día y solo si hay uno abierto se pide el detalle (sin 404 cuando no hay turno).
export async function turnoAbierto() {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  const r = await cajaModel.turnos({ desde: hoy, hasta: hoy, limit: 100 });
  const abiertos = (Array.isArray(r) ? r : (r?.data || [])).filter((c) => (c.efectivoContado === null || c.efectivoContado === undefined) && !c.cierreCajaId);
  if (!abiertos.length) return null;
  const actual = await cajaModel.actual();
  return actual?.data ?? actual;
}
export const clientesModel = {
  listar: (p) => get('/admin/clientes', p),
  crear: (body) => post('/admin/clientes', body),
  editar: (cedula, body) => put(`/admin/clientes/${e(cedula)}`, body),
  historial: (cedula) => get(`/admin/clientes/${e(cedula)}/historial`),
  acceso: (cedula) => get(`/admin/clientes/${e(cedula)}/acceso`)
};
export const inscripcionesModel = {
  listar: (p) => get('/admin/inscripciones', p),
  crear: (body) => post('/admin/inscripciones', body),
  detalle: (id) => get(`/admin/inscripciones/${e(id)}`),
  cobrar: (id, pagos) => post(`/admin/inscripciones/${e(id)}/cobrar`, { pagos }),
  agregarIntegrante: (id, clienteId) => post(`/admin/inscripciones/${e(id)}/integrantes`, { clienteId }),
  quitarIntegrante: (id, cedula) => api.delete(`/admin/inscripciones/${e(id)}/integrantes/${e(cedula)}`, S),
  renovar: (id, body) => post(`/admin/inscripciones/${e(id)}/renovar`, body),
  suspender: (id, body) => post(`/admin/inscripciones/${e(id)}/suspensiones`, body),
  anularSuspension: (id, motivo) => patch(`/admin/suspensiones/${e(id)}/anular`, { motivo }),
  anular: (id, motivo) => patch(`/admin/inscripciones/${e(id)}/anular`, { motivo })
};
export const entradasModel = {
  registrar: (body) => post('/admin/entradas', body),
  paseDiario: (body) => post('/admin/entradas/pase-diario', body),
  salida: (id) => patch(`/admin/entradas/${e(id)}/salida`),
  listar: (p) => get('/admin/entradas', p),
  aforo: () => get('/admin/aforo')
};
export const ventasModel = {
  crear: (body) => post('/admin/ventas', body),
  listar: (p) => get('/admin/ventas', p),
  detalle: (id) => get(`/admin/ventas/${e(id)}`),
  anular: (id, motivo) => patch(`/admin/ventas/${e(id)}/anular`, { motivo })
};
export const facturasModel = {
  generar: (body) => post('/admin/facturas', body),
  pendientes: (p) => get('/admin/facturas/pendientes', p),
  listar: (p) => get('/admin/facturas', p),
  detalle: (id) => get(`/admin/facturas/${e(id)}`),
  sri: (id, body) => patch(`/admin/facturas/${e(id)}/sri`, body),
  porAnular: (p) => get('/admin/facturas/por-anular', p),
  anular: (id) => patch(`/admin/facturas/${e(id)}/anular`)
};
export const inventarioModel = {
  recibir: (body) => post('/admin/inventario/entradas', body),
  ajustar: (body) => post('/admin/inventario/ajustes', body),
  baja: (id, observacion) => post(`/admin/inventario/lotes/${e(id)}/baja`, { observacion }),
  bloqueo: (id, bloquear) => patch(`/admin/inventario/lotes/${e(id)}/bloqueo`, { bloquear }),
  lotes: (p) => get('/admin/inventario/lotes', p),
  alertas: () => get('/admin/inventario/alertas'),
  kardex: (productoId, p) => get(`/admin/inventario/kardex/${e(productoId)}`, p),
  proveedores: (id) => get(`/admin/productos/${e(id)}/proveedores`),
  guardarProveedores: (id, proveedores) => put(`/admin/productos/${e(id)}/proveedores`, { proveedores })
};
export const comprasModel = {
  crear: (body) => post('/admin/compras', body),
  listar: (p) => get('/admin/compras', p),
  detalle: (id) => get(`/admin/compras/${e(id)}`),
  autorizar: (id) => patch(`/admin/compras/${e(id)}/autorizar`),
  anular: (id) => patch(`/admin/compras/${e(id)}/anular`),
  recibir: (id, body) => post(`/admin/compras/${e(id)}/recepciones`, body)
};
export const rutinasModel = {
  listar: (p) => get('/admin/rutinas', p),
  crear: (body) => post('/admin/rutinas', body),
  detalle: (id) => get(`/admin/rutinas/${e(id)}`),
  editar: (id, body) => put(`/admin/rutinas/${e(id)}`, body),
  cliente: (cedula) => get(`/admin/rutinas/cliente/${e(cedula)}`),
  plantillas: (p) => get('/admin/rutinas/plantillas', p),
  ejercicios: (p) => get('/admin/rutinas/ejercicios', p),
  miRutina: () => get('/rutinas/mi-rutina')
};
export const aliadosModel = {
  cobrar: (cedula, body) => post(`/admin/aliados/${e(cedula)}/comisiones`, body),
  comisiones: (p) => get('/admin/aliados/comisiones', p)
};
export const mensajesModel = {
  listar: (p) => get('/admin/mensajes', p),
  respondido: (id) => patch(`/admin/mensajes/${e(id)}/respondido`)
};
export const asistenciaModel = {
  entrada: (body = {}) => post('/admin/personal/asistencia/entrada', body),
  salida: (body = {}) => post('/admin/personal/asistencia/salida', body),
  reporte: (p) => get('/admin/personal/asistencia', p)
};
export const REPORTES = ['clientes', 'entradas', 'ventas', 'ganancia', 'inventario', 'inscripciones', 'caja', 'comisiones'];
export const reportesModel = {
  ver: (tipo, p) => get(`/admin/reportes/${e(tipo)}`, p),
  // El CSV se descarga con el token, por eso pasa por el cliente HTTP y no por un enlace directo.
  csv: (tipo, p) => api.get(`/admin/reportes/${e(tipo)}${consulta({ ...p, formato: 'csv' })}`, { ...S, headers: { Accept: 'text/csv' } })
};
export const adminMembresiasModel = { listar: (p) => get('/admin/membresias', p) };
export const planesModel = { listar: () => api.get('/membresias') };
export const lista = (respuesta) => (Array.isArray(respuesta) ? respuesta : (respuesta?.data ?? []));
