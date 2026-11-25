import { facturasModel, gimnasioModel, lista as extraerLista } from '../models/fase2.model.js';
import { puede } from '../models/permisos.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { escapar } from '../views/componentes.view.js';
import { detalleHtml, txt, fecha } from '../views/lista-api.view.js';
import { abrirDialogo, confirmarAccion } from './dialogo.controller.js';

export function numeroFactura(f) {
  return f?.numeroFactura || f?.numFactura || f?.numComprobante || f?.id || '';
}
function numeroSri(f) {
  return f?.numeroSri || f?.numSri || f?.sri?.numero || f?.numComprobante || '';
}
export function estadoFactura(f) {
  if (f?.estadoNombre) return f.estadoNombre;
  if (f?.estado === 'A') return 'Anulada';
  if (f?.numeroSri || f?.numSri || f?.sri?.numero || (f?.numComprobante && f?.claveAcceso)) return 'Emitida';
  return 'Pendiente de número';
}

// Vista de la factura con su formato: datos del gimnasio, cliente, líneas, subtotales, IVA, total y números. Se puede imprimir.
export async function mostrarFactura(id) {
  const [f, g] = await Promise.all([facturasModel.detalle(id).then((r) => r?.data ?? r), gimnasioModel.leer().then((r) => r?.data ?? r).catch(() => ({}))]);
  const lineas = f.lineas || f.detalles || f.items || [];
  const origen = [f.ventaId && `Venta ${txt(f.ventaId)}`, f.inscripcionId && `Inscripción ${txt(f.inscripcionId)}`].filter(Boolean).join(' · ');
  const html = `<article class="pf-factura" data-factura-vista>
    <header class="mb-2"><p class="fw-bold mb-0">${txt(g.nombre || 'Planeta Fitness')}</p><p class="small mb-0">RUC ${txt(g.ruc || g.id)} · ${txt(g.direccion)}</p></header>
    <p class="mb-1"><strong>Factura N.º ${txt(numeroFactura(f))}</strong> · ${txt(estadoFactura(f))} · ${fecha(f.fecha)}</p>
    ${numeroSri(f) ? `<p class="small mb-1">Número del SRI: ${txt(numeroSri(f))}</p>` : ''}
    ${f.claveAcceso ? `<p class="small mb-1">Clave de acceso: ${txt(f.claveAcceso)}</p>` : ''}
    ${f.fechaAutorizacion ? `<p class="small mb-1">Fecha de autorización: ${txt(f.fechaAutorizacion)}</p>` : ''}
    <p class="small mb-2">Ambiente de pruebas (simulado)</p>
    <p class="mb-2">Cliente: ${txt(f.cliente?.nombre || f.cliente || f.clienteId)}</p>
    ${origen ? `<p class="small mb-2">Origen: ${origen}</p>` : ''}
    ${lineas.length ? detalleHtml({ lineas }) : ''}
    <dl class="row small mb-0"><dt class="col-6">Subtotal</dt><dd class="col-6 text-end">${formatearPrecio(f.subtotalIva ?? f.subtotal ?? 0)}</dd><dt class="col-6">Descuento</dt><dd class="col-6 text-end">${formatearPrecio(f.descuento ?? 0)}</dd><dt class="col-6">IVA ${escapar(f.porcentajeIva ?? '')} %</dt><dd class="col-6 text-end">${formatearPrecio(f.valorIva ?? 0)}</dd><dt class="col-6">Total</dt><dd class="col-6 text-end fw-bold">${formatearPrecio(f.total ?? 0)}</dd></dl>
  </article>`;
  await abrirDialogo({ titulo: `Factura ${txt(numeroFactura(f))}`, contenido: html, textoConfirmar: 'Imprimir', textoCancelar: 'Cerrar', alConfirmar: async () => { window.print(); } });
}

export function numeroPendiente(item) {
  return item?.numero ?? item?.numeroOperacion ?? item?.id ?? '';
}

export function tipoPendiente(item) {
  const tipo = String(item?.tipo || '').toLowerCase();
  if (tipo.includes('inscrip')) return 'Inscripción';
  if (tipo.includes('venta')) return 'Venta';
  return tipo ? `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}` : 'Operación';
}

export function clientePendiente(item) {
  const cliente = item?.cliente;
  if (typeof cliente === 'string') return cliente;
  return cliente?.nombre || cliente?.razonSocial || item?.clienteId || '';
}

export function origenPendiente(item) {
  const tipo = String(item?.tipo || '').toLowerCase();
  const numero = numeroPendiente(item);
  return tipo.includes('inscrip') ? { inscripcionId: numero } : { ventaId: numero };
}

export async function operacionesSinFactura() {
  const res = await facturasModel.pendientes({ limit: 500 });
  const pendientes = extraerLista(res);
  const normalizar = (p) => ({ ...p, id: numeroPendiente(p) });
  return {
    pendientes,
    ventas: pendientes.filter((p) => String(p?.tipo || '').toLowerCase().includes('venta')).map(normalizar),
    inscripciones: pendientes.filter((p) => String(p?.tipo || '').toLowerCase().includes('inscrip')).map(normalizar)
  };
}

export async function idsSinFactura() {
  const { ventas, inscripciones } = await operacionesSinFactura();
  return new Set([...ventas.map((v) => `venta:${v.id}`), ...inscripciones.map((i) => `inscripcion:${i.id}`)]);
}

export async function elegirOperacionesSinFactura() {
  const { ventas, inscripciones } = await operacionesSinFactura();
  if (!ventas.length && !inscripciones.length) {
    await abrirDialogo({ titulo: 'Generar factura', mensaje: 'No hay ventas ni inscripciones pendientes de factura.', textoConfirmar: 'Cerrar', textoCancelar: 'Cerrar' });
    return null;
  }
  const opcion = (o, tipo) => ({ valor: String(numeroPendiente(o)), texto: `${tipo} ${numeroPendiente(o)} · ${clientePendiente(o)} · ${formatearPrecio(o.total ?? 0)}` });
  const r = await abrirDialogo({
    titulo: 'Generar factura',
    mensaje: 'Elige las operaciones sin factura. Puedes juntar una venta de productos y una inscripción de un plan en una sola factura.',
    textoConfirmar: 'Continuar',
    campos: [
      { nombre: 'ventaId', etiqueta: 'Venta de productos sin factura', tipo: 'select', opciones: [{ valor: '', texto: 'Ninguna' }, ...ventas.map((v) => opcion(v, 'Venta'))] },
      { nombre: 'inscripcionId', etiqueta: 'Inscripción de plan sin factura', tipo: 'select', opciones: [{ valor: '', texto: 'Ninguna' }, ...inscripciones.map((i) => opcion(i, 'Inscripción'))] }
    ],
    validarExtra: (_, v) => (!v.ventaId && !v.inscripcionId ? 'Elige al menos una operación.' : null)
  });
  if (!r) return null;
  const origen = {};
  if (r.valores.ventaId) Object.assign(origen, origenPendiente({ tipo: 'venta', numero: r.valores.ventaId }));
  if (r.valores.inscripcionId) Object.assign(origen, origenPendiente({ tipo: 'inscripcion', numero: r.valores.inscripcionId }));
  return origen;
}

// Al terminar un cobro: ofrece generar la factura (a nombre del cliente o de CONSUMIDOR FINAL) y la muestra.
export async function ofrecerFactura(origen) {
  if (!puede('facturas:generar')) return null;
  let generada = null;
  const ok = await abrirDialogo({
    titulo: 'Generar factura', mensaje: 'El cobro quedó registrado. ¿Generar la factura ahora?', textoConfirmar: 'Generar factura', textoCancelar: 'Ahora no',
    campos: [{ nombre: 'aQuien', etiqueta: 'A nombre de', tipo: 'select', opciones: [{ valor: '', texto: 'El cliente de la operación' }, { valor: '9999999999', texto: 'CONSUMIDOR FINAL' }] }],
    alConfirmar: async (v) => { generada = await facturasModel.generar({ ...origen, ...(v.aQuien ? { clienteId: v.aQuien } : {}) }).then((r) => r?.data ?? r); return generada; }
  });
  if (!ok || !generada?.id) return null;
  await mostrarFactura(generada.id).catch(() => {});
  return 'Factura generada con número y clave del SRI (simulados).';
}
export { confirmarAccion };
