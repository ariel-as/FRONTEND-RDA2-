import './admin.controller.js';
import { facturasModel } from '../models/fase2.model.js';
import { txt, dinero, fecha, estado, detalleHtml } from '../views/lista-api.view.js';
import { confirmarAccion } from './dialogo.controller.js';
import { puede } from '../models/permisos.model.js';
import { crearLista, formulario, enlazarBoton } from './lista-api.controller.js';

const ESTADOS = { P: 'Sin número del SRI', E: 'Registrada en el SRI', A: 'Anulada' };
const columnas = [['N.º', (f) => txt(f.id)], ['Comprobante', (f) => txt(f.numComprobante || 'Pendiente')], ['Fecha', (f) => fecha(f.fecha)], ['Cliente', (f) => txt(f.cliente?.nombre || f.cliente || f.clienteId)],
  ['Origen', (f) => txt([f.ventaId && `Venta ${f.ventaId}`, f.inscripcionId && `Inscripción ${f.inscripcionId}`].filter(Boolean).join(' · '))], ['Total', (f) => dinero(f.total)], ['Estado', (f) => estado(ESTADOS, f.estado)]];

async function imprimir(f) {
  const datos = await facturasModel.detalle(f.id).then((r) => r?.data ?? r);
  const zona = document.querySelector('[data-factura-impresa]');
  zona.innerHTML = `<h2 class="h4">Factura ${txt(datos.numComprobante || datos.id)}</h2>${detalleHtml(datos)}`;
  zona.hidden = false;
  window.print();
  zona.hidden = true;
  return null;
}

const facturas = crearLista({
  raiz: '#pantalla-facturas', filtros: '#filtros-facturas', caption: 'Facturas',
  cargar: (p) => facturasModel.listar(p),
  columnas,
  acciones: (f) => [
    { texto: 'Ver e imprimir', permiso: 'facturas:leer', etiqueta: `Ver e imprimir la factura ${f.id}`, ejecutar: () => imprimir(f) },
    f.estado === 'P' && { texto: 'Registrar SRI', permiso: 'facturas:sri', tono: 'btn-primary', etiqueta: `Registrar número del SRI de la factura ${f.id}`, ejecutar: () => formulario({
      titulo: `Datos del SRI de la factura ${f.id}`,
      campos: [
        { nombre: 'numComprobante', etiqueta: 'Número de comprobante', requerido: true, maxlength: 17, patron: '[0-9]{3}-[0-9]{3}-[0-9]{9}', mensajePatron: 'Formato 001-001-000000123.', ayuda: 'Formato 001-001-000000123.' },
        { nombre: 'claveAcceso', etiqueta: 'Clave de acceso', requerido: true, maxlength: 49, patron: '[0-9]{49}', mensajePatron: 'La clave de acceso tiene 49 dígitos.', ayuda: '49 dígitos.' }
      ],
      alConfirmar: (v) => facturasModel.sri(f.id, { numComprobante: v.numComprobante.trim(), claveAcceso: v.claveAcceso.trim() }), exito: 'Datos del SRI registrados.' }) }
  ]
});

const porAnular = puede('facturas:sri') && crearLista({
  raiz: '#pantalla-por-anular', caption: 'Facturas por anular en el SRI',
  cargar: (p) => facturasModel.porAnular(p),
  columnas,
  acciones: (f) => [{ texto: 'Marcar anulada en el SRI', permiso: 'facturas:sri', tono: 'btn-outline-danger', etiqueta: `Marcar anulada la factura ${f.id}`,
    ejecutar: async () => (await confirmarAccion({ titulo: 'Marcar anulada en el SRI', mensaje: `Confirma que la factura ${f.numComprobante || f.id} ya fue anulada en el SRI. No se puede deshacer.`, textoConfirmar: 'Marcar anulada', alConfirmar: () => facturasModel.anular(f.id) }) ? 'Factura marcada como anulada.' : null) }]
});

enlazarBoton('[data-generar-factura]', 'facturas:generar', async () => {
  const m = await formulario({
    titulo: 'Generar factura', textoConfirmar: 'Generar',
    mensaje: 'Indica la venta, la inscripción o ambas. Si no indicas a quién facturar, se usa el cliente de la operación.',
    campos: [
      { nombre: 'ventaId', etiqueta: 'Número de venta', tipo: 'number', paso: '1', min: 1 },
      { nombre: 'inscripcionId', etiqueta: 'Número de inscripción', tipo: 'number', paso: '1', min: 1 },
      { nombre: 'aQuien', etiqueta: 'Facturar a', tipo: 'select', opciones: [{ valor: '', texto: 'El cliente de la operación' }, { valor: '9999999999', texto: 'CONSUMIDOR FINAL' }, { valor: 'tercero', texto: 'Un tercero registrado (cédula o RUC)' }] },
      { nombre: 'tercero', etiqueta: 'Cédula o RUC del tercero', maxlength: 13, patron: '[0-9]{10}|[0-9]{13}', mensajePatron: 'Cédula de 10 o RUC de 13 dígitos.' }
    ],
    validarExtra: (_, v) => (!v.ventaId && !v.inscripcionId ? 'Indica una venta o una inscripción.' : v.aQuien === 'tercero' && !v.tercero ? 'Escribe la cédula o el RUC del tercero.' : null),
    alConfirmar: (v) => facturasModel.generar({ ...(v.ventaId ? { ventaId: Number(v.ventaId) } : {}), ...(v.inscripcionId ? { inscripcionId: Number(v.inscripcionId) } : {}), ...(v.aQuien === 'tercero' ? { clienteId: v.tercero.trim() } : v.aQuien ? { clienteId: v.aQuien } : {}) }),
    exito: 'Factura generada. Registra su número del SRI.'
  });
  if (m) { facturas?.recargar(); porAnular?.recargar(); }
  return m;
});
