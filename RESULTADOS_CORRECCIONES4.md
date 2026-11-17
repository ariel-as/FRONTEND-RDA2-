# Resultados de correcciones de Auditoría 4

## Resumen

Se corrigieron **13 de 15 entradas** de la tabla de resultados (R1, R2, R3, R5, R6 y H01–H10; el problema 2.1/H02 se cuenta una sola vez): **13 corregidas y 2 parciales**. H04 permanece parcial porque la instrucción de esta ronda prohíbe borrar archivos; H09 permanece parcial porque el arranque síncrono del tema aún lee la cookie directamente para evitar un destello antes de cargar los módulos. No hay hallazgos pendientes ni fuera de alcance.

La verificación Playwright confirmó los destinos de navegación, reflujo, colores de precios, logo, enlaces administrativos, reintento y foco. Todas las pruebas existentes y nuevas pasan tras el ajuste. La prueba de regresión falla al reintroducir deliberadamente `#664d00` en el precio claro.

**Límites de verificación:** axe-core no está instalado en el proyecto, por lo que no se ejecutó; las comprobaciones estáticas de accesibilidad sí pasaron. El backend real no estaba disponible para probarlo; las situaciones API disponible/no disponible se probaron con respuestas simuladas. El navegador de pruebas no pudo cargar Tailwind desde CDN, así que las capturas integradas prueban los estilos propios y estados funcionales, pero no sustituyen una revisión visual con CDN operativo. Por este motivo, no se declara una inspección visual completa de todas las páginas con axe ni con la API real.

## Cambios por grupo y hallazgo

| Hallazgo | Estado | Archivos principales | Cambio y comprobación | Evidencia |
|---|---|---|---|---|
| Problema 2.1 / H02: precios y acentos claros | Corregido | `frontend/assets/css/styles.css:31–118, 1247–1268, 1365` | Precios oscuros casi negros, peso 900 y subrayado amarillo; etiquetas y acentos claros con texto oscuro; precio oscuro conserva amarillo. Verificación automatizada de contraste en planes y tienda, además de carrito y checkout visuales. | [planes antes](evidencias-correcciones4/precios-planes-antes.png) · [planes después](evidencias-correcciones4/precios-planes-despues.png) · [tienda antes](evidencias-correcciones4/precios-tienda-antes.png) · [tienda después](evidencias-correcciones4/precios-tienda-despues.png) · [carrito antes](evidencias-correcciones4/precios-carrito-antes.png) · [carrito después](evidencias-correcciones4/precios-carrito-despues.png) · [checkout antes](evidencias-correcciones4/precios-checkout-antes.png) · [checkout después](evidencias-correcciones4/precios-checkout-despues.png) |
| R1: recarga con hash | Corregido y verificado | `frontend/controllers/main.controller.js` (línea 13); `frontend/controllers/inicio.controller.js` (alineación al terminar carga) | La implementación existente se conservó; esta ronda prueba demora de 350 ms, contexto nuevo y `#tienda`, bajo el encabezado y sin animación. | [captura R1](evidencias-correcciones4/r1-recarga-tienda-slow4g.png) |
| R2 y R3: navegación entre secciones, incluido Inscripción → Tienda | Corregido y verificado | `frontend/controllers/comunes.controller.js:77` y `frontend/controllers/inicio.controller.js` | La implementación existente se conservó; se verificaron los 49 pares origen/destino desde escritorio y móvil. `prefers-reduced-motion` mantiene desplazamiento sin animación. | [menú](evidencias-correcciones4/r2-menu-desplazamiento.png) · [Inscripción → Tienda](evidencias-correcciones4/r3-inscripcion-a-tienda.png) |
| R5: logo unificado | Corregido y verificado | páginas HTML de `frontend/` (logo declarado en cabecera y/o pie) | Las 16 páginas usan `logo-planeta.png`; la variante no depende del tema y se comprobó en claro y oscuro. | [logo claro](evidencias-correcciones4/r5-logo-claro.png) · [logo oscuro](evidencias-correcciones4/r5-logo-oscuro.png) |
| R6: acceso administrativo | Corregido y verificado | `frontend/cliente/*.html` (pies y login), `frontend/views/carrito.view.js:29` | Enlace presente y con ruta correcta en login, modal y pies de las cuatro páginas cliente. | [login](evidencias-correcciones4/r6-acceso-admin-login.png) · [modal](evidencias-correcciones4/r6-acceso-admin-modal.png) · [pie](evidencias-correcciones4/r6-acceso-admin-pie.png) |
| H01: importación administrativa rota | Corregido | `frontend/controllers/admin.controller.js:1,90`; `frontend/controllers/comunes.controller.js:16` | `iniciarTema` se exporta desde el controlador común y se importa de esa ruta. El navegador cargó el módulo administrativo sin `pageerror`. |
| H03: texto alternativo del logo | Corregido | `frontend/admin/*.html:9` (10 páginas) | Se cambió `alt=""` por `alt="Planeta Fitness"`; prueba de las 16 páginas. | [logo panel](evidencias-correcciones4/r5-logo-admin.png) |
| H04: SVG de logos sin uso | Parcial | `frontend/assets/img/logo/` | Se conservaron según la instrucción de no borrar activos; no se encontraron referencias activas en HTML/CSS/JS. Se anotan abajo para decisión del equipo. | — |
| H05: anillo de foco | Corregido | `frontend/assets/css/styles.css:31–118, 644–646` | Variable específica de foco: amarillo en oscuro y negro en claro; comprobación de foco visible por teclado. | [antes](evidencias-correcciones4/foco-visible-antes.png) · [después](evidencias-correcciones4/foco-visible-despues.png) |
| H06: nivel del título de diálogo | Corregido y verificado | `frontend/views/carrito.view.js` (título del diálogo, `h2`) | El título del diálogo ya es `h2`; comprobado en navegador. | [modal de acceso](evidencias-correcciones4/r6-acceso-admin-modal.png) |
| H07: objetivos táctiles | Corregido | `frontend/assets/css/styles.css:655–663` | Enlaces tienen mínimo 24 × 24 px; medido en 320 px y comprobado por teclado. | [antes](evidencias-correcciones4/responsivo-320px-admin-tablas.png) · [después](evidencias-correcciones4/objetivos-tactiles-despues.png) |
| H08: restauración de foco en diálogos anidados | Corregido | `frontend/controllers/carrito.controller.js:8–18` | Referencias separadas para los disparadores del panel y del modal; Escape en el diálogo hijo devuelve el foco al elemento que abrió el panel. | [antes](evidencias-correcciones4/teclado-modal-carrito.png) · [después](evidencias-correcciones4/foco-modal-anidado-despues.png) |
| H09: lectura de cookie fuera del modelo | Parcial | `frontend/assets/js/tema.js`; `frontend/controllers/comunes.controller.js` | El controlador común usa `leerCookie`/`escribirCookie` de `storage.model.js`. El script clásico síncrono de arranque sigue leyendo `document.cookie` directamente porque debe fijar el tema antes del primer pintado; migrarlo a un módulo diferido puede provocar destello. | — |
| H10: reintento de catálogo | Corregido | `frontend/controllers/inicio.controller.js:14,44` | Estado de error con botón accesible para volver a cargar planes y productos; verificado con API simulada caída y luego recuperada. | [error antes](evidencias-correcciones4/api-reintento-antes.png) · [reintento después](evidencias-correcciones4/api-reintento-despues.png) |
| Estados de carga (grupo 6) | Corregido | `frontend/index.html:159,201`; `frontend/assets/css/styles.css:1037–1061` | Estado inicial anunciado mediante `aria-busy` y mensaje en español; estado cargando visible con animación que respeta movimiento reducido. | [antes](evidencias-correcciones4/estado-carga-antes.png) · [después](evidencias-correcciones4/estado-carga-despues.png) |

Las capturas “antes” de precios de planes, tienda, carrito y checkout reproducen visualmente el color anterior `#664d00` sobre la versión servida para poder comparar el mismo contenido. Las capturas R1–R6 corresponden a la evidencia heredada de la auditoría anterior; no se volvieron a tomar todas durante esta ronda.

## Variables de color y contraste

Las variables están centralizadas al inicio de `frontend/assets/css/styles.css` y en sus bloques de tema:

| Variable | Tema claro | Tema oscuro |
|---|---|---|
| `--pf-precio-texto` | `#1a1a1a` | `#ffd000` |
| `--pf-amarillo-texto` | `#1a1a1a` | `#ffd000` |
| `--pf-foco-anillo` | `#111111` | `#ffd000` |

Contraste medido por la prueba de navegador: precios de planes y productos en tema claro, `#1a1a1a` sobre tarjeta blanca, **17.40:1**; en oscuro, `#ffd000` sobre `#151515`, **12.41:1**. Ambos superan 4.5:1. El texto oscuro de los botones amarillos de marca (`#0a0a0a` sobre `#ffd000`) mantiene **13.56:1**. La prueba verifica que el precio claro sea casi negro y falla si vuelve `#664d00`.

## Regresiones recuperadas

- Reemplazadas las pruebas estáticas de arquitectura, hash, lógica del carrito, repositorio/API y selectores por versiones adaptadas a la estructura MVC actual.
- Los puntos de entrada históricos de navegador y responsive delegan en la suite integrada, que comprueba hash con red demorada, los 49 pares de navegación, 320/375/768/1024/1440 px, zoom 200 %, temas, enlaces, foco, catálogo caído y recuperación. `servidor.mjs` sirve el frontend actual desde `frontend/`.
- Los escenarios históricos no cubiertos explícitamente por las pruebas nuevas no se consideran recuperados.

## Pruebas

Se ejecutaron con Node.js y Playwright todas las pruebas activas de `pruebas/`: accesibilidad, Auditoría 3, Auditoría 4, enlaces, HTML, arquitectura, hash, lógica, repositorio/API, selectores, navegador, responsive y verificación del frontend. Resultado: **todas pasan** después de la corrección de la aserción del foco.

La prueba de regresión se verificó con una reversión local temporal: se sustituyó `--pf-precio-texto: #1a1a1a` por `#664d00`, `prueba-correcciones4.mjs` falló en la aserción del precio claro, y luego se restauró el archivo sin commit.

axe-core no está disponible (`axe-core` no está instalado), así que no se reporta resultado de axe. Las pruebas estáticas comprobaron nombres accesibles, referencias ARIA, roles, `tabindex` y elementos ocultos enfocables; además de las verificaciones de navegador descritas arriba.

## Archivos que siguen sin uso

- `frontend/assets/img/logo/logo.svg`
- `frontend/assets/img/logo/logo-blanco.svg`
- `frontend/assets/img/logo/logo-oscuro.svg`

Se mantienen en el repositorio por la regla de no borrar archivos. `frontend/assets/img/productos/generico.svg` sí está referenciado como imagen de respaldo desde `frontend/models/presentacion.model.js` y no es huérfano.

## Decisiones y pendientes del equipo

- Decidir en una ronda posterior si se archivan los tres SVG de logo (H04); se dejaron intactos por instrucción.
- Decidir si se acepta que el script síncrono de arranque lea la cookie para evitar destello o si se rediseña el arranque para centralizar también esa lectura (H09).
- Instalar/proveer axe-core y habilitar acceso al backend para completar axe por página y la revisión con API real. Las capturas con CDN de Tailwind operativo también quedan pendientes de revisión visual completa.

## Commits

- `f8cbd1f` Grupo 1: corregir colores de precios y acentos en tema claro
- `ffd5bfc` Grupo 2: estabilizar desplazamiento por hash y menú
- `4660265` Grupo 3: unificar texto alternativo del logo administrativo
- `f16fa9f` Grupo 4: corregir H01 H05 H07 y H10
- `7d69b18` Grupo 5: recuperar foco al cerrar diálogos anidados
- `6864cc8` Grupo 6: mejorar los estados de carga del catálogo
- Grupo 7: ampliar pruebas de regresión de auditoría 4
