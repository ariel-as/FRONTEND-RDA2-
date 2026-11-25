import { escapar, rutaArchivo } from './componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

// Códigos del backend: P, R, C, E, X.
const ESTADOS_PEDIDO = { P:'Pendiente de pago', R:'Pago reportado: estamos verificándolo', C:'Pagado: listo para retirar en el gimnasio', E:'Entregado', X:'Cancelado' };
const METODOS = { EF: 'Efectivo al retirar', TR: 'Transferencia' };

export function tarjetaPedido(pedido, { orden, total } = {}) {
  const estadoTexto = ESTADOS_PEDIDO[pedido.estado] || pedido.estadoNombre || pedido.estado || '';
  const puedeCancelar = pedido.estado === 'P';
  const lineas = (pedido.detalles || []).map(d=>`<li class="flex justify-between text-sm"><span>${escapar(d.nombre || d.productoId)} x ${d.cantidad}</span><span>${formatearPrecio(d.subtotal ?? 0)}</span></li>`).join('');
  return `
  <article class="pf-tarjeta p-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div><h3 class="m-0 text-lg font-bold text-white">Tu pedido N.º ${escapar(orden ?? '—')}</h3><p class="m-0 text-sm text-neutral-400">${new Date(pedido.createdAt || pedido.fecha || Date.now()).toLocaleString('es-EC')}</p></div>
      <p class="m-0 text-sm"><span class="text-neutral-400">Estado:</span> <span class="pf-etiqueta">${escapar(estadoTexto)}</span></p>
    </div>
    <p class="mt-2 text-sm text-neutral-300">Pago: ${escapar(METODOS[pedido.metodoPago] || pedido.metodoPago || '')} ${pedido.refTransferencia ? `(comprobante ${escapar(pedido.refTransferencia)})` : ''}</p>
    <ul class="mt-3 list-none p-0 space-y-1">${lineas}</ul>
    <p class="mt-3 font-bold pf-precio">Total: ${formatearPrecio(pedido.total)}</p>
    ${puedeCancelar ? `<button type="button" class="pf-boton pf-boton-secundario mt-2" data-cancelar-pedido="${escapar(pedido.id)}" data-orden-cliente="${escapar(orden ?? '')}" aria-label="Cancelar tu pedido N.º ${escapar(orden ?? '—')}">Cancelar pedido</button>` : ''}
  </article>`;
}

const ESTADOS_INSCRIPCION = { P: 'Pendiente de pago (paga en recepción)', A: 'Activa', V: 'Vencida', S: 'Suspendida', X: 'Anulada' };
function fechaCorta(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? String(valor) : fecha.toLocaleDateString('es-EC', { timeZone: 'UTC' });
}

export function tarjetaInscripcion(ins) {
  const plan = ins.plan || ins.membresia?.nombre || ins.membresiaId || 'Plan';
  const estado = ESTADOS_INSCRIPCION[ins.estado] || ins.estadoNombre || ins.estado || '';
  // mis-inscripciones trae fecha de fin y total de ingresos; los restantes solo los ve el personal.
  const restantes = ins.ingresosRestantes ?? ins.ingresosDisponibles;
  const ingresos = restantes !== undefined && restantes !== null
    ? `<p class="text-sm text-neutral-300">Ingresos que te quedan: <strong>${escapar(restantes)}</strong></p>`
    : (ins.ingresosTotal ? `<p class="text-sm text-neutral-300">Total de ingresos del plan: ${escapar(ins.ingresosTotal)}</p>` : '');
  return `<article class="pf-tarjeta p-5"><h3 class="m-0 text-lg font-bold text-white">${escapar(plan)}</h3><p class="text-sm text-neutral-300">Inicio: ${escapar(fechaCorta(ins.fechaInicio))} · Fin: ${escapar(fechaCorta(ins.fechaFin))}</p>${ingresos}<p class="text-sm">Estado: <span class="font-semibold">${escapar(estado)}</span></p><p class="font-bold pf-precio">Valor: ${formatearPrecio(ins.totalCobrar ?? ins.valor ?? 0)}</p></article>`;
}

export function paginacion({ page, totalPages }, baseAttr) {
  // Con una sola página no se muestran Anterior ni Siguiente.
  if ((Number(totalPages) || 1) <= 1) return '';
  return `<nav aria-label="Paginación" class="mt-4 flex items-center justify-center gap-3" ${baseAttr||''}>
    <button type="button" class="pf-boton pf-boton-secundario" data-page="${page-1}" ${page<=1?'disabled':''}>Anterior</button>
    <span aria-live="polite">Página ${page} de ${totalPages || 1}</span>
    <button type="button" class="pf-boton pf-boton-secundario" data-page="${page+1}" ${page>=totalPages?'disabled':''}>Siguiente</button>
  </nav>`;
}

const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const SIN_TILDES = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function nombreDia(valor) {
  const clave = SIN_TILDES(valor);
  const nombres = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
  return nombres[clave] || String(valor || 'Día').trim();
}

function diasDeRutina(rutina) {
  const entregados = [].concat(rutina?.dias || rutina?.rutinaDias || rutina?.detallesPorDia || []);
  if (entregados.length) {
    return entregados.map((dia) => ({
      dia: nombreDia(dia.dia || dia.nombre || dia.diaSemana || dia.fecha),
      detalle: String(dia.detalle || dia.descripcion || dia.ejercicios || '').trim()
    })).filter((dia) => dia.detalle);
  }
  const grupos = [];
  String(rutina?.detalle || '').split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean).forEach((linea) => {
    const coincide = linea.match(/^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s*:\s*(.*)$/i);
    if (coincide) {
      grupos.push({ dia: nombreDia(coincide[1]), lineas: [coincide[2].trim()].filter(Boolean) });
      return;
    }
    const grupo = grupos[grupos.length - 1] || { dia: 'Día', lineas: [] };
    if (!grupos.length) grupos.push(grupo);
    grupo.lineas.push(linea.replace(/^[-•]\s*/, ''));
  });
  return grupos.map((grupo) => ({ dia: grupo.dia, detalle: grupo.lineas.join('\n') })).filter((grupo) => grupo.detalle);
}

export function tarjetaRutina(r, error = '') {
  if (!r) return `<p class="pf-mensaje">${escapar(error || 'Todavía no tienes una rutina vigente. Pídela a tu entrenador si tu plan la incluye.')}</p>`;
  const porDia = diasDeRutina(r).sort((a, b) => ORDEN_DIAS.indexOf(SIN_TILDES(a.dia)) - ORDEN_DIAS.indexOf(SIN_TILDES(b.dia)));
  const semana = porDia.length
    ? `<h4 class="mt-4 text-sm font-bold uppercase tracking-wide text-pf-amarillo">Mi semana</h4><div class="mt-2 grid gap-3 sm:grid-cols-2" data-mi-semana>${porDia.map((dia, indice) => {
      const id = `rutina-dia-${SIN_TILDES(dia.dia).replace(/[^a-z]/g, '')}-${indice}`;
      return `<section class="rounded-lg border border-pf-linea p-3" aria-labelledby="${id}"><h5 id="${id}" class="m-0 font-bold text-white">${escapar(dia.dia)}</h5><p class="mt-1 whitespace-pre-line text-sm text-neutral-300">${escapar(dia.detalle)}</p></section>`;
    }).join('')}</div>`
    : `<p class="mt-2 whitespace-pre-line text-sm">${escapar(r.detalle || '')}</p>`;
  return `<article class="pf-tarjeta p-5"><h3 class="m-0 text-lg font-bold text-white">${escapar(r.objetivo || 'Rutina')}</h3>
    <p class="text-sm text-neutral-300">Nivel: ${escapar(r.nivel || r.nivelId || '-')} · Del ${escapar(fechaCorta(r.fechaInicio))} al ${escapar(fechaCorta(r.fechaFin))}${r.entrenador || r.empleado ? ` · Entrenador: ${escapar(r.entrenador?.nombre || r.entrenador || r.empleado?.nombre || r.empleado)}` : ''}</p>
    ${semana}</article>`;
}

export function tarjetasNotificaciones(lista) {
  if (!lista.length) return '<p class="pf-mensaje">No tienes notificaciones.</p>';
  return lista.map((n) => `<article class="pf-tarjeta p-4"><p class="m-0 text-sm"><strong>${escapar(n.leida ? 'Leída' : 'Nueva')}: ${escapar(n.titulo)}</strong></p><p class="m-0 text-sm text-neutral-300">${escapar(n.mensaje)}</p>${n.fecha ? `<p class="m-0 text-xs text-neutral-400">${escapar(new Date(n.fecha).toLocaleString('es-EC'))}</p>` : ''}${n.leida ? '' : `<button type="button" class="pf-boton pf-boton-secundario mt-2" data-leer-notificacion="${escapar(n.id)}">Marcar leída</button>`}</article>`).join('');
}
