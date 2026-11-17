import './admin.controller.js';
import { iniciarPantalla, cambiarEstadoTabla } from './admin-generico.controller.js';

iniciarPantalla({
  raiz: '#pantalla-clientes',
  tabla: 'cliente',
  titulo: 'Clientes',
  columnas: ['id', 'nombre', 'apellido', 'telefono', 'correo', 'nivelId', 'estado'],
  etiquetas: { id: 'Cédula', nivelId: 'Nivel', telefono: 'Teléfono' },
  etiquetasValor: { estado: true },
  soloLecturaCampos: ['fechaRegistro'],
  defaults: { estado: 'A', esEstudiante: 'N' },
  opcionesFijas: {
    estado: { A: 'Activo', I: 'Inactivo' },
    esEstudiante: { S: 'Sí', N: 'No' }
  },
  protegido: (fila) => String(fila.id) === '9999999999',
  accionEliminar: (fila) => (fila.estado === 'A' ? {
    etiqueta: 'Desactivar',
    confirmar: `¿Desactivar al cliente ${fila.nombre || ''} ${fila.apellido || ''}?`,
    mensajeExito: 'Cliente desactivado.',
    ejecutar: () => cambiarEstadoTabla('cliente', fila, 'I')
  } : null),
  mensajeExito: 'Cliente guardado.'
});
