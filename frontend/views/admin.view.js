import { escapar } from './componentes.view.js';

// Celda sin dato: un guion visible y texto para lectores de pantalla.
export const VACIO = '<span class="text-body-secondary" aria-hidden="true">—</span><span class="visually-hidden">Sin dato</span>';

// Etiquetas en español para los campos del panel genérico (tablas y formularios).
export const ETIQUETAS_CAMPO = {
  id: 'Código', nombre: 'Nombre', apellido: 'Apellido', descripcion: 'Descripción', estado: 'Estado', telefono: 'Teléfono', correo: 'Correo',
  direccion: 'Dirección', ruc: 'RUC', contacto: 'Contacto', tipo: 'Tipo', valor: 'Valor', precio: 'Precio', porcentaje: 'Porcentaje',
  servicioId: 'Servicio', cargoId: 'Cargo', turnoId: 'Turno', nivelId: 'Nivel', empleadoId: 'Empleado', clienteId: 'Cliente', claseId: 'Clase',
  horarioId: 'Horario', membresiaId: 'Plan', promocionId: 'Promoción', proveedorId: 'Proveedor', categoriaId: 'Categoría', usuarioId: 'Usuario',
  profesionalAliadoId: 'Aliado', metodoPagoId: 'Método de pago', unidadMedidaId: 'Unidad de medida', gimnasioId: 'Gimnasio',
  duracion: 'Duración', unidadDuracion: 'Unidad de duración', numIngresos: 'Número de ingresos', numPersonas: 'Personas', pagaIva: 'Paga IVA',
  incluyeRutina: 'Incluye rutina', esEstudiantil: 'Estudiantil', esEstudiante: 'Estudiante', publicarWeb: 'Publicar en la web',
  requiereAutoriz: 'Requiere autorización', horaInicio: 'Hora de inicio', horaFin: 'Hora de fin', horaApertura: 'Apertura', horaCierre: 'Cierre',
  dia: 'Día', abierto: 'Abierto', aforoMax: 'Aforo máximo', cupoMax: 'Cupo máximo', lugar: 'Lugar', especialidad: 'Especialidad',
  fechaIngreso: 'Fecha de ingreso', fechaInicio: 'Fecha de inicio', fechaFin: 'Fecha de fin', fechaRegistro: 'Fecha de registro',
  fechaNacimiento: 'Fecha de nacimiento', sector: 'Sector', propietaria: 'Propietaria', porcentajeIva: 'IVA (%)', establecimiento: 'Establecimiento',
  puntoEmision: 'Punto de emisión', stock: 'Stock', stockMinimo: 'Stock mínimo', precioVenta: 'Precio de venta', costo: 'Costo',
  controlaCaducidad: 'Controla caducidad', diasAlertaCad: 'Días de alerta de caducidad', esContable: 'Es contable', esTitular: 'Titular',
  canal: 'Canal', permisos: 'Permisos', login: 'Correo de acceso', ultimoAcceso: 'Último acceso', fechaCreacion: 'Fecha de creación'
};
export function etiquetaCampo(nombre) {
  if (ETIQUETAS_CAMPO[nombre]) return ETIQUETAS_CAMPO[nombre];
  const texto = String(nombre || '').replace(/Id$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function tablaGenerica({ caption, columnas, filas, accionesHtml }) {
  return `<div class="table-responsive"><table class="table table-hover align-middle">
    <caption class="visually-hidden">${escapar(caption||'')}</caption>
    <thead class="table-light"><tr>${columnas.map(c=>`<th scope="col">${escapar(c.label)}</th>`).join('')}${accionesHtml?'<th scope="col">Acciones</th>':''}</tr></thead>
    <tbody>${filas || `<tr><td colspan="${columnas.length + (accionesHtml?1:0)}" class="text-center text-body-secondary">No hay registros.</td></tr>`}</tbody>
  </table></div>`;
}

export function paginacionAdmin({ page=1, totalPages=1 }, prefix='') {
  if ((Number(totalPages) || 1) <= 1) return '';
  return `<nav aria-label="Paginación" class="mt-3 d-flex justify-content-center align-items-center gap-2" data-paginacion="${prefix}">
    <button type="button" class="btn btn-outline-secondary btn-sm" data-page="${page-1}" ${page<=1?'disabled':''}>Anterior</button>
    <span aria-live="polite">Página ${page} de ${totalPages||1}</span>
    <button type="button" class="btn btn-outline-secondary btn-sm" data-page="${page+1}" ${page>= (totalPages||1)?'disabled':''}>Siguiente</button>
  </nav>`;
}

export function celda(valor) {
  if (valor === null || valor === undefined || valor === '') return VACIO;
  return escapar(typeof valor === 'object' ? JSON.stringify(valor) : valor);
}

export const ETIQUETAS_VALOR = {
  estado: { A: 'Activo', I: 'Inactivo', S: 'Suspendido', P: 'Pendiente de pago', V: 'Vencido', X: 'Anulado', R: 'Pago reportado' },
  canal: { W: 'Web', L: 'Local' },
  tipo: { T: 'Por tiempo', I: 'Por ingresos', A: 'Aliado' },
  metodoPago: { EF: 'Efectivo', TR: 'Transferencia' },
  dia: {},
  pagaIva: { S: 'Sí', N: 'No' },
  incluyeRutina: { S: 'Sí', N: 'No' },
  esEstudiantil: { S: 'Sí', N: 'No' },
  publicarWeb: { S: 'Sí', N: 'No' },
  requiereAutoriz: { S: 'Sí', N: 'No' },
  esTitular: { S: 'Sí', N: 'No' },
  esEstudiante: { S: 'Sí', N: 'No' },
  controlaCaducidad: { S: 'Sí', N: 'No' },
  esContable: { S: 'Sí', N: 'No' }
};

export function valorTexto(valor) {
  if (valor === null || valor === undefined || valor === '') return VACIO;
  return escapar(String(valor));
}

export function valorConEtiqueta(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return VACIO;
  const etiqueta = ETIQUETAS_VALOR[campo]?.[valor];
  return escapar(etiqueta || String(valor));
}

export function fechaLocal(valor) {
  if (valor === null || valor === undefined || valor === '') return VACIO;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return escapar(String(valor));
  return escapar(fecha.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }));
}

export function opcionesHtml(opciones = [], valor, { vacio = 'Selecciona una opción' } = {}) {
  const actual = valor === null || valor === undefined ? '' : String(valor);
  const primera = vacio !== null ? `<option value="">${escapar(vacio)}</option>` : '';
  return primera + opciones.map((o) => {
    const v = String(o.valor ?? o.value ?? o.id ?? '');
    const t = o.texto ?? o.label ?? o.descripcion ?? o.nombre ?? v;
    return `<option value="${escapar(v)}" ${v === actual ? 'selected' : ''}>${escapar(t)}</option>`;
  }).join('');
}

export function campoFormulario({ col, valor, etiqueta, opciones, soloLectura = false, obligatorio = false, ayuda = '', ancho = 'col-12 col-md-6', patron = '', mensajePatron = '' }) {
  const id = `f-${col.nombre}`;
  const nombre = escapar(col.nombre);
  const etiquetaSegura = escapar(etiqueta || col.nombre);
  const requerido = obligatorio || col.requerido;
  const max = col.longitudMaxima || col.longitud_maxima || col.longitud || '';
  const tipo = String(col.tipo || 'String');
  const val = valor === null || valor === undefined ? '' : String(valor);
  let control;

  if (opciones) {
    control = `<select class="form-select" id="${id}" name="${nombre}" ${soloLectura ? 'disabled' : ''} ${requerido ? 'required' : ''}>${opcionesHtml(opciones, val, { vacio: requerido ? 'Selecciona una opción' : 'Sin asignar' })}</select>`;
  } else if (tipo === 'Int' || tipo === 'Decimal') {
    control = `<input class="form-control" type="number" step="${tipo === 'Decimal' ? '0.01' : '1'}" id="${id}" name="${nombre}" value="${escapar(val)}" ${soloLectura ? 'readonly' : ''} ${requerido ? 'required' : ''}>`;
  } else if (tipo === 'DateTime' || /fecha|hora/i.test(col.nombre)) {
    const esHora = /hora/i.test(col.nombre);
    const tipoInput = esHora ? 'time' : (/fechaAutoriza|fechaAnula|ultimoAcceso/i.test(col.nombre) ? 'datetime-local' : 'date');
    const recorte = tipoInput === 'date' ? 10 : 16;
    control = `<input class="form-control" type="${tipoInput}" id="${id}" name="${nombre}" value="${escapar(val.slice(0, recorte))}" ${soloLectura ? 'readonly' : ''} ${requerido ? 'required' : ''}>`;
  } else if (Number(max) >= 200) {
    control = `<textarea class="form-control" id="${id}" name="${nombre}" rows="3" ${max ? `maxlength="${max}"` : ''} ${soloLectura ? 'readonly' : ''} ${requerido ? 'required' : ''}>${escapar(val)}</textarea>`;
  } else {
    control = `<input class="form-control" type="text" id="${id}" name="${nombre}" value="${escapar(val)}" ${max ? `maxlength="${max}"` : ''} ${soloLectura ? 'readonly' : ''} ${requerido ? 'required' : ''} ${patron ? `pattern="${escapar(patron)}"` : ''} ${mensajePatron ? `data-mensaje-patron="${escapar(mensajePatron)}"` : ''}>`;
  }

  return `<div class="${ancho}" data-campo="${nombre}"><label class="form-label" for="${id}">${etiquetaSegura}${requerido ? ' *' : ''}</label>${control}${ayuda ? `<p class="form-text mb-0">${escapar(ayuda)}</p>` : ''}</div>`;
}

export function tablaAdmin({ columnas, filas, idCampos = ['id'], acciones, caption = 'Datos', id = 'tabla-datos', soloFilas = false }) {
  const head = `<tr>${columnas.map((c, i) => `<th scope="col">${escapar(c.etiqueta || c.nombre)}</th>`).join('')}${acciones ? '<th scope="col">Acciones</th>' : ''}</tr>`;
  const cuerpo = filas.length ? filas.map((fila) => {
    const clave = fila.__clave ?? idCampos.map((k) => fila[k]).join('~');
    const celdas = columnas.map((c, i) => {
      const contenido = fila.__celdas?.[i] ?? celda(fila[c.nombre]);
      return i === 0 ? `<th scope="row">${contenido}</th>` : `<td>${contenido}</td>`;
    }).join('');
    const accion = acciones ? `<td class="text-nowrap">${acciones(fila, clave)}</td>` : '';
    return `<tr>${celdas}${accion}</tr>`;
  }).join('') : `<tr><td colspan="${columnas.length + (acciones ? 1 : 0)}" class="text-center text-body-secondary">No hay registros.</td></tr>`;
  // El encabezado lo pinta la tabla una sola vez; aquí solo van las filas cuando se pide.
  if (soloFilas) return cuerpo;
  return `<caption class="visually-hidden">${escapar(caption)}</caption><thead>${head}</thead><tbody>${cuerpo}</tbody>`;
}

export function leyendaObligatorios() {
  return '<p class="small text-body-secondary mb-2">Los campos con * son obligatorios.</p>';
}
