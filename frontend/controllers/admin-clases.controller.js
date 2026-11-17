import './admin.controller.js';
import { adminModel } from '../models/admin.model.js';
import { iniciarPantalla } from './admin-generico.controller.js';
import { escapar } from '../views/componentes.view.js';

const ESTADO_CLASE = { A: 'Activa', S: 'Suspendida' };
const ESTADO_HORARIO = { A: 'Activo', S: 'Suspendido' };

async function filasDe(tabla) {
  try {
    const respuesta = await adminModel.tablaFilas(tabla, { limit: 200 });
    return respuesta?.data || respuesta || [];
  } catch { return []; }
}

async function iniciar() {
  const [servicios, empleados, horarios] = await Promise.all([filasDe('servicio'), filasDe('empleado'), filasDe('horario')]);
  const mapaServicios = new Map(servicios.map((s) => [String(s.id), s.nombre || s.id]));
  const mapaEmpleados = new Map(empleados.map((e) => [String(e.id), `${e.nombre || ''} ${e.apellido || ''}`.trim() || e.id]));
  const mapaHorarios = new Map(horarios.map((h) => [String(h.id), `${h.dia || ''} ${h.horaInicio || ''}-${h.horaFin || ''}`.trim()]));
  const opcionesServicios = servicios.filter((s) => s.tipo === 'I').map((s) => ({ valor: s.id, texto: s.nombre || s.id }));
  const opcionesEmpleados = empleados.map((e) => ({ valor: e.id, texto: `${e.nombre || ''} ${e.apellido || ''}`.trim() || e.id }));
  const clases = await filasDe('clase');
  const mapaClases = new Map(clases.map((c) => [String(c.id), c.nombre || c.id]));
  const opcionesClases = clases.map((c) => ({ valor: c.id, texto: c.nombre || c.id }));
  const opcionesHorarios = horarios.map((h) => ({ valor: h.id, texto: `${h.dia || ''} ${h.horaInicio || ''}-${h.horaFin || ''}`.trim() }));

  iniciarPantalla({
  raiz: '#pantalla-clase',
  tabla: 'clase',
  titulo: 'Clases',
  columnas: ['id', 'nombre', 'servicioId', 'empleadoId', 'lugar', 'cupoMax', 'estado'],
  etiquetas: { id: 'Código', empleadoId: 'Instructor', cupoMax: 'Cupo máximo' },
  defaults: { estado: 'A', cupoMax: 20 },
  opciones: { servicioId: opcionesServicios, empleadoId: opcionesEmpleados },
  opcionesFijas: { estado: ESTADO_CLASE },
  formatoCelda: {
    servicioId: (valor) => escapar(mapaServicios.get(String(valor)) || valor || ''),
    empleadoId: (valor) => escapar(mapaEmpleados.get(String(valor)) || valor || ''),
    estado: (valor) => escapar(ESTADO_CLASE[valor] || valor || 'vacío')
  },
  relaciones: [
    {
      tabla: 'clase_horario',
      titulo: 'Horarios de la clase',
      idLocal: 'claseId',
      idRemoto: 'horarioId',
      opcionesTabla: 'horario',
      camposExtra: { estado: 'A' }
    }
  ],
  mensajeExito: 'Clase guardada.'
});

iniciarPantalla({
  raiz: '#pantalla-horario',
  tabla: 'horario',
  titulo: 'Horarios',
  columnas: ['id', 'dia', 'horaInicio', 'horaFin'],
  etiquetas: { id: 'Código' },
  mensajeExito: 'Horario guardado.'
});

iniciarPantalla({
  raiz: '#pantalla-clase-horario',
  tabla: 'clase_horario',
  titulo: 'Horarios por clase',
  columnas: ['claseId', 'horarioId', 'estado'],
  etiquetas: { claseId: 'Clase', horarioId: 'Horario' },
  defaults: { estado: 'A' },
  opciones: { claseId: opcionesClases, horarioId: opcionesHorarios },
  opcionesFijas: { estado: ESTADO_HORARIO },
  formatoCelda: {
    claseId: (valor) => escapar(mapaClases.get(String(valor)) || valor || ''),
    horarioId: (valor) => escapar(mapaHorarios.get(String(valor)) || valor || ''),
    estado: (valor) => escapar(ESTADO_HORARIO[valor] || valor || 'vacío')
  },
  mensajeExito: 'Asignación guardada.'
  });
}

iniciar().catch((error) => {
  const region = document.querySelector('#pantalla-clase [data-mensaje]');
  if (region) { region.textContent = error.mensaje || 'No se pudieron cargar las clases.'; region.hidden = false; }
});
