import './admin.controller.js';
import { aliadosModel, lista as extraer } from '../models/fase2.model.js';
import { adminModel } from '../models/admin.model.js';
import { txt, dinero, fecha } from '../views/lista-api.view.js';
import { crearLista, formulario, enlazarBoton } from './lista-api.controller.js';

const tabla = crearLista({
  raiz: '#pantalla-comisiones', filtros: '#filtros-pantalla-comisiones', caption: 'Comisiones de aliados',
  cargar: (p) => aliadosModel.comisiones(p),
  columnas: [['Aliado', (c) => txt(c.aliado?.nombre || c.nombre || c.profesionalAliadoId || c.cedula)], ['Desde', (c) => fecha(c.fechaDesde)], ['Hasta', (c) => fecha(c.fechaHasta)], ['Monto', (c) => dinero(c.monto)],
    ['Método', (c) => txt((c.metodoPagoId || c.metodoPago) === 'TR' ? `Transferencia ${c.referencia || ''}` : (c.metodoPagoId || c.metodoPago) ? 'Efectivo' : '')], ['Estado', (c) => txt(c.estado || (c.fechaCobro ? 'Pagado' : 'Pendiente'))]]
});

enlazarBoton('[data-cobrar-comision]', 'aliados:cobrar', async () => {
  let aliados = [];
  try { aliados = extraer(await adminModel.tablaOpciones('profesional_aliado')); } catch { aliados = []; }
  const m = await formulario({
    titulo: 'Cobrar comisión de un periodo', textoConfirmar: 'Registrar cobro',
    campos: [
      aliados.length
        ? { nombre: 'cedula', etiqueta: 'Profesional aliado', tipo: 'select', requerido: true, opciones: [{ valor: '', texto: 'Selecciona el aliado' }, ...aliados.map((a) => ({ valor: a.valor ?? a.id, texto: a.texto ?? a.descripcion ?? a.id }))] }
        : { nombre: 'cedula', etiqueta: 'Cédula del aliado', requerido: true, maxlength: 10 },
      { nombre: 'fechaDesde', etiqueta: 'Desde', tipo: 'date', requerido: true },
      { nombre: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date', requerido: true },
      { nombre: 'monto', etiqueta: 'Monto', tipo: 'number', min: 0.01, requerido: true },
      { nombre: 'metodoPago', etiqueta: 'Método de pago', tipo: 'select', requerido: true, opciones: [{ valor: 'EF', texto: 'Efectivo' }, { valor: 'TR', texto: 'Transferencia' }] },
      { nombre: 'referencia', etiqueta: 'Referencia (obligatoria en transferencia)', maxlength: 30 }
    ],
    validarExtra: (_, v) => (v.fechaDesde > v.fechaHasta ? 'La fecha inicial debe ser anterior a la final.' : v.metodoPago === 'TR' && !String(v.referencia || '').trim() ? 'Con transferencia, escribe la referencia.' : null),
    alConfirmar: (v) => aliadosModel.cobrar(v.cedula, { fechaDesde: v.fechaDesde, fechaHasta: v.fechaHasta, monto: Number(v.monto), metodoPago: v.metodoPago, ...(String(v.referencia || '').trim() ? { referencia: v.referencia.trim() } : {}) }),
    exito: 'Comisión cobrada.'
  });
  if (m) tabla?.recargar();
  return m;
});
