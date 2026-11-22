# Resultados de las pruebas locales de la fase 2

Fecha: 22/11/2026. Rama `fase2` del frontend contra el backend local (`despliegue de prueba/BACKEND proyecto RDA 2/server`, commit `c1bca90`) en `http://localhost:5050`, con la base local recién sembrada (`npm run db:seed`). El frontend se sirvió en `http://127.0.0.1:5500`, así que usó la URL local de `models/config.js`. Las pruebas se hicieron con Playwright (Chromium sin interfaz) desde `C:\herramientas-auditoria`, con scripts fuera del repositorio.

Preparación: el seed fallaba porque `JWT_SECRET` en `server/.env` tenía el texto de ejemplo. Se reemplazó por un valor aleatorio (el archivo no está en git). El backend se levantó con `RATE_LIMIT_MAX` y `LOGIN_RATE_LIMIT_MAX` más altos solo como variables del proceso, para que el recorrido automático no chocara con el límite de peticiones.

## 1. Rol × páginas

Cada cuenta inició sesión por la pantalla de login y abrió todas las páginas del panel (o de la web del cliente). «Sin acceso (esperado)» significa que la página no está en el menú del rol, muestra «No tienes acceso a esta pantalla» y no hace peticiones. «OK (sin turno abierto)» significa que la página funciona, pero el backend responde 404 a `GET /admin/caja/turnos/actual` porque ya no queda un turno abierto ese día (ver sección 4).

| Página | ADM | REC | ENT | CON | Cliente |
|---|---|---|---|---|---|
| admin/aliados.html | OK | OK | Sin acceso (esperado) | OK | — |
| admin/caja.html | OK (sin turno abierto) | OK (sin turno abierto) | Sin acceso (esperado) | OK | — |
| admin/clases.html | OK | OK | OK | Sin acceso (esperado) | — |
| admin/clientes.html | OK | OK | OK | OK | — |
| admin/compras.html | OK | Sin acceso (esperado) | Sin acceso (esperado) | OK | — |
| admin/entradas.html | OK | OK | OK | Sin acceso (esperado) | — |
| admin/facturas.html | OK | OK | Sin acceso (esperado) | OK | — |
| admin/gimnasio.html | OK | OK | OK | OK | — |
| admin/index.html | OK | OK (sin turno abierto) | OK | OK | — |
| admin/inscripciones.html | OK | OK | OK | OK | — |
| admin/inventario.html | OK | OK | Sin acceso (esperado) | OK | — |
| admin/membresias.html | OK | OK | OK | OK | — |
| admin/mensajes.html | OK | OK | Sin acceso (esperado) | Sin acceso (esperado) | — |
| admin/notificaciones.html | OK | OK | OK | OK | — |
| admin/pedidos.html | OK | OK | Sin acceso (esperado) | OK | — |
| admin/personal.html | OK | OK | OK | OK | — |
| admin/productos.html | OK | OK | Sin acceso (esperado) | OK | — |
| admin/reportes.html | OK | OK | Sin acceso (esperado) | OK | — |
| admin/rutinas.html | OK | OK | OK | Sin acceso (esperado) | — |
| admin/tablas.html | OK | Sin acceso (esperado) | Sin acceso (esperado) | OK | — |
| admin/usuarios.html | OK | Sin acceso (esperado) | Sin acceso (esperado) | Sin acceso (esperado) | — |
| admin/ventas.html | OK | OK | Sin acceso (esperado) | OK | — |
| index.html | — | — | — | — | OK |
| cliente/mis-pedidos.html | — | — | — | — | OK |
| cliente/mi-cuenta.html | — | — | — | — | OK |
| cliente/checkout.html | — | — | — | — | OK |
| cliente/nutricion.html | — | — | — | — | OK |

Resultado final: ninguna página falla con ningún rol. Las 5 cuentas iniciaron sesión correctamente.

## 2. Recorridos de la sección 8

| Recorrido | Resultado | Detalle |
|---|---|---|
| Pedido por transferencia hasta entregado | Pasa | El cliente compra con número de comprobante y el pedido 68 nace en R. Recepción lo filtra en «Por verificar», lo convierte en venta (C) y lo marca entregado (E). En mis pedidos, el cliente lo ve como «Entregado» |
| Inscripción en el local con pago mixto y acompañante | Pasa | Recepción crea dos clientes con cédula validada e inscribe al titular en el plan de 2 personas con el acompañante. Cobra en efectivo y transferencia con referencia: «Inscripción 161 registrada y cobrada» |
| Entrada rechazada por aforo | Pasa | El administrador baja el aforo a las personas adentro + 1. El titular entra y el acompañante es rechazado con `role="alert"`: «Entrada rechazada: El gimnasio está lleno (5 de 5).». Después se devolvió el aforo original |
| Venta en mostrador con factura | Pasa | Venta a CONSUMIDOR FINAL. El servidor corrigió el total (de $0.87 estimado a $1.00, por el IVA) y el cobro se ajustó solo. Se generó la factura y la contadora registró el comprobante 001-001-378562608 con su clave de acceso |
| Abrir caja, gasto, cuadre con diferencia y cierre semanal | Pasa | Turno abierto con $50, gasto de $3.50, vista previa «Faltante de $2.00» antes de confirmar, resultado «Turno cerrado. Faltante de $2.00.» anunciado con `role="alert"`. La contadora vio el resumen y confirmó el cierre semanal del día |

No se puede repetir el recorrido completo el mismo día. El cierre semanal de hoy hace que el backend rechace abrir otro turno («El día de hoy ya está dentro de un cierre semanal.»), y sin turno no se puede cobrar. Para repetirlo hay que volver a sembrar la base o probar otro día.

## 3. Errores encontrados y cómo se corrigieron

| Error | Dónde | Corrección |
|---|---|---|
| REC: 403 en `GET /admin/tablas/usuario/opciones` al abrir Personal | `controllers/admin-generico.controller.js` | El panel genérico ya no pide las opciones de tablas que el rol no puede leer (`usuario` requiere `usuarios:gestionar`; `empleado`, `empleados`). El campo muestra el código |
| ENT: 403 en `GET /admin/tablas/empleado` al abrir Clases | `controllers/admin-clases.controller.js` | Solo se cargan los empleados si el rol tiene `empleados`; si no, el instructor se muestra con su código |
| ENT: 403 en `GET /admin/tablas/empleado/meta` al abrir Personal | `controllers/admin-personal.controller.js` | Sin `empleados:leer`, Personal oculta empleados, cargos y turnos y muestra solo la asistencia propia |
| Cobro con total distinto al estimado: había que cerrar el diálogo y empezar de nuevo | `controllers/pagos.controller.js`, `dialogo.controller.js`, `lista-api.controller.js`, `admin-ventas.controller.js`, `admin-inscripciones.controller.js`, `admin-pedidos.controller.js` | Cuando el servidor responde «El pago debe ser exactamente el total: X», el componente de pagos toma ese total, actualiza los montos y lo explica en el diálogo. Se puede confirmar de nuevo sin perder lo escrito |
| El total corregido quedaba en 0 (el mensaje termina en «1.00.» y el punto final rompía el número) | `controllers/pagos.controller.js` | La expresión toma solo el número (`\d+(?:\.\d+)?`) |

## 4. Lo que no se pudo corregir porque es del backend

| Ruta | Respuesta | Efecto en el frontend | Sugerencia |
|---|---|---|---|
| `GET /admin/caja/turnos/actual` sin turno abierto | `404 {"mensaje":"No hay un turno de caja abierto hoy."}` | La pantalla lo maneja (muestra «Abrir turno» o «Sin turno abierto»), pero el navegador registra un error de recurso en la consola en Caja y en el dashboard de recepción | Responder `200` con `null` o `{ "abierto": false }` |
| `POST /admin/caja/turnos` | `409 «El turno X de hoy ya fue abierto.»` y `409 «El día de hoy ya está dentro de un cierre semanal.»` | Correcto según las reglas, pero en la base local los tests del backend dejan usados todos los turnos del día, y para probar hubo que crear un turno de prueba | Que los tests del backend usen una base aparte o limpien lo que crean |
| `PATCH /admin/entradas/:id/salida` | `409 «La salida debe ser al menos un minuto después de la entrada.»` | Regla del backend; el frontend muestra el mensaje tal cual | Ninguna (es una regla de negocio) |
| `POST /admin/ventas`, `/admin/inscripciones`, `PATCH /pedidos/:id/estado` | `400 «El pago debe ser exactamente el total: X.»` cuando el total estimado no coincide | Ahora el cobro se ajusta solo, pero se hace una petición extra | Una ruta para cotizar el total antes de cobrar |

## 5. Verificaciones del CI

Sintaxis de JavaScript sin errores y `verificar-frontend.mjs` con 0 fallos (ver el commit de esta tanda).
