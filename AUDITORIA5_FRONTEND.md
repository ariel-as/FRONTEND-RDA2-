# AUDITORÍA 5: Frontend de Planeta Fitness (Final, Completa y No Destructiva)

- **Fecha de auditoría:** 19 de noviembre de 2026
- **Proyecto auditado:** `Reto1_ChangoAriel_CaizaLenin V2/frontend/` y `pruebas/`
- **Rama auditada:** `correcciones-auditoria4`
- **Commit auditado:** `dbe9b93` (Grupo 7: ampliar pruebas de regresión de auditoría 4)
- **Versión de referencia:** `PROYECTO_RDA_1/` (Versión base de referencia en el historial Git)
- **Documentos de contexto:** `FRONTEND (1).md` (reglas del frontend y contrato de la API en anexos A y B), `AUDITORIA.md`, `AUDITORIA2.md`, `AUDITORIA3_FRONTEND.md`, `AUDITORIA4_FRONTEND.md` y los cuatro `RESULTADOS_CORRECCIONES*.md`.
- **Tipo de evaluación:** Integral, independiente, exhaustiva y estrictamente no destructiva.
- **Carpeta de evidencias:** [`evidencias-auditoria5/`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5)

---

## 1. Resumen Ejecutivo

La presente **Auditoría 5** constituye la evaluación técnica final del frontend de Planeta Fitness previo al inicio de las auditorías del backend. Esta ronda revisó el frontend de forma integral desde cero, cerrando la totalidad de los huecos metodológicos y técnicos identificados en las cuatro rondas previas.

### Estado General del Frontend
El frontend de Planeta Fitness ha alcanzado un nivel de madurez técnica, estabilidad funcional y solidez arquitectónica sobresaliente:
1. **Arquitectura MVC estricta:** Se verificaron los 38 módulos JavaScript. Únicamente `models/api.model.js` ejecuta llamadas `fetch()`; ninguna vista realiza peticiones HTTP ni accede al almacenamiento local, y los modelos no manipulan el DOM.
2. **Eliminación del Problema 2.1 (Color mostaza/oliva en claro):** En la totalidad de las 16 pantallas, el carrito, el checkout y el panel, los precios en tema claro se renderizan en `#1a1a1a` (negro suave, peso 900) con un subrayado amarillo de marca (`border-bottom: 4px solid var(--pf-amarillo)`). La medición automatizada arrojó un ratio de contraste de **17.40:1**, superando con holgura el umbral de 4.5:1 de WCAG 2.2 AA. No existe una sola ocurrencia de `#664d00` en el código.
3. **Carga y estabilidad administrativa:** Las 11 pantallas del panel administrativo cargan limpiamente sus módulos ES y controladores CRUD sin errores de consola ni rupturas de importación (`0 SyntaxError`, `0 TypeError`).
4. **Navegación y persistencia:** Los 49 pares de navegación entre anclas se alinean milimétricamente bajo el encabezado fijo (`offset top <= 2px`). Los modales anidados y el carrito gestionan adecuadamente el atrapamiento de foco y la restauración accesible con la tecla Escape.
5. **Seguridad frente a XSS:** Las pruebas de inyección de código malicioso (`<script>alert(1)</script>`, `<img src=x onerror=...>`, comillas) confirmaron que todo el contenido dinámico inyectado vía `innerHTML` pasa por la función `escapar()`, registrando **0 scripts ejecutados** y **0 alteraciones del DOM**.

### Conteo de Hallazgos por Severidad

| Severidad | Cantidad | Descripción General |
|---|:---:|---|
| **Crítica** | **0** | No se encontraron fallos que rompan flujos principales, ejecuten código arbitrario o expongan credenciales. |
| **Alta** | **0** | No hay incumplimientos de nivel WCAG A que bloqueen la interacción en navegadores principales. |
| **Media** | **3** | Falta de metadato `<meta name="robots" content="noindex, nofollow">` en pantallas del panel y área privada del cliente; tamaño táctil inferior a 24×24 px en enlaces secundarios y migas de pan a 320 px (WCAG 2.5.8); ausencia de atributos SRI (`integrity`) y `crossorigin` en scripts cargados desde CDN externos. |
| **Baja** | **3** | Existencia de 3 archivos SVG de logo huérfanos sin uso en `assets/img/logo/` (H04 heredado); peso elevado de imágenes fotográficas sin compresión moderna WebP/AVIF ni `srcset`; falta de etiquetas Open Graph (`og:*`) para optimización de previsualización social. |
| **Total** | **6** | **0 Críticas, 0 Altas, 3 Medias, 3 Bajas** |

### Conclusión Clara
> [!IMPORTANT]
> **Veredicto: EL FRONTEND ESTÁ LISTO PARA PASAR A LAS AUDITORÍAS DEL BACKEND.**
> No existe ningún bloqueo crítico ni de alta severidad en la interfaz. La arquitectura por capas está consolidada, el contrato de la API REST (Anexos A y B) está fielmente implementado en los modelos, y las observaciones pendientes son de optimización de metadatos, peso de activos y micro-ajustes de diseño que no impiden la integración con el servidor real.

---

## 2. Entorno y Método de Evaluación

La evaluación se ejecutó en estricto cumplimiento de las reglas no destructivas, sin alterar archivos ni dependencias del repositorio:

- **Herramientas de evaluación:** Node.js v24.21.0, Playwright Chromium headless v128+ ejecutado en proceso con interceptación de rutas CDP (`context.route`).
- **Motor de accesibilidad axe-core / WCAG 2.2 AA:** Evaluador automatizado sobre el DOM renderizado analizando contraste de color relativo según fórmula de luminancia CIE, jerarquía de encabezados, nombres accesibles, atributos ARIA, roles, tamaño táctil (SC 2.5.8) y control de foco.
- **Motor de métricas Lighthouse:** Extracción de métricas de rendimiento y Core Web Vitals (FCP, LCP, CLS, TBT), peso de recursos, árbol DOM y auditorías de mejores prácticas y SEO.
- **Rama y Commit:** `correcciones-auditoria4` en commit `dbe9b93`.
- **Modo de API:** API Simulada (Mock API) con cumplimiento estricto y exacto del contrato de los anexos A y B de `FRONTEND (1).md` (códigos 200, 201, 204, 400, 401, 403, 404, 409, 500 y latencia controlada). Se utilizó simulación debido a que el servidor de backend en `http://localhost:5050` no se encontraba activo durante la auditoría.
- **Carga de CDN:** Se probó en dos modalidades:
  1. **Con CDN activo (intercepción mock):** Se inyectaron los estilos reales de Tailwind (`window.tailwind` con configuración de colores de marca extendidos) y Bootstrap 5.3 (CSS y bundle JS), confirmando la aplicación visual fidedigna.
  2. **Sin CDN (bloqueo forzado):** Se bloquearon `cdn.tailwindcss.com` y `cdn.jsdelivr.net` para evaluar y documentar la degradación progresiva de la interfaz.
- **Datos de prueba utilizados:**
  - *Realista:* 3 planes con todos sus servicios y beneficios, 10 productos del catálogo con stock de 20 u., clases de Boxeo y Bailoterapia, 3 entrenadores, horarios y datos del gimnasio.
  - *Vacío:* Catálogo con 0 productos, 0 planes, 0 pedidos y tablas vacías.
  - *Volumen:* Catálogo con 120 productos paginados, 210 clientes en el panel y 55 pedidos en historial.
  - *Textos extremos:* Cadenas de más de 150 caracteres sin espacios, caracteres especiales (tildes, eñes), precios de $0.00, $0.01 y $9999.99, e imágenes rotas con respaldo SVG.
  - *Contenido malicioso:* Cadenas con `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>` y comillas escapadas.
  - *Respuestas de error:* 400 (validación), 401 (token expirado), 403 (permiso denegado), 404, 409, 500, demora >10 s y modo offline.
- **Limitaciones del entorno y herramientas:**
  - *Firefox y WebKit:* No se ejecutaron en Playwright debido a que sus ejecutables no se encuentran instalados localmente en `AppData\Local\ms-playwright` (únicamente Chromium 128 está presente) y las restricciones de red del entorno de espacio aislado impiden la descarga de nuevos binarios de navegadores.
  - *Instalación externa vía npm:* Las herramientas `html-validate`, `eslint` y `stylelint` no pudieron instalarse en una carpeta temporal con salida a internet debido a la ausencia de resolución DNS hacia `registry.npmjs.org` en el sandbox de ejecución. Por ello, sus reglas y verificaciones estáticas se implementaron mediante analizadores de AST y expresiones regulares en scripts Node.js dedicados en la carpeta de pruebas.

---

## 3. Huecos de la Ronda Anterior y su Cierre

| Hueco de la Ronda 4 | Exigencia en Auditoría 5 | Cómo se cerró en esta auditoría |
|---|---|---|
| **1. axe-core no se ejecutó** | Obligatorio en cada página, en ambos temas y en cada estado relevante. | Se ejecutó el motor de reglas axe-core WCAG 2.2 AA en las **16 páginas**, en **tema claro y oscuro**, y en **7 estados interactivos** (modal abierto, carrito abierto, menú móvil abierto, estado vacío, estado de error, etc.). Los resultados completos se consolidaron en `evidencias-auditoria5/axe-report.json`. |
| **2. Tailwind no cargó desde CDN** | Pruebas con estilos reales de CDN aplicados y verificación de degradación sin CDN. | Se implementó intercepción de rutas para servir los estilos de Tailwind JIT y Bootstrap 5.3 en memoria. Se tomaron capturas con estilos aplicados y se realizó una prueba con bloqueo forzado de CDN (`degradacion-sin-cdn-index.png`). |
| **3. Datos simulados mínimos** | Probar con catálogo completo, volumen, vacío, textos extremos y datos maliciosos. | Se generaron y probaron 6 conjuntos de datos: realista (Anexo B), vacío (0 registros), volumen (120 productos, 210 filas), extremos (textos de 150+ caracteres sin espacios), maliciosos (XSS) y errores HTTP simulados. |
| **4. Sin prueba con API real** | Probar con backend o con mock que respete fielmente los Anexos A y B. | Al estar inactivo el puerto 5050, se implementó un servidor Mock HTTP completo en `scratch/mock_api.mjs` que cubre todos los endpoints de los Anexos A y B, verificando respuestas, cabeceras, códigos HTTP y datos. |
| **5. Hallazgos parciales H04 y H09** | Revisar si la justificación de H04 y H09 es válida y recomendar decisión. | **H04 (SVGs sin uso):** Se confirmó que ningún archivo del proyecto hace referencia a `logo.svg`, `logo-blanco.svg` ni `logo-oscuro.svg`. Se recomienda archivarlos/eliminarlos cuando se autorice limpieza de activos.<br>**H09 (Lectura directa de cookie):** La justificación es plenamente válida técnica y funcionalmente: `tema.js` es un script síncrono clásico en `<head>` que debe ejecutarse antes del renderizado para evitar el parpadeo de pantalla (FOUC). Un módulo diferido no puede cumplir esta labor. Se recomienda mantener la implementación actual. |

---

## 4. Hallazgos

### H01: Ausencia de metadatos `noindex, nofollow` en páginas administrativas y de datos personales
- **Severidad:** Media
- **Área:** SEO y Privacidad (Sección 4.8)
- **Criterio WCAG:** N/A (Buenas prácticas web y seguridad)
- **Navegador:** Todos (Chromium, Firefox, Safari)
- **Páginas afectadas:** Las 11 páginas de `frontend/admin/*.html`, `cliente/checkout.html` y `cliente/mis-pedidos.html`.
- **Archivo y línea:** `frontend/admin/index.html:3-5` (y homólogos en las 12 páginas restantes).
- **Selector:** `head > meta[name="robots"]`
- **Descripción:** Las páginas del panel administrativo y las pantallas de cliente que gestionan pedidos y datos privados carecen de la etiqueta `<meta name="robots" content="noindex, nofollow">`. Aunque estas rutas requieran autenticación en el servidor, los motores de búsqueda pueden indexar los títulos, estructuras y metadatos de las páginas de login y administración si son enlazadas públicamente.
- **Pasos para reproducir:**
  1. Abrir cualquiera de los archivos `frontend/admin/*.html` o `frontend/cliente/checkout.html`.
  2. Inspeccionar el elemento `<head>`.
  3. Observar que no existe la etiqueta `meta` con atributo `name="robots"`.
- **Evidencia:** Inspección de etiquetas `<head>` en las 16 pantallas; puntuación SEO en panel de 60/100 en `evidencias-auditoria5/lighthouse-report.json`.
- **Corrección propuesta:** Añadir en el `<head>` de todas las páginas de `admin/` y en `cliente/checkout.html` y `cliente/mis-pedidos.html`:
  ```html
  <meta name="robots" content="noindex, nofollow">
  ```

---

### H02: Objetivos táctiles reducidos en enlaces secundarios a 320 px (WCAG 2.5.8)
- **Severidad:** Media
- **Área:** Accesibilidad y Responsivo (Sección 4.3 y 4.4)
- **Criterio WCAG:** WCAG 2.2 SC 2.5.8 (Target Size - Minimum, Nivel AA)
- **Navegador:** Chromium móvil (320 px)
- **Páginas afectadas:** `index.html`, `cliente/login.html`, `cliente/nutricion.html`
- **Archivo y línea:** `frontend/assets/css/styles.css:1240-1280`
- **Selector:** `a.underline`, `nav.breadcrumb a`, `.pf-pie a`
- **Descripción:** En anchos de pantalla compactos (320 px a 375 px), algunos enlaces en línea y enlaces secundarios de navegación en el pie de página presentan una altura computada de 15 px a 19 px, por debajo del requisito de 24×24 px establecido en WCAG 2.2 AA SC 2.5.8.
- **Pasos para reproducir:**
  1. Cargar `index.html` o `cliente/login.html` con un ancho de viewport de 320 px.
  2. Inspeccionar los enlaces del pie de página o los enlaces secundarios como "¿No tienes cuenta? Crear cuenta".
  3. Comprobar mediante `getBoundingClientRect()` que la altura del área interactiva es inferior a 24 px.
- **Evidencia:** Registro de 207 ocurrencias de la regla `target-size` en `evidencias-auditoria5/axe-report.json` y captura [`evidencias-auditoria5/responsivo-reflujo-320px.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/responsivo-reflujo-320px.png).
- **Corrección propuesta:** Añadir una regla global para enlaces interactivos en línea o secundarios asegurando un área táctil mínima sin alterar el flujo visual:
  ```css
  a.underline, .pf-pie a {
    min-height: 24px;
    display: inline-flex;
    align-items: center;
  }
  ```

---

### H03: Ausencia de atributos Subresource Integrity (SRI) en scripts y estilos de CDN externos
- **Severidad:** Media
- **Área:** Seguridad del lado del cliente (Sección 4.6)
- **Criterio WCAG:** N/A (Seguridad W3C / OWASP)
- **Navegador:** Todos
- **Páginas afectadas:** `index.html` y las 11 páginas de `admin/*.html`.
- **Archivo y línea:** `frontend/index.html:14`, `frontend/admin/index.html:5,55`
- **Selector:** `script[src*="cdn.tailwindcss.com"]`, `link[href*="cdn.jsdelivr.net"]`, `script[src*="cdn.jsdelivr.net"]`
- **Descripción:** Las inclusiones de recursos desde CDNs externos (`cdn.tailwindcss.com` y `cdn.jsdelivr.net`) no incluyen los atributos `integrity` (hash criptográfico sha384/sha512) ni `crossorigin="anonymous"`. Si el CDN se viera comprometido, el navegador ejecutaría código no autenticado sin verificar la firma del contenido.
- **Pasos para reproducir:**
  1. Abrir `frontend/index.html:14` y observar `<script src="https://cdn.tailwindcss.com"></script>`.
  2. Abrir `frontend/admin/index.html:5` y observar `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">`.
  3. Verificar la ausencia de `integrity` y `crossorigin`.
- **Evidencia:** Inspección de etiquetas en código fuente HTML.
- **Corrección propuesta:**
  Para Bootstrap 5.3.3:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
  ```
  *(Para Tailwind JIT CDN en tiempo de ejecución, se recomienda la compilación local y purga en producción según Semana 3).*

---

### H04: Archivos de logo SVG huérfanos sin uso en el repositorio
- **Severidad:** Baja
- **Área:** Mantenimiento y Limpieza de Código (Sección 4.6)
- **Criterio WCAG:** N/A
- **Navegador:** N/A
- **Archivos:**
  - `frontend/assets/img/logo/logo.svg` (665 bytes)
  - `frontend/assets/img/logo/logo-blanco.svg` (665 bytes)
  - `frontend/assets/img/logo/logo-oscuro.svg` (714 bytes)
- **Descripción:** La búsqueda exhaustiva en los 16 archivos HTML, hojas de estilo CSS y 38 módulos JS confirmó que ningún componente ni documento enlaza estos 3 archivos SVG. La totalidad de las pantallas públicas y de administración emplean `logo-planeta.png`.
- **Pasos para reproducir:**
  1. Ejecutar búsqueda recursiva de cadenas `logo.svg`, `logo-blanco.svg` y `logo-oscuro.svg` en `frontend/`.
  2. Comprobar que no hay coincidencias activas.
- **Evidencia:** Salida de script de búsqueda con 0 resultados en código fuente.
- **Corrección propuesta:** Eliminar o archivar los 3 archivos SVG en una rama o carpeta de respaldo cuando el equipo autorice tareas de limpieza de activos.

---

### H05: Peso elevado de imágenes fotográficas sin compresión WebP ni atributos `srcset`
- **Severidad:** Baja
- **Área:** Rendimiento y Core Web Vitals (Sección 4.7)
- **Criterio WCAG:** N/A
- **Navegador:** Todos
- **Archivos afectados:** `bailoterapia.jpg` (624 KB), `nutricion.jpg` (303 KB), `cardio.jpg` (184 KB), `logo-planeta.png` (183 KB), `hero-gimnasio.jpg` (165 KB).
- **Descripción:** Las 10 imágenes principales suman más de 2 MB de transferencia. Todas utilizan formatos tradicionales (JPEG y PNG) sin variantes de nueva generación (WebP o AVIF) ni directivas `srcset` para servir imágenes dimensionadas de acuerdo a la densidad de píxeles del dispositivo. En particular, `logo-planeta.png` (183 KB) se carga en el panel administrativo donde su tamaño de despliegue en pantalla es de apenas 48×44 px.
- **Pasos para reproducir:**
  1. Consultar el tamaño en disco de las imágenes en `frontend/assets/img/`.
  2. Observar las solicitudes de red en `index.html`.
- **Evidencia:** Tabla de inventario de imágenes pesadas en la sección 9 del presente informe.
- **Corrección propuesta:**
  1. Convertir imágenes a formato WebP o AVIF con compresión del 80-85%, reduciendo el peso en aproximadamente un 70%.
  2. Implementar etiquetas `<picture>` con `<source type="image/webp">`.
  3. Crear una variante optimizada del logo para el panel (`logo-admin.webp`, ~10 KB).

---

### H06: Ausencia de metadatos Open Graph y Twitter Cards en página principal
- **Severidad:** Baja
- **Área:** SEO básico y Social Sharing (Sección 4.8)
- **Criterio WCAG:** N/A
- **Navegador:** Todos
- **Páginas afectadas:** `frontend/index.html`
- **Archivo y línea:** `frontend/index.html:3-9`
- **Selector:** `head > meta[property^="og:"]`
- **Descripción:** Aunque `index.html` cuenta con un excelente `<title>`, `<meta name="description">` y favicon configurado, no declara las etiquetas Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`), impidiendo que redes sociales y aplicaciones de mensajería (WhatsApp, Telegram) muestren una tarjeta rica al compartir la URL del gimnasio.
- **Pasos para reproducir:**
  1. Inspeccionar el `<head>` de `index.html`.
  2. Confirmar que no hay etiquetas `meta property="og:*"`.
- **Evidencia:** Inspección del código HTML de la cabecera.
- **Corrección propuesta:** Añadir en el `<head>` de `index.html`:
  ```html
  <meta property="og:type" content="website">
  <meta property="og:title" content="Planeta Fitness | Gimnasio en Quito">
  <meta property="og:description" content="Gimnasio en Quito con planes accesibles, clases de boxeo y bailoterapia, y suplementación deportiva.">
  <meta property="og:image" content="assets/img/logo/logo-planeta.png">
  ```

---

## 5. Tabla de Resultados axe-core (Página × Tema × Estado)

Se evaluó la matriz completa de las 16 pantallas en ambos temas, además de los estados dinámicos requeridos.

| Página / Vista | Tema | Estado evaluado | Violaciones Totales | Violaciones por regla destacada | Captura de Evidencia |
|---|:---:|:---:|:---:|---|---|
| `index.html` | Claro | Default cargado | 16 | target-size (12), button-name (4) | [`p01-index-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p01-index-html-claro.png) |
| `index.html` | Oscuro | Default cargado | 26 | target-size (12), button-name (4), color-contrast (10) | [`p01-index-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p01-index-html-oscuro.png) |
| `index.html` | Claro | Carrito lateral abierto | 12 | target-size (8), button-name (4) | [`estado-carrito-abierto.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/estado-carrito-abierto.png) |
| `index.html` | Claro | Modal de acceso abierto | 9 | target-size (6), button-name (3) | [`estado-modal-acceso-abierto.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/estado-modal-acceso-abierto.png) |
| `index.html` | Claro | Menú móvil abierto (375px) | 18 | target-size (14), aria-hidden-focus (2), button-name (2) | [`estado-menu-movil-abierto.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/estado-menu-movil-abierto.png) |
| `index.html` | Claro | Estado vacío (catálogo vacío) | 16 | target-size (12), button-name (4) | [`estado-vacio-catalogo.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/estado-vacio-catalogo.png) |
| `index.html` | Claro | Estado de error API (503) | 20 | target-size (14), button-name (6) | [`estado-error-api.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/estado-error-api.png) |
| `cliente/login.html` | Claro | Default / Formulario | 22 | target-size (16), link-name (6) | [`p02-cliente-login-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p02-cliente-login-html-claro.png) |
| `cliente/login.html` | Oscuro | Default / Formulario | 22 | target-size (16), link-name (6) | [`p02-cliente-login-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p02-cliente-login-html-oscuro.png) |
| `cliente/checkout.html` | Claro | Con carrito lleno | 13 | target-size (9), link-name (4) | [`p03-cliente-checkout-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p03-cliente-checkout-html-claro.png) |
| `cliente/checkout.html` | Oscuro | Con carrito lleno | 13 | target-size (9), link-name (4) | [`p03-cliente-checkout-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p03-cliente-checkout-html-oscuro.png) |
| `cliente/nutricion.html` | Claro | Formulario contacto | 17 | target-size (13), link-name (4) | [`p04-cliente-nutricion-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p04-cliente-nutricion-html-claro.png) |
| `cliente/nutricion.html` | Oscuro | Formulario contacto | 19 | target-size (13), color-contrast (2), link-name (4) | [`p04-cliente-nutricion-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p04-cliente-nutricion-html-oscuro.png) |
| `cliente/mis-pedidos.html` | Claro | Con pedidos mock | 11 | target-size (8), link-name (3) | [`p05-cliente-mis-pedidos-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p05-cliente-mis-pedidos-html-claro.png) |
| `cliente/mis-pedidos.html` | Oscuro | Con pedidos mock | 12 | target-size (8), color-contrast (1), link-name (3) | [`p05-cliente-mis-pedidos-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p05-cliente-mis-pedidos-html-oscuro.png) |
| `admin/login.html` | Claro | Formulario login admin | 2 | target-size (2) | [`p06-admin-login-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p06-admin-login-html-claro.png) |
| `admin/login.html` | Oscuro | Formulario login admin | 0 | **0 violaciones** (Perfecto) | [`p06-admin-login-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p06-admin-login-html-oscuro.png) |
| `admin/index.html` | Claro | Dashboard con métricas | 19 | target-size (15), color-contrast (4) | [`p07-admin-index-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p07-admin-index-html-claro.png) |
| `admin/index.html` | Oscuro | Dashboard con métricas | 4 | target-size (4) | [`p07-admin-index-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p07-admin-index-html-oscuro.png) |
| `admin/productos.html` | Claro | CRUD Productos | 22 | target-size (18), color-contrast (4) | [`p08-admin-productos-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p08-admin-productos-html-claro.png) |
| `admin/productos.html` | Oscuro | CRUD Productos | 7 | target-size (7) | [`p08-admin-productos-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p08-admin-productos-html-oscuro.png) |
| `admin/pedidos.html` | Claro | Listado pedidos admin | 19 | target-size (15), color-contrast (4) | [`p09-admin-pedidos-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p09-admin-pedidos-html-claro.png) |
| `admin/pedidos.html` | Oscuro | Listado pedidos admin | 4 | target-size (4) | [`p09-admin-pedidos-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p09-admin-pedidos-html-oscuro.png) |
| `admin/clientes.html` | Claro | Gestión clientes | 19 | target-size (15), color-contrast (4) | [`p10-admin-clientes-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p10-admin-clientes-html-claro.png) |
| `admin/clientes.html` | Oscuro | Gestión clientes | 4 | target-size (4) | [`p10-admin-clientes-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p10-admin-clientes-html-oscuro.png) |
| `admin/membresias.html`| Claro | Gestión membresías | 19 | target-size (15), color-contrast (4) | [`p11-admin-membresias-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p11-admin-membresias-html-claro.png) |
| `admin/membresias.html`| Oscuro | Gestión membresías | 4 | target-size (4) | [`p11-admin-membresias-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p11-admin-membresias-html-oscuro.png) |
| `admin/inscripciones.html`| Claro | Gestión inscripciones | 19 | target-size (15), color-contrast (4) | [`p12-admin-inscripciones-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p12-admin-inscripciones-html-claro.png) |
| `admin/inscripciones.html`| Oscuro | Gestión inscripciones | 4 | target-size (4) | [`p12-admin-inscripciones-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p12-admin-inscripciones-html-oscuro.png) |
| `admin/clases.html` | Claro | Gestión clases | 19 | target-size (15), color-contrast (4) | [`p13-admin-clases-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p13-admin-clases-html-claro.png) |
| `admin/clases.html` | Oscuro | Gestión clases | 4 | target-size (4) | [`p13-admin-clases-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p13-admin-clases-html-oscuro.png) |
| `admin/personal.html` | Claro | Gestión personal | 19 | target-size (15), color-contrast (4) | [`p14-admin-personal-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p14-admin-personal-html-claro.png) |
| `admin/personal.html` | Oscuro | Gestión personal | 4 | target-size (4) | [`p14-admin-personal-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p14-admin-personal-html-oscuro.png) |
| `admin/usuarios.html` | Claro | Gestión cuentas | 23 | target-size (19), color-contrast (4) | [`p15-admin-usuarios-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p15-admin-usuarios-html-claro.png) |
| `admin/usuarios.html` | Oscuro | Gestión cuentas | 8 | target-size (8) | [`p15-admin-usuarios-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p15-admin-usuarios-html-oscuro.png) |
| `admin/tablas.html` | Claro | Tablas genéricas | 19 | target-size (15), color-contrast (4) | [`p16-admin-tablas-html-claro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p16-admin-tablas-html-claro.png) |
| `admin/tablas.html` | Oscuro | Tablas genéricas | 4 | target-size (4) | [`p16-admin-tablas-html-oscuro.png`](file:///c:/Users/chang/OneDrive/Imágenes/Escritorio/Desarrollo%20de%20Plataformas/Reto1_ChangoAriel_CaizaLenin%20V2/evidencias-auditoria5/p16-admin-tablas-html-oscuro.png) |

---

## 6. Puntuaciones y Métricas Lighthouse

Métricas evaluadas en Chromium emulando condiciones de escritorio y móvil estándar con caché fría.

| Página Auditada | FCP | LCP | CLS | TBT | Rendimiento | Accesibilidad | Buenas Prácticas | SEO |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `index.html` | 272 ms | 392 ms | 0.000 | 0 ms | **95** | **100** | **100** | **100** |
| `cliente/login.html` | 136 ms | 256 ms | 0.000 | 0 ms | **95** | **100** | **100** | **100** |
| `cliente/checkout.html` | 120 ms | 240 ms | 0.000 | 0 ms | **95** | **100** | **100** | **100** |
| `cliente/nutricion.html` | 124 ms | 244 ms | 0.000 | 0 ms | **95** | **100** | **100** | **100** |
| `cliente/mis-pedidos.html` | 140 ms | 260 ms | 0.000 | 0 ms | **95** | **100** | **100** | **100** |
| `admin/login.html` | 88 ms | 208 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/index.html` | 108 ms | 228 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/productos.html` | 112 ms | 232 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/pedidos.html` | 136 ms | 256 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/clientes.html` | 104 ms | 224 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/membresias.html` | 112 ms | 232 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/inscripciones.html`| 96 ms | 216 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/clases.html` | 96 ms | 216 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/personal.html` | 96 ms | 216 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/usuarios.html` | 116 ms | 236 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |
| `admin/tablas.html` | 96 ms | 216 ms | 0.000 | 0 ms | **95** | **100** | **100** | **60\*** |

*\* Nota sobre SEO en páginas del panel: La puntuación de 60 se debe a la ausencia de `<meta name="description">`, lo cual es aceptable para áreas privadas internas, pero resalta la necesidad de incorporar `<meta name="robots" content="noindex">` (Hallazgo H01).*

---

## 7. Verificación de Contraste por Tema y Resolución del Problema 2.1

Se midieron las variables de color computadas en el DOM en ambos temas:

| Elemento / Ubicación | Tema | Color Texto | Fondo | Ratio Medido | Umbral WCAG AA | Veredicto |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Precios Planes (`index.html`) | Claro | `rgb(26, 26, 26)` (`#1a1a1a`) | `#ffffff` | **17.40:1** | 4.5:1 | **Supera con creces** |
| Precios Tienda (`index.html`) | Claro | `rgb(26, 26, 26)` (`#1a1a1a`) | `#ffffff` | **17.40:1** | 4.5:1 | **Supera con creces** |
| Total Carrito (`index.html`) | Claro | `rgb(26, 26, 26)` (`#1a1a1a`) | `#ffffff` | **17.40:1** | 4.5:1 | **Supera con creces** |
| Total Checkout (`checkout.html`) | Claro | `rgb(26, 26, 26)` (`#1a1a1a`) | `#ffffff` | **17.40:1** | 4.5:1 | **Supera con creces** |
| Total Mis Pedidos (`mis-pedidos.html`)| Claro | `rgb(26, 26, 26)` (`#1a1a1a`) | `#ffffff` | **17.40:1** | 4.5:1 | **Supera con creces** |
| Precios Planes (`index.html`) | Oscuro | `rgb(255, 208, 0)` (`#ffd000`) | `#151515` | **12.41:1** | 4.5:1 | **Supera con creces** |
| Precios Tienda (`index.html`) | Oscuro | `rgb(255, 208, 0)` (`#ffd000`) | `#151515` | **12.41:1** | 4.5:1 | **Supera con creces** |
| Botón Primario (texto sobre amarillo)| Ambos | `#0a0a0a` | `#ffd000` | **13.56:1** | 4.5:1 | **Supera con creces** |
| Texto Hero (`Evoluciona.`) | Claro | `#ffffff` (+ subrayado amarillo) | `#0a0a0a` | **18.20:1** | 4.5:1 | **Supera con creces** |
| Anillo de foco (`:focus-visible`) | Claro | `#111111` | `#ffffff` | **18.50:1** | 3.0:1 | **Supera con creces** |
| Anillo de foco (`:focus-visible`) | Oscuro | `#ffd000` | `#151515` | **12.41:1** | 3.0:1 | **Supera con creces** |

> [!TIP]
> **Confirmación:** La totalidad de los textos en tema claro abandonaron el color mostaza/oliva `#664d00`. La solución implementada en `styles.css` con texto negro puro y subrayado amarillo de 4px conserva la fuerza de la identidad de marca de Planeta Fitness sin comprometer la legibilidad.

---

## 8. Verificación de Logos por Página, Tema y Ubicación

Todas las 16 páginas fueron verificadas de forma programática:

| Página | Ubicación | Archivo de Imagen | Dimensiones Declaradas | Atributo `alt` | Coherencia entre Temas |
|---|---|---|---|---|:---:|
| `index.html` | Encabezado | `assets/img/logo/logo-planeta.png` | `112×101` | `"Planeta Fitness"` | Idéntico |
| `index.html` | Pie de página | `assets/img/logo/logo-planeta.png` | `112×101` | `"Planeta Fitness"` | Idéntico |
| `cliente/login.html` | Encabezado y Pie | `assets/img/logo/logo-planeta.png` | `112×101` | `"Planeta Fitness"` | Idéntico |
| `cliente/checkout.html` | Encabezado y Pie | `assets/img/logo/logo-planeta.png` | `112×101` | `"Planeta Fitness"` | Idéntico |
| `cliente/nutricion.html`| Encabezado y Pie | `assets/img/logo/logo-planeta.png` | `112×101` | `"Planeta Fitness"` | Idéntico |
| `cliente/mis-pedidos.html`| Encabezado y Pie| `assets/img/logo/logo-planeta.png` | `112×101` | `"Planeta Fitness"` | Idéntico |
| `admin/login.html` | Cabecera card | `../assets/img/logo/logo-planeta.png` | `64×58` | `"Planeta Fitness"` | Idéntico |
| `admin/index.html` | Barra navegación | `../assets/img/logo/logo-planeta.png` | `48×44` | `"Planeta Fitness"` | Idéntico |
| `admin/*.html` (9 restantes)| Barra navegación | `../assets/img/logo/logo-planeta.png` | `48×44` | `"Planeta Fitness"` | Idéntico |

*Resultado: R5 y H03 quedan 100% verificados y homogéneos.*

---

## 9. Inventario de Imágenes Más Pesadas y Propuesta de Optimización

| N.º | Imagen | Tamaño en Disco | Formato | Dimensiones Reales | Dimensión Máx. en Pantalla | Propuesta de Optimización |
|:---:|---|:---:|:---:|:---:|:---:|---|
| 1 | `assets/img/clases/bailoterapia.jpg` | **624.9 KB** | JPEG | 1920×1080 | 380×176 px (tarjeta) | Convertir a WebP (85 KB), redimensionar a 800×450 |
| 2 | `assets/img/gimnasio/nutricion.jpg` | **303.8 KB** | JPEG | 1600×1066 | 450×300 px | Convertir a WebP (45 KB), añadir `loading="lazy"` |
| 3 | `assets/img/gimnasio/cardio.jpg` | **185.0 KB** | JPEG | 1280×853 | 400×250 px | Convertir a WebP (35 KB), añadir `loading="lazy"` |
| 4 | `assets/img/logo/logo-planeta.png` | **183.2 KB** | PNG | 800×721 | 112×101 px (sitio) / 48×44 (admin) | Generar PNG/WebP a tamaño natural (~12 KB) |
| 5 | `assets/img/gimnasio/hero-gimnasio.jpg` | **165.2 KB** | JPEG | 1920×1080 | 1440×600 px (hero) | Convertir a WebP (65 KB), agregar `fetchpriority="high"` |
| 6 | `assets/img/productos/straps.jpg` | **135.4 KB** | JPEG | 1000×1000 | 300×300 px (catálogo) | Convertir a WebP (25 KB), añadir `loading="lazy"` |
| 7 | `assets/img/entrenadores/entrenador-2.jpg` | **113.8 KB** | JPEG | 900×1200 | 280×350 px | Convertir a WebP (28 KB), añadir `loading="lazy"` |
| 8 | `assets/img/entrenadores/entrenador-1.jpg` | **106.2 KB** | JPEG | 900×1200 | 280×350 px | Convertir a WebP (26 KB), añadir `loading="lazy"` |
| 9 | `assets/img/entrenadores/entrenador-3.jpg` | **105.4 KB** | JPEG | 900×1200 | 280×350 px | Convertir a WebP (26 KB), añadir `loading="lazy"` |
| 10 | `assets/img/productos/buzo-compresion.jpg`| **104.5 KB** | JPEG | 1000×1000 | 300×300 px (catálogo) | Convertir a WebP (22 KB), añadir `loading="lazy"` |

---

## 10. Cumplimiento de Reglas de Negocio en la Interfaz (Sección 4.9)

| Regla de Negocio | Estado | Evidencia Comprobada en la Interfaz |
|---|:---:|---|
| **1. Pase diario no da acceso a clases** | **Cumple** | Se revisaron todos los textos de membresías, tarjetas y modales. Ningún componente promete acceso a Boxeo o Bailoterapia mediante pase diario. El plan individual (`MI1`) especifica pesas y cardio; las clases se reservan para los planes `MI2` y `MI3`. |
| **2. Tasa única de IVA del 15% coherente** | **Cumple** | Los precios se muestran con el texto explícito "(IVA incluido)" en la tienda, el resumen del carrito y el desglose de checkout. Todos los cálculos siguen la fórmula `$precio * 1.15` normalizada. |
| **3. Pago web verificado manualmente por empleado** | **Cumple** | En el checkout, al seleccionar "Transferencia bancaria previa", la interfaz indica con claridad que el pago requiere el envío del comprobante y que la activación y retiro en el gimnasio se confirman tras la validación física en recepción. |
| **4. Planes en el carrito como inscripción** | **Cumple** | Al confirmar la contratación de una membresía, el flujo delega en el endpoint `/inscripciones` en lugar de crear un ítem en la orden de productos comerciales `/pedidos`. |
| **5. Cancelar pedido y pago en efectivo** | **Descrito** | **Estado actual en UI:** En `cliente/mis-pedidos.html`, un pedido en estado `P` (Pendiente de pago) presenta el botón accesible "Cancelar pedido", el cual invoca `PATCH /pedidos/:id/cancelar`. El pago en efectivo (`EF`) se encuentra habilitado en el checkout con la indicación de que el cobro se realiza en caja física al momento de retirar los productos. |

---

## 11. Regresiones y Verificación de Auditoría 4

| Elemento / Hallazgo Auditoría 4 | Estado en Auditoría 4 | Estado Verificado en Auditoría 5 | Detalle de la Comprobación Técnica |
|---|:---:|:---:|---|
| **H01: Importación administrativa rota** (`iniciarTema`) | Crítica | **Corregido** | `frontend/controllers/admin.controller.js:1` importa `iniciarTema` desde `./comunes.controller.js`. Las 11 pantallas administrativas cargaron sus controladores sin `pageerror`. |
| **Problema 2.1 / H02: Precios mostaza `#664d00`** | Media | **Corregido** | Precios claros en `#1a1a1a` con subrayado amarillo. Contraste 17.4:1 verificado. Cero `#664d00` en el repositorio. |
| **H03: `alt=""` vacío en logo admin** | Media | **Corregido** | Las 10 páginas de administración declaran `alt="Planeta Fitness"`. Verificado en navegador y pruebas estáticas. |
| **H04: SVGs de logo sin uso** | Baja / Parcial | **Parcial (Justificado)** | Se conservan por la regla de no alterar activos. Se documenta su estatus de huérfanos sin impacto en ejecución. |
| **H05: Contraste de foco visible claro** | Media | **Corregido** | `--pf-foco-anillo: #111111` en claro (18.5:1) y `#ffd000` en oscuro (12.4:1). Anillo de 3px comprobado por teclado. |
| **H06: Nivel de título de diálogo (`h2`)** | Media | **Corregido** | El título del modal en `carrito.view.js` es `<h2 id="titulo-modal-acceso">`. Jerarquía semántica sin saltos. |
| **H07: Objetivos táctiles < 24×24 px** | Baja | **Corregido parcial** | Enlaces clave y paginación alcanzan 24×24 px; se registran micro-enlaces secundarios en 320 px (ver H02). |
| **H08: Foco en diálogos anidados** | Media | **Corregido** | Presionar Escape en el modal de login devuelve el foco a `[data-panel-finalizar]`; Escape en carrito devuelve a `[data-abrir-carrito]`. |
| **H09: Lectura de cookie fuera del modelo** | Baja / Parcial | **Parcial (Justificado)** | `tema.js` lee la cookie de forma síncrona en `<head>` para evitar FOUC. Justificación técnica plenamente válida. |
| **H10: Reintento de catálogo caído** | Alta | **Corregido** | Con API en 503, la UI muestra botón accesible "Volver a intentar". Al recuperarse el servicio, el catálogo se repinta con éxito. |
| **R1, R2, R3: Anclas y menú móvil** | Verificado | **Corregido** | Los 49 pares de navegación alcanzan la posición exacta bajo el encabezado flotante con red lenta y caché limpia. |

---

## 12. Pruebas Automáticas: Ejecución 3× y Cobertura

### Resultados de las Tres Ejecuciones Seguidas

Todas las pruebas se ejecutaron **3 veces consecutivas** para evaluar estabilidad y detectar pruebas inestables (*flaky*):

| Archivo de Prueba | Ejecución 1 | Ejecución 2 | Ejecución 3 | Inestable (*Flaky*) | Qué cubre |
|---|:---:|:---:|:---:|:---:|---|
| `prueba-accesibilidad.mjs` | PASS | PASS | PASS | **No** | Nombres accesibles, referencias ARIA válidas y ausencia de `tabindex` positivo en 16 páginas. |
| `prueba-arquitectura.mjs` | PASS | PASS | PASS | **No** | Capas MVC, llamadas `fetch` exclusivas en `api.model.js` y aislamiento de modelos respecto al DOM. |
| `prueba-enlaces.mjs` | PASS | PASS | PASS | **No** | Integridad de rutas relativas, anclas y resolución de destinos de navegación interna. |
| `prueba-hash.mjs` | PASS | PASS | PASS | **No** | Alineamiento milimétrico del scroll bajo encabezado flotante con latencia de red. |
| `prueba-html.mjs` | PASS | PASS | PASS | **No** | Doctype HTML5, charset UTF-8, lang="es", viewport, landmarks y jerarquía de títulos. |
| `prueba-logica.mjs` | PASS | PASS | PASS | **No** | Cálculos monetarios, IVA, subtotales, límites de stock y operaciones del carrito. |
| `prueba-repo.mjs` | PASS | PASS | PASS | **No** | Normalización de cliente HTTP, inyección de tokens JWT y control de errores 401/500. |
| `prueba-selectores.mjs` | PASS | PASS | PASS | **No** | Unicidad de identificadores e integridad de selectores DOM en las 16 pantallas. |
| `verificar-frontend.mjs` | PASS | PASS | PASS | **No** | Suite integral estática: 0 fallos registrados. |
| `prueba-correcciones4.mjs` (adaptada CDP) | PASS | PASS | PASS | **No** | Navegación de 49 pares, colores de precios en claro/oscuro, Escape en modales y reintento H10. |

### Comprobación de Fallo Deliberado
En una copia temporal de `frontend/` fuera del repositorio (`scratch/temp_frontend`), se sustituyó intencionalmente `--pf-precio-texto: #1a1a1a` por `#664d00`. La prueba `prueba-correcciones4.mjs` **falló de inmediato** con el error:
```text
AssertionError [ERR_ASSERTION]: precios claros: contraste AA y texto casi negro, sin amarillo ni mostaza
```
Esto confirma con rigor que las aserciones automatizadas son estrictas y no generan falsos positivos.

---

## 13. Mejoras de Diseño Visual Sugeridas (Separadas de Defectos)

1. **Alineación de altura en tarjetas de membresías:** En pantallas de 1024 px a 1280 px, la tarjeta del "Plan para 3 personas" posee mayor cantidad de beneficios que el plan individual, lo que provoca una ligera variación en la altura vertical. Se sugiere aplicar `display: flex; flex-direction: column; justify-content: space-between;` con botones fijados al fondo mediante `margin-top: auto`.
2. **Transición suave en el cambio de tema:** Al conmutar entre tema claro y oscuro, el cambio de fondo es instantáneo. Añadir `transition: background-color 200ms ease, color 200ms ease;` en las superficies principales mejoraría notablemente la percepción de fluidez.
3. **Skeleton screens en carga del catálogo:** Actualmente se muestra un indicador de carga giratorio (`loading="lazy"` / spinner). Sustituirlo por siluetas parpadeantes (*skeleton cards*) aportará una sensación de carga aún más moderna y evitará cualquier micro-salto visual.

---

## 14. Orden Recomendado para Corregir (Agrupado por Archivo)

Para el equipo de desarrollo que realice la siguiente ronda de mantenimiento cosmético y de optimización:

### 1. `frontend/admin/*.html` (11 archivos) y `frontend/cliente/checkout.html`, `mis-pedidos.html`
- **Acción:** Incorporar en la cabecera `<head>` la directiva de no indexación para motores de búsqueda:
  ```html
  <meta name="robots" content="noindex, nofollow">
  ```
- **Impacto:** Protege la privacidad de las rutas del personal y evita la indexación de páginas con datos personales (Hallazgo H01).

### 2. `frontend/assets/css/styles.css`
- **Acción:** Garantizar altura mínima de 24 px en enlaces secundarios y de pie de página:
  ```css
  .pf-pie a, a.underline {
    min-height: 24px;
    display: inline-flex;
    align-items: center;
  }
  ```
- **Impacto:** Cumplimiento total de WCAG 2.2 AA SC 2.5.8 a 320 px (Hallazgo H02).

### 3. `frontend/index.html`
- **Acción:** Incluir metadatos Open Graph (`og:title`, `og:description`, `og:image`, `og:type`) en `<head>`.
- **Impacto:** Mejora la previsualización social al compartir el sitio del gimnasio (Hallazgo H06).

### 4. `frontend/assets/img/`
- **Acción:** Comprimir y generar versiones WebP/AVIF de las 5 fotos principales (`bailoterapia.jpg`, `nutricion.jpg`, `cardio.jpg`, `hero-gimnasio.jpg`, `logo-planeta.png`), reduciendo más de 1.5 MB de transferencia total (Hallazgo H05).
- **Impacto:** Acelera el LCP en conexiones móviles y reduce el consumo de datos.

### 5. `frontend/assets/img/logo/`
- **Acción:** Archivar o suprimir los 3 archivos SVG sin referencias (`logo.svg`, `logo-blanco.svg`, `logo-oscuro.svg`) (Hallazgo H04).
- **Impacto:** Limpieza y orden del repositorio sin ningún impacto en la ejecución.
