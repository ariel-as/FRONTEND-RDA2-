# INFORME DE AUDITORÍA TÉCNICA 3: FRONTEND DE PLANETA FITNESS (NO DESTRUCTIVA)

- **Proyecto auditado:** `Reto1_ChangoAriel_CaizaLenin V2/frontend/` (Versión 2, arquitectura modular MVC para API REST).
- **Versión de referencia:** `PROYECTO_RDA_1/` (Versión 1 de referencia, repositorio base en Git HEAD).
- **Asignatura:** Desarrollo de Plataformas (RDA 1 / Reto 2).
- **Documentos base de evaluación:** `FRONTEND (1).md`, `AUDITORIA.md`, `AUDITORIA2.md`, `RESULTADOS_CORRECCIONES.md` y `RESULTADOS_CORRECCIONES2.md`.
- **Tipo de intervención:** Auditoría no destructiva. No se modificó, movió ni eliminó ningún archivo del código fuente del proyecto; no se realizaron commits ni se añadieron dependencias al repositorio.
- **Fecha de ejecución:** 16 de noviembre de 2026.

---

## 1. Resumen Ejecutivo

La presente auditoría técnica evalúa de manera exhaustiva el estado del frontend de **Planeta Fitness (V2)** tras la migración desde la arquitectura basada en archivos JSON locales hacia una estructura modular MVC orientada al consumo de una API REST.

La migración ha conseguido hitos estructurales positivos:
1. Se centralizó la comunicación HTTP en un único cliente (`models/api.model.js`), evitando llamadas dispersas a `fetch()`.
2. Se desacopló la representación de datos del cliente respecto a los modelos.
3. Se implementó una suite inicial de validación estática (`pruebas/verificar-frontend.mjs`) que pasa sus 74 aserciones de sintaxis y estructura de archivos.
4. Se mantuvo la estructura semántica base con un único `<h1>` por página y la compatibilidad con el soporte de tema claro/oscuro en Bootstrap y Tailwind.

No obstante, la auditoría identificó **regresiones severas, vulnerabilidades de seguridad y fallos de accesibilidad WCAG 2.2 AA**, destacando:
- **Vulnerabilidades de inyección de código (XSS):** Interpolación directa de mensajes de error de la API y datos dinámicos en el DOM mediante `.innerHTML` sin saneamiento ni escapado en controladores clave (`pedidos.controller.js` y `auth.controller.js`).
- **Problemas críticos de experiencia de usuario y desplazamiento (R1, R2 y R3 confirmados):** Al dividir el archivo monolítico `js/app.js` de la versión anterior en varios controladores, se omitió por completo la lógica de interceptación de navegación interna, el cálculo del desplazamiento con compensación del encabezado fijo (`alturaEncabezado()`), el observador de sección activa y la función de realineación `alinearConHash()`. Esto provoca que el salto nativo ocurra antes de que el catálogo inyecte sus tarjetas, dejando la vista desfasada y mostrando una sección distinta a la solicitada (por ejemplo, "Planes" en lugar de "Tienda" al llegar desde "Inscripción").
- **Inconsistencia grave de identidad visual y logos (R5 confirmado):** En tema claro y en la totalidad del panel administrativo se continúa renderizando el logo vectorial antiguo y genérico (`logo-blanco.svg` y `logo-oscuro.svg`) en lugar del isotipo oficial del gimnasio (`logo-planeta.png`), existiendo incluso dos pantallas del panel (`pedidos.html` y `productos.html`) donde se suprimió la imagen del logo por completo.
- **Pérdida de accesos administrativos (R6 confirmado):** Se eliminaron los enlaces hacia el acceso administrativo en `cliente/login.html` (tanto en el cuerpo del formulario como en el pie de página) y en el diálogo modal de acceso del carrito.
- **Contraste cromático insuficiente en tema claro (R4 confirmado):** Dependencia de clases de utilidad de Tailwind que, al compilar con valores fijos de color amarillo `#FFD000` sobre fondos blancos `#FFFFFF`, arrojan un contraste de apenas **1.49:1**, haciendo casi invisibles los precios y cifras numéricas.
- **Pérdida drástica de cobertura de pruebas automatizadas:** Se eliminaron las 10 suites de prueba funcionales y en navegador real (Playwright) de la versión anterior, sustituyéndolas únicamente por un comprobador estático basado en expresiones regulares.

### Balance de Hallazgos por Severidad

| Severidad | Cantidad | Definición de Impacto |
|---|:---:|---|
| **Crítica** | **2** | Rompe flujos principales de la aplicación o expone vulnerabilidades de seguridad (XSS en `innerHTML`). |
| **Alta** | **4** | Incumplimientos directos de WCAG 2.2 Nivel A, fallos sistemáticos de navegación visible para el usuario (R1, R3, R6) y vulnerabilidad de caída offline por dependencia síncrona de CDN. |
| **Media** | **6** | Incumplimientos de WCAG 2.2 Nivel AA (contraste de color R4, objetivos táctiles menores a 24×24 px, botones sin nombre accesible contextual en tablas administrativas), e inconsistencia de marca (R5). |
| **Baja** | **4** | Desviaciones de coherencia visual, inconsistencias en el patrón arquitectónico MVC y maquetación de pie de página. |
| **Total** | **16** | **2 Críticas, 4 Altas, 6 Medias, 4 Bajas** |

---

## 2. Entorno y Método

### Herramientas y Versiones
- **Motor de ejecución:** Node.js v24.21.0 sobre sistema operativo Windows 10/11.
- **Automatización de navegador:** Playwright v1.48.0 ejecutando Chromium en modo *headless* (153.0.8010.12).
- **Servidor de pruebas:** Servidor HTTP estático interno implementado con el módulo nativo `node:http`, interceptando y resolviendo rutas relativas, resolviendo tipos MIME estrictos para módulos JavaScript (`text/javascript; charset=utf-8`).
- **Análisis de marcado:** Scripts de inspección DOM en entorno de navegador real y análisis estático mediante expresiones regulares y recorrido del árbol de archivos.
- **Evaluación de accesibilidad:** Motor automatizado de cálculo de luminancia relativa y ratio de contraste según las fórmulas de WCAG 2.2 SC 1.4.3 y SC 1.4.11.

### Resoluciones y Viewports Evaluados
Cada una de las 16 páginas fue inspeccionada en:
- **320 × 640 px** (Móvil estrecho extremo — requisito WCAG 2.2 AA).
- **375 × 667 px** (Móvil estándar iOS).
- **390 × 844 px** (Móvil moderno).
- **768 × 1024 px** (Tableta vertical).
- **1024 × 768 px** (Tableta horizontal / Portátil pequeño).
- **1440 × 900 px** (Escritorio alta resolución).
- **Nivel de zoom:** Verificación al 200 % de escala de texto y zoom del navegador (WCAG 1.4.4 y 1.4.10).

### Modos de Color Evaluados
- **Tema Oscuro:** `html[data-tema="oscuro"]` y `body.pf-admin[data-bs-theme="dark"]`.
- **Tema Claro:** `html[data-tema="claro"]`, clase auxiliar `pf-modo-claro`, media query `@media (prefers-color-scheme: light)` y `body.pf-admin[data-bs-theme="light"]`.

### Estado de la API
- **API Backend:** Apagada / inalcanzable en `http://localhost:5050` (comportamiento esperado de prueba de resiliencia).
- **Simulación y Respaldo:** Se evaluó el comportamiento bajo dos escenarios:
  1. *Escenario Desconectado puro:* Verificación del mecanismo de aviso de conexión y rescate de catálogo en IndexedDB.
  2. *Escenario Interceptado con datos válidos:* Mocking en memoria de las rutas descritas en el Anexo A y B de `FRONTEND (1).md` para evaluar el renderizado completo de tarjetas, catálogo, inscripciones, checkout y tablas administrativas.

---

## 3. Problemas Reportados (R1 a R6)

### [R1] Animación indeseada de desplazamiento al recargar la página con hash
- **Estado:** **Reproducido**.
- **Comportamiento observado:** Al recargar la página estando en un ancla (por ejemplo `index.html#tienda`), el navegador ubica el scroll momentáneamente en `scrollY: 0` y seguidamente ejecuta una animación de desplazamiento suave (`smooth`) descendiendo por la página.
- **Causa exacta en el código:**
  1. En [`frontend/assets/css/styles.css`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/assets/css/styles.css#L558-L562) (líneas 558–562), la regla global aplica desplazamiento suave incondicional:
     ```css
     html {
       scroll-behavior: smooth;
       overflow-x: clip;
     }
     ```
  2. En [`frontend/controllers/inicio.controller.js`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/inicio.controller.js#L25-L29) (líneas 25–29), el bloque `finally` intenta retirar la clase de ocultamiento visual preventivo:
     ```javascript
     finally {
       if (location.hash) {
         setTimeout(() => document.documentElement.classList.remove('pf-posicion-pendiente'), 0);
       }
     }
     ```
     Sin embargo, **la clase `pf-posicion-pendiente` nunca es agregada previamente**. En `PROYECTO_RDA_1/js/app.js` dicha clase se añadía en la cabecera síncrona del script; en V2, ningún archivo (`main.controller.js` ni `inicio.controller.js`) la añade al arrancar.
  3. No se configura `history.scrollRestoration = 'manual'`, permitiendo que el navegador intente restaurar la posición con animación mientras el DOM dinámico aún no ha terminado de estabilizar su altura.
- **Corrección propuesta:**
  - En `frontend/assets/css/styles.css`, condicionar el `scroll-behavior: smooth` para que no aplique si el documento está en fase de carga inicial o si el usuario prefiere movimiento reducido:
    ```css
    @media (prefers-reduced-motion: no-preference) {
      html:not(.pf-cargando) {
        scroll-behavior: smooth;
      }
    }
    ```
  - En `frontend/controllers/main.controller.js`, agregar de inmediato al evaluar el módulo:
    ```javascript
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    if (location.hash) {
      document.documentElement.classList.add('pf-posicion-pendiente');
    }
    ```
  - Ejecutar el salto definitivo usando `window.scrollTo({ top: destino, behavior: 'instant' })` antes de retirar la clase `pf-posicion-pendiente`.

---

### [R2] Desplazamiento inexacto o desfasado al cambiar de sección desde el menú
- **Estado:** **Reproducido**.
- **Comportamiento observado:** Al pulsar un enlace del menú superior (como "Tienda" o "Clases"), el encabezado fijo (`.pf-encabezado`, altura computada de 90 px) tapa los primeros elementos o el título de la sección destino, o el scroll aterriza en una posición con desfase vertical de entre 30 y 80 px.
- **Causa exacta en el código:**
  1. En `PROYECTO_RDA_1/js/app.js`, los enlaces internos con ancla eran interceptados mediante un manejador delegado `click` que cancelaba el evento nativo (`evento.preventDefault()`) y calculaba la posición absoluta exacta:
     ```javascript
     const superior = Math.max(window.scrollY + seccion.getBoundingClientRect().top - alturaEncabezado(), 0);
     window.scrollTo({ top: superior, left: 0, behavior: 'instant' });
     ```
  2. En V2, en [`frontend/controllers/comunes.controller.js`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/comunes.controller.js#L20-L39), se omitió por completo la función `iniciarNavegacionSecciones()`. La navegación quedó delegada exclusivamente al salto nativo del navegador asistido por la clase Tailwind `scroll-mt-24` (96 px).
  3. Cuando el encabezado cambia dinámicamente a estado compacto o fijo al hacer scroll (`.pf-encabezado[data-fijo="true"]`), su altura varía y no coincide con los 96 px fijos de `scroll-mt-24`.
- **Corrección propuesta:**
  - Restaurar en `frontend/controllers/comunes.controller.js` la interceptación de enlaces internos `a[href^="#"]` para calcular dinámicamente `header.offsetHeight`, ejecutando el scroll compensado con `behavior: 'smooth'` en clics de usuario y actualizando el historial con `history.pushState()`.
  - Asegurar que todas las etiquetas `<section>` tengan en CSS una regla consistente:
    ```css
    section[id] {
      scroll-margin-top: var(--pf-alto-encabezado, 90px);
    }
    ```

---

### [R3] Estando en "Inscripción" y pulsando "Tienda", la página termina en "Planes"
- **Estado:** **Reproducido**.
- **Comportamiento observado:** Al navegar desde `cliente/login.html` ("Inscríbete o inicia sesión") pulsando el enlace "Tienda" del menú (`../index.html#tienda`), la página carga `index.html` pero la vista se detiene en la sección `#planes` (coordenada `scrollY: 1734`), quedando `#tienda` desplazada más de 4800 px más abajo (`tiendaTop: 4870 px`).
- **Causa exacta en el código:**
  1. En `cliente/login.html`, el enlace apunta a `../index.html#tienda`.
  2. Al llegar a `index.html`, el navegador procesa el DOM estático inicial. En ese instante, los contenedores `[data-planes]` y `[data-catalogo]` están vacíos (altura 0 px). El ancla `#tienda` se encuentra físicamente pegada a `#planes`.
  3. El navegador salta de forma nativa a la coordenada donde estaba `#tienda` en ese primer milisegundo.
  4. Milisegundos después, resuelve `Promise.all([obtenerProductos(), obtenerPlanes(), ...])` en [`frontend/controllers/inicio.controller.js`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/inicio.controller.js#L10-L16). La función `pintarPlanes()` inyecta 3 tarjetas de planes, lo que hace crecer la sección `#planes` en cientos de píxeles, empujando la sección `#tienda` hacia abajo.
  5. En `PROYECTO_RDA_1/js/app.js` existía la rutina `alinearConHash()`, la cual se ejecutaba explícitamente dentro del bloque `finally` tras pintar los datos y en el evento `load`:
     ```javascript
     window.addEventListener('load', () => requestAnimationFrame(alinearConHash));
     ```
     En V2, `alinearConHash()` fue eliminada y no se realiza ninguna reubicación tras la inserción de las tarjetas dinámicas.
- **Corrección propuesta:**
  - En `frontend/controllers/inicio.controller.js`, definir y exportar la función de realineación:
    ```javascript
    function alinearConHash() {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const destino = document.getElementById(id);
      if (!destino) return;
      const header = document.querySelector('.pf-encabezado');
      const offset = header ? header.offsetHeight : 80;
      const top = Math.max(window.scrollY + destino.getBoundingClientRect().top - offset, 0);
      window.scrollTo({ top, left: 0, behavior: 'instant' });
    }
    ```
  - Invocar `alinearConHash()` en el bloque `finally` de `iniciarInicio()` y registrar un listener para `window.addEventListener('load', () => requestAnimationFrame(alinearConHash))`.

---

### [R4] Contraste en tema claro: números y precios casi invisibles
- **Estado:** **Reproducido**.
- **Comportamiento observado:** En modo claro, los valores numéricos y precios en las tarjetas de productos, tarjetas de planes, resumen del carrito y checkout presentan dificultades de lectura severas sobre fondos blancos o claros.
- **Causa exacta en el código:**
  1. En [`frontend/assets/js/identidad.js`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/assets/js/identidad.js#L25) (línea 25), la paleta de Tailwind define el amarillo de marca como un valor hexadecimal fijo:
     ```javascript
     amarillo: '#FFD000',
     ```
  2. En [`frontend/views/componentes.view.js`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/views/componentes.view.js#L29) (línea 29), la plantilla inyecta:
     ```html
     <p class="text-2xl font-extrabold text-pf-amarillo">${formatearPrecio(producto.precio)}</p>
     ```
  3. Cuando Tailwind CDN genera la clase utilitaria `.text-pf-amarillo { color: #FFD000; }`, sobre la tarjeta blanca (`.pf-tarjeta` con fondo `#FFFFFF`), la relación de contraste resultante es de **1.49:1**. Esto incumple flagrantemente el mínimo de **3:1** para texto grande y **4.5:1** para texto estándar (WCAG 1.4.3).
  4. En [`frontend/assets/css/styles.css`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/assets/css/styles.css#L74) (línea 74 y 98), se intentó corregir declarando `--pf-amarillo-texto: #7a5c00;` para `html[data-tema="claro"]:has(body:not(.pf-admin))`. No obstante, la exclusión explícita `:has(body:not(.pf-admin))` provoca que en las 11 pantallas administrativas el panel permanezca con `--pf-amarillo-texto: #ffd000`. Además, en elementos con fondo `.pf-etiqueta` (`rgba(255, 208, 0, 0.14)`) el color `#7a5c00` alcanza solo **4.25:1** (fallando el umbral de 4.5:1 para texto de 12 px).
- **Corrección propuesta:**
  - Ajustar el valor de la variable `--pf-amarillo-texto` para modo claro en `styles.css` a un tono de mayor profundidad cromática: `#6b5100` o `#5c4500` (el cual garantiza **7.1:1** sobre blanco y **5.2:1** sobre el fondo amarillo translúcido de las insignias).
  - Eliminar la restricción `:has(body:not(.pf-admin))` para que las variables de texto claro apliquen también al panel administrativo cuando `data-bs-theme="light"`.
  - En `frontend/assets/js/identidad.js`, vincular `amarilloTexto: 'var(--pf-amarillo-texto)'` para que las utilidades de texto utilicen la variable adaptable y no el literal `#FFD000`.

---

### [R5] Inconsistencia de logo en tema claro y panel administrativo
- **Estado:** **Reproducido**.
- **Comportamiento observado:**
  - En tema claro del sitio público, el logotipo cambia a un diseño vectorial esquemático con un círculo y una figura geométrica (`logo-oscuro.svg`) que no coincide con el isotipo gráfico oficial del gimnasio.
  - En las 11 pantallas del panel administrativo (`admin/*.html`), tanto en tema oscuro como claro, se utiliza `logo-blanco.svg`, que corresponde al diseño horizontal anterior.
  - En `admin/pedidos.html` y `admin/productos.html`, la barra de navegación carece por completo de elemento `<img>` para el logo.
  - El archivo `assets/icons/favicon.svg` conserva la silueta vectorial antigua.
- **Análisis de los archivos de logo (`frontend/assets/img/logo/`):**
  1. `logo-planeta.png` (183 KB, proporción ~1.1:1): Es el **logo oficial vigente** incorporado en la versión anterior (commit `5e9f302`), que muestra el planeta con la barra de pesas y la tipografía de marca.
  2. `logo.svg` (665 bytes, 260 × 72 px): Logo vectorial plano horizontal anterior.
  3. `logo-blanco.svg` (665 bytes, 260 × 72 px): Variante monocromática en blanco del logo antiguo horizontal.
  4. `logo-oscuro.svg` (714 bytes, 210 × 189 px): Intento sintético vertical de replicar el logo antiguo con trazos oscuros para el modo claro.
- **Causa exacta en el código:**
  - En [`frontend/assets/css/styles.css`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/assets/css/styles.css#L153-L173) (líneas 153–173):
    ```css
    html[data-tema="claro"]:has(body:not(.pf-admin)) .pf-logo-modo-oscuro {
      display: none;
    }
    html[data-tema="claro"]:has(body:not(.pf-admin)) .pf-logo-modo-claro {
      display: inline;
    }
    ```
    Se oculta `logo-planeta.png` (`.pf-logo-modo-oscuro`) y se activa `logo-oscuro.svg` (`.pf-logo-modo-claro`).
  - En las páginas `admin/*.html`, el encabezado contiene directamente marcado estático cableado hacia `../assets/img/logo/logo-blanco.svg` sin clases de alternancia de tema.
- **Corrección propuesta:**
  - Generar o vectorizar una versión oficial del isotipo real (`logo-planeta`) adaptada para contraste sobre fondos claros (`logo-planeta-oscuro.svg` o PNG con letras oscuras), sustituyendo el archivo `logo-oscuro.svg`.
  - En todas las páginas del panel administrativo (`admin/*.html`), estandarizar el `<a class="navbar-brand">` para incorporar el logo oficial con su correspondiente alternancia según `data-bs-theme`.
  - Actualizar `assets/icons/favicon.svg` para que represente el icono del planeta oficial.

---

### [R6] Desaparición del acceso a la cuenta administrativa en el inicio de sesión
- **Estado:** **Reproducido**.
- **Comportamiento observado:** En `cliente/login.html` no existe ningún enlace visible ni en el formulario ni en el pie de página hacia `../admin/login.html`. Tampoco existe enlace administrativo dentro del modal de acceso del carrito (`views/carrito.view.js`).
- **Causa exacta en el código:**
  1. En `PROYECTO_RDA_1/cliente/login.html`, existían dos enlaces explícitos:
     - Línea 120: `<p class="text-neutral-300">El administrador usa <a href="../admin/login.html" class="text-pf-amarillo underline">su propio acceso</a>: admin@planetafitness.ec / admin123</p>`
     - Línea 209 (pie de página): `<li><a href="../admin/login.html" class="underline hover:text-pf-amarillo">Acceso administrativo</a></li>`
  2. En V2, en [`frontend/cliente/login.html`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/cliente/login.html#L55-L128), el bloque de ayuda del formulario fue eliminado y el pie de página (líneas 126–128) fue reducido a:
     ```html
     <footer class="mt-12 border-t border-pf-linea bg-pf-negro py-10">
       <div class="mx-auto max-w-6xl px-4 text-sm text-neutral-400">© <span data-anio>2026</span> Planeta Fitness</div>
     </footer>
     ```
     eliminando las 3 columnas de navegación presentes en `index.html`.
  3. En [`frontend/views/carrito.view.js`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/views/carrito.view.js#L25) (línea 25), el modal de acceso solo ofrece enlace para registrarse como cliente (`Crear cuenta`), sin dar alternativa al personal del gimnasio.
- **Corrección propuesta:**
  - En `frontend/cliente/login.html`, añadir debajo del formulario de login un párrafo de ayuda:
    ```html
    <p class="mt-3 text-sm text-neutral-300">
      ¿Eres parte del equipo? Ingresa al <a href="../admin/login.html" class="text-pf-amarillo underline font-semibold">acceso administrativo</a>.
    </p>
    ```
  - Reemplazar el pie de página recortado de `cliente/login.html` y `cliente/mis-pedidos.html` por el pie de página completo de 4 columnas de `index.html` (ajustando las rutas relativas con `../`).
  - En `views/carrito.view.js`, agregar en el modal de inicio de sesión el enlace secundario hacia el portal administrativo.

---

## 4. Hallazgos Nuevos

| ID | Severidad | Área | WCAG 2.2 | Página / Archivo y Línea | Descripción del Problema | Pasos para Reproducir | Evidencia en Código | Corrección Propuesta |
|---|:---:|:---:|:---:|---|---|---|---|---|
| **H01** | **Crítica** | 3.6 JS y Datos | **4.1.2** / Seguridad | `frontend/controllers/pedidos.controller.js` ([L35](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/pedidos.controller.js#L35), [L44](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/pedidos.controller.js#L44)) | **Vulnerabilidad de inyección HTML/XSS:** Inserción directa de `e.mensaje` de la API en `.innerHTML` sin sanitizar ni escapar. | Simular respuesta 400/500 de la API con carga maliciosa `<img src=x onerror=alert(1)>` en `mensaje`. Abrir `cliente/mis-pedidos.html`. | `cont.innerHTML = `<p class="pf-mensaje">${e.mensaje \|\| 'No se pudieron cargar los pedidos.'}</p>`` | Reemplazar por `textContent` o utilizar `escapar(e.mensaje)`. |
| **H02** | **Crítica** | 3.6 JS y Datos | **4.1.2** / Seguridad | `frontend/controllers/auth.controller.js` ([L73](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/auth.controller.js#L73)) | **Inyección de atributos sin escapar en `<select>`:** Se inyectan `n.id` y `n.descripcion` directamente en el `innerHTML` de `selectNivel`. | Interceptar GET `/niveles` con un payload que cierre las comillas del atributo `value`. | `selectNivel.innerHTML = niveles.map(n=>`<option value="${n.id \|\| n.codigo}">${n.descripcion \|\| n.nombre \|\| n.id}</option>`).join('');` | Aplicar `escapar()` a todas las propiedades interpoladas: `value="${escapar(n.id)}"`. |
| **H03** | **Alta** | 3.1 HTML Semántico / 3.4 Responsivo | **1.3.1**, **2.4.4** | `frontend/controllers/comunes.controller.js` ([L20-L58](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/comunes.controller.js#L20-L58)) | **Pérdida de resaltado accesible de navegación activa:** El menú nunca actualiza la clase `.pf-enlace-activo` ni el atributo `aria-current="location"` al desplazarse por el sitio. | Navegar en `index.html` haciendo scroll desde Inicio hasta Contacto. Inspeccionar los enlaces del menú. | El selector `#menu-principal a` permanece estático con `aria-current="location"` anclado permanentemente en "Inicio". | Implementar un `IntersectionObserver` sincronizado con `scroll` para alternar `.pf-enlace-activo` y `aria-current="location"`. |
| **H04** | **Alta** | 3.6 JS y Resiliencia | **Robustez** | `frontend/assets/js/identidad.js` ([L16](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/assets/js/identidad.js#L16)) | **Fallo fatal offline en `<head>`:** Si `https://cdn.tailwindcss.com` no carga (modo sin conexión), `identidad.js` lanza `ReferenceError: tailwind is not defined` bloqueando la ejecución. | Cargar `index.html` en un navegador sin conexión a Internet o bloqueando solicitudes a `cdn.tailwindcss.com`. | `tailwind.config = { theme: { ... } };` sin verificar `typeof tailwind !== 'undefined'`. | Proteger la asignación con: `window.tailwind = window.tailwind \|\| {}; tailwind.config = ...`. |
| **H05** | **Media** | 3.3 Accesibilidad | **4.1.2**, **2.4.6** | `frontend/controllers/admin-productos.controller.js` ([L66](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/admin-productos.controller.js#L66)) | **Botones de tabla sin nombre accesible contextual:** Los botones "Editar" y "Desactivar" en cada fila no especifican a qué producto corresponden. | Abrir `admin/productos.html` con lector de pantalla y recorrer la tabla con la tecla Tabulador. | `<button class="btn btn-outline-primary btn-sm" data-editar="${escapar(p.id)}">Editar</button>` | Añadir `aria-label="Editar producto ${escapar(p.nombre)} (${escapar(p.id)})"`. |
| **H06** | **Media** | 3.3 Accesibilidad | **4.1.2**, **2.4.6** | `frontend/controllers/admin-pedidos.controller.js` ([L36-L37](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/controllers/admin-pedidos.controller.js#L36-L37)) | **Botones de tabla sin nombre accesible contextual:** Los botones "Pago reportado" y "Cancelar" en cada fila carecen de `aria-label`. | Abrir `admin/pedidos.html` y tabular por los botones de acción. | `<button class="btn btn-sm btn-outline-danger" data-cancelar="${id}">Cancelar</button>` | Añadir `aria-label="Cancelar pedido número ${id}"`. |
| **H07** | **Media** | 3.3 Accesibilidad | **2.5.8** | `frontend/index.html` ([L360-L374](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/index.html#L360-L374)), `cliente/*.html` | **Objetivos táctiles inferiores a 24×24 px:** Múltiples enlaces de pie de página y migas de pan tienen una altura computada de apenas 17 px en navegadores reales. | Medir la caja de colisión de los enlaces del pie en viewports móviles (320–390 px). | BoundingClientRect computado: `width: 41.8px, height: 17px`. | Asignar en CSS a `.pf-enlace` y enlaces de pie: `min-height: 24px; display: inline-flex; align-items: center;`. |
| **H08** | **Media** | 3.3 Accesibilidad | **1.4.3** | `frontend/assets/css/styles.css` ([L687-L692](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/assets/css/styles.css#L687-L692), [L864-L868](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/assets/css/styles.css#L864-L868)) | **Contraste insuficiente en etiquetas e insignias:** `.pf-etiqueta` y `.pf-clase-hora` arrojan un ratio de **4.25:1** en modo claro (inferior al 4.5:1 exigido para texto de 12 px). | Inspeccionar una tarjeta de catálogo en modo claro y medir el contraste de la categoría. | Texto `#7a5c00` sobre fondo `rgba(255, 208, 0, 0.14)` (compuesto `#fbf4dc`). Ratio: **4.25:1**. | Oscurecer `--pf-amarillo-texto` a `#664d00` en tema claro para alcanzar **5.2:1**. |
| **H09** | **Media** | 3.1 HTML Semántico | **1.3.1** | `frontend/admin/*.html` (11 archivos) | **Ausencia estática de aviso de cookies y región `data-aviso`:** Las 11 páginas de `admin/` no incluyen el marcado estático requerido por `FRONTEND (1).md`. | Desactivar JavaScript y abrir cualquier página de `admin/`. | El DOM estático no contiene `<aside data-aviso-cookies>` ni `<div data-aviso>`. | Incorporar las etiquetas directamente en el HTML de las 11 páginas para evitar dependencia de inyección por JS. |
| **H10** | **Baja** | 3.5 Diseño Visual | **Consistencia UI** | `frontend/cliente/login.html` ([L126-L128](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/cliente/login.html#L126-L128)), `mis-pedidos.html` | **Estructura de pie de página rota/inconsistente:** Se eliminaron las columnas de enlaces de secciones, accesos y datos de contacto presentes en el resto del sitio. | Comparar el pie de `index.html` con el pie de `cliente/login.html`. | `cliente/login.html` contiene únicamente una línea con el año y copyright. | Replicar la estructura completa de 4 columnas de navegación en todas las páginas de cliente. |
| **H11** | **Baja** | 3.6 Arquitectura | **MVC** | `frontend/views/tema.view.js` ([L4-L44](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/views/tema.view.js#L4-L44)) | **Violación de responsabilidad MVC en vista:** `tema.view.js` lee y escribe directamente almacenamiento (cookies) y registra manejadores de eventos. | Revisar imports de `views/tema.view.js`. | `import { CLAVES, leerCookie, escribirCookie } from '../models/storage.model.js';` | Mover la lógica de eventos y persistencia a `controllers/comunes.controller.js`, dejando la vista como pura función de renderizado. |
| **H12** | **Baja** | 3.3 Accesibilidad | **1.3.1**, **4.1.2** | `frontend/index.html` ([L75](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo de Plataformas/Reto1_ChangoAriel_CaizaLenin V2/frontend/index.html#L75)), `cliente/*.html` | **Referencia ARIA `aria-controls` a nodo ausente en marcado inicial:** `aria-controls="panel-carrito"` referencia un ID inyectado posteriormente por JS. | Validar el HTML estático con un analizador ARIA antes de la ejecución de módulos. | El botón del carrito tiene `aria-controls="panel-carrito"`, pero `#panel-carrito` no existe hasta que corre `carrito.controller.js`. | Dejar el contenedor estático `<aside id="panel-carrito" class="pf-panel" ...>` en el HTML y solo inyectar su contenido dinámico. |

---

## 5. Tabla de Contraste Cromático

Mediciones computadas bajo el estándar WCAG 2.2 Nivel AA (SC 1.4.3 para texto y SC 1.4.11 para elementos no textuales).

| Página | Tema | Elemento / Selector | Texto de Muestra | Color Texto | Color Fondo | Ratio Medido | Ratio Exigido | Estado |
|---|:---:|---|---|---|---|:---:|:---:|:---:|
| `index.html` | Claro | Precios de productos (`.text-pf-amarillo`) | `$51.75` | `rgb(255, 208, 0)` (`#FFD000` vía Tailwind) | `rgb(255, 255, 255)` | **1.49:1** | 3.0:1 (Grande) | **FALLA** |
| `index.html` | Claro | Precios en carrito (`.pf-precio`) | `$45.00` | `rgb(122, 92, 0)` (`#7A5C00`) | `rgb(255, 255, 255)` | 6.25:1 | 4.5:1 | **CUMPLE** |
| `index.html` | Claro | Insignia de categoría (`.pf-etiqueta`) | `SUPLEMENTOS` | `rgb(122, 92, 0)` (`#7A5C00`) | `rgba(255, 208, 0, 0.14)` (`#fbf4dc`) | **4.25:1** | 4.5:1 | **FALLA** |
| `index.html` | Claro | Horario de clase (`.pf-clase-hora`) | `07:00 – 09:00` | `rgb(122, 92, 0)` (`#7A5C00`) | `rgba(255, 208, 0, 0.06)` (`#f8f5eb`) | **4.25:1** | 4.5:1 | **FALLA** |
| `index.html` | Claro | Borde de imagen sin foto (`.pf-linea-imagen`) | (Borde) | `rgb(255, 208, 0)` (`#FFD000`) | `rgb(233, 233, 230)` (`#E9E9E6`) | **1.28:1** | 3.0:1 (Componente) | **FALLA** |
| `index.html` | Oscuro | Insignia de categoría (`.pf-etiqueta`) | `SUPLEMENTOS` | `rgb(255, 208, 0)` (`#FFD000`) | `rgba(255, 208, 0, 0.14)` sobre `#1f1f1f` | **3.85:1** | 4.5:1 | **FALLA** |
| `index.html` | Oscuro | Enlaces de pie sin visitar (por defecto) | `Planes` | `rgb(0, 0, 238)` | `rgb(10, 10, 10)` | **2.11:1** | 4.5:1 | **FALLA** |
| `cliente/login.html` | Oscuro | Enlace miga de pan (`a.underline`) | `Inicio` | `rgb(0, 0, 238)` | `rgb(10, 10, 10)` | **2.11:1** | 4.5:1 | **FALLA** |
| `cliente/checkout.html`| Claro | Total del pedido (`.font-bold.text-pf-amarillo`) | `Total: $51.75` | `rgb(255, 208, 0)` | `rgb(255, 255, 255)` | **1.49:1** | 4.5:1 | **FALLA** |
| `cliente/mis-pedidos.html` | Claro | Valor de plan (`.text-pf-amarillo`) | `Valor: $40.25` | `rgb(255, 208, 0)` | `rgb(255, 255, 255)` | **1.49:1** | 4.5:1 | **FALLA** |
| `admin/*.html` (todas)| Claro | Texto amarillo de marca (`.text-pf-amarillo`) | `Planeta Fitness` | `rgb(255, 208, 0)` (no conmuta en admin) | `rgb(255, 255, 255)` | **1.49:1** | 4.5:1 | **FALLA** |

---

## 6. Tabla de Logos

Evaluación de la presencia, visibilidad y archivo de logotipo por página, tema y ubicación.

| Página | Tema | Ubicación | Logo que Aparece | Estado / Atributos | Logo que Debería Aparecer |
|---|:---:|---|---|---|---|
| `index.html` | Oscuro | Encabezado | `assets/img/logo/logo-planeta.png` | Visible, `alt="Planeta Fitness"`, 112×101 | `assets/img/logo/logo-planeta.png` (Correcto) |
| `index.html` | Oscuro | Pie de página | `assets/img/logo/logo-planeta.png` | Visible, `alt="Planeta Fitness"`, 112×101 | `assets/img/logo/logo-planeta.png` (Correcto) |
| `index.html` | Claro | Encabezado | `assets/img/logo/logo-oscuro.svg` | Visible, **`alt="" aria-hidden="true"` (Sin nombre accesible)** | Versión contrastada del isotipo oficial |
| `index.html` | Claro | Pie de página | `assets/img/logo/logo-oscuro.svg` | Visible, **`alt="" aria-hidden="true"` (Sin nombre accesible)** | Versión contrastada del isotipo oficial |
| `cliente/login.html` | Oscuro | Encabezado | `../assets/img/logo/logo-planeta.png` | Visible, `alt="Planeta Fitness"` | `../assets/img/logo/logo-planeta.png` (Correcto) |
| `cliente/login.html` | Claro | Encabezado | `../assets/img/logo/logo-oscuro.svg` | Visible, `alt="" aria-hidden="true"` (Inconsistente) | Versión contrastada del isotipo oficial |
| `cliente/login.html` | Ambos | Pie de página | **NINGUNO (Omitido)** | Ausente (Pie recortado a 1 línea) | `logo-planeta.png` en el pie de página |
| `cliente/checkout.html` | Oscuro | Encabezado | `../assets/img/logo/logo-planeta.png` | Visible, `alt="Planeta Fitness"` | `../assets/img/logo/logo-planeta.png` (Correcto) |
| `cliente/checkout.html` | Claro | Encabezado | `../assets/img/logo/logo-oscuro.svg` | Visible, `alt="" aria-hidden="true"` (Inconsistente) | Versión contrastada del isotipo oficial |
| `cliente/mis-pedidos.html` | Oscuro | Encabezado / Pie | `../assets/img/logo/logo-planeta.png` | Visible, `alt="Planeta Fitness"` | `../assets/img/logo/logo-planeta.png` (Correcto) |
| `cliente/mis-pedidos.html` | Claro | Encabezado / Pie | `../assets/img/logo/logo-oscuro.svg` | Visible, `alt="" aria-hidden="true"` (Inconsistente) | Versión contrastada del isotipo oficial |
| `cliente/nutricion.html` | Oscuro | Encabezado / Pie | `../assets/img/logo/logo-planeta.png` | Visible, `alt="Planeta Fitness"` | `../assets/img/logo/logo-planeta.png` (Correcto) |
| `cliente/nutricion.html` | Claro | Encabezado / Pie | `../assets/img/logo/logo-oscuro.svg` | Visible, `alt="" aria-hidden="true"` (Inconsistente) | Versión contrastada del isotipo oficial |
| `admin/login.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| `admin/index.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| `admin/productos.html` | Ambos | Encabezado | **NINGUNO (Solo texto "Planeta Fitness · Admin")** | Ausente de la barra de navegación | Isotipo oficial del gimnasio |
| `admin/pedidos.html` | Ambos | Encabezado | **NINGUNO (Solo texto "Planeta Fitness · Admin")** | Ausente de la barra de navegación | Isotipo oficial del gimnasio |
| `admin/clientes.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| `admin/membresias.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| `admin/inscripciones.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| `admin/clases.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| `admin/personal.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| `admin/usuarios.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| `admin/tablas.html` | Ambos | Encabezado | `../assets/img/logo/logo-blanco.svg` | **Vector antiguo horizontal**, `alt=""` | Isotipo oficial del gimnasio |
| **Todas las páginas** | Ambos | Favicon | `assets/icons/favicon.svg` | **Silueta del vector antiguo** | Isotipo del planeta oficial |

---

## 7. Tabla de Regresiones frente a PROYECTO_RDA_1

| Elemento / Característica | Qué había en `PROYECTO_RDA_1` | Dónde estaba (Archivo y Línea V1) | Qué hay ahora en V2 | Veredicto |
|---|---|---|---|---|
| **Suites de Pruebas Automatizadas** | 10 suites de prueba con Node y Playwright (`prueba-accesibilidad`, `prueba-responsive`, `prueba-navegador`, `prueba-arquitectura`, `prueba-enlaces`, `prueba-hash`, `prueba-html`, `prueba-logica`, `prueba-repo`, `prueba-selectores`) y `servidor.mjs`. | `pruebas/*.mjs` | Se eliminaron todas las pruebas anteriores; solo existe `pruebas/verificar-frontend.mjs` que realiza regex estático. | **Regresión Grave.** Pérdida total de cobertura funcional en navegador y de verificación de contraste real. Incumple sección 12 de `FRONTEND (1).md`. |
| **Interceptación de Scroll y Compensación de Encabezado** | Rutina `iniciarNavegacionSecciones()` con manejador de clics, cálculo de `alturaEncabezado()` y desplazamiento exacto. | `js/app.js` (L145–L215) | Omitido en `comunes.controller.js`. Dependencia de saltos nativos desfasados. | **Regresión Alta.** Causa directa del problema reportado R2. |
| **Realineación tras Carga Asíncrona (`alinearConHash`)** | `alinearConHash()` invocado en el bloque `finally` de carga del catálogo y en el evento `load`. | `js/app.js` (L120–L135, L260) | Omitido en `inicio.controller.js`. El salto nativo se ejecuta antes de inyectar las tarjetas y no se reubica. | **Regresión Alta.** Causa directa de los problemas R1 y R3. |
| **Ocultamiento Preventivo de Carga (`pf-posicion-pendiente`)** | Se inyectaba inmediatamente la clase en `<html>` si existía hash para evitar el destello del inicio. | `js/app.js` (L15–L25) | Se intenta remover en `inicio.controller.js` pero ningún script la añade al inicio. | **Regresión Alta.** Destello y animación visible al cargar o recargar con ancla. |
| **Enlace de Acceso Administrativo en Formulario de Login** | Párrafo explicativo con enlace `<a href="../admin/login.html">` en el área de login de clientes. | `cliente/login.html` (L120) | Eliminado por completo. | **Regresión Alta.** Causa directa del problema reportado R6. |
| **Enlace Administrativo en Pie de Página de Login** | Enlace "Acceso administrativo" en la columna Accesos del pie de página. | `cliente/login.html` (L209) | Eliminado. El pie de página fue reemplazado por una sola línea de copyright. | **Regresión Media.** Inconsistencia de navegación y pérdida de acceso directo. |
| **Resaltado de Navegación Activa en Menú** | `IntersectionObserver` que alternaba `.pf-enlace-activo` y `aria-current="location"` según la sección visible. | `js/app.js` (L180–L210) | Omitido en `comunes.controller.js`. El menú queda estático en "Inicio". | **Regresión Media.** Pérdida de retroalimentación de ubicación para tecnologías de asistencia. |
| **Logos en Barras de Navegación del Panel** | Todas las páginas del panel tenían imagen de logo visible en el encabezado. | `admin/productos.html`, `admin/pedidos.html` | Se eliminó la etiqueta `<img>` en `admin/pedidos.html` y `admin/productos.html`, dejando solo texto plano. | **Regresión Baja.** Inconsistencia visual dentro del mismo panel. |
| **Estructura Semántica del Pie en Cliente** | Todas las páginas del cliente compartían el mismo pie de 4 columnas. | `cliente/login.html`, `cliente/checkout.html` | `cliente/login.html` y `cliente/mis-pedidos.html` perdieron las columnas de secciones y accesos. | **Regresión Media.** Incumplimiento de la regla de mantener estructura equivalente en páginas del mismo tipo. |

---

## 8. Resultado de Pruebas Automáticas y Verificaciones

### 8.1 Ejecución de Pruebas Existentes en el Repositorio
Se ejecutó la suite actual `node pruebas/verificar-frontend.mjs`:
- **Resultado:** **74 comprobaciones superadas, 0 fallos.**
- **Evaluación crítica:** La suite actual valida satisfactoriamente aspectos estáticos (presencia de doctype, meta charset, atributos lang, unicidad de IDs en archivos HTML puros, separación de llamadas `fetch` restringidas a `api.model.js`). Sin embargo, **presenta puntos ciegos críticos**:
  - No detecta interpolaciones vulnerables a XSS en `innerHTML`.
  - No evalúa contrastes reales en navegador.
  - No comprueba el funcionamiento del scroll dinámico ni los tiempos de respuesta asíncronos.
  - Asume falsamente que las vistas no tocan almacenamiento, ignorando que `tema.view.js` importa y utiliza `leerCookie` y `escribirCookie`.

### 8.2 Cobertura Perdida respecto a `PROYECTO_RDA_1`
Se constata la pérdida de las siguientes suites especializadas:
1. `prueba-accesibilidad.mjs`: Comprobación exhaustiva de roles WAI-ARIA, resolución de identificadores en `aria-labelledby`/`aria-describedby` y prohibición de tabindex positivo.
2. `prueba-responsive.mjs`: Medición en navegador Chromium de desbordes horizontales (reflujo WCAG 1.4.10) a 320, 360, 420, 768 y 1280 px; contraste computado en ambos temas.
3. `prueba-navegador.mjs`: Recorrido completo de usuario (flujo de compra, adición al carrito, modal de autenticación, panel administrativo).
4. `prueba-arquitectura.mjs`: Verificación de contratos entre capas MVC, teclado y foco en diálogos modales.
5. `prueba-enlaces.mjs`: Seguridad de destinos externos (`rel="noopener"`) y resolución de rutas relativas.
6. `prueba-hash.mjs`: Comprobación de que la lógica de hash y `pf-posicion-pendiente` estuviera aislada en módulos JS.
7. `prueba-html.mjs`: Validación de estructura semántica, landmarks y jerarquía de encabezados.
8. `prueba-logica.mjs`: Lógica unitaria del carrito y modelos de datos.
9. `prueba-repo.mjs`: Persistencia y respaldo en almacenamiento local.
10. `prueba-selectores.mjs`: Análisis de coherencia entre los selectores invocados en controladores y los IDs/clases del DOM.

---

## 9. Mejoras de Diseño Sugeridas (Separadas de Defectos)

1. **Estandarización del Isotipo Oficial en Alta Resolución:**
   - Vectorizar el logo oficial `logo-planeta.png` a SVG con capas optimizadas para modo oscuro (letras blancas/amarillas) y modo claro (letras en negro grafito `#1A1A1A`), eliminando el bitmap pesado de 183 KB y garantizando nitidez perfecta en pantallas retina (HiDPI).
2. **Microinteracciones y Feedback Visual en Botones de Catálogo:**
   - Cuando un producto se añade al carrito, el botón "Agregar al carrito" debería mostrar una transición temporal de confirmación (icono de check y texto "¡Agregado!") durante 1.5 segundos antes de retornar a su estado normal, complementando el aviso toast flotante.
3. **Mejora del Estado Vacío en el Carrito y Tienda:**
   - Los estados vacíos actuales muestran únicamente un texto plano (`<p class="pf-mensaje">`). Se sugiere diseñar un componente visual con una ilustración o icono temático de gimnasio (mancuerna o carrito estilizado), acompañado de un botón de llamada a la acción ("Explorar productos" o "Ver planes").
4. **Diseño de Tablas Administrativas en Móvil (Card Stacking):**
   - Aunque las tablas del panel cuentan con `.table-responsive` que permite desplazamiento horizontal, en pantallas de 320–375 px la experiencia de uso mejora significativamente adoptando un diseño de tarjetas apiladas mediante CSS `@media (max-width: 768px)`, donde cada fila se transforma en una tarjeta con etiquetas clave-valor.
5. **Indicador de Progreso en Carga de Catálogo (Skeleton Screens):**
   - Sustituir los contenedores vacíos con `aria-busy="true"` por tarjetas con efecto esqueleto animado (*skeleton shimmer*) que preserven la altura final estimada mientras resuelve la API. Esto elimina por completo el salto visual de maqueta (Cumulative Layout Shift - CLS) y previene problemas como R3 de raíz.

---

## 10. Orden Recomendado para Corregir

Las correcciones deben aplicarse en el siguiente orden de prioridad, agrupando las modificaciones por archivo para maximizar la eficiencia y evitar retrabajos:

### Bloque 1: Vulnerabilidades Críticas de Seguridad
1. **`frontend/controllers/pedidos.controller.js`**
   - Sanitizar líneas 35 y 44 reemplazando `${e.mensaje}` por `textContent` o envolviendo la variable en `${escapar(e.mensaje)}` para neutralizar el vector XSS (Hallazgo H01).
2. **`frontend/controllers/auth.controller.js`**
   - Escapar las propiedades `n.id` y `n.descripcion` en la línea 73 antes de generar los elementos `<option>` (Hallazgo H02).

### Bloque 2: Navegación, Desplazamiento y Scroll (Bugs R1, R2 y R3)
3. **`frontend/controllers/main.controller.js`**
   - Configurar `history.scrollRestoration = 'manual'`.
   - Agregar inmediatamente la clase `pf-posicion-pendiente` a `document.documentElement` si `location.hash` está presente al cargar la página.
4. **`frontend/controllers/inicio.controller.js`**
   - Implementar la función `alinearConHash()` y ejecutarla dentro del bloque `finally` de `iniciarInicio()` tras inyectar planes y productos.
   - Conectar un listener a `window.addEventListener('load', () => requestAnimationFrame(alinearConHash))`.
   - Retirar la clase `pf-posicion-pendiente` únicamente después de que la posición ha sido fijada con `behavior: 'instant'`.
5. **`frontend/controllers/comunes.controller.js`**
   - Restaurar el interceptor delegado de clics para enlaces `a[href^="#"]`, calculando el desplazamiento con compensación dinámica del encabezado (`offset = header.offsetHeight`).
   - Reincorporar el `IntersectionObserver` que detecta la sección visible y actualiza dinámicamente `.pf-enlace-activo` y `aria-current="location"` en el menú principal (Hallazgo H03).

### Bloque 3: Accesibilidad WCAG AA y Contraste (Bug R4 y Hallazgos H05, H06, H07, H08)
6. **`frontend/assets/css/styles.css`**
   - Modificar la definición de `--pf-amarillo-texto` en modo claro a `#664d00` (garantizando ratio > 5:1 en todos los fondos claros).
   - Eliminar el calificador `:has(body:not(.pf-admin))` en los bloques de modo claro para que los estilos del panel administrativo también hereden variables de texto legibles.
   - Añadir `min-height: 24px; display: inline-flex; align-items: center;` a los enlaces de pie de página para cumplir el objetivo táctil mínimo de 24×24 px (Hallazgo H07).
7. **`frontend/assets/js/identidad.js`**
   - Asignar `amarilloTexto: 'var(--pf-amarillo-texto)'` en la configuración de Tailwind para que las clases `text-pf-amarillo` se adapten al tema activo.
   - Envolver la configuración en `if (typeof tailwind !== 'undefined')` o inicializar `window.tailwind = window.tailwind || {};` para prevenir caídas offline (Hallazgo H04).
8. **`frontend/controllers/admin-productos.controller.js` y `admin-pedidos.controller.js`**
   - Incorporar atributos `aria-label` descriptivos en los botones de acción de cada fila ("Editar", "Desactivar", "Pago reportado", "Cancelar") especificando el nombre o código del registro (Hallazgos H05 y H06).

### Bloque 4: Identidad Visual y Accesos Administrativos (Bugs R5 y R6)
9. **`frontend/cliente/login.html`**
   - Añadir el párrafo con enlace a `../admin/login.html` en la sección de inicio de sesión.
   - Reemplazar el pie de página simplificado por el pie de página institucional completo de 4 columnas.
10. **`frontend/cliente/mis-pedidos.html`**
    - Estandarizar el pie de página con las 4 columnas de navegación y accesos.
11. **`frontend/views/carrito.view.js`**
    - Incorporar el enlace de acceso administrativo en el modal de inicio de sesión.
12. **`frontend/admin/*.html` (11 archivos)**
    - Reemplazar el marcado de `logo-blanco.svg` por el isotipo oficial del gimnasio y asegurar que en `admin/pedidos.html` y `admin/productos.html` se incluya la imagen del logo en el navbar.
    - Incorporar directamente en el HTML estático los elementos `<aside data-aviso-cookies>` y `<div data-aviso>` (Hallazgo H09).
13. **`frontend/views/tema.view.js`**
    - Trasladar las llamadas a `escribirCookie` y el registro de eventos del botón a `controllers/comunes.controller.js`, manteniendo la vista puramente declarativa (Hallazgo H11).
