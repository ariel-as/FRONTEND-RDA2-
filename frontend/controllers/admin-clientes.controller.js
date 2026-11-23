import './admin.controller.js';
import { clientesModel } from '../models/fase2.model.js';
import { txt, nombrePersona } from '../views/lista-api.view.js';
import { validarCedula, validarTelefono } from './validacion.controller.js';
import { confirmarAccion } from './dialogo.controller.js';
import { crearLista, formulario, verDetalle, enlazarBoton } from './lista-api.controller.js';

const NIVELES = [{ valor: '', texto: 'Sin nivel' }, { valor: 'PRI', texto: 'Principiante' }, { valor: 'INT', texto: 'Intermedio' }, { valor: 'AVA', texto: 'Avanzado' }];
const CONSUMIDOR_FINAL = '9999999999';

function camposCliente(c = {}) {
  return [
    ...(c.id ? [] : [{ nombre: 'cedula', etiqueta: 'Cédula', requerido: true, maxlength: 10, ayuda: '10 dígitos, cédula ecuatoriana válida.' }]),
    { nombre: 'nombre', etiqueta: 'Nombres', requerido: true, maxlength: 60, valor: c.nombre },
    { nombre: 'apellido', etiqueta: 'Apellidos', requerido: true, maxlength: 60, valor: c.apellido },
    { nombre: 'telefono', etiqueta: 'Teléfono', maxlength: 10, valor: c.telefono, ayuda: '10 dígitos, empieza con 09.' },
    { nombre: 'correo', etiqueta: 'Correo', tipo: 'email', maxlength: 120, valor: c.correo },
    { nombre: 'nivelId', etiqueta: 'Nivel', tipo: 'select', opciones: NIVELES, valor: c.nivelId || '' },
    { nombre: 'esEstudiante', etiqueta: '¿Es estudiante?', tipo: 'select', opciones: [{ valor: 'N', texto: 'No' }, { valor: 'S', texto: 'Sí' }], valor: c.esEstudiante || 'N' }
  ];
}
const cuerpo = (v) => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '').map(([k, x]) => [k, String(x).trim()]));

const lista = crearLista({
  raiz: '#pantalla-clientes',
  filtros: '#filtros-clientes',
  caption: 'Clientes registrados',
  cargar: (p) => clientesModel.listar(p),
  columnas: [['Cédula', (c) => txt(c.cedula || c.id)], ['Nombre', (c) => txt(nombrePersona(c))], ['Teléfono', (c) => txt(c.telefono)], ['Correo', (c) => txt(c.correo)], ['Nivel', (c) => txt(String(c.cedula || c.id) === CONSUMIDOR_FINAL ? 'No aplica' : (c.nivel || c.nivelId || 'Sin nivel'))], ['Estado', (c) => txt(c.estado === 'A' ? 'Activo' : 'Inactivo')]],
  acciones: (c) => {
    const id = c.cedula || c.id;
    const nombre = nombrePersona(c);
    const protegido = String(id) === CONSUMIDOR_FINAL;
    return [
      { texto: 'Historial', permiso: 'clientes:leer', etiqueta: `Historial de ${nombre}`, ejecutar: () => verDetalle(`Historial de ${nombre}`, () => clientesModel.historial(id)) },
      !protegido && { texto: 'Editar', permiso: 'clientes:editar', etiqueta: `Editar ${nombre}`, ejecutar: () => formulario({
        titulo: `Editar a ${nombre}`, campos: camposCliente(c), reglas: { telefono: validarTelefono },
        alConfirmar: (v) => clientesModel.editar(id, cuerpo(v)), exito: 'Cliente actualizado.' }) },
      !protegido && { texto: c.estado === 'A' ? 'Desactivar' : 'Activar', permiso: 'clientes:editar', tono: c.estado === 'A' ? 'btn-outline-warning' : 'btn-outline-success', etiqueta: `${c.estado === 'A' ? 'Desactivar' : 'Activar'} a ${nombre}`,
        ejecutar: async () => (await confirmarAccion({ titulo: c.estado === 'A' ? 'Desactivar cliente' : 'Activar cliente', mensaje: `¿${c.estado === 'A' ? 'Desactivar' : 'Activar'} a ${nombre}?`, textoConfirmar: c.estado === 'A' ? 'Desactivar' : 'Activar', tono: c.estado === 'A' ? 'peligro' : 'primario',
          alConfirmar: () => clientesModel.editar(id, { estado: c.estado === 'A' ? 'I' : 'A' }) }) ? 'Estado del cliente actualizado.' : null) }
    ];
  }
});

enlazarBoton('[data-nuevo-cliente]', 'clientes:editar', async () => {
  const m = await formulario({
    titulo: 'Nuevo cliente', campos: camposCliente(), reglas: { cedula: validarCedula, telefono: validarTelefono },
    alConfirmar: (v) => clientesModel.crear(cuerpo(v)), exito: 'Cliente registrado.'
  });
  if (m) lista?.recargar();
  return m;
});

// Llegada desde Entradas con la cédula ya cargada: ?cedula=...&nuevo=1
const params = new URLSearchParams(location.search);
if (params.get('cedula')) {
  const buscar = document.querySelector('#buscar-cliente');
  if (buscar) { buscar.value = params.get('cedula'); lista?.recargar(); }
}
