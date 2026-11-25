import { iniciarComunes } from './comunes.controller.js';
import { iniciarPanelCarrito } from './carrito.controller.js';
import { iniciarInicio } from './inicio.controller.js';
import { iniciarAuth } from './auth.controller.js';
import { iniciarCheckout } from './checkout.controller.js';
import { iniciarNutricion } from './nutricion.controller.js';
import { iniciarMisPedidos, iniciarMiCuenta } from './pedidos.controller.js';
import { mostrarAviso } from '../views/componentes.view.js';
import { raizSitio } from '../models/storage.model.js';

// La restauración nativa ocurre antes de que terminen de pintarse las tarjetas.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) document.documentElement.classList.add('pf-posicion-pendiente');

window.addEventListener('pf:sesion-expirada', () => {
  mostrarAviso('Tu sesión terminó. Inicia sesión de nuevo; tu carrito se conserva.', 'error');
  const pagina = document.body.dataset.pagina;
  if (pagina === 'checkout' || pagina === 'mis-pedidos' || pagina === 'mi-cuenta') {
    window.setTimeout(() => {
      const origen = pagina === 'checkout' ? 'carrito' : pagina;
      location.href = new URL(`cliente/login.html?origen=${origen}`, raizSitio()).href;
    }, 800);
  }
});

async function main(){
  try {
    iniciarComunes();
    iniciarPanelCarrito();
    const pagina = document.body.dataset.pagina;
    switch (pagina) {
      case 'inicio': await iniciarInicio(); break;
      case 'login': await iniciarAuth(); break;
      case 'checkout': await iniciarCheckout(); break;
      case 'nutricion': await iniciarNutricion(); break;
      case 'mis-pedidos': await iniciarMisPedidos(); break;
      case 'mi-cuenta': await iniciarMiCuenta(); break;
      default: break;
    }
    // Solo el inicio espera al catálogo para alinear el hash; en las demás páginas se muestra de inmediato.
    if (pagina !== 'inicio') mostrarDestinoDelHash();
  } catch (e){
    console.error(e);
    mostrarAviso('No se pudo iniciar la página.', 'error');
  }
}

function mostrarDestinoDelHash() {
  document.documentElement.classList.remove('pf-posicion-pendiente');
  const destino = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!destino) return;
  const alto = document.querySelector('.pf-encabezado')?.offsetHeight || 0;
  window.scrollTo({ top: Math.max(window.scrollY + destino.getBoundingClientRect().top - alto, 0), left: 0, behavior: 'instant' });
  destino.querySelector('input:not([type="hidden"]), select, textarea')?.focus({ preventScroll: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main); else main();
