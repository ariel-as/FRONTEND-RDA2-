import './admin.controller.js';
import { facturasModel } from '../models/fase2.model.js';
import { txt, dinero, fecha } from '../views/lista-api.view.js';
import { confirmarAccion } from './dialogo.controller.js';
import { puede } from '../models/permisos.model.js';
import { mostrarFactura, elegirOperacionesSinFactura, ofrecerFactura, estadoFactura, numeroFactura } from './factura.controller.js';
import { crearLista, formulario, enlazarBoton } from './lista-api.controller.js';

const columnas = [['N.º de factura', (f) => txt(numeroFactura(f))], ['Fecha', (f) => fecha(f.fecha)], ['Cliente', (f) => txt(f.cliente?.nombre || f.cliente || f.clienteId)],
  ['Origen', (f) => txt([f.ventaId && `Venta ${f.ventaId}`, f.inscripcionId && `Inscripción ${f.inscripcionId}`].filter(Boolean).join(' · '))], ['Total', (f) => dinero(f.total)], ['Estado', (f) => txt(estadoFactura(f))]];

async function imprimir(f) {
  await mostrarFactura(f.id);
  return null;
}

const facturas = crearLista({
  raiz: '#pantalla-facturas', filtros: '#filtros-facturas', caption: 'Facturas',
  cargar: (p) => facturasModel.listar(p),
  columnas,
  acciones: (f) => [
    { texto: 'Ver e imprimir', permiso: 'facturas:leer', etiqueta: `Ver e imprimir la factura ${numeroFactura(f)}`, ejecutar: async () => { await mostrarFactura(f.id); return null; } },
    { texto: 'Corregir datos del SRI', permiso: 'facturas:sri', tono: 'btn-outline-secondary', secundaria: true, etiqueta: `Corregir datos del SRI de la factura ${numeroFactura(f)}`, ejecutar: () => formulario({
      titulo: `Corregir datos del SRI de la factura ${numeroFactura(f)}`,
      mensaje: 'Acción de corrección para administración y contabilidad; la emisión normal la hace el sistema.',
      campos: [
        { nombre: 'numComprobante', etiqueta: 'Número de comprobante', requerido: true, maxlength: 17, patron: '[0-9]{3}-[0-9]{3}-[0-9]{9}', mensajePatron: 'Formato 001-001-000000123.', ayuda: 'Formato 001-001-000000123.' },
        { nombre: 'claveAcceso', etiqueta: 'Clave de acceso', requerido: true, maxlength: 49, patron: '[0-9]{49}', mensajePatron: 'La clave de acceso tiene 49 dígitos.', ayuda: '49 dígitos.' }
      ],
      alConfirmar: (v) => facturasModel.sri(f.id, { numComprobante: v.numComprobante.trim(), claveAcceso: v.claveAcceso.trim() }), exito: 'Datos del SRI corregidos.' }) }
  ]
});

const porAnular = puede('facturas:sri') && crearLista({
  raiz: '#pantalla-por-anular', caption: 'Facturas por anular en el SRI',
  cargar: (p) => facturasModel.porAnular(p),
  columnas,
  acciones: (f) => [{ texto: 'Marcar anulada en el SRI', permiso: 'facturas:sri', tono: 'btn-outline-danger', etiqueta: `Marcar anulada la factura ${f.id}`,
    ejecutar: async () => (await confirmarAccion({ titulo: 'Marcar anulada en el SRI', mensaje: `Confirma que la factura ${numeroFactura(f)} ya fue anulada en el SRI. No se puede deshacer.`, textoConfirmar: 'Marcar anulada', alConfirmar: () => facturasModel.anular(f.id) }) ? 'Factura marcada como anulada.' : null) }]
});

enlazarBoton('[data-generar-factura]', 'facturas:generar', async () => {
  const origen = await elegirOperacionesSinFactura();
  if (!origen) return null;
  const mensaje = await ofrecerFactura(origen);
  if (mensaje) { facturas?.recargar(); porAnular?.recargar(); }
  return mensaje;
});
