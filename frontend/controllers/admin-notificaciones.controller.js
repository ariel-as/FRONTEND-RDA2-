import './admin.controller.js';
import { notificacionesModel } from '../models/notificaciones.model.js';
import { txt, fecha } from '../views/lista-api.view.js';
import { textoNoLeidas } from '../views/campana.view.js';
import { crearLista } from './lista-api.controller.js';

crearLista({
  raiz: '#pantalla-notificaciones', filtros: '#filtros-notificaciones', caption: 'Notificaciones',
  cargar: async (p) => { const l = await notificacionesModel.listar(p); return { data: l, pagination: l.pagination, noLeidas: l.noLeidas }; },
  alCargar: (r) => { document.querySelector('[data-no-leidas]').textContent = textoNoLeidas(r.noLeidas); },
  columnas: [['Tipo', (n) => txt(n.titulo)], ['Mensaje', (n) => txt(n.mensaje)], ['Fecha', (n) => fecha(n.fecha, true)], ['Estado', (n) => txt(n.leida ? 'Leída' : 'Nueva')]],
  acciones: (n) => [!n.leida && { texto: 'Marcar leída', permiso: null, etiqueta: `Marcar leída: ${n.titulo}`, ejecutar: async () => { await notificacionesModel.marcarLeida(n.id); return 'Notificación marcada como leída.'; } }]
});
