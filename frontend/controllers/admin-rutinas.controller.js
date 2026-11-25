import './admin.controller.js';
import { rutinasModel } from '../models/fase2.model.js';
import { txt, fecha } from '../views/lista-api.view.js';
import { validarCedula } from './validacion.controller.js';
import { crearLista, formulario, verDetalle, enlazarBoton } from './lista-api.controller.js';

const NIVELES = [{ valor: 'PRI', texto: 'Principiante' }, { valor: 'INT', texto: 'Intermedio' }, { valor: 'AVA', texto: 'Avanzado' }];
const campos = (r = {}) => [
  ...(r.id ? [] : [{ nombre: 'clienteId', etiqueta: 'Cédula del cliente', requerido: true, maxlength: 10 }]),
  { nombre: 'nivelId', etiqueta: 'Nivel', tipo: 'select', requerido: true, opciones: NIVELES, valor: r.nivelId || 'PRI' },
  { nombre: 'objetivo', etiqueta: 'Objetivo', requerido: true, maxlength: 100, valor: r.objetivo },
  { nombre: 'detalle', etiqueta: 'Detalle de la rutina', tipo: 'textarea', requerido: true, maxlength: 2000, valor: r.detalle, ayuda: 'Escribe una línea por día, por ejemplo: Lunes: pecho y tríceps.' },
  { nombre: 'fechaInicio', etiqueta: 'Desde', tipo: 'date', requerido: true, valor: String(r.fechaInicio || '').slice(0, 10) },
  { nombre: 'fechaFin', etiqueta: 'Hasta', tipo: 'date', requerido: true, valor: String(r.fechaFin || '').slice(0, 10) }
];
const cuerpo = (v) => ({ nivelId: v.nivelId, objetivo: v.objetivo.trim(), detalle: v.detalle.trim(), fechaInicio: v.fechaInicio, fechaFin: v.fechaFin, ...(v.clienteId ? { clienteId: v.clienteId.trim() } : {}) });
const fechasOk = (_, v) => (v.fechaInicio > v.fechaFin ? 'La fecha inicial debe ser anterior a la final.' : null);

const tabla = crearLista({
  raiz: '#pantalla-rutinas', filtros: '#filtros-pantalla-rutinas', caption: 'Rutinas',
  cargar: (p) => rutinasModel.listar(p),
  columnas: [['Cliente', (r) => txt(r.cliente?.nombre || r.cliente || r.clienteId)], ['Nivel', (r) => txt(NIVELES.find((n) => n.valor === r.nivelId)?.texto || r.nivelId)], ['Objetivo', (r) => txt(r.objetivo)], ['Desde', (r) => fecha(r.fechaInicio)], ['Hasta', (r) => fecha(r.fechaFin)], ['Entrenador', (r) => txt(r.empleado?.nombre || r.empleado || r.empleadoId)]],
  acciones: (r) => [
    { texto: 'Ver', permiso: 'rutinas', etiqueta: `Ver la rutina de ${r.clienteId}`, ejecutar: () => verDetalle('Rutina', () => rutinasModel.detalle(r.id)) },
    { texto: 'Editar', permiso: 'rutinas:gestionar', etiqueta: `Editar la rutina de ${r.clienteId}`, ejecutar: () => formulario({ titulo: 'Editar rutina', campos: campos(r), validarExtra: fechasOk, alConfirmar: (v) => rutinasModel.editar(r.id, cuerpo(v)), exito: 'Rutina actualizada.' }) }
  ]
});
enlazarBoton('[data-nueva-rutina]', 'rutinas:gestionar', async () => {
  const m = await formulario({ titulo: 'Nueva rutina', campos: campos(), reglas: { clienteId: validarCedula }, validarExtra: fechasOk, alConfirmar: (v) => rutinasModel.crear(cuerpo(v)), exito: 'Rutina creada.' });
  if (m) tabla?.recargar();
  return m;
});
