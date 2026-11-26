import './admin.controller.js';
import { rutinasModel, lista as extraer } from '../models/fase2.model.js';
import { txt, fecha } from '../views/lista-api.view.js';
import { escapar } from '../views/componentes.view.js';
import { mostrarMensaje, validarCedula } from './validacion.controller.js';
import { crearLista } from './lista-api.controller.js';
import { abrirDialogo, confirmarAccion } from './dialogo.controller.js';
import { usuarioActual, tieneRol } from '../models/sesion.model.js';
import { esAdm } from '../models/permisos.model.js';

const NIVELES = [{ valor: 'PRI', texto: 'Principiante' }, { valor: 'INT', texto: 'Intermedio' }, { valor: 'AVA', texto: 'Avanzado' }];
const OBJETIVOS = ['Bajar de peso', 'Ganar masa muscular', 'Resistencia', 'Tonificar', 'Salud general'].map((texto) => ({ valor: texto, texto }));
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
const sumarDias = (iso, cantidad) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + cantidad); return d.toLocaleDateString('en-CA'); };
const menorFecha = (a, b) => (!a ? b : (!b ? a : (a < b ? a : b)));
const fechaTexto = (v) => { const t = String(v || '').slice(0, 10); const m = /^(d{4})-(d{2})-(d{2})$/.exec(t); return m ? `${m[3]}/${m[2]}/${m[1]}` : (t || '-'); };
const nombreEntrenador = (r) => (typeof r?.entrenador === 'string' ? r.entrenador : (r?.entrenador?.nombre || r?.empleado?.nombre || ''));
const mensajero = () => document.querySelector('[data-mensaje]');

function filaVacia() { return { ejercicio: '', series: '', repeticiones: '', descanso: '', nota: '' }; }

function normalizarDias(detalle) {
  let datos = detalle;
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos); } catch {
      const lineas = datos.split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean);
      return lineas.map((linea, indice) => ({ dia: DIAS[indice] || `Día ${indice + 1}`, filas: [{ ...filaVacia(), ejercicio: linea.replace(/^[-•]\s*/, '') }] })).filter((dia) => dia.filas[0].ejercicio);
    }
  }
  const entregados = [].concat(datos?.dias || datos?.rutinaDias || (Array.isArray(datos) ? datos : []));
  return entregados.map((dia, indice) => {
    const filas = [].concat(dia.filas || dia.ejercicios || []).map((fila) => (typeof fila === 'string' ? { ...filaVacia(), ejercicio: fila } : { ...filaVacia(), ...fila }));
    if (!filas.length) String(dia.detalle || dia.descripcion || '').split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean).forEach((linea) => filas.push({ ...filaVacia(), ejercicio: linea.replace(/^[-•]\s*/, '') }));
    return { dia: dia.dia || dia.nombre || dia.diaSemana || `Día ${indice + 1}`, filas };
  }).filter((dia) => dia.filas.length);
}

function diasParaDetalle(dias) {
  return { dias: dias.map((dia) => ({ dia: dia.dia, filas: dia.filas.map((fila) => ({ ejercicio: fila.ejercicio.trim(), series: fila.series.trim(), repeticiones: fila.repeticiones.trim(), descanso: fila.descanso.trim(), nota: fila.nota.trim() })).filter((fila) => fila.ejercicio) })).filter((dia) => dia.filas.length) };
}

function resumenRutina(rutina) {
  return normalizarDias(rutina?.detalle).map((dia) => `${dia.dia}: ${dia.filas.map((fila) => [fila.ejercicio, fila.series && `${fila.series} series`, fila.repeticiones, fila.descanso && `descanso ${fila.descanso}`, fila.nota].filter(Boolean).join(' · ')).join(' | ')}`).join('\n');
}

function rutinaHtml(rutina) {
  const dias = normalizarDias(rutina?.detalle);
  const nivel = NIVELES.find((n) => n.valor === (rutina?.nivelId || rutina?.nivel))?.texto || rutina?.nivel || rutina?.nivelId || '-';
  return `<article class="pf-rutina-vista"><h3>${escapar(rutina?.objetivo || 'Rutina')}</h3>
    <p>Nivel: ${escapar(nivel)} · Del ${escapar(fecha(rutina?.fechaInicio))} al ${escapar(fecha(rutina?.fechaFin))}${nombreEntrenador(rutina) ? ` · Entrenador: ${escapar(nombreEntrenador(rutina))}` : ''}</p>
    ${rutina?.observaciones ? `<p>${escapar(rutina.observaciones)}</p>` : ''}
    ${dias.map((dia, indice) => `<section aria-labelledby="rutina-vista-dia-${indice}"><h4 id="rutina-vista-dia-${indice}">${escapar(dia.dia)}</h4><ul>${dia.filas.map((fila) => `<li><strong>${escapar(fila.ejercicio)}</strong>${[fila.series && `${escapar(fila.series)} series`, fila.repeticiones && escapar(fila.repeticiones), fila.descanso && `Descanso: ${escapar(fila.descanso)}`, fila.nota && escapar(fila.nota)].filter(Boolean).map((parte) => `<span>${parte}</span>`).join('')}</li>`).join('')}</ul></section>`).join('')}
    ${!dias.length ? `<p>${escapar(String(rutina?.detalle || 'Sin detalle.'))}</p>` : ''}</article>`;
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
  cont.querySelector('[data-ficha-nivel]').textContent = ficha.nivel || NIVELES.find((n) => n.valor === ficha.nivelId)?.texto || ficha.nivelId;
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

function datosLista() {
  const grupos = new Map();
  ejercicios.forEach((ejercicio) => {
    const grupo = ejercicio.grupoMuscular || ejercicio.grupo || ejercicio.grupoMusculo || 'Otros';
    if (!grupos.has(grupo)) grupos.set(grupo, []);
    grupos.get(grupo).push(ejercicio.nombre || ejercicio.descripcion || ejercicio.ejercicio || '');
  });
  return `<datalist id="lista-ejercicios-rutina">${[...grupos].map(([grupo, nombres]) => nombres.filter(Boolean).map((nombre) => `<option value="${escapar(nombre)}" label="${escapar(grupo)}"></option>`).join('')).join('')}</datalist>`;
}

function leerEditor() {
  if (!editorRaiz) return;
  editorDias = editorDias.map((dia, indice) => ({
    dia: editorRaiz.querySelector(`[name="dia-${indice}"]`)?.value || dia.dia,
    filas: dia.filas.map((_, filaIndice) => ({
      ejercicio: editorRaiz.querySelector(`[name="ejercicio-${indice}-${filaIndice}"]`)?.value || '',
      series: editorRaiz.querySelector(`[name="series-${indice}-${filaIndice}"]`)?.value || '',
      repeticiones: editorRaiz.querySelector(`[name="repeticiones-${indice}-${filaIndice}"]`)?.value || '',
      descanso: editorRaiz.querySelector(`[name="descanso-${indice}-${filaIndice}"]`)?.value || '',
      nota: editorRaiz.querySelector(`[name="nota-${indice}-${filaIndice}"]`)?.value || ''
    }))
  }));
}

function pintarEditor(mensaje = '') {
  if (!editorRaiz) return;
  editorRaiz.innerHTML = `<div data-dias-rutina>${editorDias.map((dia, i) => `<section class="border rounded p-3 mb-3" aria-labelledby="editor-dia-${i}"><div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2"><h4 id="editor-dia-${i}" class="h6 m-0">${escapar(dia.dia)}</h4><input type="hidden" name="dia-${i}" value="${escapar(dia.dia)}"><div class="d-flex flex-wrap gap-1"><button type="button" class="btn btn-outline-secondary btn-sm" data-accion="subir-dia" data-dia="${i}">Subir día</button><button type="button" class="btn btn-outline-secondary btn-sm" data-accion="bajar-dia" data-dia="${i}">Bajar día</button><button type="button" class="btn btn-outline-danger btn-sm" data-accion="quitar-dia" data-dia="${i}">Quitar día</button></div></div>${dia.filas.map((fila, j) => `<div class="row g-2 mb-2" data-fila="${i}-${j}"><div class="col-12"><label class="form-label small" for="ejercicio-${i}-${j}">Ejercicio</label><input class="form-control form-control-sm" id="ejercicio-${i}-${j}" name="ejercicio-${i}-${j}" list="lista-ejercicios-rutina" value="${escapar(fila.ejercicio)}" placeholder="Busca o escribe un ejercicio"></div><div class="col-6 col-md-3"><label class="form-label small" for="series-${i}-${j}">Series</label><input class="form-control form-control-sm" id="series-${i}-${j}" name="series-${i}-${j}" value="${escapar(fila.series)}"></div><div class="col-6 col-md-3"><label class="form-label small" for="repeticiones-${i}-${j}">Repeticiones o tiempo</label><input class="form-control form-control-sm" id="repeticiones-${i}-${j}" name="repeticiones-${i}-${j}" value="${escapar(fila.repeticiones)}"></div><div class="col-6 col-md-3"><label class="form-label small" for="descanso-${i}-${j}">Descanso</label><input class="form-control form-control-sm" id="descanso-${i}-${j}" name="descanso-${i}-${j}" value="${escapar(fila.descanso)}"></div><div class="col-6 col-md-3"><label class="form-label small" for="nota-${i}-${j}">Nota</label><input class="form-control form-control-sm" id="nota-${i}-${j}" name="nota-${i}-${j}" value="${escapar(fila.nota)}"></div><div class="col-12 d-flex flex-wrap gap-1"><button type="button" class="btn btn-outline-secondary btn-sm" data-accion="subir-fila" data-dia="${i}" data-fila="${j}">Subir fila</button><button type="button" class="btn btn-outline-secondary btn-sm" data-accion="bajar-fila" data-dia="${i}" data-fila="${j}">Bajar fila</button><button type="button" class="btn btn-outline-danger btn-sm" data-accion="quitar-fila" data-dia="${i}" data-fila="${j}">Quitar fila</button></div></div>`).join('')}<button type="button" class="btn btn-outline-primary btn-sm" data-accion="agregar-fila" data-dia="${i}">Agregar fila a ${escapar(dia.dia)}</button></section>`).join('')}</div><button type="button" class="btn btn-primary" data-accion="agregar-dia">Agregar día</button>${datosLista()}`;
  if (estadoEditor) estadoEditor.textContent = mensaje;
}

async function cargarEjercicios() {
  if (ejercicios.length) return;
  try { ejercicios = extraer(await rutinasModel.ejercicios({ limit: 500 })); } catch { ejercicios = []; }
  pintarEditor(ejercicios.length ? 'Catálogo de ejercicios cargado.' : 'No hay catálogo de ejercicios; puedes escribir el nombre.');
}

async function cargarPlantilla(nivel) {
  if (editorModificado && !(await confirmarAccion({ titulo: 'Reemplazar ejercicios', mensaje: 'Ya editaste los ejercicios. ¿Reemplazarlos con la plantilla del nivel?', textoConfirmar: 'Reemplazar', tono: 'peligro' }))) return;
  leerEditor();
  let plantillas = [];
  try { plantillas = extraer(await rutinasModel.plantillas({ nivelId: nivel })); } catch { plantillas = []; }
  const plantilla = plantillas.find((p) => String(p.nivelId || p.nivel) === String(nivel)) || plantillas[0];
  editorDias = plantilla ? normalizarDias(plantilla.detalle || plantilla.dias || plantilla) : [];
  editorModificado = false;
  pintarEditor(plantilla ? 'Plantilla cargada.' : 'No hay plantilla para este nivel.');
}

function enlazarEditor() {
  editorRaiz.addEventListener('input', (evento) => { if (evento.target.name) editorModificado = true; });
  editorRaiz.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    leerEditor();
    const i = Number(boton.dataset.dia);
    const j = Number(boton.dataset.fila);
    let mensaje = '';
    switch (boton.dataset.accion) {
      case 'agregar-dia': editorDias.push({ dia: `Día ${editorDias.length + 1}`, filas: [filaVacia()] }); mensaje = 'Día agregado.'; break;
      case 'quitar-dia': if (editorDias.length > 1) { editorDias.splice(i, 1); mensaje = 'Día quitado.'; } else { editorDias = []; mensaje = 'Se quitó el último día.'; } break;
      case 'subir-dia': if (i > 0) { [editorDias[i - 1], editorDias[i]] = [editorDias[i], editorDias[i - 1]]; mensaje = 'Día movido arriba.'; } break;
      case 'bajar-dia': if (i < editorDias.length - 1) { [editorDias[i + 1], editorDias[i]] = [editorDias[i], editorDias[i + 1]]; mensaje = 'Día movido abajo.'; } break;
      case 'agregar-fila': editorDias[i]?.filas.push(filaVacia()); mensaje = 'Fila agregada.'; break;
      case 'quitar-fila': if (editorDias[i]?.filas.length > 1) editorDias[i].filas.splice(j, 1); else if (editorDias[i]) editorDias[i].filas = []; mensaje = 'Fila quitada.'; break;
      case 'subir-fila': if (editorDias[i] && j > 0) { [editorDias[i].filas[j - 1], editorDias[i].filas[j]] = [editorDias[i].filas[j], editorDias[i].filas[j - 1]]; mensaje = 'Fila movida arriba.'; } break;
      case 'bajar-fila': if (editorDias[i] && j < editorDias[i].filas.length - 1) { [editorDias[i].filas[j + 1], editorDias[i].filas[j]] = [editorDias[i].filas[j], editorDias[i].filas[j + 1]]; mensaje = 'Fila movida abajo.'; } break;
      default: return;
    }
    editorModificado = true;
    pintarEditor(mensaje);
  });
}

async function abrirEditor(rutina) {
  const inicio = hoyISO();
  const fechaFinMax = ficha?.fechaFin || '';
  const fin = menorFecha(sumarDias(inicio, 28), fechaFinMax) || sumarDias(inicio, 28);
  editorDias = rutina ? normalizarDias(rutina.detalle) : normalizarDias(plantillaInicial());
  editorModificado = false;
  ejercicios = [];
  editorRaiz = null;
  estadoEditor = null;
  const respuesta = await abrirDialogo({
    titulo: rutina ? 'Editar rutina' : 'Asignar rutina',
    mensaje: `Cliente: ${ficha?.nombre || ficha?.cedula || ''}`,
    campos: [
      { nombre: 'nivelId', etiqueta: 'Nivel', tipo: 'select', requerido: true, opciones: NIVELES, valor: rutina?.nivelId || ficha?.nivelId || 'PRI' },
      { nombre: 'objetivo', etiqueta: 'Objetivo', tipo: 'select', requerido: true, opciones: OBJETIVOS, valor: rutina?.objetivo || 'Salud general' },
      { nombre: 'fechaInicio', etiqueta: 'Desde', tipo: 'date', requerido: true, valor: String(rutina?.fechaInicio || '').slice(0, 10) || inicio },
      { nombre: 'fechaFin', etiqueta: 'Hasta', tipo: 'date', requerido: true, valor: String(rutina?.fechaFin || '').slice(0, 10) || fin, ayuda: fechaFinMax ? `No puede pasar del ${fechaTexto(fechaFinMax)}.` : '' },
      { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', maxlength: 200, valor: rutina?.observaciones || '' }
    ],
    contenido: '<input type="hidden" name="detalle"><div class="pf-editor-rutina" data-editor-rutina></div><p class="small mt-2 mb-0" data-estado-editor role="status" aria-live="polite"></p>',
    textoConfirmar: rutina ? 'Guardar cambios' : 'Asignar rutina',
    alPreparar: (formulario) => {
      editorRaiz = formulario.querySelector('[data-editor-rutina]');
      estadoEditor = formulario.querySelector('[data-estado-editor]');
      formulario.elements.namedItem('fechaFin').max = fechaFinMax;
      enlazarEditor();
      pintarEditor('Escribe los ejercicios por día o elige un nivel para cargar su plantilla.');
      cargarEjercicios();
      if (!rutina) cargarPlantilla(ficha?.nivelId || 'PRI');
      formulario.elements.namedItem('nivelId').addEventListener('change', (evento) => cargarPlantilla(evento.target.value));
    },
    validarExtra: (_, v) => {
      leerEditor();
      if (!v.fechaInicio || !v.fechaFin || v.fechaInicio > v.fechaFin) return 'La fecha inicial debe ser anterior a la final.';
      if (fechaFinMax && v.fechaFin > fechaFinMax) return `La fecha de fin no puede pasar del ${fechaTexto(fechaFinMax)}.`;
      if (!editorDias.length) return 'Agrega al menos un día con ejercicios.';
      const dia = editorDias.find((d) => !d.filas.some((f) => f.ejercicio.trim()));
      return dia ? `${dia.dia} necesita al menos un ejercicio.` : null;
    },
    alConfirmar: async (v, formulario) => {
      leerEditor();
      const detalle = diasParaDetalle(editorDias);
      formulario.elements.namedItem('detalle').value = JSON.stringify(detalle);
      const cuerpo = { clienteId: ficha?.cedula, nivelId: v.nivelId, objetivo: v.objetivo, detalle, observaciones: v.observaciones.trim(), fechaInicio: v.fechaInicio, fechaFin: v.fechaFin };
      return rutina ? rutinasModel.editar(rutina.id, cuerpo) : rutinasModel.crear(cuerpo);
    }
  });
  if (!respuesta?.resultado) return;
  mostrarMensaje(mensajero(), rutina ? 'Rutina actualizada.' : 'Rutina asignada.', 'exito');
  await Promise.all([mis?.recargar(), consultarCliente()]);
}

function plantillaInicial() {
  return { dias: [{ dia: 'Lunes', filas: [filaVacia()] }] };
}

async function verRutina(rutina) {
  const detalle = await rutinasModel.detalle(rutina.id).then((x) => x?.data ?? x).catch(() => rutina);
  const vista = rutinaHtml(detalle);
  const correo = ficha?.correo || detalle?.cliente?.correo || detalle?.correo || '';
  await abrirDialogo({
    titulo: `Rutina de ${ficha?.nombre || detalle?.cliente?.nombre || rutina.clienteId}`,
    contenido: `${vista}<div class="d-flex flex-wrap gap-2 mt-3"><button type="button" class="btn btn-outline-primary" data-imprimir-rutina>Imprimir / Guardar PDF</button><button type="button" class="btn btn-outline-secondary" data-enviar-rutina${correo ? '' : ' disabled'}>Enviar por correo</button></div><p class="small mt-2 mb-0" data-correo-rutina role="status" aria-live="polite"></p>`,
    textoConfirmar: 'Cerrar',
    textoCancelar: 'Cerrar',
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
  columnas: [['Cliente', (r) => txt(r.cliente?.nombre || r.cliente || r.clienteId)], ['Nivel', (r) => txt(NIVELES.find((n) => n.valor === r.nivelId)?.texto || r.nivelId || r.nivel)], ['Desde', (r) => fecha(r.fechaInicio)], ['Hasta', (r) => fecha(r.fechaFin)], ['Estado', (r) => txt(estadoRutina(r))], ['Entrenador', (r) => txt(r.empleado?.nombre || r.empleado || r.empleadoId)]],
  acciones: (r) => [
    { texto: 'Ver', permiso: 'rutinas', etiqueta: `Ver la rutina de ${r.clienteId}`, ejecutar: () => verRutina(r) },
    ...(puedeEditarRutina(r) ? [{ texto: 'Editar', permiso: 'rutinas', etiqueta: `Editar la rutina de ${r.clienteId}`, ejecutar: () => abrirEditor(r) }] : [])
  ]
});

document.querySelector('#form-rutina-cliente')?.addEventListener('submit', (evento) => { evento.preventDefault(); consultarCliente(); });
document.querySelector('[data-asignar-rutina]')?.addEventListener('click', () => abrirEditor(null));
document.querySelector('[data-editar-rutina]')?.addEventListener('click', () => abrirEditor(ficha?.rutina));
document.querySelector('[data-ver-rutina]')?.addEventListener('click', () => ficha?.rutina && verRutina(ficha.rutina));
document.querySelector('#rutina-cedula')?.focus();
