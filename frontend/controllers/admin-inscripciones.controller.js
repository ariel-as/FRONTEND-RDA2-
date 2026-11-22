import './admin.controller.js';
import { inscripcionesModel, facturasModel, planesModel, lista as extraer } from '../models/fase2.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, dinero, fecha, estado } from '../views/lista-api.view.js';
import { validarCedula } from './validacion.controller.js';
import { confirmarAccion } from './dialogo.controller.js';
import { crearPagos } from './pagos.controller.js';
import { crearLista, formulario, verDetalle, enlazarBoton } from './lista-api.controller.js';

export const ESTADOS_INSCRIPCION = { P: 'Pendiente de pago', A: 'Activa', V: 'Vencida o sin ingresos', S: 'Suspendida', X: 'Anulada' };
const CEDULA = '[0-9]{10}';
let planes = [];
const cargarPlanes = async () => { if (!planes.length) { try { planes = extraer(await planesModel.listar()); } catch { planes = []; } } return planes; };
const precioPlan = (id) => Number(planes.find((p) => String(p.id) === String(id))?.precioConIva ?? planes.find((p) => String(p.id) === String(id))?.precio ?? 0);

// Campos de plan + pagos con total estimado; el servidor responde 400 con el total correcto si no cuadra.
async function dialogoConPagos({ titulo, mensaje, campos, totalInicial, idPagos, alConfirmar, exito, conPlan }) {
  await cargarPlanes();
  let pagos = null;
  return formulario({
    titulo, mensaje, campos, textoConfirmar: 'Confirmar y cobrar',
    contenido: '<p class="small mb-2" data-total-estimado></p><div data-contenedor-pagos></div>',
    alPreparar: (f) => {
      pagos = crearPagos(f.querySelector('[data-contenedor-pagos]'), { total: totalInicial, id: idPagos });
      const plan = f.querySelector('[name="membresiaId"]');
      const aviso = f.querySelector('[data-total-estimado]');
      const actualizar = () => { if (!conPlan) return; const t = precioPlan(plan?.value); pagos.actualizarTotal(t); aviso.textContent = t ? `Total estimado según el plan: ${formatearPrecio(t)}. Si hay promoción o cambio de IVA, el servidor indicará el total exacto.` : ''; };
      plan?.addEventListener('change', actualizar);
      actualizar();
    },
    validarExtra: () => (pagos && !pagos.validar() ? 'Revisa la forma de pago: los montos deben sumar el total.' : null),
    alConfirmar: (v) => alConfirmar(v, pagos.obtener()),
    alFallar: (fallo, _, nodo) => pagos?.ajustarDesdeError(fallo, nodo),
    exito
  });
}
const opcionesPlanes = () => [{ valor: '', texto: 'Selecciona el plan' }, ...planes.map((p) => ({ valor: p.id, texto: `${p.nombre} (${formatearPrecio(p.precioConIva ?? p.precio)})` }))];

const tabla = crearLista({
  raiz: '#pantalla-inscripciones',
  filtros: '#filtros-inscripciones',
  caption: 'Inscripciones',
  cargar: (p) => inscripcionesModel.listar(p),
  columnas: [['N.º', (i) => txt(i.id)], ['Plan', (i) => txt(i.plan || i.membresiaId)], ['Titular', (i) => txt(i.titular?.nombre || i.titular?.clienteId)], ['Inicio', (i) => fecha(i.fechaInicio)], ['Fin', (i) => fecha(i.fechaFin)], ['Ingresos', (i) => txt(i.ingresosTotal ?? 'Ilimitados')],
    ['Canal', (i) => txt(i.canal === 'W' ? 'Web' : 'Local')], ['Total', (i) => dinero(i.total)], ['Estado', (i) => estado(ESTADOS_INSCRIPCION, i.estado) + (i.canal === 'W' && i.estado === 'P' ? '<br><span class="small">Cobrar en recepción</span>' : '')]],
  acciones: (i) => [
    { texto: 'Detalle', permiso: 'inscripciones:leer', etiqueta: `Detalle de la inscripción ${i.id}`, ejecutar: () => verDetalle(`Inscripción ${i.id}`, () => inscripcionesModel.detalle(i.id)) },
    i.estado === 'P' && { texto: 'Cobrar', permiso: 'inscripciones:gestionar', tono: 'btn-primary', etiqueta: `Cobrar la inscripción ${i.id}`, ejecutar: () => dialogoConPagos({
      titulo: `Cobrar la inscripción ${i.id}`, mensaje: `${i.plan || ''} · Titular: ${i.titular?.nombre || ''}`, campos: [], totalInicial: i.total, idPagos: `pagos-ins-${i.id}`,
      alConfirmar: (_, pagos) => inscripcionesModel.cobrar(i.id, pagos), exito: 'Inscripción cobrada.' }) },
    ['A', 'P'].includes(i.estado) && { texto: 'Agregar acompañante', permiso: 'inscripciones:gestionar', etiqueta: `Agregar acompañante a la inscripción ${i.id}`, ejecutar: () => formulario({
      titulo: 'Agregar acompañante', campos: [{ nombre: 'clienteId', etiqueta: 'Cédula del acompañante', requerido: true, maxlength: 10 }], reglas: { clienteId: validarCedula },
      alConfirmar: (v) => inscripcionesModel.agregarIntegrante(i.id, v.clienteId.trim()), exito: 'Acompañante agregado.' }) },
    ['A', 'P'].includes(i.estado) && { texto: 'Quitar acompañante', permiso: 'inscripciones:gestionar', etiqueta: `Quitar acompañante de la inscripción ${i.id}`, ejecutar: () => formulario({
      titulo: 'Quitar acompañante', mensaje: 'Solo se puede quitar a un acompañante que todavía no tenga entradas.', tono: 'peligro', textoConfirmar: 'Quitar',
      campos: [{ nombre: 'cedula', etiqueta: 'Cédula del acompañante', requerido: true, maxlength: 10, patron: CEDULA, mensajePatron: 'La cédula tiene 10 dígitos.' }],
      alConfirmar: (v) => inscripcionesModel.quitarIntegrante(i.id, v.cedula.trim()), exito: 'Acompañante quitado.' }) },
    ['A', 'V'].includes(i.estado) && { texto: 'Renovar', permiso: 'inscripciones:gestionar', etiqueta: `Renovar la inscripción ${i.id}`, ejecutar: async () => { await cargarPlanes(); return dialogoConPagos({
      titulo: `Renovar la inscripción ${i.id}`, conPlan: true, totalInicial: precioPlan(i.membresiaId), idPagos: `pagos-renovar-${i.id}`,
      campos: [{ nombre: 'membresiaId', etiqueta: 'Plan', tipo: 'select', requerido: true, opciones: opcionesPlanes(), valor: i.membresiaId }, { nombre: 'promocionId', etiqueta: 'Número de promoción (opcional)', tipo: 'number', paso: '1', min: 1 }, { nombre: 'empAutorizaId', etiqueta: 'Cédula del ADM que autoriza (si la promoción lo pide)', maxlength: 10, patron: CEDULA, mensajePatron: 'La cédula tiene 10 dígitos.' }],
      alConfirmar: (v, pagos) => inscripcionesModel.renovar(i.id, { membresiaId: v.membresiaId, ...(v.promocionId ? { promocionId: Number(v.promocionId) } : {}), ...(v.empAutorizaId ? { empAutorizaId: v.empAutorizaId } : {}), pagos }), exito: 'Inscripción renovada.' }); } },
    i.estado === 'A' && { texto: 'Suspender', permiso: 'inscripciones:gestionar', etiqueta: `Suspender la inscripción ${i.id}`, ejecutar: () => formulario({
      titulo: `Suspender la inscripción ${i.id}`, mensaje: 'Suspensión por motivo médico. Los días suspendidos se recuperan al final del plan.', textoConfirmar: 'Suspender',
      campos: [{ nombre: 'fechaInicio', etiqueta: 'Desde', tipo: 'date', requerido: true }, { nombre: 'fechaFin', etiqueta: 'Hasta', tipo: 'date', requerido: true }, { nombre: 'motivo', etiqueta: 'Motivo', tipo: 'textarea', requerido: true, maxlength: 200 }, { nombre: 'certificado', etiqueta: 'Número o detalle del certificado médico', requerido: true, maxlength: 100 }],
      validarExtra: (_, v) => (v.fechaInicio > v.fechaFin ? 'La fecha inicial debe ser anterior a la final.' : null),
      alConfirmar: (v) => inscripcionesModel.suspender(i.id, { fechaInicio: v.fechaInicio, fechaFin: v.fechaFin, motivo: v.motivo.trim(), certificado: v.certificado.trim() }), exito: 'Inscripción suspendida.' }) },
    i.estado === 'S' && { texto: 'Anular suspensión', permiso: 'inscripciones:anular', tono: 'btn-outline-danger', etiqueta: `Anular suspensión de la inscripción ${i.id}`, ejecutar: () => formulario({
      titulo: 'Anular suspensión', mensaje: 'El número de suspensión aparece en el detalle de la inscripción.', tono: 'peligro', textoConfirmar: 'Anular suspensión',
      campos: [{ nombre: 'suspensionId', etiqueta: 'Número de suspensión', tipo: 'number', paso: '1', min: 1, requerido: true }, { nombre: 'motivo', etiqueta: 'Motivo', tipo: 'textarea', requerido: true, maxlength: 200 }],
      alConfirmar: (v) => inscripcionesModel.anularSuspension(v.suspensionId, v.motivo.trim()), exito: 'Suspensión anulada.' }) },
    i.estado !== 'X' && { texto: 'Generar factura', permiso: 'facturas:generar', etiqueta: `Generar factura de la inscripción ${i.id}`, ejecutar: async () => (await confirmarAccion({
      titulo: 'Generar factura', mensaje: `Se generará la factura de la inscripción ${i.id} a nombre del titular. Para facturar a otra persona usa Facturación.`, textoConfirmar: 'Generar', tono: 'primario',
      alConfirmar: () => facturasModel.generar({ inscripcionId: i.id }) }) ? 'Factura generada. Registra su número en Facturación.' : null) },
    i.estado !== 'X' && { texto: 'Anular', permiso: 'inscripciones:anular', tono: 'btn-outline-danger', etiqueta: `Anular la inscripción ${i.id}`, ejecutar: () => formulario({
      titulo: `Anular la inscripción ${i.id}`, mensaje: 'Esta acción no se puede deshacer.', tono: 'peligro', textoConfirmar: 'Anular inscripción',
      campos: [{ nombre: 'motivo', etiqueta: 'Motivo', tipo: 'textarea', requerido: true, maxlength: 200 }],
      alConfirmar: (v) => inscripcionesModel.anular(i.id, v.motivo.trim()), exito: 'Inscripción anulada.' }) }
  ]
});

enlazarBoton('[data-nueva-inscripcion]', 'inscripciones:gestionar', async () => {
  await cargarPlanes();
  const cedula = new URLSearchParams(location.search).get('cedula') || '';
  const m = await dialogoConPagos({
    titulo: 'Nueva inscripción en el local', conPlan: true, totalInicial: 0, idPagos: 'pagos-nueva-inscripcion',
    campos: [
      { nombre: 'clienteId', etiqueta: 'Cédula del titular', requerido: true, maxlength: 10, valor: cedula, ayuda: 'Si no está registrado, créalo antes en Clientes.' },
      { nombre: 'membresiaId', etiqueta: 'Plan', tipo: 'select', requerido: true, opciones: opcionesPlanes() },
      { nombre: 'fechaInicio', etiqueta: 'Fecha de inicio', tipo: 'date' },
      { nombre: 'acompanantes', etiqueta: 'Cédulas de acompañantes (separadas por coma)', maxlength: 60 },
      { nombre: 'promocionId', etiqueta: 'Número de promoción vigente (opcional)', tipo: 'number', paso: '1', min: 1 },
      { nombre: 'empAutorizaId', etiqueta: 'Cédula del ADM que autoriza (si la promoción lo pide)', maxlength: 10, patron: CEDULA, mensajePatron: 'La cédula tiene 10 dígitos.' }
    ],
    alConfirmar: (v, pagos) => {
      const acompanantes = String(v.acompanantes || '').split(/[,\s]+/).filter(Boolean);
      return inscripcionesModel.crear({ clienteId: v.clienteId.trim(), membresiaId: v.membresiaId, ...(v.fechaInicio ? { fechaInicio: v.fechaInicio } : {}), ...(acompanantes.length ? { acompanantes } : {}), ...(v.promocionId ? { promocionId: Number(v.promocionId) } : {}), ...(v.empAutorizaId ? { empAutorizaId: v.empAutorizaId } : {}), pagos });
    },
    exito: (r) => `Inscripción ${escapar((r?.data ?? r)?.id ?? '')} registrada y cobrada.`
  });
  if (m) tabla?.recargar();
  return m;
});

// Filtro rápido: canal Web y estado Pendiente de pago.
const boton = document.querySelector('[data-filtro-web-pendientes]');
const fEstado = document.querySelector('#filtro-inscripcion-estado');
const fCanal = document.querySelector('#filtro-inscripcion-canal');
const sincronizar = () => boton?.setAttribute('aria-pressed', String(fEstado?.value === 'P' && fCanal?.value === 'W'));
boton?.addEventListener('click', () => {
  const activo = boton.getAttribute('aria-pressed') === 'true';
  fEstado.value = activo ? '' : 'P';
  fCanal.value = activo ? '' : 'W';
  fCanal.dispatchEvent(new Event('change', { bubbles: true }));
  sincronizar();
});
[fEstado, fCanal].forEach((c) => c?.addEventListener('change', sincronizar));
