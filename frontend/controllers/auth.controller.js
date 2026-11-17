import { iniciarSesion, registrarCliente, haySesion, tienePendencia } from '../models/sesion.model.js';
import { construirValidador, validarCedula, validarTelefono, validarNombre, validarContrasena, validarCoincidencia, mostrarMensaje, mostrarErroresServidor } from './validacion.controller.js';
import { raizSitio } from '../models/storage.model.js';
import { obtenerNiveles } from '../models/catalogo.model.js';
import { escapar } from '../views/componentes.view.js';

function select(s){ return document.querySelector(s); }

function destinoPostLogin() {
  const params = new URLSearchParams(location.search);
  const origen = params.get('origen');
  if (tienePendencia('checkout') || origen === 'carrito' || origen === 'checkout') return new URL('cliente/checkout.html', raizSitio()).href;
  if (origen === 'mis-pedidos') return new URL('cliente/mis-pedidos.html', raizSitio()).href;
  return new URL('index.html', raizSitio()).href;
}

export async function iniciarAuth(){
  await poblarNiveles();
  const fLogin = select('#formulario-login');
  const fReg = select('#formulario-registro');
  if (haySesion()) {
    // permitir seguir, no redirigir agresivo salvo caso claro
  }
  if (fLogin){
    const region = select('#mensaje-login');
    construirValidador(fLogin, { alEnviar: async ()=>{
      try {
        const correo = fLogin.querySelector('#correo').value;
        const contrasena = fLogin.querySelector('#contrasena').value;
        const resultado = await iniciarSesion(correo, contrasena, 'cliente');
        if (!resultado.ok){ mostrarMensaje(region, resultado.mensaje || 'No se pudo iniciar sesión.', 'error'); return false; }
        mostrarMensaje(region, resultado.mensaje, 'exito');
        window.setTimeout(()=>{ window.location.href = destinoPostLogin(); }, 500);
      } catch(e){ mostrarMensaje(region, e?.mensaje || 'No se pudo iniciar sesión.', 'error'); return false; }
    }});
  }
  if (fReg){
    const region = select('#mensaje-registro');
    construirValidador(fReg, {
      reglas: {
        'cedula-registro': validarCedula,
        'telefono-registro': validarTelefono,
        'nombre-registro': validarNombre,
        'apellido-registro': validarNombre,
        'contrasena-registro': validarContrasena,
        'confirmar': (campo)=> validarCoincidencia(campo, fReg.querySelector('#contrasena-registro'))
      },
      alEnviar: async ()=>{
        try {
          const datos = Object.fromEntries(new FormData(fReg));
          if (datos.contrasena !== datos.confirmar){ mostrarMensaje(region, 'Las contraseñas no coinciden.', 'error'); return false; }
          const resultado = await registrarCliente({
            cedula: datos.cedula, nombre: datos.nombre, apellido: datos.apellido,
            correo: datos.correo, telefono: datos.telefono, nivelId: datos.nivelId, contrasena: datos.contrasena
          });
          if (!resultado.ok){
            if (resultado.error?.status === 400) mostrarErroresServidor(fReg, resultado.error, { cedula:'cedula-registro', nombre:'nombre-registro', apellido:'apellido-registro', correo:'correo-registro', telefono:'telefono-registro', contrasena:'contrasena-registro' });
            mostrarMensaje(region, resultado.mensaje || 'No se pudo crear la cuenta.', 'error');
            return false;
          }
          mostrarMensaje(region, 'Cuenta creada. Redirigiendo...', 'exito');
          window.setTimeout(()=>{ window.location.href = destinoPostLogin(); }, 500);
        } catch(e){ mostrarMensaje(region, e?.mensaje || 'No se pudo crear la cuenta.', 'error'); return false; }
      }
    });
  }
}

async function poblarNiveles(){
  const selectNivel = select('#nivel'); if(!selectNivel) return;
  try {
    const niveles = await obtenerNiveles();
    if (Array.isArray(niveles) && niveles.length && typeof niveles[0] === 'object') {
      selectNivel.innerHTML = niveles.map((n)=>{
        const id = n.id || n.codigo || '';
        const descripcion = n.descripcion || n.nombre || id;
        return `<option value="${escapar(id)}">${escapar(descripcion)}</option>`;
      }).join('');
      selectNivel.name = 'nivelId';
    }
  } catch {}
}
