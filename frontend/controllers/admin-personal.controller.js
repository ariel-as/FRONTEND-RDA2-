import './admin.controller.js';
import { adminModel } from '../models/admin.model.js';
import { iniciarPantalla, cambiarEstadoTabla } from './admin-generico.controller.js';
import { escapar } from '../views/componentes.view.js';
import { puede } from '../models/permisos.model.js';

const ESTADO = { A: 'Activo', I: 'Inactivo' };

async function filasDe(tabla) {
  try {
    const respuesta = await adminModel.tablaFilas(tabla, { limit: 200 });
    return respuesta?.data || respuesta || [];
  } catch { return []; }
}

async function iniciar() {
// Sin empleados:leer (por ejemplo ENT) solo se muestra la asistencia propia.
if (!puede('empleados')) { ['#pantalla-empleado', '#pantalla-cargo', '#pantalla-turno'].forEach((s) => { const n = document.querySelector(s); if (n) n.hidden = true; }); return; }
const [cargos, turnos] = await Promise.all([filasDe('cargo'), filasDe('turno')]);
const mapaCargos = new Map(cargos.map((c) => [String(c.id), c.descripcion || c.id]));
const mapaTurnos = new Map(turnos.map((t) => [String(t.id), t.descripcion || t.id]));

iniciarPantalla({
  raiz: '#pantalla-empleado',
  tabla: 'empleado',
  titulo: 'Empleados',
  columnas: ['id', 'nombre', 'apellido', 'cargoId', 'turnoId', 'telefono', 'estado'],
  etiquetas: { id: 'Cédula' },
  defaults: { estado: 'A' },
  soloLecturaCampos: ['usuarioId'],
  opcionesFijas: { estado: ESTADO },
  formatoCelda: {
    cargoId: (valor) => escapar(mapaCargos.get(String(valor)) || valor || ''),
    turnoId: (valor) => escapar(mapaTurnos.get(String(valor)) || valor || ''),
    estado: (valor) => escapar(ESTADO[valor] || valor || 'vacío')
  },
  accionEliminar: (fila) => (fila.estado === 'A' ? {
    etiqueta: 'Desactivar',
    confirmar: `¿Desactivar al empleado ${fila.nombre || ''} ${fila.apellido || ''}?`,
    mensajeExito: 'Empleado desactivado.',
    ejecutar: () => cambiarEstadoTabla('empleado', fila, 'I')
  } : null),
  mensajeExito: 'Empleado guardado.'
});

iniciarPantalla({
  raiz: '#pantalla-cargo',
  tabla: 'cargo',
  titulo: 'Cargos',
  columnas: ['id', 'descripcion', 'sueldoBase'],
  etiquetas: { id: 'Código', sueldoBase: 'Sueldo base' },
  mensajeExito: 'Cargo guardado.'
});

iniciarPantalla({
  raiz: '#pantalla-turno',
  tabla: 'turno',
  titulo: 'Turnos',
  columnas: ['id', 'descripcion', 'horaInicio', 'horaFin'],
  etiquetas: { id: 'Código' },
  mensajeExito: 'Turno guardado.'
});
}

iniciar().catch((error) => {
  const region = document.querySelector('#pantalla-empleado [data-mensaje]');
  if (region) { region.textContent = error.mensaje || 'No se pudo cargar el personal.'; region.hidden = false; }
});
