import './admin.controller.js';
import { asistenciaModel } from '../models/fase2.model.js';
import { puede } from '../models/permisos.model.js';
import { txt, fecha } from '../views/lista-api.view.js';
import { mostrarMensaje } from './validacion.controller.js';
import { crearLista } from './lista-api.controller.js';

const region = document.querySelector('#pantalla-asistencia [data-mensaje]');
const hora = (v) => txt(String(v || '').slice(0, 5));

document.querySelectorAll('[data-marcar]').forEach((b) => b.addEventListener('click', async () => {
  try {
    const r = await (b.dataset.marcar === 'entrada' ? asistenciaModel.entrada() : asistenciaModel.salida()).then((x) => x?.data ?? x);
    const h = String((b.dataset.marcar === 'entrada' ? r?.horaEntrada : r?.horaSalida) || '').slice(0, 5);
    mostrarMensaje(region, `${b.dataset.marcar === 'entrada' ? 'Entrada' : 'Salida'} registrada${h ? ` a las ${h}` : ''}.`, 'exito');
    reporte?.recargar();
  } catch (error) { mostrarMensaje(region, error.mensaje || 'No se pudo registrar la asistencia.', 'error'); }
}));

// Reporte con rango de fechas: atrasos y faltas los calcula el servidor.
const reporte = puede(['asistencia:reporte', 'asistencia:gestionar']) && document.body.dataset.sinAcceso !== 'true' ? crearLista({
  raiz: '#pantalla-asistencia', filtros: '#filtros-asistencia', caption: 'Reporte de asistencia del personal',
  cargar: (p) => asistenciaModel.reporte(p),
  columnas: [['Empleado', (a) => txt(a.empleado?.nombre || a.empleado || a.empleadoId)], ['Fecha', (a) => fecha(a.fecha)], ['Entrada', (a) => hora(a.horaEntrada)], ['Salida', (a) => hora(a.horaSalida)],
    ['Atraso', (a) => txt(a.atraso === true ? 'Sí' : a.atraso === false ? 'No' : a.minutosAtraso ? `${a.minutosAtraso} min` : a.atraso)], ['Observación', (a) => txt(a.observacion || (a.falta ? 'Falta' : ''))]]
}) : null;
