import { adminModel } from '../models/admin.model.js';
import { usuarioActual, codigosRol } from '../models/sesion.model.js';
import { construirValidador, mostrarMensaje, mostrarErroresServidor } from './validacion.controller.js';
import { escapar } from '../views/componentes.view.js';
import {
  tablaAdmin, paginacionAdmin, valorTexto, valorConEtiqueta, fechaLocal,
  campoFormulario, leyendaObligatorios
} from '../views/admin.view.js';

const instancias = new WeakMap();
const CAMPOS_CALCULADOS = new Set(['fechaRegistro','fechaCreacion','ultimoAcceso','fechaFin','ingresosTotal','fechaAsigna']);
let contador = 0;

export function esAdm() {
  const usuario = usuarioActual();
  if (!usuario) return false;
  const codigos = codigosRol(usuario);
  return codigos.includes('ADM') || (!codigos.length && usuario.rol === 'admin');
}

export function iniciarPantalla(config = {}) {
  const raiz = typeof config.raiz === 'string' ? document.querySelector(config.raiz) : (config.raiz || document);
  if (!raiz) return null;
  const inst = {
    config, raiz,
    tabla: config.tabla || raiz.dataset.tabla || document.body.dataset.tabla || '',
    key: config.clave || `t${++contador}`,
    meta: null,
    opcionesCache: {},
    pagina: 1,
    totalPages: 1,
    focoAnterior: null,
    modal: null,
    formulario: null,
    modo: 'crear'
  };
  if (!inst.tabla) return null;
  instancias.set(raiz, inst);
  enlazar(inst);
  cargar(inst);
  return inst;
}

function enlazar(inst) {
  const { config, raiz } = inst;
  raiz.querySelector('[data-nuevo]')?.addEventListener('click', (evento) => {
    inst.focoAnterior = evento.currentTarget;
    abrirFormulario(inst, null);
  });
  raiz.addEventListener('click', (evento) => accion(inst, evento));
  raiz.querySelectorAll('[data-filtro]').forEach((control) => {
    control.addEventListener('change', () => { inst.pagina = 1; cargarFilas(inst); });
  });
  (config.filtrosContenedor ? document.querySelectorAll(config.filtrosContenedor) : raiz.querySelectorAll('[data-filtro]')).forEach((control) => {
    if (raiz.contains(control)) return;
    control.addEventListener('change', () => { inst.pagina = 1; cargarFilas(inst); });
  });
}

async function cargar(inst) {
  const tbody = inst.raiz.querySelector('[data-tabla-body]');
  if (tbody) tbody.setAttribute('aria-busy', 'true');
  try {
    inst.meta = await adminModel.tablaMeta(inst.tabla);
    await cargarOpciones(inst);
    pintarEncabezado(inst);
    configurarBotones(inst);
    await cargarFilas(inst);
  } catch (error) {
    mostrarMensaje(region(inst), error.mensaje || 'No se pudo cargar la pantalla.', 'error');
  } finally {
    if (tbody) tbody.setAttribute('aria-busy', 'false');
  }
}

async function cargarOpciones(inst) {
  const columnas = columnasMeta(inst);
  const referencias = [...new Set(columnas.map((c) => c.referencia || c.ref || c.tablaReferencia).filter(Boolean))];
  await Promise.all(referencias.map(async (tabla) => {
    try { inst.opcionesCache[tabla] = normalizarOpciones(await adminModel.tablaOpciones(tabla)); } catch { inst.opcionesCache[tabla] = []; }
  }));
}

function normalizarOpciones(respuesta) {
  if (Array.isArray(respuesta)) return respuesta;
  if (Array.isArray(respuesta?.data)) return respuesta.data;
  if (Array.isArray(respuesta?.opciones)) return respuesta.opciones;
  if (Array.isArray(respuesta?.items)) return respuesta.items;
  return [];
}

function columnasMeta(inst) {
  return inst.meta?.columnas || inst.meta?.columns || [];
}

function columnasVista(inst) {
  const nombres = inst.config.columnas;
  if (!nombres) return columnasMeta(inst);
  return nombres.map((nombre) => columnasMeta(inst).find((c) => c.nombre === nombre) || { nombre });
}

function etiqueta(inst, col) {
  return inst.config.etiquetas?.[col.nombre] || col.etiqueta || col.nombre;
}

function region(inst) {
  return inst.raiz.querySelector('[data-mensaje]') || document.querySelector('#mensaje-pantalla');
}

function configurarBotones(inst) {
  const nuevo = inst.raiz.querySelector('[data-nuevo]');
  if (nuevo) nuevo.hidden = !puedeEscribir(inst) || inst.config.puedeCrear === false;
}

function puedeEscribir(inst) {
  if (!esAdm() || inst.config.soloLectura) return false;
  if (inst.meta?.soloLectura === true) return false;
  const modo = String(inst.meta?.modo || inst.meta?.mode || '').toLowerCase();
  return !modo || modo === 'crud';
}

function pintarEncabezado(inst) {
  const head = inst.raiz.querySelector('[data-tabla-head]');
  if (!head) return;
  const muestraAcciones = inst.config.muestraAcciones !== false;
  head.innerHTML = `<tr>${columnasVista(inst).map((c) => `<th scope="col">${escapar(etiqueta(inst, c))}</th>`).join('')}${muestraAcciones ? '<th scope="col">Acciones</th>' : ''}</tr>`;
}

function etiquetaRegistro(inst, fila) {
  const preferidos = ['nombre','descripcion','login','apellido','id'];
  for (const campo of preferidos) {
    if (fila[campo]) return String(fila[campo]);
  }
  return String(inst.meta?.idCampos?.map((k) => fila[k]).join('~') || '');
}

function celdaDe(inst, col, valor, fila) {
  const formato = inst.config.formatoCelda?.[col.nombre];
  if (typeof formato === 'function') return formato(valor, fila);
  if (formato && typeof formato === 'object') return valorConEtiqueta(col.nombre, valor);
  if (inst.config.etiquetasValor?.[col.nombre]) return valorConEtiqueta(col.nombre, valor);
  if (valor === null || valor === undefined || valor === '') return valorTexto(valor);
  if (/^(fecha|createdAt|updatedAt)/i.test(col.nombre) || String(col.tipo) === 'DateTime') return fechaLocal(valor);
  if (inst.config.valores?.[col.nombre]?.[valor]) return escapar(inst.config.valores[col.nombre][valor]);
  return valorConEtiqueta(col.nombre, valor);
}

async function cargarFilas(inst) {
  const tbody = inst.raiz.querySelector('[data-tabla-body]');
  if (!tbody) return;
  tbody.setAttribute('aria-busy', 'true');
  try {
    const params = { page: inst.pagina, limit: inst.config.limit || 20, ...(inst.config.filtrosFijos || {}) };
    inst.raiz.querySelectorAll('[data-filtro]').forEach((control) => {
      const campo = control.dataset.campo || control.name;
      if (campo && control.value) params[campo] = control.value;
    });
    (inst.config.filtrosExtra || []).forEach(({ campo, selector }) => {
      const valor = document.querySelector(selector)?.value;
      if (campo && valor) params[campo] = valor;
    });
    const respuesta = await adminModel.tablaFilas(inst.tabla, params);
    const filas = respuesta?.data || respuesta || [];
    if (typeof inst.config.completarFilas === 'function') await inst.config.completarFilas(filas, inst);
    const paginacion = respuesta?.pagination || { page: 1, totalPages: 1 };
    inst.totalPages = paginacion.totalPages || 1;
    pintarEncabezado(inst);
    const columnas = columnasVista(inst);
    const acciones = inst.config.muestraAcciones === false ? null : (fila, clave) => accionesDe(inst, fila, clave);
    tbody.innerHTML = tablaAdmin({
      columnas: columnas.map((c) => ({ nombre: c.nombre, etiqueta: etiqueta(inst, c) })),
      filas: filas.map((fila) => ({ ...fila, __clave: claveFila(inst, fila), __celdas: columnas.map((c) => celdaDe(inst, c, fila[c.nombre], fila)) })),
      idCampos: inst.meta?.idCampos || ['id'],
      acciones,
      caption: inst.config.titulo || inst.tabla,
      id: `tabla-${inst.key}`
    });
    const cont = inst.raiz.querySelector('[data-paginacion]');
    if (cont) {
      cont.innerHTML = paginacionAdmin({ page: paginacion.page || inst.pagina, totalPages: inst.totalPages });
      cont.querySelectorAll('[data-page]').forEach((boton) => {
        boton.addEventListener('click', () => { inst.pagina = Number(boton.dataset.page) || 1; cargarFilas(inst); });
      });
    }
    if (!filas.length) tbody.innerHTML = `<tr><td colspan="${columnas.length + (inst.config.muestraAcciones === false ? 0 : 1)}" class="text-center text-body-secondary">No hay registros.</td></tr>`;
  } catch (error) {
    mostrarMensaje(region(inst), error.mensaje || 'No se pudieron cargar los registros.', 'error');
  } finally {
    tbody.setAttribute('aria-busy', 'false');
  }
}

function claveFila(inst, fila) {
  const campos = inst.meta?.idCampos || ['id'];
  return campos.map((k) => fila[k]).join('~');
}

function accionesDe(inst, fila, clave) {
  const etiquetaFila = escapar(etiquetaRegistro(inst, fila));
  if (inst.config.accionesFila) return inst.config.accionesFila(fila, clave);
  if (inst.config.protegido?.(fila)) return '<span class="text-body-secondary">Protegido</span>';
  if (!puedeEscribir(inst)) return '<span class="text-body-secondary">Solo lectura</span>';
  if (inst.config.accionEliminar) {
    const accion = inst.config.accionEliminar(fila);
    if (!accion) return `<button type="button" class="btn btn-sm btn-outline-primary" data-editar="${escapar(clave)}" aria-label="Editar ${etiquetaFila}">Editar</button>`;
    return `<button type="button" class="btn btn-sm btn-outline-primary" data-editar="${escapar(clave)}" aria-label="Editar ${etiquetaFila}">Editar</button> <button type="button" class="btn btn-sm btn-outline-warning" data-accion="${escapar(clave)}" aria-label="${escapar(accion.etiqueta)} ${etiquetaFila}">${escapar(accion.etiqueta)}</button>`;
  }
  return `<button type="button" class="btn btn-sm btn-outline-primary" data-editar="${escapar(clave)}" aria-label="Editar ${etiquetaFila}">Editar</button> <button type="button" class="btn btn-sm btn-outline-danger" data-eliminar="${escapar(clave)}" aria-label="Eliminar ${etiquetaFila}">Eliminar</button>`;
}

function accion(inst, evento) {
  const editar = evento.target.closest('[data-editar]');
  const eliminar = evento.target.closest('[data-eliminar]');
  const ver = evento.target.closest('[data-ver]');
  const accionPersonalizada = evento.target.closest('[data-accion]');
  if (editar) {
    inst.focoAnterior = editar;
    if (inst.config.alEditar) { inst.config.alEditar(editar.dataset.editar, inst); return; }
    abrirFormulario(inst, editar.dataset.editar);
    return;
  }
  if (ver) {
    inst.focoAnterior = ver;
    abrirFormulario(inst, ver.dataset.ver, 'ver');
    return;
  }
  if (accionPersonalizada && inst.config.alAccion) {
    inst.config.alAccion(accionPersonalizada.dataset.accion, inst);
    return;
  }
  if (eliminar) eliminarRegistro(inst, eliminar.dataset.eliminar, eliminar);
}

async function eliminarRegistro(inst, clave, boton) {
  try {
    const fila = await adminModel.tablaFila(inst.tabla, clave);
    const datos = fila?.data || fila || {};
    const accion = inst.config.accionEliminar?.(datos);
    if (accion) {
      if (!window.confirm(accion.confirmar || `¿${accion.etiqueta} el registro ${etiquetaRegistro(inst, datos)}?`)) return;
      await accion.ejecutar(datos);
      mostrarMensaje(region(inst), accion.mensajeExito || 'Registro actualizado.', 'exito');
    } else {
      if (!window.confirm(`¿Eliminar el registro ${etiquetaRegistro(inst, datos)}?`)) return;
      await adminModel.tablaEliminar(inst.tabla, clave);
      mostrarMensaje(region(inst), 'Registro eliminado.', 'exito');
    }
    await cargarFilas(inst);
  } catch (error) {
    mostrarMensaje(region(inst), error.mensaje || 'No se pudo completar la acción.', 'error');
  } finally {
    boton?.focus?.();
  }
}

function asegurarModal(inst) {
  if (inst.modal) return;
  const idTitulo = `titulo-modal-${inst.key}`;
  const modal = document.createElement('dialog');
  modal.className = 'border-0 rounded p-0 pf-admin-modal';
  modal.style.cssText = 'max-width:760px;width:100%';
  modal.setAttribute('aria-labelledby', idTitulo);
  modal.innerHTML = `<div class="p-4">
    <h2 id="${idTitulo}" class="h5" data-titulo-modal>Registro</h2>
    ${leyendaObligatorios()}
    <form data-form-tabla novalidate>
      <div data-campos-form class="row g-2"></div>
      <div data-relaciones-form></div>
      <div data-detalle-form></div>
      <div class="mt-3 d-flex gap-2 justify-content-end">
        <button type="button" class="btn btn-outline-secondary" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primary" data-guardar-modal>Guardar</button>
      </div>
    </form>
  </div>`;
  inst.raiz.appendChild(modal);
  inst.modal = modal;
  inst.formulario = modal.querySelector('[data-form-tabla]');
  modal.querySelector('[data-cerrar-modal]').addEventListener('click', () => cerrarModal(inst));
  modal.addEventListener('close', () => { if (inst.focoAnterior instanceof HTMLElement) inst.focoAnterior.focus(); });
  construirValidador(inst.formulario, { borrador: false, alEnviar: () => guardar(inst) });
}

function abrirFormulario(inst, clave, modo = clave ? 'editar' : 'crear') {
  asegurarModal(inst);
  inst.modo = modo;
  inst.claveEditando = clave;
  const formulario = inst.formulario;
  formulario.reset();
  formulario.querySelectorAll('.pf-error').forEach((n) => n.remove());
  const campos = formulario.querySelector('[data-campos-form]');
  const relaciones = formulario.querySelector('[data-relaciones-form]');
  const detalle = formulario.querySelector('[data-detalle-form]');
  campos.innerHTML = '';
  relaciones.innerHTML = '';
  detalle.innerHTML = '';
  formulario.querySelector('[data-guardar-modal]').hidden = modo === 'ver';
  formulario.querySelector('[data-guardar-modal]').textContent = modo === 'ver' ? 'Cerrar' : 'Guardar';
  formulario.querySelector('[data-cerrar-modal]').hidden = modo === 'ver';
  inst.modal.showModal?.();
  if (!inst.modal.open) inst.modal.setAttribute('open', '');
  cargarFormulario(inst, clave, modo).catch((error) => {
    mostrarMensaje(region(inst), error.mensaje || 'No se pudo preparar el formulario.', 'error');
    cerrarModal(inst);
  });
}

async function cargarFormulario(inst, clave, modo) {
  let fila = {};
  if (clave) {
    const respuesta = await adminModel.tablaFila(inst.tabla, clave);
    fila = respuesta?.data || respuesta || {};
  }
  const columnas = columnasMeta(inst);
  const idCampos = inst.meta?.idCampos || ['id'];
  const titulo = inst.formulario.querySelector('[data-titulo-modal]');
  titulo.textContent = modo === 'ver' ? `Detalle de ${inst.config.titulo || inst.tabla}` : modo === 'editar' ? `Editar ${inst.config.titulo || inst.tabla}` : `Nuevo registro en ${inst.config.titulo || inst.tabla}`;
  const campos = inst.formulario.querySelector('[data-campos-form]');
  const fragmentos = [];
  for (const col of columnas) {
    if (inst.config.ocultarCampos?.includes(col.nombre)) continue;
    if (col.autoincremental && modo === 'crear') continue;
    const esId = col.esId || idCampos.includes(col.nombre);
    const soloLectura = modo === 'ver' || (inst.config.soloLecturaCampos?.includes(col.nombre)) || (modo === 'editar' && esId) || (modo === 'editar' && CAMPOS_CALCULADOS.has(col.nombre) && !inst.config.editarCalculados);
    const valor = fila[col.nombre] ?? inst.config.defaults?.[col.nombre] ?? '';
    const fk = col.referencia || col.ref || col.tablaReferencia;
    let opciones = null;
    if (inst.config.opciones?.[col.nombre]) {
      opciones = typeof inst.config.opciones[col.nombre] === 'function'
        ? inst.config.opciones[col.nombre](fila, inst)
        : inst.config.opciones[col.nombre];
    } else if (inst.config.opcionesFijas?.[col.nombre]) {
      opciones = opcionesDeMapa(inst.config.opcionesFijas[col.nombre]);
    } else if (fk) {
      opciones = inst.opcionesCache[fk] || [];
    }
    if (inst.config.filtrosOpciones?.[col.nombre]) opciones = inst.config.filtrosOpciones[col.nombre](opciones || [], fila);
    fragmentos.push(campoFormulario({
      col,
      valor,
      etiqueta: etiqueta(inst, col),
      opciones,
      soloLectura,
      obligatorio: inst.config.obligatorios?.includes(col.nombre) ? true : undefined,
      ayuda: inst.config.ayudas?.[col.nombre] || '',
      patron: inst.config.patrones?.[col.nombre],
      mensajePatron: inst.config.mensajesPatron?.[col.nombre]
    }));
  }
  campos.innerHTML = fragmentos.join('');
  if (typeof inst.config.alPrepararFormulario === 'function') await inst.config.alPrepararFormulario(inst.formulario, modo, inst);
  if (modo === 'ver') {
    const cerrar = inst.formulario.querySelector('[data-cerrar-modal]');
    cerrar.hidden = false;
    cerrar.textContent = 'Cerrar';
  }
  await cargarRelaciones(inst, fila, modo);
  if (typeof inst.config.detalle === 'function') {
    inst.formulario.querySelector('[data-detalle-form]').innerHTML = await inst.config.detalle(fila, modo, inst);
  }
  const primerCampo = [...campos.querySelectorAll('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly])')][0];
  primerCampo?.focus();
}

function opcionesDeMapa(mapa) {
  if (Array.isArray(mapa)) return mapa;
  return Object.entries(mapa || {}).map(([valor, texto]) => ({ valor, texto }));
}

async function cargarRelaciones(inst, fila, modo) {
  const cont = inst.formulario.querySelector('[data-relaciones-form]');
  const relaciones = inst.config.relaciones || [];
  if (!relaciones.length) return;
  const bloques = [];
  for (const relacion of relaciones) {
    const localId = fila[relacion.idLocal];
    if (!localId) { bloques.push(`<p class="small text-body-secondary mt-3">${escapar(relacion.titulo)}: guarda el registro para poder gestionarlo.</p>`); continue; }
    const existentesRes = await adminModel.tablaFilas(relacion.tabla, { [relacion.idLocal]: localId, limit: 100 });
    const existentes = existentesRes?.data || existentesRes || [];
    let metaRelacion = inst.metaRelaciones?.[relacion.tabla];
    if (!metaRelacion) {
      try { metaRelacion = await adminModel.tablaMeta(relacion.tabla); } catch { metaRelacion = {}; }
      inst.metaRelaciones = { ...(inst.metaRelaciones || {}), [relacion.tabla]: metaRelacion };
    }
    const camposClave = metaRelacion?.idCampos?.length ? metaRelacion.idCampos.join(',') : `${relacion.idLocal},${relacion.idRemoto}`;
    const valores = new Set(existentes.map((r) => String(r[relacion.idRemoto])));
    let opciones = inst.opcionesCache[relacion.opcionesTabla];
    if (!opciones) { opciones = normalizarOpciones(await adminModel.tablaFilas(relacion.opcionesTabla, { limit: 200 })); inst.opcionesCache[relacion.opcionesTabla] = opciones; }
    if (relacion.filtrarOpciones) opciones = relacion.filtrarOpciones(opciones, fila);
    const checks = opciones.map((opcion) => {
      const valor = String(opcion.valor ?? opcion.id ?? '');
      const texto = opcion.texto ?? opcion.descripcion ?? opcion.nombre ?? valor;
      const marcado = valores.has(valor) ? 'checked' : '';
      const disabled = modo === 'ver' ? 'disabled' : '';
      return `<div class="col-12 col-md-6"><label class="form-check"><input class="form-check-input" type="checkbox" name="rel-${escapar(relacion.tabla)}" value="${escapar(valor)}" data-relacion="${escapar(relacion.tabla)}" ${marcado} ${disabled}> <span class="form-check-label">${escapar(texto)}</span></label></div>`;
    }).join('');
    const actuales = existentes.map((r) => String(r[relacion.idRemoto]));
    bloques.push(`<fieldset class="border rounded p-3 mt-3"><legend class="h6 w-auto px-2">${escapar(relacion.titulo)}</legend><div class="row g-2" data-relacion-contenedor="${escapar(relacion.tabla)}" data-relacion-local="${escapar(localId)}" data-relacion-idlocal="${escapar(relacion.idLocal)}" data-relacion-idremoto="${escapar(relacion.idRemoto)}" data-relacion-idcampos="${escapar(camposClave)}" data-relacion-actuales="${escapar(actuales.join(','))}">${checks || '<p class="small text-body-secondary">No hay opciones disponibles.</p>'}</div></fieldset>`);
  }
  cont.innerHTML = bloques.join('');
}

function extraerBody(inst, form) {
  const columnas = columnasMeta(inst);
  const idCampos = inst.meta?.idCampos || ['id'];
  const body = {};
  for (const col of columnas) {
    if (inst.config.ocultarCampos?.includes(col.nombre)) continue;
    if (inst.config.soloLecturaCampos?.includes(col.nombre)) continue;
    if (col.autoincremental) continue;
    const campo = form.querySelector(`[name="${CSS.escape(col.nombre)}"]`);
    if (!campo) continue;
    const esId = col.esId || idCampos.includes(col.nombre);
    if (inst.modo === 'editar' && esId) continue;
    let valor = campo.value;
    if (valor === '') {
      if (col.requerido || inst.config.obligatorios?.includes(col.nombre)) continue;
      valor = inst.modo === 'editar' ? null : undefined;
    } else if (col.tipo === 'Int' || col.tipo === 'Decimal') {
      valor = Number(valor);
    }
    if (valor !== undefined) body[col.nombre] = valor;
  }
  return body;
}

async function guardar(inst) {
  if (inst.modo === 'ver') return;
  const form = inst.formulario;
  const body = extraerBody(inst, form);
  const regionMensaje = region(inst);
  try {
    let respuesta;
    if (inst.config.alGuardar) {
      respuesta = await inst.config.alGuardar(body, inst.claveEditando, inst);
    } else if (inst.modo === 'editar') {
      respuesta = await adminModel.tablaEditar(inst.tabla, inst.claveEditando, body);
    } else {
      respuesta = await adminModel.tablaCrear(inst.tabla, body);
    }
    const guardado = respuesta?.data || respuesta || body;
    await guardarRelaciones(inst, inst.modo === 'editar' ? inst.claveEditando : (guardado[idDe(inst)] || inst.claveEditando), body);
    mostrarMensaje(regionMensaje, inst.config.mensajeExito || 'Registro guardado.', 'exito');
    cerrarModal(inst);
    await cargarFilas(inst);
  } catch (error) {
    const primero = mostrarErroresServidor(form, error, inst.config.mapaCampos || {});
    mostrarMensaje(regionMensaje, error.mensaje || 'No se pudo guardar el registro.', error.status === 400 && primero ? 'info' : 'error');
  }
}

function idDe(inst) {
  const campo = (inst.meta?.idCampos || ['id'])[0];
  return campo;
}

async function guardarRelaciones(inst, localId, body) {
  const cont = inst.formulario.querySelector('[data-relaciones-form]');
  if (!cont || !localId) return;
  for (const relacion of inst.config.relaciones || []) {
    const bloque = cont.querySelector(`[data-relacion-contenedor="${CSS.escape(relacion.tabla)}"]`);
    if (!bloque) continue;
    const idLocal = bloque.dataset.relacionIdlocal;
    const idRemoto = bloque.dataset.relacionIdremoto;
    const antes = new Set((bloque.dataset.relacionActuales || '').split(',').filter(Boolean));
    const despues = new Set([...bloque.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value));
    for (const valor of despues) {
      if (antes.has(valor)) continue;
      await adminModel.tablaCrear(relacion.tabla, { [idLocal]: localId, [idRemoto]: valor, ...(relacion.camposExtra || {}) });
    }
    const camposClave = (bloque.dataset.relacionIdcampos || `${idLocal},${idRemoto}`).split(',');
    for (const valor of antes) {
      if (despues.has(valor)) continue;
      const clave = camposClave.map((campo) => {
        if (campo === idLocal) return localId;
        if (campo === idRemoto) return valor;
        return '';
      }).join('~');
      await adminModel.tablaEliminar(relacion.tabla, clave);
    }
    bloque.dataset.relacionActuales = [...despues].join(',');
  }
}

function cerrarModal(inst) {
  if (inst.modal?.close) inst.modal.close();
  else inst.modal?.removeAttribute('open');
  if (inst.focoAnterior instanceof HTMLElement) inst.focoAnterior.focus();
}

export async function cambiarEstadoTabla(tabla, fila, estado) {
  const meta = await adminModel.tablaMeta(tabla);
  const columnas = meta?.columnas || [];
  const idCampos = meta?.idCampos || ['id'];
  const body = {};
  for (const col of columnas) {
    if (col.autoincremental || CAMPOS_CALCULADOS.has(col.nombre)) continue;
    if (idCampos.includes(col.nombre)) continue;
    body[col.nombre] = fila[col.nombre] ?? null;
  }
  body.estado = estado;
  return adminModel.tablaEditar(tabla, idCampos.map((k) => fila[k]).join('~'), body);
}

export function instanciaDe(nodo) {
  return instancias.get(nodo);
}
