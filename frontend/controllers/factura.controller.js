import { facturasModel, gimnasioModel } from '../models/fase2.model.js';
import { puede } from '../models/permisos.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { escapar } from '../views/componentes.view.js';
import { detalleHtml, txt, fecha } from '../views/lista-api.view.js';
import { abrirDialogo, confirmarAccion } from './dialogo.controller.js';

// Vista de la factura con su formato: datos del gimnasio, cliente, líneas, subtotales, IVA, total y números. Se puede imprimir.
export async function mostrarFactura(id) {
  const [f, g] = await Promise.all([facturasModel.detalle(id).then((r) => r?.data ?? r), gimnasioModel.leer().then((r) => r?.data ?? r).catch(() => ({}))]);
  const lineas = f.lineas || f.detalles || f.items || [];
  const html = `<article class="pf-factura" data-factura-vista>
    <header class="mb-2"><p class="fw-bold mb-0">${txt(g.nombre || 'Planeta Fitness')}</p><p class="small mb-0">RUC ${txt(g.ruc || g.id)} · ${txt(g.direccion)}</p></header>
    <p class="mb-1"><strong>Factura N.º ${txt(f.numComprobante || 'pendiente del SRI')}</strong> · Interno ${txt(f.id)} · ${fecha(f.fecha)}</p>
    ${f.claveAcceso ? `<p class="small mb-1">Clave de acceso: ${txt(f.claveAcceso)}</p>` : ''}
    <p class="mb-2">Cliente: ${txt(f.cliente?.nombre || f.cliente || f.clienteId)}</p>
    ${lineas.length ? detalleHtml({ lineas }) : ''}
    <dl class="row small mb-0"><dt class="col-6">Subtotal</dt><dd class="col-6 text-end">${formatearPrecio(f.subtotalIva ?? f.subtotal ?? 0)}</dd><dt class="col-6">Descuento</dt><dd class="col-6 text-end">${formatearPrecio(f.descuento ?? 0)}</dd><dt class="col-6">IVA ${escapar(f.porcentajeIva ?? '')} %</dt><dd class="col-6 text-end">${formatearPrecio(f.valorIva ?? 0)}</dd><dt class="col-6">Total</dt><dd class="col-6 text-end fw-bold">${formatearPrecio(f.total ?? 0)}</dd></dl>
  </article>`;
  await abrirDialogo({ titulo: `Factura ${f.numComprobante || f.id}`, contenido: html, textoConfirmar: 'Imprimir', textoCancelar: 'Cerrar', alConfirmar: async () => { window.print(); } });
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
  return 'Factura generada. La contadora registrará el número del SRI.';
}
export { confirmarAccion };
