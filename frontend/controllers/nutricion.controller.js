import { obtenerAliados, enviarContacto } from '../models/catalogo.model.js';
import { construirValidador, mostrarMensaje, mostrarErroresServidor } from './validacion.controller.js';
import { escapar } from '../views/componentes.view.js';

const select = s => document.querySelector(s);

export async function iniciarNutricion(){
  await cargarAliados();
  const form = select('#formulario-nutricion'); if(!form) return;
  const region = select('#mensaje-nutricion');
  construirValidador(form, { alEnviar: async ()=>{
    try {
      const datos = Object.fromEntries(new FormData(form));
      const mensaje = `[Nutrición] Motivo: ${datos.motivo || ''}\n${datos.comentarios || ''}`.slice(0,400);
      await enviarContacto({ nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono || undefined, mensaje });
      form.reset(); mostrarMensaje(region, 'Solicitud enviada. Te contactaremos pronto.', 'exito');
    } catch (e){ if(e.status===400){ mostrarErroresServidor(form, e); mostrarMensaje(region, e.mensaje||'Revisa los campos.', 'error'); return false; } mostrarMensaje(region, e.mensaje||'No se pudo enviar la solicitud.', 'error'); return false; }
  }});
}

async function cargarAliados(){
  const cont = select('[data-aliados-nutricion]'); if(!cont) return;
  try {
    const aliados = await obtenerAliados();
    const lista = (Array.isArray(aliados)?aliados:aliados?.data||[]).filter(a => /nutri/i.test(a.servicio?.nombre || a.servicio || a.servicioNombre || 'Nutrición'));
    if (!lista.length){ cont.innerHTML = '<p class="pf-mensaje">Pronto publicaremos la información de nuestro nutricionista.</p>'; return; }
    cont.innerHTML = lista.map(a=>`
      <article class="pf-tarjeta p-4"><h3 class="font-bold text-pf-amarillo">${escapar(a.nombre || a.nombreCompleto || 'Nutricionista')}</h3>
      <p class="text-sm text-neutral-300">${escapar(a.consultorio || '')}</p>
      <p class="text-sm"><a class="underline" href="tel:${escapar(a.telefono||'')}">${escapar(a.telefono||'')}</a></p>
      ${a.correo ? `<p class="text-sm"><a class="underline" href="mailto:${escapar(a.correo)}">${escapar(a.correo)}</a></p>` : ''}
      </article>`).join('');
  } catch(e){ cont.innerHTML = `<p class="pf-mensaje">No se pudo cargar la información.</p>`; }
}
