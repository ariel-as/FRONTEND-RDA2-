import { facturasModel, gimnasioModel, lista as extraerLista } from '../models/fase2.model.js';
import { puede } from '../models/permisos.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, fecha } from '../views/lista-api.view.js';
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

const num = (v) => Number(v ?? 0) || 0;
// Líneas facturadas a partir del detalle de GET /admin/facturas/:id (venta, inscripción o ambas).
export function lineasFactura(f) {
  const directas = f?.detalles || f?.lineas || f?.items || f?.detalle;
  const crudas = Array.isArray(directas) && directas.length ? directas : [
    ...(f?.venta?.detalles || f?.venta?.items || []),
    ...(f?.inscripcion ? [{ descripcion: f.inscripcion.membresia?.nombre || f.inscripcion.plan?.nombre || `Inscripción ${f.inscripcion.id ?? f.inscripcionId ?? ''}`, cantidad: 1, precioUnitario: f.inscripcion.precio ?? f.inscripcion.total, descuento: f.inscripcion.descuento, subtotal: f.inscripcion.subtotal ?? f.inscripcion.total }] : [])
  ];
  return crudas.map((l) => {
    const cantidad = num(l.cantidad ?? 1) || 1;
    const precioUnitario = num(l.precioUnitario ?? l.precio ?? l.valorUnitario);
    const descuento = num(l.descuento);
    return {
      descripcion: l.descripcion || l.nombre || l.concepto || l.producto?.nombre || (typeof l.producto === 'string' ? l.producto : '') || l.membresia?.nombre || l.productoId || '',
      cantidad, precioUnitario, descuento,
      subtotal: l.subtotal != null ? num(l.subtotal) : Math.round((precioUnitario * cantidad - descuento) * 100) / 100
    };
  });
}

export function facturaHtml(f, g = {}) {
  const lineas = lineasFactura(f);
  const origen = [f.ventaId && `Venta ${txt(f.ventaId)}`, f.inscripcionId && `Inscripción ${txt(f.inscripcionId)}`].filter(Boolean).join(' · ');
  const subtotal = f.subtotal != null ? num(f.subtotal) : (f.subtotal0 != null || f.subtotalIva != null) ? num(f.subtotal0) + num(f.subtotalIva) : lineas.reduce((a, l) => a + l.subtotal, 0);
  const iva = num(f.valorIva ?? f.iva);
  const fila = (etiqueta, valor, fuerte = false) => `<tr><th scope="row">${etiqueta}</th><td${fuerte ? ' class="fw-bold"' : ''}>${formatearPrecio(valor)}</td></tr>`;
  return `<article class="pf-factura" data-factura-vista>
    <header class="pf-factura-cabecera"><p class="fw-bold mb-0">${txt(g.nombre || 'Planeta Fitness')}</p><p class="small mb-0">RUC ${txt(g.ruc || g.id)}${g.direccion ? ` · ${txt(g.direccion)}` : ''}</p></header>
    <p class="mb-1"><strong>Factura N.º ${txt(numeroFactura(f))}</strong> · ${txt(estadoFactura(f))} · ${fecha(f.fecha)}</p>
    ${numeroSri(f) ? `<p class="small mb-1">Número del SRI: ${txt(numeroSri(f))}</p>` : ''}
    ${f.claveAcceso ? `<p class="small mb-1 pf-factura-clave">Clave de acceso: ${txt(f.claveAcceso)}</p>` : ''}
    ${f.fechaAutorizacion ? `<p class="small mb-1">Fecha de autorización: ${txt(f.fechaAutorizacion)}</p>` : ''}
    <p class="small mb-2">Ambiente de pruebas (simulado)</p>
    <p class="mb-1">Cliente: ${txt(f.cliente?.nombre || f.cliente?.razonSocial || f.cliente || f.clienteId)}${f.cliente?.id || f.clienteId ? ` · ${txt(f.cliente?.id || f.clienteId)}` : ''}</p>
    ${origen ? `<p class="small mb-2">Origen: ${origen}</p>` : ''}
    <table class="table table-sm pf-factura-tabla"><caption class="visually-hidden">Detalle facturado</caption>
      <thead><tr><th scope="col">Descripción</th><th scope="col" class="pf-num">Cantidad</th><th scope="col" class="pf-num">Precio unitario</th><th scope="col" class="pf-num">Descuento</th><th scope="col" class="pf-num">Subtotal</th></tr></thead>
      <tbody>${lineas.length ? lineas.map((l) => `<tr><td>${txt(l.descripcion)}</td><td class="pf-num">${escapar(l.cantidad)}</td><td class="pf-num">${formatearPrecio(l.precioUnitario)}</td><td class="pf-num">${formatearPrecio(l.descuento)}</td><td class="pf-num">${formatearPrecio(l.subtotal)}</td></tr>`).join('') : '<tr><td colspan="5">Sin detalle.</td></tr>'}</tbody>
    </table>
    <table class="table table-sm pf-factura-totales"><caption class="visually-hidden">Totales</caption><tbody>
      ${fila('Subtotal', subtotal)}${num(f.descuento) ? fila('Descuento', num(f.descuento)) : ''}${fila(`IVA${f.porcentajeIva != null ? ` ${escapar(f.porcentajeIva)} %` : ''}`, iva)}${fila('Total', num(f.total), true)}
    </tbody></table>
  </article>`;
}

const ESTILOS_IMPRESION = `@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font:10.5pt/1.35 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#000;background:#fff}
p{margin:0 0 4px}.small{font-size:9pt}.fw-bold{font-weight:700}.mb-0{margin-bottom:0}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.pf-factura-cabecera{border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px}.pf-factura-cabecera p:first-child{font-size:13pt}.pf-factura-clave{word-break:break-all}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:4px 6px;border-bottom:1px solid #999;text-align:left;vertical-align:top}thead th{border-bottom:1.5px solid #000}
.pf-num,.pf-factura-totales td{text-align:right}.pf-factura-totales{width:auto;min-width:60mm;margin-left:auto}.pf-factura-totales tr:last-child th,.pf-factura-totales tr:last-child td{border-top:1.5px solid #000;font-size:12pt}
@media print{article{page-break-inside:avoid;break-inside:avoid}}`;

// Imprime solo el comprobante en un iframe aparte: sin el panel, sin botones ni mensajes del diálogo.
export function imprimirComprobante(titulo, cuerpo) {
  document.querySelector('[data-marco-impresion]')?.remove();
  const marco = document.createElement('iframe');
  marco.dataset.marcoImpresion = '';
  marco.title = 'Impresión';
  marco.setAttribute('aria-hidden', 'true');
  marco.tabIndex = -1;
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  marco.srcdoc = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapar(titulo)}</title><style>${ESTILOS_IMPRESION}</style></head><body>${cuerpo}</body></html>`;
  marco.addEventListener('load', () => {
    const w = marco.contentWindow;
    w.addEventListener('afterprint', () => marco.remove(), { once: true });
    w.focus();
    w.print();
  }, { once: true });
  document.body.appendChild(marco);
  return marco;
}

// Vista de la factura: datos del gimnasio, cliente, detalle facturado, subtotal, IVA y total. «Imprimir» saca una hoja limpia.
export async function mostrarFactura(id) {
  const [f, g] = await Promise.all([facturasModel.detalle(id).then((r) => r?.data ?? r), gimnasioModel.leer().then((r) => r?.data ?? r).catch(() => ({}))]);
  const html = facturaHtml(f, g || {});
  const titulo = `Factura ${numeroFactura(f)}`;
  await abrirDialogo({
    titulo, soloCerrar: true,
    contenido: `${html}<div class="d-flex justify-content-end mt-2"><button type="button" class="btn btn-primary" data-imprimir-factura>Imprimir</button></div>`,
    alPreparar: (form) => form.querySelector('[data-imprimir-factura]')?.addEventListener('click', () => imprimirComprobante(titulo, html))
  });
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
    await abrirDialogo({ titulo: 'Generar factura', mensaje: 'No hay ventas ni inscripciones pendientes de factura.', soloCerrar: true });
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
    validarExtra: (_, v) => (!v.ventaId && !v.inscripcionId ? { campo: 'ventaId', mensaje: 'Elige al menos una operación.' } : null)
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
