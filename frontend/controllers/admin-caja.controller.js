import './admin.controller.js';
import { cajaModel } from '../models/fase2.model.js';
import { adminModel } from '../models/admin.model.js';
import { puede } from '../models/permisos.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, dinero, fecha, tablaHtml } from '../views/lista-api.view.js';
import { mostrarMensaje } from './validacion.controller.js';
import { crearLista, formulario, enlazarBoton } from './lista-api.controller.js';
import { confirmarAccion } from './dialogo.controller.js';

const region = document.querySelector('[data-mensaje]');
const cont = document.querySelector('[data-turno]');
const TIPOS = { ING: 'Ingreso', EGR: 'Gasto', DEV: 'Devolución', COM: 'Comisión' };
const centavos = (v) => Math.round(Number(v || 0) * 100);

function diferenciaTexto(dif) {
  const c = centavos(dif);
  if (c === 0) return { texto: 'Sin diferencia: el efectivo cuadra.', clase: 'pf-dif-cero' };
  return c < 0 ? { texto: `Faltante de ${formatearPrecio(-c / 100)}.`, clase: 'pf-dif-faltante' } : { texto: `Sobrante de ${formatearPrecio(c / 100)}.`, clase: 'pf-dif-sobrante' };
}

async function pintarTurno() {
  cont.setAttribute('aria-busy', 'true');
  try {
    const t = await cajaModel.actual().then((r) => r?.data ?? r);
    cont.innerHTML = `<p class="mb-2">Turno <strong>${txt(t.turno || t.turnoId)}</strong> del ${fecha(t.fecha)} · Responsable: ${txt(t.empleado || t.empleadoId)} · Estado: <strong>abierto</strong></p>
      <dl class="row text-center g-2 mb-3" aria-live="polite">
        ${[['Saldo inicial', t.saldoInicial], ['Efectivo recibido', t.totalIngresos], ['Transferencias (aparte)', t.totalTransf], ['Egresos', t.totalEgresos], ['Saldo esperado en caja', t.saldoFinal]].map(([k, v]) => `<div class="col-6 col-md"><dt class="small text-body-secondary">${k}</dt><dd class="fs-5 fw-bold mb-0">${dinero(v)}</dd></div>`).join('')}
      </dl>
      <div class="d-flex flex-wrap gap-2 mb-3">
        <button type="button" class="btn btn-outline-primary" data-mov="EGR">Registrar gasto</button>
        <button type="button" class="btn btn-outline-primary" data-mov="DEV">Registrar devolución</button>
        <button type="button" class="btn btn-danger" data-cerrar-turno>Cerrar turno</button>
      </div>
      <h3 class="h6">Movimientos</h3>
      ${tablaHtml({ caption: 'Movimientos del turno', columnas: [['Hora', (m) => fecha(m.fecha, true)], ['Tipo', (m) => txt(TIPOS[m.tipo] || m.tipo)], ['Método', (m) => txt(m.metodoPago === 'TR' ? 'Transferencia' : 'Efectivo')], ['Concepto', (m) => txt(m.concepto)], ['Monto', (m) => dinero(m.monto)]], filas: t.movimientos || [] })}`;
    cont.querySelectorAll('[data-mov]').forEach((b) => b.addEventListener('click', () => movimiento(b.dataset.mov)));
    cont.querySelector('[data-cerrar-turno]').addEventListener('click', () => cerrarTurno(t));
  } catch (error) {
    if (error.status !== 404) { cont.innerHTML = `<p>${escapar(error.mensaje || 'No se pudo cargar la caja.')}</p>`; return; }
    cont.innerHTML = `<p>No hay un turno de caja abierto hoy.</p><button type="button" class="btn btn-primary" data-abrir-turno>Abrir turno</button>`;
    cont.querySelector('[data-abrir-turno]').addEventListener('click', abrirTurno);
  } finally { cont.setAttribute('aria-busy', 'false'); }
}

async function abrirTurno() {
  let turnos = [];
  try { turnos = (await adminModel.tablaOpciones('turno')) || []; } catch { turnos = []; }
  const m = await formulario({
    titulo: 'Abrir turno de caja', textoConfirmar: 'Abrir turno',
    campos: [
      { nombre: 'turnoId', etiqueta: 'Turno', tipo: 'select', requerido: true, opciones: [{ valor: '', texto: 'Selecciona el turno' }, ...turnos.map((o) => ({ valor: o.valor ?? o.id, texto: o.texto ?? o.descripcion ?? o.id }))] },
      { nombre: 'saldoInicial', etiqueta: 'Saldo inicial en efectivo', tipo: 'number', min: 0, requerido: true }
    ],
    alConfirmar: (v) => cajaModel.abrir({ turnoId: v.turnoId, saldoInicial: Number(v.saldoInicial) }), exito: 'Turno abierto.'
  });
  if (m) { mostrarMensaje(region, m, 'exito'); pintarTurno(); }
}

async function movimiento(tipo) {
  const m = await formulario({
    titulo: tipo === 'EGR' ? 'Registrar gasto' : 'Registrar devolución', textoConfirmar: 'Registrar',
    campos: [
      { nombre: 'concepto', etiqueta: 'Concepto', tipo: 'textarea', requerido: true, maxlength: 200 },
      { nombre: 'monto', etiqueta: 'Monto', tipo: 'number', min: 0.01, requerido: true },
      ...(tipo === 'DEV' ? [{ nombre: 'pagoId', etiqueta: 'Número de pago a devolver (opcional)', tipo: 'number', paso: '1', min: 1 }] : [])
    ],
    alConfirmar: (v) => cajaModel.movimiento({ tipo, concepto: v.concepto.trim(), monto: Number(v.monto), ...(v.pagoId ? { pagoId: Number(v.pagoId) } : {}) }),
    exito: tipo === 'EGR' ? 'Gasto registrado.' : 'Devolución registrada.'
  });
  if (m) { mostrarMensaje(region, m, 'exito'); pintarTurno(); }
}

async function cerrarTurno(t) {
  const m = await formulario({
    titulo: 'Cerrar turno de caja', textoConfirmar: 'Cerrar turno', tono: 'peligro',
    mensaje: `Saldo esperado en caja: ${formatearPrecio(t.saldoFinal)}. Cuenta el efectivo y escríbelo; después de cerrar no se puede modificar.`,
    campos: [{ nombre: 'efectivoContado', etiqueta: 'Efectivo contado', tipo: 'number', min: 0, requerido: true }],
    contenido: '<p class="fw-semibold" data-vista-diferencia aria-live="polite"></p>',
    alPreparar: (f) => {
      const campo = f.querySelector('[name="efectivoContado"]');
      const vista = f.querySelector('[data-vista-diferencia]');
      campo.addEventListener('input', () => {
        if (campo.value === '') { vista.textContent = ''; return; }
        const d = diferenciaTexto((centavos(campo.value) - centavos(t.saldoFinal)) / 100);
        vista.textContent = `Diferencia estimada: ${d.texto}`;
        vista.className = `fw-semibold ${d.clase}`;
      });
    },
    alConfirmar: (v) => cajaModel.cuadrar(t.id, Number(v.efectivoContado)),
    exito: (r) => { const c = r?.data ?? r ?? {}; return `Turno cerrado. ${diferenciaTexto(c.diferencia).texto}`; }
  });
  if (!m) return;
  const alerta = !/Sin diferencia/.test(m);
  region.setAttribute('role', alerta ? 'alert' : 'status');
  mostrarMensaje(region, m, alerta ? 'error' : 'exito');
  pintarTurno();
  cuadres?.recargar();
}

const columnasCuadre = [['Fecha', (c) => fecha(c.fecha)], ['Turno', (c) => txt(c.turno || c.turnoId)], ['Responsable', (c) => txt(c.empleado || c.empleadoId)], ['Esperado', (c) => dinero(c.saldoFinal)], ['Contado', (c) => dinero(c.efectivoContado)],
  ['Diferencia', (c) => (c.efectivoContado === null || c.efectivoContado === undefined ? txt('Turno abierto') : `<span class="${diferenciaTexto(c.diferencia).clase}">${escapar(diferenciaTexto(c.diferencia).texto)}</span>`)], ['Cierre semanal', (c) => txt(c.cierreCajaId ? `N.º ${c.cierreCajaId}` : 'Pendiente')]];
const cuadres = puede('caja') ? crearLista({ raiz: '#lista-cuadres', caption: 'Cuadres de turno', filtros: '#filtros-cuadres', cargar: (p) => cajaModel.turnos(p), columnas: columnasCuadre }) : null;
const cierres = puede('caja') ? crearLista({ raiz: '#lista-cierres', caption: 'Cierres semanales', cargar: (p) => cajaModel.cierres(p), columnas: [['N.º', (c) => txt(c.id)], ['Desde', (c) => fecha(c.fechaDesde)], ['Hasta', (c) => fecha(c.fechaHasta)], ['Efectivo', (c) => dinero(c.totalEfectivo)], ['Transferencias', (c) => dinero(c.totalTransf)], ['Egresos', (c) => dinero(c.totalEgresos)], ['Diferencia', (c) => dinero(c.diferencia)], ['Observación', (c) => txt(c.observacion)]] }) : null;

enlazarBoton('[data-cierre-semanal]', 'caja:cierre', async () => {
  const datos = await formulario({
    titulo: 'Cierre semanal de caja', textoConfirmar: 'Revisar resumen',
    campos: [{ nombre: 'fechaDesde', etiqueta: 'Desde', tipo: 'date', requerido: true }, { nombre: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date', requerido: true }, { nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', maxlength: 300 }],
    validarExtra: (_, v) => (v.fechaDesde > v.fechaHasta ? 'La fecha inicial debe ser anterior a la final.' : null),
    alConfirmar: async (v) => ({ v, turnos: await cajaModel.turnos({ desde: v.fechaDesde, hasta: v.fechaHasta, limit: 100 }) }),
    exito: (r) => r
  });
  if (!datos) return null;
  const lista = (datos.turnos?.data ?? datos.turnos ?? []);
  const suma = (k) => lista.reduce((a, c) => a + centavos(c[k]), 0) / 100;
  const ok = await confirmarAccion({
    titulo: 'Confirmar cierre semanal',
    mensaje: `Del ${datos.v.fechaDesde} al ${datos.v.fechaHasta}: ${lista.length} cuadres, efectivo ${formatearPrecio(suma('totalIngresos'))}, transferencias ${formatearPrecio(suma('totalTransf'))}, egresos ${formatearPrecio(suma('totalEgresos'))} (resumen estimado; el servidor calcula el definitivo). Después del cierre no se podrá modificar nada de esa semana.`,
    textoConfirmar: 'Cerrar la semana',
    alConfirmar: () => cajaModel.cierre({ fechaDesde: datos.v.fechaDesde, fechaHasta: datos.v.fechaHasta, ...(datos.v.observacion ? { observacion: datos.v.observacion.trim() } : {}) })
  });
  if (!ok) return null;
  cuadres?.recargar(); cierres?.recargar();
  return 'Cierre semanal registrado.';
}, region);

if (document.body.dataset.sinAcceso !== 'true' && puede('caja:operar')) pintarTurno();
