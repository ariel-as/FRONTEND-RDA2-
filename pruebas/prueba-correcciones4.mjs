import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg' };
const servidor = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const archivo = path.resolve(raiz, `.${decodeURIComponent(url.pathname)}`);
  if (!archivo.startsWith(raiz) || !existsSync(archivo)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(archivo).toLowerCase()] || 'application/octet-stream' });
  res.end(await readFile(archivo));
});
await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${servidor.address().port}`;
const browser = await chromium.launch({ headless: true });
let apiDisponible = true;
let comprobaciones = 0;
function comprobar(condicion, mensaje) { assert.ok(condicion, mensaje); comprobaciones += 1; console.log(`OK ${mensaje}`); }
function api(url) {
  const ruta = new URL(url).pathname;
  if (ruta.endsWith('/productos')) return { data:[{ id:'PF0001', nombre:'Producto de prueba', descripcion:'Proteína', categoria:'Suplementos', precio:10, precioConIva:10, stock:5, estado:'A', disponible:true }] };
  if (ruta.endsWith('/membresias')) return { data:[{ id:'MI1', nombre:'Plan de prueba', precio:35, precioConIva:35, personas:1, beneficios:['Pesas'] }] };
  if (ruta.endsWith('/niveles')) return [{ id:'PRI', descripcion:'Principiante' }];
  if (ruta.endsWith('/gimnasio')) return { servicios:[], horarios:[] };
  if (ruta.endsWith('/auth/me')) return { usuario:{ id:1, rol:'user', roles:['CLI'], nombre:'Cliente de prueba' } };
  if (ruta.endsWith('/pedidos/mis-pedidos')) return { data:[{id:'P001',total:10,estado:'P',estadoNombre:'Pendiente',metodoPago:'EF',createdAt:'2026-01-01'}],pagination:{page:1,totalPages:1} };
  return { data:[] };
}

try {
  const contexto = await browser.newContext({ viewport:{ width:1440, height:900 }, colorScheme:'light', reducedMotion:'reduce' });
  const interceptarApi = async (route) => {
    if (!apiDisponible) return route.fulfill({ status:503, contentType:'application/json', body:JSON.stringify({ mensaje:'API temporalmente no disponible' }) });
    await new Promise((resolve) => setTimeout(resolve, 350));
    return route.fulfill({ status:200, contentType:'application/json', headers:{ 'access-control-allow-origin':'*', 'access-control-allow-headers':'*' }, body:JSON.stringify(api(route.request().url())) });
  };
  await contexto.route('http://localhost:5050/**', interceptarApi);
  const pagina = await contexto.newPage();
  const erroresPagina = [];
  pagina.on('pageerror', (error) => erroresPagina.push(error.message));

  await pagina.goto(`${base}/index.html#tienda`, { waitUntil:'domcontentloaded' });
  await pagina.waitForSelector('[data-catalogo] [data-accion="agregar"]');
  await pagina.waitForFunction(() => !document.documentElement.classList.contains('pf-posicion-pendiente'));
  if(await pagina.locator('[data-aceptar-cookies]').isVisible()) await pagina.locator('[data-aceptar-cookies]').click();
  const alineacion = await pagina.evaluate(() => ({ top:document.querySelector('#tienda').getBoundingClientRect().top, header:document.querySelector('.pf-encabezado').getBoundingClientRect().height, y:scrollY }));
  comprobar(Math.abs(alineacion.top - alineacion.header) <= 2 && alineacion.y > 0, 'hash: la tienda queda alineada bajo el encabezado tras respuesta lenta y caché vacía');
  comprobar(await pagina.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'), 'movimiento reducido: el desplazamiento no usa animación suave');

  const secciones = ['inicio','planes','tienda','clases','rutinas','nutricion','contacto'];
  for (const ancho of [1440, 375]) {
    await pagina.setViewportSize({ width:ancho, height:900 });
    for (const origen of secciones) for (const destino of secciones) {
      await pagina.evaluate((id) => { window.scrollTo(0, document.getElementById(id).offsetTop); }, origen);
      if (ancho < 1024) {
        const botonMenu = pagina.locator('[data-menu-boton]');
        if (await botonMenu.getAttribute('aria-expanded') !== 'true') await botonMenu.click();
      }
      await pagina.locator(`#menu-principal a[href="#${destino}"]`).click();
      await pagina.waitForFunction((id) => Math.abs(document.getElementById(id).getBoundingClientRect().top - document.querySelector('.pf-encabezado').getBoundingClientRect().height) <= 2, destino);
    }
  }
  comprobar(true, 'menú: los 49 pares de secciones aterrizan bajo el encabezado en escritorio y móvil');
  for (const ancho of [320,375,768,1024,1440]) {
    await pagina.setViewportSize({ width:ancho, height:900 });
    comprobar(await pagina.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `reflujo sin desbordamiento a ${ancho}px`);
  }
  await pagina.evaluate(() => { document.body.style.zoom='200%'; });
  comprobar(await pagina.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'reflujo sin desbordamiento al 200%');
  await pagina.evaluate(() => { document.body.style.zoom=''; });

  const contraste = async (selector) => pagina.locator(selector).first().evaluate((elemento) => {
    const color = getComputedStyle(elemento).color.match(/[\d.]+/g).slice(0,3).map(Number);
    const fondo = getComputedStyle(elemento.closest('.pf-tarjeta') || elemento.parentElement).backgroundColor.match(/[\d.]+/g).slice(0,3).map(Number);
    const lum = ([r,g,b]) => [r,g,b].map((v)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const a=lum(color),b=lum(fondo); const reglas=[]; const buscar=(lista)=>{for(const r of lista){if(r.selectorText&&r.style?.color){try{if(elemento.matches(r.selectorText))reglas.push([r.selectorText,r.style.color]);}catch{}}if(r.cssRules)buscar(r.cssRules);}};for(const h of document.styleSheets){try{buscar(h.cssRules);}catch{}}return { ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05), color:color.map(Math.round), tema:document.documentElement.dataset.tema, propio:getComputedStyle(elemento).getPropertyValue('--pf-precio-texto').trim(), regla:getComputedStyle(elemento).color, clases:elemento.className, reglas };
  });
  await pagina.waitForFunction(() => ['claro','oscuro'].includes(document.documentElement.dataset.tema));
  if (await pagina.evaluate(() => document.documentElement.dataset.tema !== 'claro')) {
    await pagina.locator('[data-boton-tema]').first().click();
    await pagina.waitForFunction(() => document.documentElement.dataset.tema === 'claro');
  }
  await pagina.waitForTimeout(250);
  await pagina.setViewportSize({width:1440,height:1000});
  const estiloAntesPrecios=await pagina.addStyleTag({content:'html[data-tema="claro"] .pf-precio, html[data-bs-theme="light"] .pf-precio, html[data-tema="claro"] .pf-total-final dd, html[data-bs-theme="light"] .pf-total-final dd { color:#664d00 !important; border-bottom:0 !important; } html[data-tema="claro"] .pf-tarjeta h4.text-pf-amarillo { color:#664d00 !important; background:transparent !important; }'});
  await pagina.locator('#planes').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  await pagina.screenshot({path:'evidencias-correcciones4/precios-planes-antes.png'});
  await pagina.locator('#tienda').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  await pagina.screenshot({path:'evidencias-correcciones4/precios-tienda-antes.png'});
  await estiloAntesPrecios.evaluate((n)=>n.remove());
  await pagina.waitForTimeout(250);
  const preciosClaros = await contraste('[data-planes] .pf-precio');
  comprobar(preciosClaros.ratio >= 4.5 && preciosClaros.color[0] < 40 && preciosClaros.color[1] < 40 && preciosClaros.color[2] < 40, 'precios claros: contraste AA y texto casi negro, sin amarillo ni mostaza');
  const tiendaClara=await contraste('[data-catalogo] .pf-precio');
  comprobar(tiendaClara.ratio>=4.5&&tiendaClara.color[0]<40&&tiendaClara.color[1]<40&&tiendaClara.color[2]<40,'precios de tienda claros: contraste AA y texto casi negro');
  await pagina.locator('#planes').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  await pagina.screenshot({path:'evidencias-correcciones4/precios-planes-despues.png'});
  await pagina.locator('#tienda').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  await pagina.screenshot({path:'evidencias-correcciones4/precios-tienda-despues.png'});
  await pagina.locator('[data-boton-tema]').first().click();
  await pagina.waitForFunction(() => document.documentElement.dataset.tema === 'oscuro');
  await pagina.waitForTimeout(250);
  const logoOscuro=await pagina.locator('header img[alt="Planeta Fitness"]').first().getAttribute('src');
  const preciosOscuros = await contraste('[data-planes] .pf-precio');
  comprobar(preciosOscuros.ratio >= 4.5 && preciosOscuros.color[0] === 255 && preciosOscuros.color[1] === 208 && preciosOscuros.color[2] === 0, `precios oscuros: amarillo de marca y contraste AA (${JSON.stringify(preciosOscuros)})`);
  const tiendaOscura=await contraste('[data-catalogo] .pf-precio');
  comprobar(tiendaOscura.ratio>=4.5&&tiendaOscura.color[0]===255&&tiendaOscura.color[1]===208&&tiendaOscura.color[2]===0,'precios de tienda oscuros: amarillo de marca y contraste AA');
  const logoClaro=await pagina.locator('header img[alt="Planeta Fitness"]').first().getAttribute('src');
  comprobar(logoClaro===logoOscuro,'el encabezado conserva el mismo logo en ambos temas');

  const paginas = ['index.html','cliente/login.html','cliente/checkout.html','cliente/mis-pedidos.html','cliente/nutricion.html', ...readdirSync(path.join(raiz,'admin')).filter((n)=>n.endsWith('.html')).map((n)=>`admin/${n}`)];
  for (const archivo of paginas) {
    const html = readFileSync(path.join(raiz,archivo),'utf8');
    comprobar(html.includes('logo-planeta.png') && /alt="Planeta Fitness"/.test(html), `${archivo}: logo vigente con texto alternativo`);
  }
  for (const archivo of ['cliente/login.html','cliente/checkout.html','cliente/mis-pedidos.html','cliente/nutricion.html']) {
    const html=readFileSync(path.join(raiz,archivo),'utf8');
    comprobar(html.includes('href="../admin/login.html"'), `${archivo}: enlace administrativo con ruta correcta`);
  }
  await pagina.goto(`${base}/cliente/login.html`);
  await pagina.setViewportSize({width:1440,height:900});
  await pagina.locator('[data-boton-tema]').first().click();
  await pagina.waitForFunction(() => document.documentElement.dataset.tema === 'claro');
  await pagina.setViewportSize({width:320,height:800});
  await pagina.waitForTimeout(100);
  const enlaceTactil=pagina.locator('footer a[href="../admin/login.html"]').first();
  await enlaceTactil.evaluate((e)=>e.focus({focusVisible:true}));
  const cajaTactil=await enlaceTactil.boundingBox();
  comprobar(cajaTactil.width>=24&&cajaTactil.height>=24,'teclado/móvil: enlace de pie de página cumple 24×24 px a 320 px');
  comprobar(await enlaceTactil.evaluate((e)=>getComputedStyle(e).outlineWidth)==='3px','foco visible: conserva un anillo de 3 px');
  const colorFoco=await enlaceTactil.evaluate((e)=>getComputedStyle(e).outlineColor);
  const rgbFoco=colorFoco.match(/\d+/g)?.map(Number) ?? [];
  comprobar(rgbFoco.length===3&&rgbFoco.every((canal)=>canal<40),`foco visible: usa un contorno casi negro en tema claro (${colorFoco})`);
  await pagina.screenshot({path:'evidencias-correcciones4/foco-visible-despues.png'});
  await pagina.screenshot({path:'evidencias-correcciones4/objetivos-tactiles-despues.png'});
  const objetivosSecundarios=await pagina.evaluate(()=>{const fixture=document.createElement('div');fixture.innerHTML='<nav class="breadcrumb"><a href="#">Ruta</a></nav><ul class="pagination"><li><a class="page-link" href="#">1</a></li></ul>';document.body.append(fixture);const medidas=[...fixture.querySelectorAll('a')].map((e)=>{const caja=e.getBoundingClientRect();return {w:caja.width,h:caja.height};});fixture.remove();return medidas;});
  comprobar(objetivosSecundarios.length>0&&objetivosSecundarios.every(({w,h})=>w>=24&&h>=24),`migas/paginación: objetivos secundarios de al menos 24×24 px a 320 px (${JSON.stringify(objetivosSecundarios)})`);
  await pagina.locator('footer a[href="../index.html#tienda"]').click();
  await pagina.waitForFunction(() => location.hash === '#tienda' && Math.abs(document.querySelector('#tienda').getBoundingClientRect().top-document.querySelector('.pf-encabezado').getBoundingClientRect().height)<=2);
  comprobar(true,'Inscripción → Tienda: el enlace entre páginas termina en la sección correcta');
  await pagina.addInitScript(() => localStorage.setItem('carrito', JSON.stringify([{ id:'PF0001', nombre:'Producto', precio:10, cantidad:1, stock:5, tipo:'producto' }])));
  await pagina.goto(`${base}/index.html`);
  await pagina.locator('[data-abrir-carrito]').click();
  await pagina.locator('[data-panel-finalizar]').click();
  comprobar(await pagina.locator('[data-modal-acceso] a[href*="admin/login.html"]').count() === 1, 'modal de acceso: incluye enlace al panel administrativo');
  comprobar(await pagina.locator('[data-modal-acceso] h2#titulo-modal-acceso').count()===1,'modal de acceso: título con jerarquía h2');
  await pagina.keyboard.press('Escape');
  await pagina.waitForFunction(()=>document.activeElement?.matches('[data-panel-finalizar]'));
  await pagina.keyboard.press('Escape');
  await pagina.waitForFunction(()=>document.activeElement?.matches('[data-abrir-carrito]'));
  await pagina.screenshot({path:'evidencias-correcciones4/foco-modal-anidado-despues.png'});
  comprobar(true,'Escape en diálogos anidados devuelve el foco al control de origen');

  await pagina.addInitScript(()=>{
    const payload=btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    sessionStorage.setItem('pf_token',JSON.stringify(`e30.${payload}.sig`));
    sessionStorage.setItem('usuario',JSON.stringify({id:1,rol:'user',roles:['CLI'],nombre:'Cliente de prueba'}));
  });
  await pagina.goto(`${base}/cliente/checkout.html`,{waitUntil:'domcontentloaded'});
  await pagina.waitForFunction(()=>document.querySelector('[data-checkout-total]')?.textContent==='$10.00');
  await pagina.evaluate(()=>{document.documentElement.dataset.tema='claro';document.documentElement.dataset.bsTheme='light';document.documentElement.classList.add('pf-modo-claro');});
  await pagina.waitForTimeout(100);
  const estiloAntesCheckout=await pagina.addStyleTag({content:'html[data-tema="claro"] .pf-precio, html[data-bs-theme="light"] .pf-precio { color:#664d00 !important; border-bottom:0 !important; }'});
  await pagina.screenshot({path:'evidencias-correcciones4/precios-checkout-antes.png'});
  await estiloAntesCheckout.evaluate((n)=>n.remove());
  await pagina.waitForTimeout(100);
  const colorCheckoutClaro=await pagina.locator('[data-checkout-total]').evaluate((e)=>getComputedStyle(e).color);
  comprobar(colorCheckoutClaro==='rgb(26, 26, 26)','checkout: precio oscuro en tema claro');
  await pagina.screenshot({path:'evidencias-correcciones4/precios-checkout-despues.png'});
  await pagina.locator('[data-abrir-carrito]').click();
  await pagina.waitForFunction(()=>document.querySelector('[data-panel-carrito]')?.dataset.visible==='true');
  await pagina.waitForTimeout(350);
  const estiloAntesCarrito=await pagina.addStyleTag({content:'html[data-tema="claro"] .pf-total-final dd, html[data-bs-theme="light"] .pf-total-final dd { color:#664d00 !important; }'});
  await pagina.screenshot({path:'evidencias-correcciones4/precios-carrito-antes.png'});
  await estiloAntesCarrito.evaluate((n)=>n.remove());
  await pagina.waitForTimeout(100);
  const colorCarritoClaro=await pagina.locator('.pf-total-final dd').evaluate((e)=>getComputedStyle(e).color);
  comprobar(colorCarritoClaro==='rgb(26, 26, 26)','carrito: total oscuro en tema claro');
  await pagina.screenshot({path:'evidencias-correcciones4/precios-carrito-despues.png'});
  await pagina.setViewportSize({width:1440,height:1000});
  await pagina.goto(`${base}/cliente/mis-pedidos.html`,{waitUntil:'domcontentloaded'});
  await pagina.waitForSelector('[data-mis-pedidos] .pf-precio');
  await pagina.waitForFunction(()=>['claro','oscuro'].includes(document.documentElement.dataset.tema));
  if(await pagina.evaluate(()=>document.documentElement.dataset.tema!=='claro')){await pagina.locator('[data-boton-tema]').first().click();await pagina.waitForFunction(()=>document.documentElement.dataset.tema==='claro');}
  await pagina.waitForTimeout(250);
  const totalPedidoClaro=await pagina.locator('[data-mis-pedidos] .pf-precio').evaluate((e)=>getComputedStyle(e).color);
  comprobar(totalPedidoClaro==='rgb(26, 26, 26)',`mis pedidos: total oscuro en tema claro (${totalPedidoClaro})`);

  apiDisponible=false;
  const contextoError=await browser.newContext({ viewport:{ width:1440, height:900 }, colorScheme:'light', reducedMotion:'reduce' });
  await contextoError.route('http://localhost:5050/**', interceptarApi);
  const paginaError=await contextoError.newPage();
  await paginaError.goto(`${base}/index.html`, { waitUntil:'domcontentloaded' });
  await paginaError.waitForSelector('[data-reintentar-catalogo]');
  await paginaError.screenshot({ path:'evidencias-correcciones4/api-reintento-antes.png' });
  apiDisponible=true;
  await paginaError.locator('[data-reintentar-catalogo]').first().click();
  await paginaError.waitForSelector('[data-catalogo] [data-accion="agregar"]');
  await paginaError.screenshot({ path:'evidencias-correcciones4/api-reintento-despues.png' });
  comprobar(await paginaError.locator('[data-reintentar-catalogo]').count() === 0, 'H10: reintentar sustituye el estado de error por el catálogo');
  await contextoError.close();

  const erroresAdmin=[];
  pagina.on('pageerror',(error)=>erroresAdmin.push(error.message));
  await pagina.goto(`${base}/admin/login.html`, { waitUntil:'domcontentloaded' });
  await pagina.waitForTimeout(300);
  await pagina.locator('[data-boton-tema]').click();
  comprobar(erroresAdmin.length===0, 'H01: el módulo administrativo se carga y el tema responde sin error de importación');

  comprobar(erroresPagina.length===0, `consola del flujo cliente sin excepciones (${erroresPagina.join('; ') || 'ninguna'})`);
  await contexto.close();
  console.log(`\nPruebas de Auditoría 4: ${comprobaciones} comprobaciones superadas.`);
} finally {
  await browser.close();
  await new Promise((resolve) => servidor.close(resolve));
}
