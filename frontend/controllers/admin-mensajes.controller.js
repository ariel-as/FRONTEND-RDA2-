import './admin.controller.js';
import { mensajesModel } from '../models/fase2.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, fecha, estado } from '../views/lista-api.view.js';
import { confirmarAccion } from './dialogo.controller.js';
import { crearLista } from './lista-api.controller.js';

const ESTADOS = { P: 'Pendiente', R: 'Respondido' };
crearLista({
  raiz: '#pantalla-mensajes', filtros: '#filtros-pantalla-mensajes', caption: 'Mensajes de contacto',
  cargar: (p) => mensajesModel.listar(p),
  columnas: [['Nombre', (m) => txt(m.nombre)],
    ['Correo', (m) => (m.correo ? `<a href="mailto:${escapar(m.correo)}">${escapar(m.correo)}</a>` : txt(''))],
    ['Teléfono', (m) => (m.telefono ? `<a href="tel:${escapar(m.telefono)}">${escapar(m.telefono)}</a>` : txt(''))],
    ['Mensaje', (m) => txt(m.mensaje)], ['Fecha', (m) => fecha(m.fecha, true)], ['Estado', (m) => estado(ESTADOS, m.estado)]],
  acciones: (m) => [m.estado !== 'R' && { texto: 'Marcar respondido', permiso: 'mensajes:gestionar', etiqueta: `Marcar respondido el mensaje de ${m.nombre}`,
    ejecutar: async () => (await confirmarAccion({ titulo: 'Marcar respondido', mensaje: `¿Ya respondiste a ${m.nombre}?`, textoConfirmar: 'Marcar respondido', tono: 'primario', alConfirmar: () => mensajesModel.respondido(m.id) }) ? 'Mensaje marcado como respondido.' : null) }]
});
