# Resultados de correcciones — Auditoría 3 Frontend

Rama: `correcciones-auditoria3`

## Correcciones aplicadas

| Hallazgo | Resultado |
|---|---|
| R1 — desplazamiento inicial por hash | La página alinea la sección después del renderizado dinámico y considera la altura del encabezado. |
| R2 — navegación entre secciones | Se conserva la navegación por hash, el historial y el movimiento reducido; el menú refleja la sección activa. |
| R3 — enlaces entre páginas y secciones | Los enlaces de la tienda y las páginas de cliente apuntan a destinos válidos y alinean el destino. |
| R4 — contraste | Se ajustaron los acentos y los precios para mantener contraste suficiente en temas claro y oscuro. |
| R5 — logo | Se unificó el logo visible y el favicon con `logo-planeta.png`; los SVG anteriores permanecen sin referencias HTML. |
| R6 — acceso administrativo | Se añadieron accesos administrativos desde las páginas y el panel de acceso del cliente. |
| H01 | Los errores de carga de pedidos y suscripciones se insertan como texto, sin interpretar HTML de la respuesta. |
| H02 | Los niveles de membresía se escapan al construir las opciones del formulario. |
| H03 | El menú y la sección activa se mantienen sincronizados durante la navegación. |
| H04 | Tailwind se inicializa con respaldo si su objeto global no está definido. |
| H05–H06 | Los controles de editar/desactivar y pago/cancelación incluyen nombres accesibles con contexto del registro. |
| H07 | Los enlaces de pie de página y migas de pan tienen objetivos táctiles de al menos 24 px. |
| H08 | Se mejoró el contraste de acentos, precios y etiquetas en ambos temas. |
| H09 | Las 11 páginas administrativas incluyen avisos estáticos que existen sin JavaScript. |
| H10 | Las cuatro páginas de cliente comparten un pie de página con navegación, contacto y acceso administrativo. |
| H11 | La vista del tema solo pinta el DOM; el controlador central gestiona persistencia y eventos. |
| H12 | Las cinco páginas de cliente incluyen una estructura inicial accesible del panel del carrito, oculta hasta su uso. |

Los hallazgos repetidos entre auditorías quedaron atendidos en los grupos R1–R6 y H01–H12. Los cambios se concentraron en `frontend/`; las pruebas y este informe están en `pruebas/` y en la raíz, respectivamente.

## Verificación

- `node pruebas/prueba-html.mjs` — pasó.
- `node pruebas/prueba-accesibilidad.mjs` — pasó; incluye nombres de controles, referencias ARIA, foco visible y movimiento reducido.
- `node pruebas/prueba-enlaces.mjs` — pasó; 94 recursos locales revisados.
- `node pruebas/prueba-auditoria3.mjs` — pasó; 53 comprobaciones de navegador, incluidos hashes, menú, temas, contraste, errores de API, rutas y anchos de pantalla.
- `node pruebas/verificar-frontend.mjs` — 0 fallos; UTF‑8 y cliente HTTP verificados.
- `node --check` sobre los archivos JavaScript del frontend — pasó.

`axe-core` no se ejecutó porque no está instalado en el proyecto. La comprobación automatizada disponible fue la prueba de accesibilidad del repositorio, junto con las verificaciones de navegador descritas arriba.

## Commits

- `c1b2dab` — R1 R2 R3: corregir desplazamiento por hash y secciones
- `51ec9ed` — R6: recuperar acceso administrativo en cliente
- `c725059` — R5: unificar el logo oficial en todo el frontend
- `f13cabf` — R4: mejorar el contraste de precios y acentos
- `681ece7` — H01 H02 H04-H12: corregir seguridad y accesibilidad
- Pendiente: commit separado de pruebas e informe.
