import './admin.controller.js';
import { rutinasModel, lista as extraer } from '../models/fase2.model.js';
import { txt, fecha } from '../views/lista-api.view.js';
import { escapar } from '../views/componentes.view.js';
import { mostrarMensaje } from './validacion.controller.js';
import { crearLista } from './lista-api.controller.js';
import { abrirDialogo, confirmarAccion } from './dialogo.controller.js';
import { usuarioActual, tieneRol } from '../models/sesion.model.js';
import { esAdm } from '../models/permisos.model.js';

const NIVELES = [{ valor: 'PRI', texto: 'Principiante' }, { valor: 'INT', texto: 'Intermedio' }, { valor: 'AVA', texto: 'Avanzado' }];
const OBJETIVOS = ['Bajar de peso', 'Ganar masa muscular', 'Resistencia', 'Tonificar', 'Salud general'].map((texto) => ({ valor: texto, texto }));
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const LIMITES = { dias: 7, ejercicios: 10, repeticiones: 100, tiempo: 3600 };
const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
const sumarDias = (iso, cantidad) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + cantidad); return d.toLocaleDateString('en-CA'); };
const menorFecha = (a, b) => (!a ? b : (!b ? a : (a < b ? a : b)));
const fechaTexto = (v) => { const t = String(v || '').slice(0, 10); const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t); return m ? `${m[3]}/${m[2]}/${m[1]}` : (t || '-'); };
const nombreEntrenador = (r) => (typeof r?.entrenador === 'string' ? r.entrenador : (r?.entrenador?.nombre || r?.empleado?.nombre || ''));
const nivelValor = (r) => r?.nivelId || NIVELES.find((n) => n.valor === r?.nivel || n.texto === r?.nivel)?.valor || '';
const textoNivel = (valor) => NIVELES.find((n) => n.valor === valor)?.texto || valor;
const mensajero = () => document.querySelector('[data-mensaje]');
const entero = (v) => String(v ?? '').match(/\d+/)?.[0] || '';
const enteroEntre = (v, min, max) => /^\d+$/.test(String(v ?? '').trim()) && Number(v) >= min && Number(v) <= max;
const rutaDia = (i) => `detalle.dias[${i}]`;
const rutaEjercicio = (i, j) => `${rutaDia(i)}.ejercicios[${j}]`;

function ejercicioVacio() { return { nombre: '', grupo: '', series: '3', modo: 'reps', cantidad: '12', descanso: '60s', nota: '' }; }
function diaVacio(indice) { return { nombre: `Día ${indice + 1}`, ejercicios: [ejercicioVacio()] }; }

function leerDetalle(detalle) {
  if (typeof detalle !== 'string') return detalle;
  try { return JSON.parse(detalle); } catch { return detalle; }
}

function notaGeneral(detalle) {
  const datos = leerDetalle(detalle);
  return datos && typeof datos === 'object' && !Array.isArray(datos) ? String(datos.nota || '') : '';
}

function leerEjercicio(e) {
  if (typeof e === 'string') return { ...ejercicioVacio(), nombre: e.replace(/^[-•]\s*/, '') };
  const vacio = (v) => v === null || v === undefined || v === '';
  let modo = 'reps';
  let cantidad = '';
  if (!vacio(e.tiempo) && vacio(e.repeticiones)) { modo = 'seg'; cantidad = entero(e.tiempo); } else {
    const texto = String(e.repeticiones ?? '');
    cantidad = entero(texto);
    if (/min/i.test(texto) && cantidad) { modo = 'seg'; cantidad = String(Number(cantidad) * 60); } else if (/\d\s*(s|seg|segundos)\b/i.test(texto)) modo = 'seg';
  }
  return { nombre: String(e.nombre ?? e.ejercicio ?? e.descripcion ?? ''), grupo: String(e.grupo ?? e.grupoMuscular ?? ''), series: entero(e.series), modo, cantidad, descanso: String(e.descanso ?? '').replace(/\s+/g, ''), nota: String(e.nota ?? '') };
}

// Lee el formato del backend ({ dias: [{ nombre, ejercicios }] }) y también las rutinas viejas (filas o texto).
function normalizarDias(detalle) {
  const datos = leerDetalle(detalle);
  if (typeof datos === 'string') {
    const lineas = datos.split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean);
    return lineas.map((linea, indice) => ({ nombre: DIAS[indice] || `Día ${indice + 1}`, ejercicios: [leerEjercicio(linea)] }));
  }
  const entregados = [].concat(datos?.dias || datos?.rutinaDias || (Array.isArray(datos) ? datos : []));
  return entregados.map((dia, indice) => {
    const lista = [].concat(dia.ejercicios || dia.filas || []).map(leerEjercicio);
    if (!lista.length) String(dia.detalle || dia.descripcion || '').split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean).forEach((linea) => lista.push(leerEjercicio(linea)));
    return { nombre: String(dia.nombre || dia.dia || dia.diaSemana || `Día ${indice + 1}`), ejercicios: lista };
  }).filter((dia) => dia.ejercicios.length);
}

// Arma exactamente el formato que acepta el backend, con números enteros.
function diasParaDetalle(dias, nota = '') {
  const detalle = {
    editable: true,
    dias: dias.map((dia) => ({
      nombre: dia.nombre.trim(),
      ejercicios: dia.ejercicios.map((e) => ({
        nombre: e.nombre.trim(),
        grupo: e.grupo.trim() || null,
        series: Number.parseInt(e.series, 10),
        repeticiones: e.modo === 'seg' ? null : Number.parseInt(e.cantidad, 10),
        tiempo: e.modo === 'seg' ? Number.parseInt(e.cantidad, 10) : null,
        descanso: e.descanso.trim(),
        nota: e.nota.trim()
      }))
    }))
  };
  if (String(nota || '').trim()) detalle.nota = String(nota).trim();
  return detalle;
}

// Mismas reglas que el backend; cada error apunta al campo exacto del editor.
function validarRutina(dias) {
  const errores = [];
  const agregar = (campo, mensaje) => errores.push({ campo, mensaje });
  if (!dias.length) agregar('nivelId', 'La rutina necesita al menos un día. Elige un nivel para cargar su plantilla.');
  if (dias.length > LIMITES.dias) agregar(`${rutaDia(LIMITES.dias)}.nombre`, `La rutina admite hasta ${LIMITES.dias} días.`);
  dias.forEach((dia, i) => {
    const nombre = dia.nombre.trim();
    if (nombre.length < 3 || nombre.length > 30) agregar(`${rutaDia(i)}.nombre`, 'El nombre del día tiene entre 3 y 30 caracteres.');
    if (!dia.ejercicios.length || dia.ejercicios.length > LIMITES.ejercicios) agregar(`${rutaDia(i)}.nombre`, `Cada día lleva entre 1 y ${LIMITES.ejercicios} ejercicios.`);
    dia.ejercicios.forEach((e, j) => {
      const q = rutaEjercicio(i, j);
      const nombreEjercicio = e.nombre.trim();
      if (nombreEjercicio.length < 2 || nombreEjercicio.length > 60) agregar(`${q}.nombre`, 'El ejercicio tiene entre 2 y 60 caracteres.');
      if (!enteroEntre(e.series, 1, 10)) agregar(`${q}.series`, 'Las series son un número entero de 1 a 10.');
      if (e.modo === 'seg' ? !enteroEntre(e.cantidad, 1, LIMITES.tiempo) : !enteroEntre(e.cantidad, 1, LIMITES.repeticiones)) agregar(`${q}.repeticiones`, e.modo === 'seg' ? 'El tiempo es un número entero de 1 a 3600 segundos.' : 'Las repeticiones son un número entero de 1 a 100.');
      const descanso = e.descanso.trim();
      if (descanso.length < 1 || descanso.length > 15) agregar(`${q}.descanso`, 'El descanso tiene entre 1 y 15 caracteres, por ejemplo 90s.');
      if (e.nota.trim().length > 120) agregar(`${q}.nota`, 'La nota tiene hasta 120 caracteres.');
    });
  });
  return errores;
}

// Traduce rutas del servidor (detalle.dias[1].ejercicios[3].tiempo) al campo del editor.
function ubicarCampo(ruta, formulario) {
  let nombre = String(ruta || '').replace(/^body\./, '');
  if (nombre === 'observaciones' || nombre === 'nota') nombre = 'detalle.nota';
  if (nombre === 'detalle' || nombre === 'detalle.dias') nombre = `${rutaDia(0)}.nombre`;
  nombre = nombre.replace(/\.tiempo$/, '.repeticiones').replace(/(dias\[\d+\])\.ejercicios$/, '$1.nombre');
  if (/\]$/.test(nombre)) nombre += '.nombre';
  return formulario.querySelector(`[name="${CSS.escape(nombre)}"]`);
}

function textoCantidad(e) {
  if (!e.cantidad) return '';
  return e.modo === 'seg' ? `${e.cantidad} s` : `${e.cantidad} repeticiones`;
}

function resumenRutina(rutina) {
  return normalizarDias(rutina?.detalle).map((dia) => `${dia.nombre}: ${dia.ejercicios.map((e) => [e.nombre, e.series && `${e.series} series`, textoCantidad(e), e.descanso && `descanso ${e.descanso}`, e.nota].filter(Boolean).join(' · ')).join(' | ')}`).join('\n');
}

function rutinaHtml(rutina) {
  const dias = normalizarDias(rutina?.detalle);
  const nivel = textoNivel(nivelValor(rutina)) || rutina?.nivel || '-';
  const nota = notaGeneral(rutina?.detalle) || rutina?.observaciones || '';
  return `<article class="pf-rutina-vista"><h3>${escapar(rutina?.objetivo || 'Rutina')}</h3>
    <p>Nivel: ${escapar(nivel)} · Del ${escapar(fechaTexto(rutina?.fechaInicio))} al ${escapar(fechaTexto(rutina?.fechaFin))}${nombreEntrenador(rutina) ? ` · Entrenador: ${escapar(nombreEntrenador(rutina))}` : ''}</p>
    ${nota ? `<p>${escapar(nota)}</p>` : ''}
    ${dias.map((dia, indice) => `<section aria-labelledby="rutina-vista-dia-${indice}"><h4 id="rutina-vista-dia-${indice}">${escapar(dia.nombre)}</h4><ul>${dia.ejercicios.map((e) => `<li><strong>${escapar(e.nombre)}</strong>${[e.grupo && escapar(e.grupo), e.series && `${escapar(e.series)} series`, textoCantidad(e) && escapar(textoCantidad(e)), e.descanso && `Descanso: ${escapar(e.descanso)}`, e.nota && escapar(e.nota)].filter(Boolean).map((parte) => `<span>${parte}</span>`).join('')}</li>`).join('')}</ul></section>`).join('')}
    ${!dias.length ? `<p>${escapar(typeof rutina?.detalle === 'string' ? rutina.detalle : 'Sin detalle.')}</p>` : ''}</article>`;
}

function imprimirRutina(html) {
  const nodo = document.querySelector('#rutina-impresion');
  if (!nodo) return;
  nodo.innerHTML = html;
  nodo.hidden = false;
  const limpiar = () => { nodo.innerHTML = ''; nodo.hidden = true; };
  window.addEventListener('afterprint', limpiar, { once: true });
  window.print();
}

function estadoRutina(rutina) {
  const fin = new Date(`${String(rutina?.fechaFin || '').slice(0, 10)}T12:00:00`);
  if (Number.isNaN(fin.getTime())) return 'Vigente';
  const dias = Math.round((fin - new Date(`${hoyISO()}T12:00:00`)) / 86400000);
  if (dias < 0) return 'Vencida';
  if (dias <= 7) return 'Por vencer en 7 días';
  return 'Vigente';
}

function puedeGestionar() { return esAdm() || tieneRol('ENT'); }

function puedeEditarRutina(rutina) {
  const usuario = usuarioActual() || {};
  if (esAdm(usuario)) return true;
  if (!rutina || !tieneRol('ENT')) return false;
  const propio = usuario.empleadoId ?? usuario.empleado?.id;
  return propio !== undefined && propio !== null && propio !== '' && String(rutina.empleadoId ?? '') === String(propio);
}

function normalizarFicha(respuesta) {
  const r = respuesta || {};
  const plan = r.planActivo || null;
  const rv = r.rutinaVigente || null;
  return {
    cedula: String(r.cedula || r.clienteId || ''),
    nombre: r.nombre || '',
    correo: r.correo || '',
    nivel: r.nivel || '',
    nivelId: r.nivelId || 'PRI',
    tienePlan: Boolean(plan),
    incluyeRutina: plan?.incluyeRutina === true,
    planId: plan?.id ?? null,
    plan: plan?.nombre || '',
    fechaFin: String(plan?.fechaFin || '').slice(0, 10),
    rutina: rv ? { id: rv.id, objetivo: rv.objetivo || '', detalle: rv.detalle, fechaInicio: rv.fechaInicio, fechaFin: rv.fechaFin, nivel: rv.nivel || '', nivelId: rv.nivelId || '', entrenador: rv.entrenador || '', empleadoId: rv.empleadoId ?? null } : null
  };
}

let ficha = null;
let editorDias = [];
let ejercicios = [];
let editorModificado = false;
let editorRaiz = null;
let estadoEditor = null;

function pintarFicha() {
  const cont = document.querySelector('#ficha-cliente');
  if (!cont) return;
  if (!ficha) { cont.hidden = true; return; }
  cont.hidden = false;
  cont.querySelector('[data-ficha-nombre]').textContent = ficha.nombre || ficha.cedula;
  cont.querySelector('[data-ficha-nivel]').textContent = ficha.nivel || textoNivel(ficha.nivelId);
  cont.querySelector('[data-ficha-plan]').textContent = ficha.tienePlan ? `${ficha.plan || 'Plan activo'}${ficha.fechaFin ? ` · hasta ${fechaTexto(ficha.fechaFin)}` : ''} · ${ficha.incluyeRutina ? 'Incluye rutina' : 'No incluye rutina'}` : 'Sin plan activo';
  cont.querySelector('[data-ficha-rutina]').textContent = ficha.rutina ? `${ficha.rutina.objetivo || 'Rutina'} · ${fechaTexto(ficha.rutina.fechaInicio)} a ${fechaTexto(ficha.rutina.fechaFin)}${ficha.rutina.entrenador ? ` · ${ficha.rutina.entrenador}` : ''}` : 'Sin rutina vigente';
  const motivo = cont.querySelector('[data-ficha-motivo]');
  const asignar = cont.querySelector('[data-asignar-rutina]');
  const editar = cont.querySelector('[data-editar-rutina]');
  const ver = cont.querySelector('[data-ver-rutina]');
  let textoMotivo = '';
  if (!ficha.tienePlan) textoMotivo = 'El cliente no tiene una membresía activa';
  else if (!ficha.incluyeRutina) textoMotivo = 'Su plan no incluye rutina';
  else if (!puedeGestionar()) textoMotivo = 'Tu rol solo puede ver rutinas.';
  else if (ficha.rutina && !puedeEditarRutina(ficha.rutina)) textoMotivo = 'La rutina vigente pertenece a otro entrenador.';
  motivo.hidden = !textoMotivo;
  motivo.textContent = textoMotivo;
  asignar.hidden = !(ficha.tienePlan && ficha.incluyeRutina && !ficha.rutina && puedeGestionar());
  editar.hidden = !(ficha.rutina && puedeEditarRutina(ficha.rutina));
  ver.hidden = !ficha.rutina;
}

async function consultarCliente() {
  const campo = document.querySelector('#rutina-cedula');
  const cedula = campo?.value.trim() || '';
  if (!/^\d{10}$/.test(cedula)) { mostrarMensaje(mensajero(), 'La cédula tiene 10 dígitos.', 'error'); campo?.focus(); return; }
  try {
    const r = await rutinasModel.cliente(cedula).then((x) => x?.data ?? x);
    ficha = normalizarFicha({ ...r, clienteId: cedula });
    pintarFicha();
    mostrarMensaje(mensajero(), 'Ficha cargada.', 'exito');
  } catch (error) {
    ficha = null;
    pintarFicha();
    mostrarMensaje(mensajero(), error.mensaje || 'No se pudo consultar la ficha del cliente.', 'error');
  }
}

function opcionesDatalist() {
  return ejercicios.map((e) => ({ nombre: e.nombre || e.descripcion || e.ejercicio || '', grupo: e.grupoMuscular || e.grupo || '' })).filter((e) => e.nombre)
    .map((e) => `<option value="${escapar(e.nombre)}"${e.grupo ? ` label="${escapar(e.grupo)}"` : ''}></option>`).join('');
}

function leerEditor() {
  if (!editorRaiz) return;
  const valor = (nombre, actual) => editorRaiz.querySelector(`[name="${CSS.escape(nombre)}"]`)?.value ?? actual;
  editorDias = editorDias.map((dia, i) => ({
    nombre: valor(`${rutaDia(i)}.nombre`, dia.nombre),
    ejercicios: dia.ejercicios.map((e, j) => {
      const q = rutaEjercicio(i, j);
      return { nombre: valor(`${q}.nombre`, e.nombre), grupo: valor(`${q}.grupo`, e.grupo), series: valor(`${q}.series`, e.series), modo: valor(`${q}.modo`, e.modo), cantidad: valor(`${q}.repeticiones`, e.cantidad), descanso: valor(`${q}.descanso`, e.descanso), nota: valor(`${q}.nota`, e.nota) };
    })
  }));
}

function ejercicioHtml(e, i, j, total) {
  const q = rutaEjercicio(i, j);
  const id = `rt-${i}-${j}`;
  const et = `Día ${i + 1} · Ejercicio ${j + 1}`;
  const seg = e.modo === 'seg';
  return `<fieldset class="border-top pt-2 mb-2" data-ejercicio="${i}-${j}"><legend class="small fw-semibold mb-1">Ejercicio ${j + 1}</legend><div class="row g-2">
    <div class="col-12 col-md-8"><label class="form-label small" for="${id}-nombre">Ejercicio</label><input class="form-control form-control-sm" id="${id}-nombre" name="${q}.nombre" list="lista-ejercicios-rutina" value="${escapar(e.nombre)}" required maxlength="60" pattern=".*\\S.*\\S.*" data-mensaje-patron="El ejercicio tiene entre 2 y 60 caracteres." data-etiqueta="${et} · Nombre" placeholder="Busca o escribe un ejercicio" autocomplete="off"></div>
    <div class="col-12 col-md-4"><label class="form-label small" for="${id}-grupo">Grupo muscular</label><input class="form-control form-control-sm" id="${id}-grupo" name="${q}.grupo" value="${escapar(e.grupo)}" maxlength="40" data-etiqueta="${et} · Grupo" autocomplete="off"></div>
    <div class="col-6 col-md-2"><label class="form-label small" for="${id}-series">Series</label><input class="form-control form-control-sm" type="number" inputmode="numeric" id="${id}-series" name="${q}.series" value="${escapar(e.series)}" required min="1" max="10" step="1" data-mensaje-rango="Las series son un número entero de 1 a 10." data-etiqueta="${et} · Series"></div>
    <div class="col-6 col-md-4"><label class="form-label small" for="${id}-cantidad">Reps o tiempo</label><input class="form-control form-control-sm" type="number" inputmode="numeric" id="${id}-cantidad" name="${q}.repeticiones" value="${escapar(e.cantidad)}" required min="1" max="${seg ? LIMITES.tiempo : LIMITES.repeticiones}" step="1" data-mensaje-rango="${seg ? 'El tiempo es un número entero de 1 a 3600 segundos.' : 'Las repeticiones son un número entero de 1 a 100.'}" data-etiqueta="${et} · Reps o tiempo"><select class="form-select form-select-sm mt-1" id="${id}-modo" name="${q}.modo" aria-label="Unidad del ${et}"><option value="reps"${seg ? '' : ' selected'}>Repeticiones</option><option value="seg"${seg ? ' selected' : ''}>Segundos</option></select></div>
    <div class="col-6 col-md-2"><label class="form-label small" for="${id}-descanso">Descanso</label><input class="form-control form-control-sm" id="${id}-descanso" name="${q}.descanso" value="${escapar(e.descanso)}" required maxlength="15" placeholder="90s" data-etiqueta="${et} · Descanso" autocomplete="off"></div>
    <div class="col-6 col-md-4"><label class="form-label small" for="${id}-nota">Nota</label><input class="form-control form-control-sm" id="${id}-nota" name="${q}.nota" value="${escapar(e.nota)}" maxlength="120" data-etiqueta="${et} · Nota" autocomplete="off"></div>
    <div class="col-12 d-flex flex-wrap gap-1"><button type="button" class="btn btn-outline-secondary btn-sm" data-accion="subir-fila" data-dia="${i}" data-fila="${j}"${j === 0 ? ' disabled' : ''}>Subir</button><button type="button" class="btn btn-outline-secondary btn-sm" data-accion="bajar-fila" data-dia="${i}" data-fila="${j}"${j === total - 1 ? ' disabled' : ''}>Bajar</button><button type="button" class="btn btn-outline-danger btn-sm" data-accion="quitar-fila" data-dia="${i}" data-fila="${j}"${total === 1 ? ' disabled' : ''} aria-label="Quitar ejercicio ${j + 1} del día ${i + 1}">Quitar</button></div>
  </div></fieldset>`;
}

function diaHtml(dia, i, total, abierto) {
  const n = dia.ejercicios.length;
  return `<details class="border rounded mb-2" data-dia-panel="${i}"${abierto ? ' open' : ''}><summary class="p-2 fw-semibold">${escapar(dia.nombre || `Día ${i + 1}`)} · ${n} ${n === 1 ? 'ejercicio' : 'ejercicios'}</summary><div class="px-3 pb-3">
    <label class="form-label small" for="rt-${i}-nombre">Nombre del día</label><input class="form-control form-control-sm" id="rt-${i}-nombre" name="${rutaDia(i)}.nombre" value="${escapar(dia.nombre)}" required maxlength="30" pattern="\\s*\\S.{1,28}\\S\\s*" data-mensaje-patron="El nombre del día tiene entre 3 y 30 caracteres." data-etiqueta="Día ${i + 1} · Nombre del día" autocomplete="off">
    <div class="d-flex flex-wrap gap-1 my-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-accion="subir-dia" data-dia="${i}"${i === 0 ? ' disabled' : ''}>Subir día</button><button type="button" class="btn btn-outline-secondary btn-sm" data-accion="bajar-dia" data-dia="${i}"${i === total - 1 ? ' disabled' : ''}>Bajar día</button><button type="button" class="btn btn-outline-danger btn-sm" data-accion="quitar-dia" data-dia="${i}"${total === 1 ? ' disabled' : ''}>Quitar día</button></div>
    ${dia.ejercicios.map((e, j) => ejercicioHtml(e, i, j, n)).join('')}
    <button type="button" class="btn btn-outline-primary btn-sm" data-accion="agregar-fila" data-dia="${i}"${n >= LIMITES.ejercicios ? ' disabled' : ''}>Agregar ejercicio</button>
  </div></details>`;
}

function pintarEditor(mensaje = '', abrir = null) {
  if (!editorRaiz) return;
  const abiertos = new Set([...editorRaiz.querySelectorAll('details[data-dia-panel][open]')].map((d) => Number(d.dataset.diaPanel)));
  if (!editorRaiz.querySelector('details[data-dia-panel]')) abiertos.add(0);
  if (abrir !== null) abiertos.add(abrir);
  editorRaiz.innerHTML = `<div data-dias-rutina>${editorDias.map((dia, i) => diaHtml(dia, i, editorDias.length, abiertos.has(i))).join('')}</div><button type="button" class="btn btn-outline-primary btn-sm" data-accion="agregar-dia"${editorDias.length >= LIMITES.dias ? ' disabled' : ''}>Agregar día</button><datalist id="lista-ejercicios-rutina">${opcionesDatalist()}</datalist>`;
  if (estadoEditor) estadoEditor.textContent = mensaje;
}

async function cargarEjercicios() {
  if (!ejercicios.length) {
    try { ejercicios = extraer(await rutinasModel.ejercicios({ limit: 500 })); } catch { ejercicios = []; }
  }
  const lista = editorRaiz?.querySelector('#lista-ejercicios-rutina');
  if (lista) lista.innerHTML = opcionesDatalist();
}

async function plantillaDe(nivel) {
  let plantillas = [];
  try { plantillas = extraer(await rutinasModel.plantillas({ nivelId: nivel })); } catch { plantillas = []; }
  const plantilla = plantillas.find((p) => String(p.nivelId || p.nivel) === String(nivel)) || plantillas[0];
  return plantilla ? normalizarDias(plantilla.detalle || plantilla).slice(0, LIMITES.dias) : [];
}

async function cargarPlantilla(nivel, selector) {
  leerEditor();
  if (editorModificado && !(await confirmarAccion({ titulo: 'Reemplazar ejercicios', mensaje: `Ya cambiaste los ejercicios. ¿Reemplazarlos con la plantilla de ${textoNivel(nivel)}?`, textoConfirmar: 'Reemplazar', tono: 'peligro' }))) {
    if (selector) selector.value = selector.dataset.anterior || selector.value;
    return;
  }
  if (selector) selector.dataset.anterior = nivel;
  const dias = await plantillaDe(nivel);
  editorDias = dias.length ? dias : [diaVacio(0)];
  editorModificado = false;
  editorRaiz.innerHTML = '';
  pintarEditor(dias.length ? `Plantilla de ${textoNivel(nivel)} cargada.` : 'No hay plantilla para este nivel: escribe los ejercicios.');
}

function enlazarEditor() {
  editorRaiz.addEventListener('input', (evento) => {
    if (!evento.target.name) return;
    editorModificado = true;
    if (evento.target.name.endsWith('.nombre') && evento.target.list) {
      const elegido = ejercicios.find((e) => (e.nombre || '') === evento.target.value);
      const grupo = editorRaiz.querySelector(`[name="${CSS.escape(evento.target.name.replace(/\.nombre$/, '.grupo'))}"]`);
      if (elegido && grupo && !grupo.value) grupo.value = elegido.grupoMuscular || elegido.grupo || '';
    }
  });
  editorRaiz.addEventListener('change', (evento) => {
    const selector = evento.target;
    if (!selector.name?.endsWith('.modo')) return;
    editorModificado = true;
    const campo = editorRaiz.querySelector(`[name="${CSS.escape(selector.name.replace(/\.modo$/, '.repeticiones'))}"]`);
    if (!campo) return;
    const seg = selector.value === 'seg';
    campo.max = String(seg ? LIMITES.tiempo : LIMITES.repeticiones);
    campo.dataset.mensajeRango = seg ? 'El tiempo es un número entero de 1 a 3600 segundos.' : 'Las repeticiones son un número entero de 1 a 100.';
  });
  editorRaiz.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    leerEditor();
    const i = Number(boton.dataset.dia);
    const j = Number(boton.dataset.fila);
    const dia = editorDias[i];
    let mensaje = '';
    let abrir = Number.isNaN(i) ? null : i;
    switch (boton.dataset.accion) {
      case 'agregar-dia': if (editorDias.length < LIMITES.dias) { editorDias.push(diaVacio(editorDias.length)); abrir = editorDias.length - 1; mensaje = 'Día agregado.'; } break;
      case 'quitar-dia': if (editorDias.length > 1) { editorDias.splice(i, 1); abrir = null; mensaje = 'Día quitado.'; } break;
      case 'subir-dia': if (i > 0) { [editorDias[i - 1], editorDias[i]] = [editorDias[i], editorDias[i - 1]]; abrir = i - 1; mensaje = 'Día movido arriba.'; } break;
      case 'bajar-dia': if (i < editorDias.length - 1) { [editorDias[i + 1], editorDias[i]] = [editorDias[i], editorDias[i + 1]]; abrir = i + 1; mensaje = 'Día movido abajo.'; } break;
      case 'agregar-fila': if (dia && dia.ejercicios.length < LIMITES.ejercicios) { dia.ejercicios.push(ejercicioVacio()); mensaje = 'Ejercicio agregado.'; } break;
      case 'quitar-fila': if (dia && dia.ejercicios.length > 1) { dia.ejercicios.splice(j, 1); mensaje = 'Ejercicio quitado.'; } break;
      case 'subir-fila': if (dia && j > 0) { [dia.ejercicios[j - 1], dia.ejercicios[j]] = [dia.ejercicios[j], dia.ejercicios[j - 1]]; mensaje = 'Ejercicio movido arriba.'; } break;
      case 'bajar-fila': if (dia && j < dia.ejercicios.length - 1) { [dia.ejercicios[j + 1], dia.ejercicios[j]] = [dia.ejercicios[j], dia.ejercicios[j + 1]]; mensaje = 'Ejercicio movido abajo.'; } break;
      default: return;
    }
    if (!mensaje) return;
    editorModificado = true;
    if (boton.dataset.accion.endsWith('-dia')) editorRaiz.innerHTML = '';
    pintarEditor(mensaje, abrir);
  });
}

async function abrirEditor(rutina) {
  let base = rutina;
  if (rutina?.id) {
    const detalle = await rutinasModel.detalle(rutina.id).then((x) => x?.data ?? x).catch(() => null);
    base = { ...rutina, ...(detalle && typeof detalle === 'object' ? detalle : {}) };
  }
  const deFicha = !rutina || (ficha?.rutina && String(ficha.rutina.id) === String(rutina.id));
  const fechaFinMax = deFicha ? (ficha?.fechaFin || '') : '';
  const inicio = hoyISO();
  const fin = menorFecha(sumarDias(inicio, 28), fechaFinMax) || sumarDias(inicio, 28);
  const nivelInicial = nivelValor(base) || ficha?.nivelId || 'PRI';
  let mensajeInicial;
  if (rutina) {
    editorDias = normalizarDias(base?.detalle).slice(0, LIMITES.dias);
    mensajeInicial = 'Rutina guardada cargada. Cambia lo que necesites y guarda.';
  } else {
    editorDias = await plantillaDe(nivelInicial);
    mensajeInicial = editorDias.length ? `Plantilla de ${textoNivel(nivelInicial)} cargada. Puedes asignarla tal cual o editarla.` : 'No hay plantilla para este nivel: escribe los ejercicios.';
  }
  if (!editorDias.length) editorDias = [diaVacio(0)];
  editorModificado = false;
  editorRaiz = null;
  estadoEditor = null;
  const objetivo = base?.objetivo || 'Salud general';
  const opcionesObjetivo = OBJETIVOS.some((o) => o.valor === objetivo) ? OBJETIVOS : [...OBJETIVOS, { valor: objetivo, texto: objetivo }];
  const respuesta = await abrirDialogo({
    titulo: rutina ? 'Editar rutina' : 'Asignar rutina',
    mensaje: `Cliente: ${ficha && deFicha ? (ficha.nombre || ficha.cedula) : (base?.cliente?.nombre || base?.cliente || base?.clienteId || '')}`,
    campos: [
      { nombre: 'nivelId', etiqueta: 'Nivel', tipo: 'select', requerido: true, opciones: NIVELES, valor: nivelInicial },
      { nombre: 'objetivo', etiqueta: 'Objetivo', tipo: 'select', requerido: true, opciones: opcionesObjetivo, valor: objetivo },
      { nombre: 'fechaInicio', etiqueta: 'Desde', tipo: 'date', requerido: true, valor: String(base?.fechaInicio || '').slice(0, 10) || inicio },
      { nombre: 'fechaFin', etiqueta: 'Hasta', tipo: 'date', requerido: true, valor: String(base?.fechaFin || '').slice(0, 10) || fin, ayuda: fechaFinMax ? `No puede pasar del ${fechaTexto(fechaFinMax)}.` : '' },
      { nombre: 'detalle.nota', etiqueta: 'Nota general (opcional)', tipo: 'textarea', maxlength: 120, valor: (notaGeneral(base?.detalle) || base?.observaciones || '').slice(0, 120) }
    ],
    contenido: '<div class="pf-editor-rutina" data-editor-rutina></div><p class="small mt-2 mb-0" data-estado-editor role="status" aria-live="polite"></p>',
    textoConfirmar: rutina ? 'Guardar cambios' : 'Asignar rutina',
    ubicarCampo,
    alPreparar: (formulario) => {
      editorRaiz = formulario.querySelector('[data-editor-rutina]');
      estadoEditor = formulario.querySelector('[data-estado-editor]');
      const campoFin = formulario.elements.namedItem('fechaFin');
      if (fechaFinMax) { campoFin.max = fechaFinMax; campoFin.dataset.mensajeRango = `La fecha de fin no puede pasar del ${fechaTexto(fechaFinMax)}.`; }
      enlazarEditor();
      pintarEditor(mensajeInicial);
      cargarEjercicios();
      const nivel = formulario.elements.namedItem('nivelId');
      nivel.dataset.anterior = nivel.value;
      nivel.addEventListener('change', (evento) => cargarPlantilla(evento.target.value, evento.target));
    },
    validarExtra: (_, v) => {
      leerEditor();
      const errores = [];
      if (v.fechaInicio && v.fechaFin && v.fechaInicio > v.fechaFin) errores.push({ campo: 'fechaFin', mensaje: 'La fecha final debe ser posterior a la inicial.' });
      if (fechaFinMax && v.fechaFin > fechaFinMax) errores.push({ campo: 'fechaFin', mensaje: `La fecha de fin no puede pasar del ${fechaTexto(fechaFinMax)}.` });
      return [...errores, ...validarRutina(editorDias)];
    },
    alConfirmar: async (v) => {
      leerEditor();
      const cuerpo = { nivelId: v.nivelId, objetivo: v.objetivo, detalle: diasParaDetalle(editorDias, v['detalle.nota']), fechaInicio: v.fechaInicio, fechaFin: v.fechaFin };
      return rutina ? rutinasModel.editar(rutina.id, cuerpo) : rutinasModel.crear({ clienteId: ficha?.cedula, ...cuerpo });
    }
  });
  if (!respuesta?.resultado) return;
  mostrarMensaje(mensajero(), rutina ? 'Rutina actualizada.' : 'Rutina asignada.', 'exito');
  await Promise.all([mis?.recargar(), ficha ? consultarCliente() : null]);
}

async function verRutina(rutina) {
  const detalle = await rutinasModel.detalle(rutina.id).then((x) => x?.data ?? x).catch(() => rutina);
  const vista = rutinaHtml({ ...rutina, ...(detalle && typeof detalle === 'object' ? detalle : {}) });
  const correo = ficha?.correo || detalle?.cliente?.correo || detalle?.correo || '';
  await abrirDialogo({
    titulo: `Rutina de ${ficha?.nombre || detalle?.cliente?.nombre || rutina.clienteId || rutina.cliente || ''}`,
    contenido: `${vista}<div class="d-flex flex-wrap gap-2 mt-3"><button type="button" class="btn btn-outline-primary" data-imprimir-rutina>Imprimir / Guardar PDF</button><button type="button" class="btn btn-outline-secondary" data-enviar-rutina${correo ? '' : ' disabled'}>Enviar por correo</button></div><p class="small mt-2 mb-0" data-correo-rutina role="status" aria-live="polite"></p>`,
    soloCerrar: true,
    alPreparar: (formulario) => {
      formulario.querySelector('[data-imprimir-rutina]').addEventListener('click', () => imprimirRutina(vista));
      formulario.querySelector('[data-enviar-rutina]').addEventListener('click', () => {
        const asunto = encodeURIComponent('Tu rutina en Planeta Fitness');
        const cuerpo = encodeURIComponent(`Hola ${ficha?.nombre || ''}:\n\n${resumenRutina(detalle)}\n\nUsa "Imprimir / Guardar PDF" para generar el PDF y adjúntalo a este correo.\n\nPlaneta Fitness`);
        window.location.href = `mailto:${encodeURIComponent(correo)}?subject=${asunto}&body=${cuerpo}`;
        formulario.querySelector('[data-correo-rutina]').textContent = 'Se abrió tu aplicación de correo con la rutina resumida.';
      });
    }
  });
}

const mis = crearLista({
  raiz: '#pantalla-mis-clientes', caption: 'Mis clientes con rutina', fijos: { mias: 'S' }, limite: 100,
  cargar: (p) => rutinasModel.listar(p),
  columnas: [['Cliente', (r) => txt(r.cliente?.nombre || r.cliente || r.clienteId)], ['Nivel', (r) => txt(textoNivel(nivelValor(r)) || r.nivel)], ['Desde', (r) => fecha(r.fechaInicio)], ['Hasta', (r) => fecha(r.fechaFin)], ['Estado', (r) => txt(estadoRutina(r))], ['Entrenador', (r) => txt(nombreEntrenador(r) || r.empleado || r.empleadoId)]],
  acciones: (r) => [
    { texto: 'Ver', permiso: 'rutinas', etiqueta: `Ver la rutina de ${r.clienteId || r.cliente?.nombre || r.cliente || ''}`, ejecutar: () => verRutina(r) },
    ...(puedeEditarRutina(r) ? [{ texto: 'Editar', permiso: 'rutinas', etiqueta: `Editar la rutina de ${r.clienteId || r.cliente?.nombre || r.cliente || ''}`, ejecutar: () => abrirEditor(r) }] : [])
  ]
});

document.querySelector('#form-rutina-cliente')?.addEventListener('submit', (evento) => { evento.preventDefault(); consultarCliente(); });
document.querySelector('[data-asignar-rutina]')?.addEventListener('click', () => abrirEditor(null));
document.querySelector('[data-editar-rutina]')?.addEventListener('click', () => abrirEditor(ficha?.rutina));
document.querySelector('[data-ver-rutina]')?.addEventListener('click', () => ficha?.rutina && verRutina(ficha.rutina));
document.querySelector('#rutina-cedula')?.focus();
