import './admin.controller.js';
import { inscripcionesModel, facturasModel, planesModel, lista as extraer } from '../models/fase2.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, dinero, fecha, estado } from '../views/lista-api.view.js';
import { validarCedula } from './validacion.controller.js';
import { confirmarAccion } from './dialogo.controller.js';
import { crearPagos } from './pagos.controller.js';
import { ofrecerFactura } from './factura.controller.js';
import { adminModel } from '../models/admin.model.js';
import { puede } from '../models/permisos.model.js';
function puedeVerDinero() { return puede(['inscripciones:gestionar', 'ventas', 'caja', 'facturas', 'reportes:todos']); }
import { clientesModel } from '../models/fase2.model.js';
import { crearLista, formulario, verDetalle, enlazarBoton } from './lista-api.controller.js';

// El entrenador solo lee inscripciones: no ve montos (sección 5).
const VER_DINERO = puedeVerDinero();
export const ESTADOS_INSCRIPCION = { P: 'Pendiente de pago', A: 'Activa', V: 'Vencida o sin ingresos', S: 'Suspendida', X: 'Anulada' };
const CEDULA = '[0-9]{10}';
let planes = [];
const cargarPlanes = async () => { if (!planes.length) { try { planes = extraer(await planesModel.listar()); } catch { planes = []; } } return planes; };
const precioPlan = (id) => Number(planes.find((p) => String(p.id) === String(id))?.precioConIva ?? planes.find((p) => String(p.id) === String(id))?.precio ?? 0);

// Campos de plan + pagos con total estimado; el servidor responde 400 con el total correcto si no cuadra.
async function dialogoConPagos({ titulo, mensaje, campos, totalInicial, idPagos, alConfirmar, exito, conPlan, extra, contenidoExtra = '' }) {
  await cargarPlanes();
  let pagos = null;
  return formulario({
    titulo, mensaje, campos, textoConfirmar: 'Confirmar y cobrar',
    contenido: `${contenidoExtra}<p class="small mb-2" data-total-estimado></p><div data-contenedor-pagos></div>`,
    alPreparar: (f) => {
      pagos = crearPagos(f.querySelector('[data-contenedor-pagos]'), { total: totalInicial, id: idPagos });
      const plan = f.querySelector('[name="membresiaId"]');
      const cliente = f.querySelector('[name="clienteId"]');
      const aviso = f.querySelector('[data-total-estimado]');
      const zonaPagos = f.querySelector('[data-contenedor-pagos]');
      // El total y los pagos aparecen solo cuando ya hay cliente y plan.
      const actualizar = () => {
        if (!conPlan) return;
        const listo = Boolean(plan?.value) && (!cliente || /^\d{10}$/.test(cliente.value.trim()));
        zonaPagos.hidden = !listo;
        const t = precioPlan(plan?.value);
        pagos.actualizarTotal(t);
        aviso.textContent = listo && t ? `Total estimado según el plan: ${formatearPrecio(t)}. Si hay promoción o cambio de IVA, el servidor indicará el total exacto.` : 'Elige el cliente y el plan para ver el total y registrar el pago.';
      };
      plan?.addEventListener('change', actualizar);
      cliente?.addEventListener('input', actualizar);
      if (extra) extra(f, actualizar);
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
    ['Canal', (i) => txt(i.canal === 'W' ? 'Web' : 'Local')], ...(VER_DINERO ? [['Total', (i) => dinero(i.total)]] : []), ['Estado', (i) => estado(ESTADOS_INSCRIPCION, i.estado)]],
  acciones: (i) => [
    { texto: 'Detalle', permiso: 'inscripciones:leer', etiqueta: `Detalle de la inscripción ${i.id}`, ejecutar: () => verDetalle(`Inscripción ${i.id}`, () => inscripcionesModel.detalle(i.id)) },
    i.estado === 'P' && { texto: 'Cobrar', permiso: 'inscripciones:gestionar', tono: 'btn-primary', etiqueta: `Cobrar la inscripción ${i.id}`, ejecutar: () => dialogoConPagos({
      titulo: `Cobrar la inscripción ${i.id}`, mensaje: `${i.plan || ''} · Titular: ${i.titular?.nombre || ''}`, campos: [], totalInicial: i.total, idPagos: `pagos-ins-${i.id}`,
      alConfirmar: (_, pagos) => inscripcionesModel.cobrar(i.id, pagos), exito: 'Inscripción cobrada.' }).then(async (m) => { if (m) { const f = await ofrecerFactura({ inscripcionId: i.id }); return f ? `${m} ${f}` : m; } return m; }) },
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
      { nombre: 'fechaInicio', etiqueta: 'Fecha de inicio', tipo: 'date' }
    ],
    contenidoExtra: `<p class="small fw-semibold" data-nombre-titular aria-live="polite"></p>
      <div class="mb-3" data-zona-promocion hidden><label class="form-label" for="promo-inscripcion">Promoción vigente para el plan</label><select class="form-select" id="promo-inscripcion" name="promocionId"></select></div>
      <div class="mb-3" data-zona-autoriza hidden><label class="form-label" for="autoriza-inscripcion">ADM que autoriza la promoción</label><select class="form-select" id="autoriza-inscripcion" name="empAutorizaId"></select></div>
      <fieldset class="mb-3" data-zona-acompanantes hidden><legend class="fs-6">Acompañantes <span class="small text-body-secondary" data-limite-acompanantes></span></legend>
        <div class="d-flex gap-2"><label class="visually-hidden" for="buscar-acompanante">Cédula, nombre o apellido del acompañante</label><input class="form-control" id="buscar-acompanante" placeholder="Cédula, nombre o apellido" autocomplete="off"><button type="button" class="btn btn-outline-primary" data-agregar-acompanante>Agregar</button></div>
        <ul class="list-unstyled mt-2 mb-0" data-lista-acompanantes></ul><p class="small mb-0" data-estado-acompanantes aria-live="polite"></p></fieldset>`,
    extra: (f, actualizar) => prepararNuevaInscripcion(f, actualizar),
    alConfirmar: (v, pagos) => {
      const acompanantes = [...document.querySelectorAll('[data-lista-acompanantes] [data-cedula]')].map((n) => n.dataset.cedula);
      return inscripcionesModel.crear({ clienteId: v.clienteId.trim(), membresiaId: v.membresiaId, ...(v.fechaInicio ? { fechaInicio: v.fechaInicio } : {}), ...(acompanantes.length ? { acompanantes } : {}), ...(v.promocionId ? { promocionId: Number(v.promocionId) } : {}), ...(v.empAutorizaId ? { empAutorizaId: v.empAutorizaId } : {}), pagos });
    },
    exito: (r) => ({ id: (r?.data ?? r)?.id })
  });
  if (!m) return null;
  tabla?.recargar();
  const f = m.id ? await ofrecerFactura({ inscripcionId: m.id }) : null;
  return `Inscripción ${m.id ?? ''} registrada y cobrada.${f ? ` ${f}` : ''}`;
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

// Nueva inscripción: nombre del titular, promociones vigentes del plan, ADM que autoriza y acompañantes con el límite del plan.
async function prepararNuevaInscripcion(f, actualizar) {
  const cliente = f.querySelector('[name="clienteId"]');
  const plan = f.querySelector('[name="membresiaId"]');
  const nombre = f.querySelector('[data-nombre-titular]');
  const zonaPromo = f.querySelector('[data-zona-promocion]');
  const selPromo = f.querySelector('[name="promocionId"]');
  const zonaAut = f.querySelector('[data-zona-autoriza]');
  const selAut = f.querySelector('[name="empAutorizaId"]');
  const zonaAcomp = f.querySelector('[data-zona-acompanantes]');
  const listaAcomp = f.querySelector('[data-lista-acompanantes]');
  const estadoAcomp = f.querySelector('[data-estado-acompanantes]');
  let promos = [];
  const filas = async (tabla, p) => { try { const r = await adminModel.tablaFilas(tabla, { limit: 100, ...p }); return r?.data || r || []; } catch { return []; } };
  cliente.addEventListener('change', async () => {
    const ced = cliente.value.trim();
    if (!/^\d{10}$/.test(ced)) { nombre.textContent = ''; return; }
    try { const r = await clientesModel.listar({ buscar: ced, limit: 1 }); const c = (r?.data || r || [])[0]; nombre.textContent = c ? `Titular: ${c.nombre || ''} ${c.apellido || ''}` : 'No hay un cliente con esa cédula: regístralo en Clientes.'; } catch { nombre.textContent = ''; }
  });
  const limite = () => Math.max(0, Number(planes.find((p) => String(p.id) === plan.value)?.personas || 1) - 1);
  const pintarLimite = () => {
    const max = limite();
    zonaAcomp.hidden = max === 0;
    f.querySelector('[data-limite-acompanantes]').textContent = `(hasta ${max})`;
    while (listaAcomp.children.length > max) listaAcomp.lastElementChild.remove();
  };
  plan.addEventListener('change', async () => {
    pintarLimite();
    const hoy = new Date().toLocaleDateString('en-CA');
    const relacion = plan.value ? await filas('membresia_promocion', { membresiaId: plan.value }) : [];
    const ids = new Set(relacion.map((r) => String(r.promocionId)));
    promos = ids.size ? (await filas('promocion', { estado: 'A' })).filter((p) => ids.has(String(p.id)) && (!p.fechaInicio || String(p.fechaInicio).slice(0, 10) <= hoy) && (!p.fechaFin || String(p.fechaFin).slice(0, 10) >= hoy)) : [];
    zonaPromo.hidden = !promos.length;
    selPromo.innerHTML = '<option value="">Sin promoción</option>' + promos.map((p) => `<option value="${escapar(p.id)}">${escapar(p.descripcion || p.nombre || p.id)} (${escapar(p.porcentaje ?? '')} %)</option>`).join('');
    zonaAut.hidden = true;
    actualizar();
  });
  selPromo.addEventListener('change', async () => {
    const p = promos.find((x) => String(x.id) === selPromo.value);
    zonaAut.hidden = !(p && p.requiereAutoriz === 'S');
    if (!zonaAut.hidden && !selAut.options.length) {
      const adm = await filas('empleado', { cargoId: 'ADM', estado: 'A' });
      selAut.innerHTML = adm.map((e) => `<option value="${escapar(e.id)}">${escapar(`${e.nombre || ''} ${e.apellido || ''}`.trim() || e.id)}</option>`).join('');
    }
  });
  f.querySelector('[data-agregar-acompanante]').addEventListener('click', async () => {
    const campo = f.querySelector('#buscar-acompanante');
    const q = campo.value.trim();
    if (!q) return;
    if (listaAcomp.children.length >= limite()) { estadoAcomp.textContent = `El plan permite hasta ${limite()} acompañantes.`; return; }
    try {
      const r = await clientesModel.listar({ buscar: q, limit: 1 });
      const c = (r?.data || r || [])[0];
      if (!c) { estadoAcomp.textContent = 'No se encontró el cliente. Regístralo antes en Clientes.'; return; }
      const ced = String(c.cedula || c.id);
      if (ced === cliente.value.trim() || listaAcomp.querySelector(`[data-cedula="${ced}"]`)) { estadoAcomp.textContent = 'Esa persona ya está en la inscripción.'; return; }
      listaAcomp.insertAdjacentHTML('beforeend', `<li class="d-flex justify-content-between align-items-center gap-2 py-1" data-cedula="${escapar(ced)}"><span>${escapar(`${c.nombre || ''} ${c.apellido || ''}`.trim())} (${escapar(ced)})</span><button type="button" class="btn btn-sm btn-outline-danger" data-quitar-acompanante>Quitar<span class="visually-hidden"> a ${escapar(c.nombre || ced)}</span></button></li>`);
      estadoAcomp.textContent = `${c.nombre || ced} agregado.`;
      campo.value = '';
    } catch (error) { estadoAcomp.textContent = error.mensaje || 'No se pudo buscar el cliente.'; }
  });
  listaAcomp.addEventListener('click', (e) => { const b = e.target.closest('[data-quitar-acompanante]'); if (b) { b.closest('li').remove(); estadoAcomp.textContent = 'Acompañante quitado.'; } });
  pintarLimite();
}
