# Resultados de las correcciones de la Auditoría 5

## 1. Resumen

Se continuó la rama `correcciones-auditoria5` desde el trabajo que ya había dejado codex sin commitear. Se completaron de forma puntual los grupos pendientes de `APLICAR_AUDITORIA5_FRONTEND.md`: accesibilidad básica de nombres y diálogos, objetivos táctiles, imágenes WebP, Open Graph, verificación de reglas de negocio, mejoras visuales de planes/tema y una prueba de regresión ligera.

Quedan tres pendientes que no dependen del código del frontend:

1. **axe-core real**: no está instalado y no se simuló su resultado; las violaciones del grupo 1 quedan corregidas en código, pero sin verificación con axe.
2. **H04**: no se borraron `logo.svg`, `logo-blanco.svg` ni `logo-oscuro.svg` porque el documento exige autorización previa.
3. **`og:image` absoluta**: no hay dominio publicado confirmado; la etiqueta quedó preparada con ruta relativa.

No se tocaron backend, API, base de datos, CI/CD ni los cambios ajenos que ya estaban en la raíz del repositorio. No se hicieron commits porque no fue solicitado explícitamente en esta sesión.

## 2. Herramientas realmente usadas

| Herramienta | Uso real en esta ronda |
|---|---|
| Node.js `v24.21.0` | Ejecución de pruebas y `node --check`. |
| `pruebas/prueba-correcciones5.mjs` | Nueva prueba estática de regresión de Auditoría 5; pasa con 0 fallos. |
| `pruebas/prueba-logica.mjs` | Vuelve a pasar tras tocar `carrito.model.js`. |
| `pruebas/verificar-frontend.mjs` | Vuelve a pasar tras actualizar la aserción del campo de transferencia. |
| Bootstrap CDN 5.3.3 | Se descargaron CSS y JS fuera del repo para recalcular los hashes SHA-384; coinciden con los `integrity` usados. |
| Playwright `1.63.0` | Instalado en `node_modules`, pero **no ejecutado** en esta ronda. |
| axe-core / @axe-core/playwright | **No instalados; no ejecutados.** No se presentan resultados simulados. |
| Lighthouse / html-validate | **No ejecutados.** |

## 3. Estado por hallazgo

| Hallazgo | Estado | Archivos y líneas | Qué se hizo | Cómo se comprobó | Capturas |
|---|---|---|---|---|---|
| `button-name`, `link-name` | Corregido en código | `frontend/views/carrito.view.js:15`, `:20`, `:28`, `:29`, `:48` | Nombres accesibles en botones del panel, modal de acceso, enlace "Crear cuenta", acceso administrativo y botón "Eliminar del carrito". | Revisión de código y `verificar-frontend.mjs`. | Sin capturas nuevas. |
| `aria-hidden-focus` | Corregido en código | `frontend/controllers/carrito.controller.js:11`; `frontend/index.html`; 4 páginas de `frontend/cliente/` | El panel y el modal ahora usan `inert` además de `aria-hidden`, y `alternarCapa()` sincroniza ambos estados. | Revisión de código. | Sin capturas nuevas. |
| `color-contrast` | Corregido en código; pendiente de axe real | `frontend/assets/css/styles.css:670`, `:987`, `:1110`, `:1116`, `:1640`, `:1687` | Enlaces subrayados legibles, horarios en blanco, mensajes con fondo opaco y overrides del panel sobre la barra oscura. | Revisión de reglas CSS; sin axe real. | Sin capturas nuevas. |
| H01: `noindex` | Corregido | 11 páginas de `frontend/admin/`, `frontend/cliente/checkout.html`, `frontend/cliente/mis-pedidos.html` y `frontend/cliente/login.html` | Directiva `<meta name="robots" content="noindex, nofollow">`. | `prueba-correcciones5.mjs`. | No aplica. |
| H02: objetivos táctiles | Corregido en código | `frontend/assets/css/styles.css:662`, `:728`, `:1090`, `:1438` | `min-height: 24px` e `inline-flex` en enlaces en línea, migas/paginación y campos. | `prueba-correcciones5.mjs`; pendiente de medición real a 320 px y 200 % de zoom. | Sin capturas nuevas. |
| H03: SRI | Corregido y verificado | Las 11 páginas de `frontend/admin/` | `integrity` y `crossorigin="anonymous"` en Bootstrap CSS y JS. Los hashes descargados del CDN coinciden. | Descarga temporal y cálculo SHA-384; `prueba-correcciones5.mjs`. | No aplica. |
| H04: SVGs sin uso | Pendiente de autorización | `frontend/assets/img/logo/logo.svg`, `logo-blanco.svg`, `logo-oscuro.svg` | Se dejaron intactos. | Revisión de alcance. | No aplica. |
| H05: imágenes | Corregido | `frontend/index.html:35`, `:100`, `:263`; `frontend/views/componentes.view.js:16-42`; 16 cabeceras HTML | WebP con `<picture>`, logo compacto, `fetchpriority="high"` en el hero, `width`/`height` y `loading="lazy"`. | `prueba-correcciones5.mjs`. | Sin capturas nuevas. |
| H06: Open Graph | Corregido; URL absoluta pendiente | `frontend/index.html:8-12` | `og:type`, `og:title`, `og:description`, `og:image`, `og:locale="es_EC"`. Ciudad tomada de `data/gimnasio.json` y del `<title>` existente: Quito, Ecuador. | `prueba-correcciones5.mjs`. | No aplica. |
| Grupo 9: diseño | Corregido | `frontend/assets/css/styles.css:656`, `:782`, `:786`, `:790`, `:1804` | Tarjetas de planes con altura igual y botón al fondo; transición de tema con `prefers-reduced-motion: reduce`. | `prueba-correcciones5.mjs`. | Sin capturas nuevas. |

## 4. axe antes y después

El reporte `evidencias-auditoria5/axe-report.json` corresponde al **antes** y es un reporte personalizado con selectores, no un resultado de axe-core real. No se generó un "después" con axe.

| Regla | Antes (según el reporte) | Después |
|---|---|---|
| `button-name` | `index.html` y 4 páginas cliente, incluidos estados de carrito, modal y menú móvil. | Corregido en código; sin medición axe. |
| `link-name` | `cliente/*.html`, enlaces "Crear cuenta" y "Acceso administrativo". | Corregido en código; sin medición axe. |
| `aria-hidden-focus` | `ASIDE` y `DIV` con `aria-hidden="true"` y descendientes enfocables. | Corregido con `inert`; sin medición axe. |
| `color-contrast` | Horarios oscuros, `a.underline`, mensajes de error y panel administrativo claro. | Corregido en código; sin medición axe. |
| `target-size` | 207 hallazgos en el informe original. | Corregido en CSS; sin medición axe. |

## 5. Reglas de negocio (grupo 8)

| Regla | Resultado | Evidencia |
|---|---|---|
| IVA parametrizable, sin tasa fija | **Cumple** | No aparece `1.15`, `0.15`, `15 %` ni `* 15` en `models/`, `controllers/` ni `views/`. `frontend/models/catalogo.model.js:35`, `:36`, `:50`, `:51` toma `precioConIva` y `porcentajeIva` de la API. `frontend/models/carrito.model.js:36` conserva la tasa en el carrito. `frontend/views/componentes.view.js:16`, `:60`, `:90`, `frontend/views/checkout.view.js:10` y `frontend/views/carrito.view.js:48` muestran "IVA 0%" cuando corresponde. Prueba con producto de IVA 0 incluida en `pruebas/prueba-correcciones5.mjs`. |
| Beneficios de planes desde la API | **Cumple** | `frontend/models/catalogo.model.js:53` toma `m.beneficios` de `GET /membresias`; `frontend/views/componentes.view.js:76-90` renderiza esa lista sin texto fijo de clases. No hay promesa de boxeo/bailoterapia para un pase diario. |
| Transferencia verificada por empleado | **Cumple** | `frontend/cliente/checkout.html:123-125` pide "Número de referencia de la transferencia" e indica que un empleado verificará el pago antes de aprobarlo. `frontend/controllers/checkout.controller.js:31` valida 4-30 caracteres. `frontend/models/pedido.model.js:15` envía `refTransferencia`. |
| Plan en carrito se inscribe, no se vende como producto | **Cumple** | `frontend/models/pedido.model.js:4-5` separa productos y planes; `:13` envía productos a `POST /pedidos`; `:27` envía cada plan a `POST /inscripciones`. `frontend/views/checkout.view.js:34` lo explica en la confirmación. |

## 6. Imágenes

Peso estimado de las imágenes servidas en `index.html` (logo de cabecera + logo del pie + hero + nutrición), calculado con los archivos actuales:

| Estado | Peso |
|---|---:|
| Antes | 815.8 KB |
| Después | 464.2 KB |
| Ahorro | 351.6 KB (43.1 %) |

Se conservaron los originales. El logo compacto (`224×202`) mantiene la misma proporción y se usa solo en encabezados y barras del panel; el pie conserva el PNG original.

## 7. Pruebas

| Prueba | Resultado |
|---|---|
| `node pruebas/prueba-correcciones5.mjs` | PASS; 0 fallos. Aviso explícito de que axe-core no está instalado. |
| `node pruebas/prueba-logica.mjs` | PASS. |
| `node pruebas/verificar-frontend.mjs` | PASS; `exit=0`. Se actualizó la aserción `checkout: campo de referencia de la transferencia`. |
| `node --check` en JS modificado | PASS. |
| Comprobación de fallo deliberado | Se copiaron `frontend/` y `pruebas/` a `C:\Users\chang\AppData\Local\Temp\opencode\a5-fail`, se inyectó `1.15` en `carrito.model.js` y la nueva prueba falló con `AssertionError: models/carrito.model.js: sin tasa de IVA fija`. Copia eliminada después. |

No se ejecutaron las tres pasadas consecutivas pedidas en el documento, ni las pruebas con Playwright, siguiendo la instrucción de no ampliar la validación más allá de lo esencial de esta ronda.

## 8. Decisiones y preguntas para el equipo

- **H04:** ¿se pueden borrar los tres SVG sin uso de `frontend/assets/img/logo/`? Siguen presentes.
- **`og:image`:** hace falta el dominio publicado para convertir `assets/img/logo/logo-planeta.png` en URL absoluta.
- **Ciudad del gimnasio:** se usó Quito, Ecuador, confirmado en `data/gimnasio.json` (en `HEAD`) y en el título existente; no se inventó.
- **`noindex` en `cliente/login.html`:** se conservó la decisión ya aplicada por codex, al ser una pantalla de autenticación sin datos privados propios.
- **Tailwind CDN:** no admite SRI porque genera CSS dinámicamente; se dejó como está, igual que en la Auditoría 4.

El frontend queda listo para continuar con el backend salvo por la ejecución de axe real y las dos decisiones externas indicadas arriba.
