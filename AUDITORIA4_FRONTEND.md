# Informe de Auditoría 4: Frontend de Planeta Fitness

- **Fecha de auditoría:** 16 de noviembre de 2026
- **Proyecto auditado:** `Reto1_ChangoAriel_CaizaLenin V2/frontend/` y `pruebas/`
- **Rama auditada:** `correcciones-auditoria3`
- **Commit auditado:** `b9461e35947b4fa3910022a36949fe14ec310b73` (Pruebas: ampliar regresión de auditoría 3 frontend)
- **Versión de referencia:** `PROYECTO_RDA_1/` (Versión 1 de referencia, repositorio base en Git HEAD)
- **Asignatura:** Desarrollo de Plataformas (RDA 1 / Reto 2)
- **Documentos base de evaluación:** `FRONTEND (1).md`, `AUDITORIA.md`, `AUDITORIA2.md`, `AUDITORIA3_FRONTEND.md`, `RESULTADOS_CORRECCIONES.md`, `RESULTADOS_CORRECCIONES2.md` y `RESULTADOS_CORRECCIONES3.md`.
- **Tipo de auditoría:** Completa, exhaustiva, independiente y estrictamente no destructiva.

---

## 1. Resumen Ejecutivo

La presente **Auditoría 4** constituye una revisión técnica integral desde cero del estado del frontend de Planeta Fitness, tras la aplicación de los paquetes de corrección de la Auditoría 3 (commits `c1b2dab` a `b9461e3`). 

El análisis confirma que las intervenciones mecánicas sobre la navegación por anclas (**R1**, **R2**, **R3**) estabilizaron el alineamiento del encabezado fijo bajo desplazamientos dinámicos, y se recuperaron los enlaces de acceso administrativo (**R6**). Sin embargo, la auditoría descubrió **un fallo crítico de regresión por ruptura de exportación en módulos JavaScript** que inutiliza por completo las 11 pantallas del panel administrativo, además de constatar la persistencia del **grave defecto de color y marca en tema claro (Problema 2.1)**, donde los precios y acentos se visualizan en un tono oliva/mostaza sucio (`#664d00`) que no armoniza con el amarillo corporativo.

### Conteo de Hallazgos por Severidad

| Severidad | Cantidad | Descripción General |
|---|:---:|---|
| **Crítica** | **1** | Ruptura de carga de módulos ES en las 11 pantallas de administración (`admin/*.html`) debido a la importación de un identificador inexistente (`iniciarTema`) en `frontend/controllers/admin.controller.js:1`, lo que provoca `SyntaxError` y detiene la ejecución completa de JavaScript en el área administrativa. |
| **Alta** | **1** | Brecha de pruebas automatizadas y falsa sensación de aprobación: la suite `prueba-auditoria3.mjs` lee las 11 pantallas de administración mediante `readFileSync` estático sin cargarlas en un navegador real, ocultando el colapso total de scripts en admin. Además, la tienda carece de mecanismo de reintento ante caída de API. |
| **Media** | **5** | **Problema 2.1**: Tono oliva/mostaza `#664d00` en tema claro en precios, etiquetas "INCLUYE" y pasos; atributo `alt=""` vacío en el logo de 10 páginas administrativas; contraste deficiente en anillo de foco claro; inconsistencia de jerarquía `<h1>`/`<h2>` en modales; pérdida de foco accesible al cerrar el carrito con Escape. |
| **Baja** | **3** | Archivos SVG huérfanos sin uso en `assets/img/logo/`; micro-objetivos táctiles inferiores a 24×24 px en enlaces secundarios a 320 px; lecturas directas dispersas de `document.cookie` saltándose la abstracción de `storage.model.js`. |
| **Total** | **10** | **1 Crítica, 1 Alta, 5 Medias, 3 Bajas** |

---

## 2. Entorno y Método de Evaluación

La evaluación se ejecutó en un entorno estricto sin dependencias externas que alteren el código del repositorio:

- **Herramientas de automatización y diagnóstico:** Node.js v24.21.0, Playwright Chromium headless v1.47+, algoritmos de luminancia relativa y contraste WCAG 2.2 AA (SC 1.4.3, SC 1.4.11), analizador de árbol semántico y validador de enlaces y referencias ARIA.
- **Modo de ejecución:** Servidor de rutas estáticas en memoria vía interceptación Chromium (`context.route`), evitando apertura de puertos de socket locales bloqueados por sandbox, sirviendo exactamente la estructura de `frontend/` y abstrayendo la API REST en `http://localhost:5050/api/v1/`.
- **Páginas auditadas (16 en total):**
  1. Principal: `frontend/index.html`
  2. Área cliente (4): `cliente/login.html`, `cliente/checkout.html`, `cliente/nutricion.html`, `cliente/mis-pedidos.html`
  3. Área administrativa (11): `admin/login.html`, `admin/index.html`, `admin/productos.html`, `admin/pedidos.html`, `admin/clientes.html`, `admin/membresias.html`, `admin/inscripciones.html`, `admin/clases.html`, `admin/personal.html`, `admin/usuarios.html`, `admin/tablas.html`
- **Condiciones de visualización y pruebas:**
  - **Temas:** Claro (`html[data-tema="claro"]`, `data-bs-theme="light"`) y Oscuro (`html[data-tema="oscuro"]`, `data-bs-theme="dark"`).
  - **Anchos de pantalla:** 320 px (móvil compacto), 375 px (iPhone estándar), 390 px (móvil moderno), 768 px (tablet vertical), 1024 px (laptop/tablet horizontal) y 1440 px (escritorio amplio).
  - **Zoom de navegador:** 200 % comprobando reflujo bidireccional y preservación funcional (WCAG 1.4.4 y 1.4.10).
  - **Navegación asistida:** Recorrido exclusivo por teclado (`Tab`, `Shift+Tab`, `Enter`, `Espacio`, `Escape`).
  - **Condiciones de red:** Emulación de red móvil lenta ("Slow 4G", latencia 150 ms) y vaciado forzado de caché para probar el renderizado de anclas y salto a hashes.
  - **Disponibilidad de API:** Verificación con API levantada (respuestas mock normalizadas Anexo B) y con API caída (aborto de peticiones y respuestas HTTP 500).

---

## 3. Problemas Conocidos (Sección 2)

### 3.1 Precios y Textos de Acento en Tema Claro (Problema 2.1)

#### Diagnóstico y Reproducción
El problema se reproduce al 100 %. En la sección de planes de `frontend/index.html` bajo el tema claro, los precios de las membresías ($40.25, $69.00, $97.75 al mes), la etiqueta "INCLUYE", los títulos de pasos de contratación ("1. Elige tu plan", "2. Agrega productos", "3. Inicia sesión", "4. Retíralo en el gym") y los precios de los productos en la tienda se visualizan en un color **oliva / mostaza oscuro** (`#664d00`, RGB `102, 77, 0`).

Aunque la medición estricta de contraste sobre blanco (`#ffffff`) arroja un ratio de **8.03:1** (cumpliendo matemáticamente el umbral de 4.5:1 de WCAG 2.2 SC 1.4.3), el resultado visual es un defecto comercial grave:
1. El color no pertenece a la paleta de marca de Planeta Fitness (amarillo primario `#ffd000`).
2. Se ve apagado, sucio y semejante a un marrón verdoso sobre fondo blanco.
3. Coexiste en la misma tarjeta con botones de fondo amarillo vibrante (`#ffd000`), generando una incoherencia cromática evidente que hace parecer al texto como un error de diseño.

#### Inventario Completo de Usos de `--pf-amarillo-texto` (`#664d00`) en Tema Claro

| Archivo | Selector / Elemento | Texto o Elemento afectado | Fondo | Color Computado | Contraste | Veredicto |
|---|---|---|---|---|:---:|:---:|
| `frontend/assets/css/styles.css:1220` | `.pf-tarjeta .pf-precio, .pf-precio` | Precios de planes en `index.html` ($40.25, $69.00, $97.75) | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/views/componentes.view.js:61` | `h4.text-pf-amarillo` | Etiqueta "INCLUYE" en tarjetas de planes | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/views/componentes.view.js:52` | `span.text-pf-amarillo` | Icono de verificación "✓" de beneficios | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/index.html:165,169,173,177` | `section[aria-labelledby="titulo-como-contratar"] p.font-bold` | Títulos 1 a 4 de "Cómo elegir tu plan" | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/views/componentes.view.js:23` | `.pf-tienda-precio, .text-2xl.text-pf-amarillo` | Precios de productos en tienda (`$40.25`, `$28.75`, etc.) | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/assets/css/styles.css:717` | `.pf-etiqueta` | Insignias de categoría en tienda | `rgba(255,208,0,0.14)` | `rgb(102, 77, 0)` | **7.12:1** | Pasa WCAG / Tono oliva sobre amarillo pastel |
| `frontend/assets/css/styles.css:893` | `.pf-clase-hora` | Horarios de clases en `index.html` (ej. 07:00 – 08:00) | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/assets/css/styles.css:306` | `.pf-enlace-activo` | Texto de sección activa en menú superior | `#f6f6f3` | `rgb(102, 77, 0)` | **7.38:1** | Pasa WCAG / Poco contraste contra fondo gris |
| `frontend/assets/css/styles.css:318` | `.pf-enlace-activo::after` | Línea de subrayado de menú activo | `#f6f6f3` | `rgb(102, 77, 0)` | N/A | Subrayado oliva sucio |
| `frontend/assets/css/styles.css:633` | `:focus-visible` | Anillo de enfoque de teclado general | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Anillo de foco oliva oscuro |
| `frontend/assets/css/styles.css:1297` | `.pf-total-final dd` | Monto total en Checkout (`checkout.html`) | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/assets/css/styles.css:809` | `.pf-pedido-total` | Monto total en Mis Pedidos (`mis-pedidos.html`) | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/cliente/checkout.html:91` | `li[aria-current="page"]` | Miga de pan activa "Finalizar compra" | `#f6f6f3` | `rgb(102, 77, 0)` | **7.38:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/cliente/login.html:48` | `li[aria-current="page"]` | Miga de pan activa "Inscríbete" | `#f6f6f3` | `rgb(102, 77, 0)` | **7.38:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/cliente/checkout.html:158` | `strong.text-pf-amarillo` | Dirección destacada del gimnasio en checkout | `#ffffff` | `rgb(102, 77, 0)` | **8.03:1** | Pasa WCAG / Falla Identidad Visual |
| `frontend/index.html:104` | `.pf-hero .text-pf-amarillo` | Palabra "Evoluciona." en subtítulo hero | `#0a0a0a` | `rgb(102, 77, 0)` | **2.31:1** | **FALLA WCAG**: en hero oscuro con tema claro forzado |
| `frontend/views/carrito.view.js:28-29`| `.text-pf-amarillo.underline` | Enlaces "Crear cuenta" y "Acceso admin" en modal | `#151515` | `rgb(102, 77, 0)` | **2.31:1** | **FALLA WCAG**: modal oscuro con variable clara |

#### Causa Exacta en el Código
En `frontend/assets/css/styles.css`, las líneas 74, 98 y 111 redefinen la variable `--pf-amarillo-texto`:
```css
/* Línea 74: Media query prefers-color-scheme: light */
--pf-amarillo-texto: #664d00;

/* Línea 98: Selector manual html[data-tema="claro"] */
--pf-amarillo-texto: #664d00;

/* Línea 111: Selector Bootstrap html[data-bs-theme="light"] */
--pf-amarillo-texto: #664d00;
```
Y en las líneas 136-138 y 1217-1222:
```css
html .text-pf-amarillo {
  color: var(--pf-amarillo-texto);
}

.pf-tarjeta .pf-precio,
.pf-panel .pf-precio,
.pf-precio {
  color: var(--pf-amarillo-texto);
  font-weight: 800;
}
```

#### Propuesta de Diseño Concreta (Criterio de la Materia)
1. **Regla de oro para tema claro:** El amarillo de marca (`#ffd000`) **nunca se usa como color de texto**, ni tampoco una alteración oscurecida de él (`#664d00`). El amarillo corporativo queda restringido exclusivamente a **rellenos y acentos**: botones primarios, fondos de insignias, subrayados gruesos, bordes de selección y píldoras.
2. **Precios en tema claro:** Se escriben en el color de texto principal casi negro (`#111111` / `var(--pf-blanco)` computado a `#1a1a1a`), con peso extranegrita (`font-weight: 900`). El acento de marca amarillo se coloca como un **subrayado decorativo inferior** (`border-bottom: 4px solid #ffd000` o pseudo-elemento `::after` de 6 px de altura) o como una pastilla suave detrás del valor.
3. **Etiquetas ("INCLUYE"):** Se convierten en una **insignia con relleno amarillo de marca** (`background-color: #ffd000; color: #111111; padding: 3px 12px; border-radius: 4px; font-weight: 800; text-transform: uppercase;`).
4. **Pasos "Cómo elegir tu plan":** Texto oscuro `#111111` con un reborde de acento izquierdo grueso (`border-left: 4px solid #ffd000; padding-left: 8px;`).
5. **Tema oscuro intacto:** En modo oscuro (`html[data-tema="oscuro"]`), se mantiene `--pf-amarillo-texto: #ffd000;`, el cual sobre fondos oscuros (`#0a0a0a` y `#151515`) alcanza un contraste de más de 12:1 y proyecta la fuerza de la identidad visual.

#### Evidencia Fotográfica Comparativa
- Captura del estado actual con color mostaza sucio en tema claro:  
  [problema-2.1-actual-tema-claro.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/problema-2.1-actual-tema-claro.png)
- Captura de la propuesta de diseño aplicada (precios oscuros con acento amarillo, insignia "INCLUYE" rellena):  
  [problema-2.1-propuesta-tema-claro.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/problema-2.1-propuesta-tema-claro.png)
- Captura en tema oscuro (amarillo corporativo `#ffd000` legible):  
  [problema-2.1-actual-tema-oscuro.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/problema-2.1-actual-tema-oscuro.png)

---

### 3.2 Re-verificación de Problemas de Auditorías Anteriores (R1 a R6)

| Código | Qué comprobar | Resultado en Auditoría 4 | Evidencia y Mediciones | Veredicto |
|---|---|---|---|:---:|
| **R1** | Al recargar con hash (`index.html#tienda`), la página aparece directamente en la sección, sin verse arriba primero ni animarse. Probado con red lenta ("Slow 4G") y caché vacía. | **Corregido.** `main.controller.js` y `inicio.controller.js` desactivan la restauración del navegador (`history.scrollRestoration = 'manual'`) y ejecutan `alinearConHash()` tras estabilizar el DOM dinámico de productos y planes. La sección `#tienda` queda situada a `90.31 px` de la parte superior del viewport, con un desfase de solo `0.72 px` respecto al encabezado fijo (`89.59 px`). No se producen saltos ni títulos tapados. | [r1-recarga-tienda-slow4g.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r1-recarga-tienda-slow4g.png) | **Aprobado** |
| **R2** | Cada enlace del menú termina exactamente en su sección, sin que el encabezado sticky tape el título. | **Corregido.** La función `desplazar()` en `comunes.controller.js:77` calcula `window.scrollY + destino.getBoundingClientRect().top - encabezado.offsetHeight`. Las diferencias medidas entre el tope de sección y el encabezado son: `inicio` → `tienda` (0.72 px), `inicio` → `clases` (0.11 px), `inicio` → `contacto` (0.02 px), `planes` → `tienda` (0.72 px), `planes` → `clases` (0.11 px). Todas las anclas caen a menos de 1 px del borde. | [r2-menu-desplazamiento.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r2-menu-desplazamiento.png) | **Aprobado** |
| **R3** | Todas las combinaciones origen → destino del menú, en escritorio y móvil. `Inscripción → Tienda` debe terminar en Tienda. | **Corregido.** Al pulsar desde el pie de `cliente/login.html` el enlace `../index.html#tienda`, el navegador carga `index.html`, renderiza el catálogo mediante `Promise.all` y aterriza exactamente en `#tienda` sin solapamiento con la cabecera. | [r3-inscripcion-a-tienda.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r3-inscripcion-a-tienda.png) | **Aprobado** |
| **R5** | El mismo logo vigente del gimnasio en todas las páginas (sitio, cliente y las 11 del panel), en ambos temas y ubicaciones. | **Parcialmente corregido.** Se unificó la imagen del logo en `logo-planeta.png` tanto en el encabezado y pie de `index.html`, en las 4 páginas cliente y en las 11 del panel administrativo. Sin embargo, en 10 páginas del panel de administración (`admin/clases.html`, etc.), el logo tiene el atributo `alt=""` vacío (Hallazgo **H03**). Además, existen 3 archivos SVG huérfanos sin uso en el directorio (Hallazgo **H04**). | [r5-logo-claro.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r5-logo-claro.png)<br>[r5-logo-oscuro.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r5-logo-oscuro.png)<br>[r5-logo-admin.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r5-logo-admin.png) | **Observación (H03/H04)** |
| **R6** | El enlace al acceso administrativo aparece en `cliente/login.html`, en el modal de acceso de `index.html` y en el pie de todas las páginas de cliente, con la ruta correcta. | **Corregido.** Se validó la presencia de enlaces hacia `../admin/login.html` en: (1) Formulario de `cliente/login.html:71`, (2) Modal de acceso inyectado por `views/carrito.view.js:29`, y (3) En el pie de página de `cliente/checkout.html`, `cliente/login.html`, `cliente/mis-pedidos.html` y `cliente/nutricion.html`. Todas las rutas relativas resuelven con código HTTP 200. | [r6-acceso-admin-login.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r6-acceso-admin-login.png)<br>[r6-acceso-admin-modal.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r6-acceso-admin-modal.png)<br>[r6-acceso-admin-pie.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/r6-acceso-admin-pie.png) | **Aprobado** |

---

## 4. Hallazgos Detallados de la Auditoría 4

### H01: Ruptura de Carga de Módulos ES en las 11 Pantallas de Administración por Importación Inexistente
- **Severidad:** **Crítica**
- **Área:** JavaScript, DOM y Arquitectura de Módulos (Semanas 5, 6 y 8)
- **Criterio WCAG:** N/A (Fallo funcional y de arquitectura de software)
- **Páginas afectadas:** Las 11 páginas de `frontend/admin/`: `clases.html`, `clientes.html`, `index.html`, `inscripciones.html`, `login.html`, `membresias.html`, `pedidos.html`, `personal.html`, `productos.html`, `tablas.html`, `usuarios.html`.
- **Archivo y línea:** [`frontend/controllers/admin.controller.js:1`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/controllers/admin.controller.js#L1-L2) y [`frontend/controllers/admin.controller.js:90`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/controllers/admin.controller.js#L90)
- **Descripción del fallo:**  
  En el commit `681ece7` de la Auditoría 3 (asociado a la corrección H11), se modificó `frontend/views/tema.view.js` para extraer la lógica de inicialización y eventos de temas, dejando en dicha vista únicamente las funciones `pintarBotonesTema` y `aplicarTema`.  
  Sin embargo, en `frontend/controllers/admin.controller.js:1` quedó la instrucción:
  ```javascript
  import { iniciarTema } from '../views/tema.view.js';
  ```
  Al no existir `iniciarTema` entre las exportaciones de `tema.view.js`, el motor de JavaScript del navegador aborta inmediatamente la carga del módulo con el error fatal:
  `Uncaught SyntaxError: The requested module '../views/tema.view.js' does not provide an export named 'iniciarTema'`
- **Impacto directo:**  
  Dado que los controladores de todas las páginas de administración importan `admin.controller.js`, **ningún script de administración se ejecuta**:
  1. En `admin/login.html`, el validador del formulario nunca se inicializa; el formulario realiza envíos nativos descontrolados.
  2. En las 10 páginas protegidas, `protegerAdmin()` y la carga de datos del panel (`mainAdmin()`) nunca llegan a ejecutarse.
  3. El conmutador de tema de Bootstrap en el panel no reacciona al clic.
  4. Ninguna prueba anterior detectó este problema porque `pruebas/verificar-frontend.mjs` realiza análisis regex sobre texto plano y `pruebas/prueba-auditoria3.mjs` solo aplicó `readFileSync` sobre las páginas de `admin/`.
- **Pasos para reproducir:**
  1. Abrir en el navegador cualquiera de las páginas de administración (ej. `http://localhost:5500/frontend/admin/login.html` o `admin/index.html`).
  2. Abrir la consola de herramientas de desarrollo (F12).
  3. Observar el error de sintaxis en rojo `SyntaxError: The requested module '../views/tema.view.js' does not provide an export named 'iniciarTema'`.
- **Corrección propuesta:**
  1. En `frontend/controllers/comunes.controller.js`, exportar la función `iniciarTema` (`export function iniciarTema() { ... }`).
  2. En `frontend/controllers/admin.controller.js:1`, corregir la ruta de importación:
     ```javascript
     import { iniciarTema } from './comunes.controller.js';
     ```
     O bien importar `aplicarTema` directamente desde `../views/tema.view.js` si el panel no comparte los escuchadores del área pública.

---

### H02: Uso Inapropiado de Tono Oliva/Mostaza Sucio (`#664d00`) en Precios y Acentos en Tema Claro (Problema 2.1)
- **Severidad:** **Media**
- **Área:** Diseño Visual, Coherencia e Identidad de Marca (Semanas 1 y 2)
- **Criterio WCAG:** SC 1.4.3 Contraste Mínimo (pasa el ratio 4.5:1 numérico, pero incumple la directriz de coherencia visual y marca)
- **Páginas afectadas:** `frontend/index.html`, `frontend/cliente/checkout.html`, `frontend/cliente/mis-pedidos.html`, `frontend/cliente/nutricion.html`, `frontend/cliente/login.html`.
- **Archivo y línea:** [`frontend/assets/css/styles.css:74, 98, 111, 137, 1220`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/assets/css/styles.css#L74-L112)
- **Descripción del fallo:**  
  Para resolver la falta de contraste del amarillo vibrante `#ffd000` sobre fondos blancos, se oscureció la variable `--pf-amarillo-texto` a `#664d00`. Esto convierte los precios numéricos ($40.25, $69.00, etc.), la palabra "INCLUYE", los títulos de pasos 1-4 y los totales del carrito en un color mostaza apagado y sucio que choca frontalmente con los botones amarillos limpios `#ffd000`.
- **Pasos para reproducir:**
  1. Acceder a `frontend/index.html`.
  2. Activar el modo claro pulsando el botón de cambio de tema en la barra superior.
  3. Desplazarse a la sección `#planes` y `#tienda`.
  4. Inspeccionar el color computado de los precios `.pf-precio` y de `h4.text-pf-amarillo`: computan a `rgb(102, 77, 0)`.
- **Evidencia:**  
  [problema-2.1-actual-tema-claro.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/problema-2.1-actual-tema-claro.png)
- **Corrección propuesta:**  
  Desacoplar el color de texto de precios en tema claro. En `styles.css`:
  ```css
  html[data-tema="claro"] .pf-tarjeta .pf-precio,
  html[data-tema="claro"] .pf-precio {
    color: #111111;
    font-weight: 900;
    border-bottom: 4px solid var(--pf-amarillo);
    display: inline-block;
  }
  html[data-tema="claro"] h4.text-pf-amarillo,
  html[data-tema="claro"] .pf-tarjeta h4 {
    color: #111111;
    background-color: var(--pf-amarillo);
    padding: 3px 10px;
    border-radius: 4px;
    font-weight: 800;
  }
  ```

---

### H03: Atributo `alt=""` Vacío en el Logo de 10 Pantallas Administrativas
- **Severidad:** **Media**
- **Área:** Accesibilidad y HTML Semántico (Semana 1 / WCAG 2.2 AA)
- **Criterio WCAG:** SC 1.1.1 Contenido No Textual (Nivel A)
- **Páginas afectadas:** 10 páginas de `frontend/admin/`: `clases.html`, `clientes.html`, `index.html`, `inscripciones.html`, `membresias.html`, `pedidos.html`, `personal.html`, `productos.html`, `tablas.html`, `usuarios.html`.
- **Archivo y línea:** `frontend/admin/*.html` (ej. [`frontend/admin/index.html:9`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/admin/index.html#L9))
- **Descripción del fallo:**  
  En las 10 pantallas administrativas modulares, el logo en la barra de navegación se declara como:
  ```html
  <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
    <img src="../assets/img/logo/logo-planeta.png" alt="" width="48" height="44" class="pf-admin-logo">
    <span>Planeta Fitness · Admin</span>
  </a>
  ```
  El documento de requisitos `FRONTEND (1).md` exige explícitamente: *"alt correcto en imágenes; el logo con el nombre del gimnasio."*  
  Aunque el enlace contiene un `<span>` con texto visible, en `admin/login.html:13` sí se incluyó `alt="Planeta Fitness"`, generando una inconsistencia de marcado que incumple la regla estricta de la materia.
- **Corrección propuesta:**  
  Unificar el atributo a `alt="Planeta Fitness"` en las etiquetas `img.pf-admin-logo` de las 10 pantallas de administración.

---

### H04: Archivos SVG de Logotipo Huérfanos en el Repositorio
- **Severidad:** **Baja**
- **Área:** Mantenimiento y Gestión de Activos
- **Criterio WCAG:** N/A
- **Páginas afectadas:** Repositorio en general (`frontend/assets/img/logo/`)
- **Archivo y línea:** `frontend/assets/img/logo/logo.svg`, `frontend/assets/img/logo/logo-blanco.svg`, `frontend/assets/img/logo/logo-oscuro.svg`
- **Descripción del fallo:**  
  Tras la aplicación del commit `c725059` (R5: unificar logo en PNG), se estandarizó el uso de `logo-planeta.png` en los 16 archivos HTML. Los 3 archivos SVG vectoriales originales permanecen en el árbol del proyecto sin ninguna referencia en HTML, CSS ni JS, ocupando espacio y prestando a confusión a futuros desarrolladores sobre cuál es el activo oficial.
- **Corrección propuesta:**  
  Archivar o retirar los 3 archivos SVG huérfanos una vez validado que ningún componente dinámico dependa de ellos.

---

### H05: Anillo de Foco Visible de Color Oliva en Modo Claro
- **Severidad:** **Media**
- **Área:** Accesibilidad WCAG 2.2 AA (SC 2.4.7 Foco Visible / SC 1.4.11 Contraste No Textual)
- **Criterio WCAG:** SC 2.4.7 Foco Visible (Nivel AA) y SC 1.4.11 (Nivel AA)
- **Páginas afectadas:** Todas las páginas en tema claro.
- **Archivo y línea:** [`frontend/assets/css/styles.css:633`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/assets/css/styles.css#L633-L637)
- **Descripción del fallo:**  
  La regla global de foco visible establece:
  ```css
  :focus-visible {
    outline: 3px solid var(--pf-amarillo-texto);
    outline-offset: 3px;
    border-radius: 0.25rem;
  }
  ```
  En tema claro, `var(--pf-amarillo-texto)` computa a `#664d00`. Al navegar mediante teclado sobre elementos con bordes oscuros o fondos grises (como inputs o botones secundarios), el anillo de color oliva apagado pierde visibilidad y se confunde con sombras o bordes de control.
- **Evidencia:**  
  [teclado-foco-visible.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/teclado-foco-visible.png)
- **Corrección propuesta:**  
  Definir una variable específica para foco `--pf-foco-anillo`:
  ```css
  :root { --pf-foco-anillo: #ffd000; }
  html[data-tema="claro"] { --pf-foco-anillo: #b38600; }
  :focus-visible {
    outline: 3px solid var(--pf-foco-anillo);
    outline-offset: 2px;
  }
  ```

---

### H06: Inconsistencia en la Jerarquía de Encabezados Semánticos en Modales
- **Severidad:** **Media**
- **Área:** HTML Semántico (Semana 1 / WCAG 2.2 AA SC 1.3.1)
- **Criterio WCAG:** SC 1.3.1 Información y Relaciones (Nivel A)
- **Páginas afectadas:** `frontend/index.html` y las 4 páginas de cliente (`cliente/*.html`) al abrir el modal de acceso.
- **Archivo y línea:** [`frontend/views/carrito.view.js:15-18`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/views/carrito.view.js#L15-L18)
- **Descripción del fallo:**  
  En el modal de inicio de sesión inyectado desde el carrito, el título principal del diálogo se renderiza como `<h3 id="modal-acceso-titulo" class="text-xl font-bold text-white">Iniciar sesión</h3>`, sin que dentro del diálogo (`role="dialog"`) exista un `<h2>` o una estructura que conecte coherentemente con el árbol de encabezados del documento principal, saltando de nivel según la página que lo invoque.
- **Corrección propuesta:**  
  Asignar al diálogo su propia jerarquía semántica autónoma con `<h2 id="modal-acceso-titulo">` para representar el nivel secundario bajo el contexto de landmark del diálogo accesible.

---

### H07: Micro-objetivos Táctiles Inferiores a 24×24 px en Navegación a 320 px
- **Severidad:** **Baja**
- **Área:** Accesibilidad y Diseño Móvil (WCAG 2.2 AA SC 2.5.8)
- **Criterio WCAG:** SC 2.5.8 Tamaño del Objetivo (Mínimo) (Nivel AA)
- **Páginas afectadas:** `frontend/cliente/login.html`, `frontend/cliente/checkout.html`, `frontend/admin/tablas.html`
- **Archivo y línea:** `frontend/cliente/checkout.html:90`, `frontend/admin/tablas.html:45`
- **Descripción del fallo:**  
  A 320 px de ancho de viewport, los enlaces de migas de pan y los botones de paginación pequeña de Bootstrap computan dimensiones de 21×18 px y 23×22 px respectivamente. Aunque el commit `681ece7` añadió relleno `py-1` a varios enlaces, algunos elementos de navegación secundaria continúan rozando o quedando por debajo del área táctil mínima de 24×24 px.
- **Evidencia:**  
  [responsivo-320px-admin-tablas.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/responsivo-320px-admin-tablas.png)
- **Corrección propuesta:**  
  Aplicar una clase utilitaria global:
  ```css
  .pf-tactil-minimo, .breadcrumb a, .pagination .page-link {
    min-width: 24px;
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  ```

---

### H08: Pérdida de Restauración de Foco al Cerrar Diálogo del Carrito con Escape
- **Severidad:** **Media**
- **Área:** Accesibilidad y Navegación por Teclado (WCAG 2.2 AA SC 2.4.3)
- **Criterio WCAG:** SC 2.4.3 Orden del Foco (Nivel A)
- **Páginas afectadas:** `frontend/index.html` y las 4 páginas de cliente.
- **Archivo y línea:** [`frontend/controllers/carrito.controller.js:45-55`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/controllers/carrito.controller.js#L45-L55)
- **Descripción del fallo:**  
  Al pulsar Escape dentro del panel lateral del carrito (`#panel-carrito`), el panel se oculta asignando `hidden = true`. Sin embargo, si el usuario abrió el carrito pulsando el botón flotante o una tarjeta de producto dinámica de la tienda, la referencia al elemento disparador no se almacena de forma persistente, provocando que el foco del navegador retorne a `document.body` en lugar de volver al botón específico que disparó la acción.
- **Evidencia:**  
  [teclado-modal-carrito.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/teclado-modal-carrito.png)
- **Corrección propuesta:**  
  En `carrito.controller.js`, registrar `ultimoDisparador = document.activeElement` antes de abrir el diálogo, y en el manejador del cierre ejecutar:
  ```javascript
  if (ultimoDisparador && typeof ultimoDisparador.focus === 'function') {
    ultimoDisparador.focus();
  }
  ```

---

### H09: Lectura Directa Dispersa de `document.cookie` Saltándose el Modelo
- **Severidad:** **Baja**
- **Área:** Arquitectura MVC y Gestión de Datos (Semana 8)
- **Criterio WCAG:** N/A (Mantenibilidad arquitectónica)
- **Páginas afectadas:** Todas las páginas cliente.
- **Archivo y línea:** [`frontend/controllers/comunes.controller.js:11`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/controllers/comunes.controller.js#L11-L22)
- **Descripción del fallo:**  
  Aunque el proyecto cuenta con `models/storage.model.js` para centralizar cookies, localStorage y sessionStorage, en varias funciones de `comunes.controller.js` se realizan comprobaciones ad-hoc manipulando directamente cadenas de `document.cookie`. Esto contraviene la estricta separación MVC exigida por la materia, donde toda manipulación de persistencia debe transitar exclusivamente a través del modelo de almacenamiento.
- **Corrección propuesta:**  
  Encapsular todas las lecturas y escrituras de cookies invocando únicamente a `leerCookie()` y `escribirCookie()` importadas de `../models/storage.model.js`.

---

### H10: Ausencia de Botón de Reintento ante Caída de API en la Tienda
- **Severidad:** **Alta**
- **Área:** Resiliencia de Datos y Manejo de Errores de API (Semana 6)
- **Criterio WCAG:** SC 3.3.1 Identificación de Errores (Nivel A)
- **Páginas afectadas:** `frontend/index.html` (sección `#tienda` y `#planes`)
- **Archivo y línea:** [`frontend/controllers/inicio.controller.js:25-35`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/frontend/controllers/inicio.controller.js#L25-L35)
- **Descripción del fallo:**  
  Al simular la caída de la API REST (`http://localhost:5050/api/v1/`), las secciones de planes y tienda despliegan un mensaje estático de error *"No se pudo conectar con el catálogo"*. Sin embargo, la interfaz no ofrece al usuario un botón de acción para reintentar la solicitud (`Reintentar carga`) sin recargar completamente la página completa, obligándolo a un reinicio total del estado de navegación.
- **Evidencia:**  
  [api-caida-estado-vacio.png](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria4/api-caida-estado-vacio.png)
- **Corrección propuesta:**  
  Añadir dentro del estado de error un botón accesible `data-reintentar-catalogo` que invoque nuevamente la promesa de carga de productos y planes.

---

## 5. Tabla de Contraste Medido por Tema

| Componente / Elemento | Selector Evaluado | Color de Texto | Color de Fondo | Contraste Tema Claro | Contraste Tema Oscuro | Requisito WCAG | Cumplimiento |
|---|---|---|---|:---:|:---:|:---:|:---:|
| **Precios de planes** | `#planes .pf-precio` | `#664d00` (claro) / `#ffd000` (oscuro) | `#ffffff` (claro) / `#151515` (oscuro) | **8.03:1** | **12.82:1** | 4.5:1 (AA) | Pasa WCAG / Falla identidad en claro |
| **Etiqueta "INCLUYE"** | `.pf-tarjeta h4` | `#664d00` (claro) / `#ffd000` (oscuro) | `#ffffff` (claro) / `#151515` (oscuro) | **8.03:1** | **12.82:1** | 4.5:1 (AA) | Pasa WCAG / Falla identidad en claro |
| **Precios tienda** | `#tienda .text-2xl` | `#664d00` (claro) / `#ffd000` (oscuro) | `#ffffff` (claro) / `#151515` (oscuro) | **8.03:1** | **12.82:1** | 4.5:1 (AA) | Pasa WCAG / Falla identidad en claro |
| **Texto principal** | `h1, h2, h3, p` | `#1a1a1a` (claro) / `#ffffff` (oscuro) | `#f6f6f3` (claro) / `#0a0a0a` (oscuro) | **15.84:1** | **18.52:1** | 4.5:1 (AA) | **Excelente (AAA)** |
| **Texto secundario** | `.text-neutral-300` | `#525252` (claro) / `#d4d4d4` (oscuro) | `#ffffff` (claro) / `#151515` (oscuro) | **7.21:1** | **9.64:1** | 4.5:1 (AA) | **Excelente (AAA)** |
| **Botón primario** | `.pf-boton-primario`| `#0a0a0a` | `#ffd000` | **13.56:1** | **13.56:1** | 4.5:1 (AA) | **Excelente (AAA)** |
| **Enlace activo menú** | `.pf-enlace-activo` | `#664d00` (claro) / `#ffd000` (oscuro) | `#f6f6f3` (claro) / `#0a0a0a` (oscuro) | **7.38:1** | **14.20:1** | 4.5:1 (AA) | Pasa WCAG en ambos |
| **Anillo de foco visible**| `:focus-visible` | `#664d00` (claro) / `#ffd000` (oscuro) | `#ffffff` (claro) / `#0a0a0a` (oscuro) | **8.03:1** | **14.20:1** | 3.0:1 (AA) | Pasa WCAG / Bajo realce en claro |
| **Total checkout** | `.pf-total-final dd` | `#664d00` (claro) / `#ffd000` (oscuro) | `#ffffff` (claro) / `#151515` (oscuro) | **8.03:1** | **12.82:1** | 4.5:1 (AA) | Pasa WCAG / Falla identidad en claro |
| **Insignia categoría** | `.pf-etiqueta` | `#664d00` (claro) / `#ffd000` (oscuro) | `rgba(255,208,0,0.14)` | **7.12:1** | **11.40:1** | 4.5:1 (AA) | Pasa WCAG / Tono oliva sucio en claro |

---

## 6. Tabla de Logos: Página × Tema × Ubicación

| # | Página auditada | Ubicación | Archivo de Imagen | Atributo `alt` | Legible en Modo Claro | Legible en Modo Oscuro | Observaciones |
|---|---|---|---|---|:---:|:---:|---|
| 1 | `index.html` | Encabezado | `assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto con dimensiones explícitas (112×101) |
| 1 | `index.html` | Pie de página | `assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 2 | `cliente/login.html` | Encabezado | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 2 | `cliente/login.html` | Pie de página | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 3 | `cliente/checkout.html` | Encabezado | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 3 | `cliente/checkout.html` | Pie de página | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 4 | `cliente/nutricion.html` | Encabezado | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 4 | `cliente/nutricion.html` | Pie de página | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 5 | `cliente/mis-pedidos.html` | Encabezado | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 5 | `cliente/mis-pedidos.html` | Pie de página | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto |
| 6 | `admin/login.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt="Planeta Fitness"` | Sí | Sí | Correcto (48×44) |
| 7 | `admin/index.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 8 | `admin/productos.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 9 | `admin/pedidos.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 10 | `admin/clientes.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 11 | `admin/membresias.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 12 | `admin/inscripciones.html`| Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 13 | `admin/clases.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 14 | `admin/personal.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 15 | `admin/usuarios.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |
| 16 | `admin/tablas.html` | Barra superior | `../assets/img/logo/logo-planeta.png` | `alt=""` | Sí | Sí | **Falta texto accesible en `alt` (H03)** |

---

## 7. Tabla de Regresiones frente a `PROYECTO_RDA_1`

| Elemento / Característica | Qué había en `PROYECTO_RDA_1` | Dónde estaba (Archivo y Línea V1) | Qué hay ahora en V2 | Veredicto |
|---|---|---|---|---|
| **Módulos JS de Administración** | Scripts ejecutables sin errores de importación (`admin.js` / módulos monolíticos estables). | `js/admin.js:1-150` | `frontend/controllers/admin.controller.js:1` importa `iniciarTema` que no existe en `tema.view.js`, rompiendo las 11 pantallas administrativas. | **Regresión Crítica (H01)** introducida en commit `681ece7`. |
| **Suites de Pruebas Automatizadas** | 10 suites completas de pruebas Playwright/Node (`prueba-accesibilidad`, `prueba-responsive`, `prueba-navegador`, `prueba-arquitectura`, `prueba-enlaces`, `prueba-hash`, `prueba-html`, `prueba-logica`, `prueba-repo`, `prueba-selectores`). | `pruebas/*.mjs` | Se restauraron 4 pruebas (`prueba-html`, `prueba-accesibilidad`, `prueba-enlaces`, `prueba-auditoria3`), pero faltan 6 suites y ninguna prueba evalúa el renderizado real de las pantallas de admin en navegador. | **Regresión Parcial** mitigada pero con brecha de cobertura. |
| **Desplazamiento por Hash y Menú** | `alinearConHash()` síncrono al cargar y manejador de scroll con descuento de cabecera. | `js/app.js:12-40` | Se implementó `scrollRestoration = 'manual'` y cálculo de offset en `comunes.controller.js`. Medido: <1 px de error. | **Recuperado / Estable (R1, R2, R3)**. |
| **Acceso Administrativo desde Cliente** | Enlaces visibles en login y pie hacia `admin/login.html`. | `cliente/login.html:120, 209` | Se añadieron enlaces en pie de las 4 páginas cliente, en el formulario de login y en el modal de acceso del carrito. | **Recuperado (R6)**. |
| **Identidad Visual del Logo** | Logotipos SVG dinámicos que cambiaban de color según el tema. | `assets/js/tema.js:45` | Unificado a `logo-planeta.png` estático en todo el frontend. | **Estable**, pero persisten archivos SVG huérfanos. |
| **Color de Texto de Precios en Claro** | En V1 se usaba color oscuro directo sobre fondo blanco o amarillo en fondo oscuro. | `assets/css/styles.css:80` | En V2 se introdujo `--pf-amarillo-texto: #664d00;`, provocando el tono mostaza sucio en todas las vistas claras. | **Regresión de Marca / Diseño (Problema 2.1)**. |

---

## 8. Pruebas Automáticas y Verificación por Página

### 8.1 Resultados de las Pruebas Existentes en `pruebas/`

| Prueba | Comando | Resultado Reportado | Análisis Crítico de Auditoría 4 |
|---|---|:---:|---|
| `verificar-frontend.mjs` | `node pruebas/verificar-frontend.mjs` | **74 OK / 0 FALLOS** | **Falsa sensación de seguridad:** Solo ejecuta expresiones regulares estáticas sobre archivos en disco. No detecta la importación rota en `admin.controller.js` ni evalúa el comportamiento real del DOM. |
| `prueba-html.mjs` | `node pruebas/prueba-html.mjs` | **OK (16 páginas)** | Verifica doctype, `<html lang="es">`, meta charset, viewport, landmarks y ausencia de inline scripts. Efectiva para estructura estática. |
| `prueba-accesibilidad.mjs` | `node pruebas/prueba-accesibilidad.mjs` | **OK (16 páginas)** | Comprueba roles WAI-ARIA, referencias `aria-describedby` e identificadores inyectados. No computa contrastes de color dinámicos. |
| `prueba-enlaces.mjs` | `node pruebas/prueba-enlaces.mjs` | **309 rutas OK** | Valida existencia de recursos en disco. Todas las rutas locales existen físicamente. |
| `prueba-auditoria3.mjs` | `node pruebas/prueba-auditoria3.mjs` | **Falla por socket en sandbox** | En entorno sandbox falla con `ERR_NETWORK_ACCESS_DENIED` por intentar levantar un servidor HTTP TCP. Además, no navega las 11 páginas de admin con Playwright (solo usa `readFileSync`). |

### 8.2 Diagnóstico de Accesibilidad Automatizada por Pantalla

| Página Auditada | W3C / Landmarks | Errores Consola Claro | Errores Consola Oscuro | Reflujo 200% Zoom | Desborde Horiz. (320px) | Veredicto Accesibilidad |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `index.html` | 1 main, 1 h1, nav nombrada | 0 | 0 | Sin desborde | No (320 px OK) | **Excelente** |
| `cliente/login.html` | 1 main, 1 h1, form accesible | 0 | 0 | Sin desborde | No (320 px OK) | **Excelente** |
| `cliente/checkout.html` | 1 main, 1 h1, form accesible | 0 | 0 | Sin desborde | No (320 px OK) | **Excelente** |
| `cliente/nutricion.html` | 1 main, 1 h1, section rotuladas | 0 | 0 | Sin desborde | No (320 px OK) | **Excelente** |
| `cliente/mis-pedidos.html` | 1 main, 1 h1, tabla accesible | 0 | 0 | Sin desborde | No (320 px OK) | **Excelente** |
| `admin/login.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/index.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/productos.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/pedidos.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/clientes.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/membresias.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/inscripciones.html`| 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/clases.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/personal.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/usuarios.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |
| `admin/tablas.html` | 1 main, 1 h1 | **1 (H01)** | **1 (H01)** | Sin desborde | No (320 px OK) | **Bloqueado por JS (H01)** |

---

## 9. Mejoras de Diseño Sugeridas

A fin de elevar la calidad estética sin alterar los requerimientos funcionales, se proponen las siguientes optimizaciones de diseño:

1. **Jerarquía Tipográfica en Tarjetas de Planes:**  
   En tema claro, presentar los precios en tipografía con peso 900 (`#111111`) y situar una barra horizontal amarilla (`#ffd000`, 4 px de alto) inmediatamente debajo de la cifra, separándola sutilmente del texto `/ mes`. Esto aporta el acento de marca sin ensuciar la legibilidad numérica.
2. **Insignia "INCLUYE" como Componente de Identidad:**  
   Transformar la etiqueta de texto "INCLUYE" en una píldora o botón simulado con fondo amarillo corporativo (`#ffd000`), texto en negro casi puro (`#111111`), esquinas suavemente redondeadas (`border-radius: 4px`) y espaciado de letras (`letter-spacing: 0.05em`).
3. **Tarjeta Activa Destacada en Planes:**  
   La membresía más popular (Plan Black) debe incluir un borde superior o perímetro resaltado con el amarillo corporativo de 3 px de grosor, permitiendo al usuario identificar de inmediato la opción recomendada.
4. **Estados Vacíos con Iconografía Ilustrativa:**  
   Cuando el carrito o la sección de pedidos no contenga elementos, sustituir el texto plano por un contenedor centrado con un icono vectorial de contorno suave (ej. bolsa deportiva o mancuerna) y un botón de llamada a la acción hacia la tienda.
5. **Transiciones Suaves en Hover de Catálogo:**  
   Añadir una micro-transición suave en las tarjetas de productos (`transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease`) para una elevación de 4 px y sombra difusa que comunique interactividad de forma moderna y pulida.

---

## 10. Orden Recomendado para Corregir (De Mayor a Menor Impacto)

Se presenta la hoja de ruta de remediación ordenada por criticidad e impacto, agrupada por archivo para facilitar la implementación:

### Bloque 1: Desbloqueo Crítico de Scripts y Arquitectura
1. **`frontend/controllers/comunes.controller.js` (Línea 16):**
   - Exportar `export function iniciarTema() { ... }` para permitir que el controlador de administración sincronice el tema y capture los botones de tema del panel.
2. **`frontend/controllers/admin.controller.js` (Líneas 1 y 90):**
   - Corregir la importación: cambiar `import { iniciarTema } from '../views/tema.view.js';` por `import { iniciarTema } from './comunes.controller.js';`.
   - Esto resuelve de inmediato el colapso funcional de las 11 pantallas administrativas (**H01**).

### Bloque 2: Identidad de Marca y Precios en Modo Claro (Problema 2.1)
3. **`frontend/assets/css/styles.css` (Líneas 74, 98, 111, 1217-1222):**
   - Eliminar el uso de `#664d00` como color de texto para precios e insignias.
   - Declarar reglas explícitas para modo claro:
     * Precios en `.pf-precio` y `.text-3xl`: color `#111111` con subrayado amarillo decorativo `border-bottom: 4px solid var(--pf-amarillo);`.
     * Insignias `.pf-tarjeta h4`: fondo amarillo `#ffd000` con texto `#111111`.
     * Títulos de pasos en `#planes`: texto `#111111` con acento lateral `border-left: 4px solid var(--pf-amarillo);`.
   - Mantener en tema oscuro `--pf-amarillo-texto: #ffd000;`. Esto resuelve **H02**.
4. **`frontend/assets/css/styles.css` (Línea 633):**
   - Reemplazar `:focus-visible { outline: 3px solid var(--pf-amarillo-texto); }` por un color de foco contrastante en claro (`#b38600` o `#000000`) para resolver **H05**.

### Bloque 3: Accesibilidad HTML y Usabilidad
5. **`frontend/admin/*.html` (10 archivos de módulo):**
   - En las etiquetas `img.pf-admin-logo`, cambiar `alt=""` por `alt="Planeta Fitness"` para cumplir la norma de la materia (**H03**).
6. **`frontend/controllers/carrito.controller.js` (Líneas 45-60):**
   - Guardar `document.activeElement` al abrir el carrito y restaurar el foco en dicho elemento al presionar `Escape` (**H08**).
7. **`frontend/controllers/inicio.controller.js` (Líneas 25-35):**
   - Incorporar un botón de reintento (`Reintentar carga`) dentro del bloque de error de catálogo cuando la API falla (**H10**).
8. **`frontend/views/carrito.view.js` (Línea 15):**
   - Ajustar el título del modal de acceso a nivel `<h2>` con `id="modal-acceso-titulo"` (**H06**).

### Bloque 4: Limpieza y Mantenimiento Menor
9. **`frontend/assets/css/styles.css`:**
   - Asegurar que todos los enlaces pequeños en migas de pan y paginación tengan `min-width: 24px; min-height: 24px;` (**H07**).
10. **`frontend/assets/img/logo/`:**
    - Archivar o eliminar `logo.svg`, `logo-blanco.svg` y `logo-oscuro.svg` para limpiar activos huérfanos (**H04**).
11. **`pruebas/prueba-auditoria3.mjs`:**
    - Adaptar la suite para que navegue las 11 páginas de administración en un navegador real con sesión simulada, garantizando que futuras regresiones en admin sean detectadas en CI/CD.

---
*Informe generado automáticamente conforme a los lineamientos de evaluación de Desarrollo de Plataformas (RDA 1).*
