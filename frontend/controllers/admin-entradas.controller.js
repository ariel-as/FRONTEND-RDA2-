import './admin.controller.js';
import { entradasModel, clientesModel, facturasModel } from '../models/fase2.model.js';
import { puede } from '../models/permisos.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, fecha } from '../views/lista-api.view.js';
import { mostrarMensaje, validarCedula } from './validacion.controller.js';
import { crearLista } from './lista-api.controller.js';
import { abrirDialogo } from './dialogo.controller.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { mostrarFactura } from './factura.controller.js';

const PRECIO_PASE = 3;
const PATRON_REFERENCIA = '[A-Za-z0-9-]{4,30}';

async function mostrarClientePase(cedula, nodo) {
  if (!/^\d{10}$/.test(cedula)) { nodo.textContent = 'Sin cédula: se facturará a CONSUMIDOR FINAL.'; return; }
  nodo.textContent = 'Consultando cliente…';
  try {
    const r = await clientesModel.acceso(cedula).then((x) => x?.data ?? x);
    nodo.textContent = r?.cliente?.nombre
      ? `Cliente: ${r.cliente.nombre}${r.cliente.estado === 'I' ? ' (inactivo)' : ''}.`
      : 'Cédula no registrada: se facturará a CONSUMIDOR FINAL.';
  } catch {
    nodo.textContent = 'Cédula no registrada: se facturará a CONSUMIDOR FINAL.';
  }
}

async function imprimirComprobante(pase) {
  const nodo = document.querySelector('#comprobante-pase-diario');
  if (!nodo) return;
  const cliente = pase.cliente?.nombre || pase.cliente || pase.clienteId || 'CONSUMIDOR FINAL';
  nodo.innerHTML = `<article class="pf-comprobante-tarjeta"><h1>Planeta Fitness</h1><h2>Comprobante de pase diario</h2><dl><dt>Cliente</dt><dd>${escapar(String(cliente))}</dd><dt>Fecha</dt><dd>${escapar(fecha(pase.fecha, true))}</dd><dt>Entrada</dt><dd>${escapar(String(pase.id ?? ''))}</dd><dt>Forma de pago</dt><dd>${escapar(pase.metodoPago === 'TR' ? 'Transferencia' : 'Efectivo')}</dd>${pase.referencia ? `<dt>Referencia</dt><dd>${escapar(String(pase.referencia))}</dd>` : ''}<dt>Total</dt><dd>${formatearPrecio(PRECIO_PASE)}</dd></dl></article>`;
  nodo.hidden = false;
  const limpiar = () => { nodo.innerHTML = ''; nodo.hidden = true; };
  window.addEventListener('afterprint', limpiar, { once: true });
  window.print();
}

async function generarFacturaPase(pase, nodo) {
  if (!puede('facturas:generar')) { nodo.textContent = 'Tu rol no puede generar facturas.'; return; }
  try {
    const f = await facturasModel.generar({ entradaId: pase.id }).then((x) => x?.data ?? x);
    if (f?.id) await mostrarFactura(f.id).catch(() => {});
    nodo.textContent = 'Factura generada con número y clave del SRI (simulados).';
  } catch (error) {
    nodo.textContent = error.mensaje || 'No se pudo generar la factura.';
  }
}

async function ofrecerComprobante(pase) {
  await abrirDialogo({
    titulo: 'Pase diario registrado',
    mensaje: 'Pase diario cobrado y entrada registrada.',
    contenido: `<div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-outline-primary" data-imprimir-pase>Imprimir comprobante</button><button type="button" class="btn btn-outline-secondary" data-generar-factura-pase${puede('facturas:generar') ? '' : ' disabled'}>Generar factura</button></div><p class="small mt-2 mb-0" data-opcion-pase role="status" aria-live="polite"></p>`,
    textoConfirmar: 'Cerrar',
    textoCancelar: 'Cerrar',
    alPreparar: (formulario) => {
      formulario.querySelector('[data-imprimir-pase]').addEventListener('click', () => imprimirComprobante(pase));
      formulario.querySelector('[data-generar-factura-pase]').addEventListener('click', () => generarFacturaPase(pase, formulario.querySelector('[data-opcion-pase]')));
    }
  });
}

async function paseDiario() {
  mostrarRechazo('');
  const r = await abrirDialogo({
    titulo: 'Cobrar pase diario',
    mensaje: `Pase diario: ${formatearPrecio(PRECIO_PASE)}. La cédula es opcional.`,
    campos: [
      { nombre: 'clienteId', etiqueta: 'Cédula del cliente (opcional)', maxlength: 10, patron: '[0-9]{10}', mensajePatron: 'La cédula tiene 10 dígitos.' },
      { nombre: 'metodoPago', etiqueta: 'Forma de pago', tipo: 'select', requerido: true, valor: 'EF', opciones: [{ valor: 'EF', texto: 'Efectivo (EF)' }, { valor: 'TR', texto: 'Transferencia (TR)' }] },
      { nombre: 'referencia', etiqueta: 'Referencia de transferencia', requerido: true, maxlength: 30, patron: PATRON_REFERENCIA, mensajePatron: 'La referencia tiene entre 4 y 30 letras, números o guiones.', ayuda: 'Solo para transferencias: de 4 a 30 letras, números o guiones.' }
    ],
    contenido: '<p class="small mb-0" data-cliente-pase role="status" aria-live="polite">Sin cédula: se facturará a CONSUMIDOR FINAL.</p>',
    alPreparar: (formulario) => {
      const cedula = formulario.elements.namedItem('clienteId');
      const metodo = formulario.elements.namedItem('metodoPago');
      const referencia = formulario.elements.namedItem('referencia');
      const grupoReferencia = referencia.closest('.pf-dialogo-campo');
      const aviso = formulario.querySelector('[data-cliente-pase]');
      const actualizarReferencia = () => {
        const transferencia = metodo.value === 'TR';
        grupoReferencia.hidden = !transferencia;
        referencia.required = transferencia;
      };
      actualizarReferencia();
      metodo.addEventListener('change', actualizarReferencia);
      let consultada = '';
      cedula.addEventListener('input', () => {
        const valor = cedula.value.trim();
        if (valor === consultada) return;
        consultada = valor;
        mostrarClientePase(valor, aviso);
      });
    },
    validarExtra: (_, v) => {
      const cedula = v.clienteId.trim();
      if (cedula && !/^\d{10}$/.test(cedula)) return 'La cédula tiene 10 dígitos.';
      if (v.metodoPago === 'TR' && !new RegExp(`^${PATRON_REFERENCIA}$`).test(v.referencia.trim())) return 'La referencia tiene entre 4 y 30 letras, números o guiones.';
      return null;
    },
    alConfirmar: async (v) => entradasModel.paseDiario({
      ...(v.clienteId.trim() ? { clienteId: v.clienteId.trim() } : {}),
      metodoPago: v.metodoPago,
      ...(v.metodoPago === 'TR' ? { referencia: v.referencia.trim() } : {})
    }).then((x) => x?.data ?? x)
  });
  const pase = r?.resultado;
  if (!pase) return;
  mostrarMensaje(region, 'Pase diario cobrado y entrada registrada.', 'exito');
  await Promise.all([pintarAforo(), adentro?.recargar()]);
  await ofrecerComprobante(pase);
  campo.value = '';
  campo.focus();
}

const region = document.querySelector('[data-mensaje]');
const rechazo = document.querySelector('[data-rechazo]');
const acceso = document.querySelector('[data-acceso]');
const form = document.querySelector('#form-cedula');
const campo = document.querySelector('#cedula-entrada');
const gestiona = puede('entradas:gestionar');

async function pintarAforo() {
  try {
    const a = await entradasModel.aforo().then((r) => r?.data ?? r);
    const pct = a.aforoMax ? Math.min(100, Math.round((a.personasAdentro / a.aforoMax) * 100)) : 0;
    const texto = `${a.personasAdentro} de ${a.aforoMax} personas`;
    document.querySelector('[data-aforo-texto]').textContent = `${texto}${a.disponible === 0 ? ' (aforo completo)' : ''}`;
    const barra = document.querySelector('[data-aforo-barra]');
    barra.setAttribute('aria-valuenow', String(pct));
    barra.setAttribute('aria-valuetext', `${texto}, ${pct} %`);
    barra.firstElementChild.style.width = `${pct}%`;
    barra.firstElementChild.textContent = `${pct} %`;
    barra.firstElementChild.className = `progress-bar ${pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning text-dark' : 'bg-success'}`;
  } catch (error) { document.querySelector('[data-aforo-texto]').textContent = error.mensaje || 'No se pudo consultar el aforo.'; }
}

function mostrarRechazo(texto) {
  rechazo.textContent = texto;
  rechazo.hidden = !texto;
}

async function registrar(cuerpo, nombre) {
  mostrarRechazo('');
  try {
    const r = await entradasModel.registrar(cuerpo).then((x) => x?.data ?? x);
    const restantes = r?.ingresosRestantes !== null && r?.ingresosRestantes !== undefined ? ` Le quedan ${r.ingresosRestantes} ingresos.` : '';
    mostrarMensaje(region, `Entrada registrada: ${r?.cliente || nombre}${r?.clase ? ` a ${r.clase}` : ''}.${restantes}`, 'exito');
    acceso.innerHTML = '';
    campo.value = '';
    campo.focus();
    await Promise.all([pintarAforo(), adentro?.recargar()]);
  } catch (error) {
    mostrarRechazo(`Entrada rechazada: ${error.mensaje || 'no se pudo registrar.'}`);
  }
}

async function consultar() {
  mostrarRechazo('');
  const cedula = campo.value.trim();
  acceso.innerHTML = '<p>Consultando…</p>';
  try {
    const r = await clientesModel.acceso(cedula).then((x) => x?.data ?? x);
    const ins = r.inscripciones || [];
    const nombre = r.cliente?.nombre || cedula;
    if (!ins.length) {
      acceso.innerHTML = '';
      mostrarRechazo(`${nombre} no tiene inscripciones activas.`);
      acceso.innerHTML = `<div class="d-flex flex-wrap gap-2"><a class="btn btn-outline-primary" href="inscripciones.html?cedula=${encodeURIComponent(cedula)}">Vender un plan</a><a class="btn btn-outline-secondary" href="inscripciones.html?estado=P&canal=W&clienteId=${encodeURIComponent(cedula)}">Ver inscripciones web pendientes</a></div>`;
      return;
    }
    acceso.innerHTML = `<h3 class="h6">${escapar(nombre)}${r.cliente?.estado === 'I' ? ' (cliente inactivo)' : ''}</h3>` + ins.map((i, n) => `
      <div class="border rounded p-2 mb-2">
        <p class="mb-1"><strong>${escapar(i.plan || i.membresiaId)}</strong> · Fin: ${fecha(i.fechaFin)} · ${i.ingresosTotal ? `Ingresos que quedan: ${escapar(i.ingresosRestantes)} de ${escapar(i.ingresosTotal)}` : 'Ingresos ilimitados'}${i.suspendida ? ' · <strong>Suspendida</strong>' : ''}</p>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-success" data-entrar="${n}">Registrar entrada al gimnasio</button>
          ${(i.clasesHoy || []).map((c, k) => `<button type="button" class="btn btn-outline-success" data-entrar="${n}" data-clase="${k}">Entrada a ${escapar(c.clase)} (${escapar(String(c.horaInicio || '').slice(0, 5))})</button>`).join('')}
        </div>
      </div>`).join('');
    acceso.querySelectorAll('[data-entrar]').forEach((b) => b.addEventListener('click', () => {
      const i = ins[Number(b.dataset.entrar)];
      const c = b.dataset.clase !== undefined ? i.clasesHoy[Number(b.dataset.clase)] : null;
      registrar({ clienteId: cedula, inscripcionId: i.inscripcionId, ...(c ? { claseId: c.claseId, horarioId: c.horarioId } : {}) }, nombre);
    }));
    acceso.querySelector('[data-entrar]')?.focus();
  } catch (error) {
    acceso.innerHTML = '';
    if (error.status === 404) {
      mostrarRechazo('La cédula no está registrada.');
      acceso.innerHTML = '<div class="d-flex flex-wrap gap-2"><a class="btn btn-outline-primary" href="clientes.html?cedula=">Registrar cliente</a></div>';
      acceso.querySelector('a').href += encodeURIComponent(cedula);
    } else mostrarRechazo(error.mensaje || 'No se pudo consultar la cédula.');
  }
}

const adentro = gestiona ? crearLista({
  raiz: '#pantalla-adentro', caption: 'Personas adentro', fijos: { abiertas: 'S' }, limite: 100,
  cargar: (p) => entradasModel.listar(p),
  columnas: [['Cliente', (e) => txt(typeof e.cliente === 'string' ? e.cliente : (e.cliente?.nombre || e.clienteId))], ['Ingreso', (e) => txt(String(e.horaIngreso || '').slice(0, 5) || fecha(e.fecha))], ['Clase', (e) => txt(typeof e.clase === 'string' ? e.clase : (e.clase?.nombre || (e.claseId ? `Clase ${e.claseId}` : 'Gimnasio')))]],
  acciones: (e) => [{ texto: 'Registrar salida', permiso: 'entradas:gestionar', etiqueta: `Registrar salida de ${typeof e.cliente === 'string' ? e.cliente : e.clienteId}`, ejecutar: async () => { await entradasModel.salida(e.id); pintarAforo(); return 'Salida registrada.'; } }]
}) : null;

if (document.body.dataset.sinAcceso !== 'true') {
  pintarAforo();
  window.setInterval(() => { pintarAforo(); adentro?.recargar(); }, 60000);
  if (form && gestiona) {
    campo.focus();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!campo.value.trim() || !validarCedula(campo)) { campo.focus(); return; }
      consultar();
    });
  }
}
document.querySelector('[data-pase-diario]')?.addEventListener('click', paseDiario);
