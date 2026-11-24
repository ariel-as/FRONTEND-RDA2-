# FRONTEND: correcciones de diseño, uso y errores (revisión del sitio publicado)

Este documento es para el agente que trabaja en el repositorio `FRONTEND-RDA2-`, publicado en `https://ariel-as.github.io/FRONTEND-RDA2-/`. Junta dos revisiones hechas a mano sobre el sitio publicado, como cliente, como administrador y como personal (escritorio 1440 × 900 y celular 375 × 812): la revisión técnica y la lista de errores del equipo (marcados como **[E#]**, con el número de la lista del equipo).

Las 22 pantallas de `admin/` responden. Lo que falta es corregir errores, pulir el diseño, la navegación y algunos detalles de uso. No hay que agregar endpoints ni cambiar el contrato con el backend. Lo que necesita el backend va en la sección 6.

No trae código. Trae qué está mal, dónde y cómo debe quedar.

## 0. Cómo trabajar

- Corregir en el orden de las secciones. Un commit por sección, en una rama `correcciones-diseno`. Push a esa rama al terminar cada sección, sin merge a `main` hasta que el equipo lo revise.
- **Eficiencia:** no leas archivos completos (usa búsquedas), edita cada archivo en una sola pasada, no muestres código ni explicaciones en el chat, y corre el CI al final de cada sección, no después de cada cambio.
- Mantener la arquitectura (`models/`, `views/`, `controllers/`, Bootstrap en el panel, estilos propios en el sitio). Estilos solo en `assets/css/styles.css`, nunca en línea.
- No romper lo que ya cumple accesibilidad: foco visible, `aria-current`, etiquetas, `aria-live`, contraste AA en los dos temas y áreas de toque de 24 × 24 px.
- **Responsive obligatorio [pedido del equipo]:** cada cambio se revisa a 375, 768, 1024, 1366 y 1440 px, en tema claro y oscuro. Al final se hace un recorrido completo en celular y tableta de todas las páginas, y se corrige todo lo que se vea mal (desbordes, textos cortados, botones fuera de su caja, tablas ilegibles).
- Si un punto necesita una decisión del equipo (sección 7), aplicar la opción indicada por defecto y anotarlo.

## 1. Errores que se notan en todo el sitio (van primero)

### 1.1 Navegación por secciones del inicio [E1, E6]

Problemas:

- El enlace activo no coincide con la sección visible: con Rutinas arriba marca Clases, con Nutrición marca Rutinas, con Contacto marca Nutrición y Contacto solo se marca al final.
- Al hacer clic en una sección lejana (por ejemplo de Planes a Contacto), la página recorre todas las secciones intermedias y el resaltado va pasando por cada una. Durante el desplazamiento se ven dos enlaces activos a la vez, y el recuadro activo se queda en la sección equivocada.
- Desde el pie de página, el enlace a Tienda recarga y la página aparece arriba y luego baja, en lugar de quedar directamente en Tienda (las demás secciones sí quedan bien).

Causa: en `iniciarNavegacionSecciones` (`controllers/comunes.controller.js`) el `IntersectionObserver` elige la sección por `intersectionRatio` y solo entre las entradas que cambiaron. Las secciones miden muy distinto (Tienda más de 3000 px y Nutrición unos 500). Tienda, además, crece después de cargar el catálogo, lo que mueve el destino.

Cómo debe quedar:

- La sección activa es la última cuyo inicio ya pasó una línea fija (altura de la cabecera más 30 % de la ventana), calculada al hacer scroll con `requestAnimationFrame`. Al final de la página, la activa es Contacto.
- Al hacer clic, el enlace pulsado queda marcado desde el inicio y no se recalcula hasta que termine el desplazamiento. Solo un enlace activo a la vez.
- Saltos lejanos sin recorrer toda la página: si la distancia es grande, salto directo (sin animación) o animación corta. Siempre directo si el usuario tiene `prefers-reduced-motion`.
- Al cargar o recargar con un hash (`#tienda`, `#contacto`), la página aparece directamente en la sección, sin animación, cuando el contenido dinámico ya tiene su altura final. Lo mismo desde los enlaces del pie.
- En las páginas de `cliente/`, el menú marca la página actual con `aria-current="page"` (Nutrición en `nutricion.html`).

### 1.2 Cabecera del sitio con sesión iniciada [E7, E11, E23]

Con sesión (de cliente o de personal), la cabecera no cabe: el carrito queda fuera del borde y la barra flotante pierde su forma (en el checkout, en "Inscríbete" y con cuentas administrativas). Pasa en `index.html` y todas las páginas de `cliente/`.

Cómo debe quedar:

- Igual que en el panel: un botón con ícono de usuario que abre un menú con el saludo, Mi cuenta, Mis pedidos y Cerrar sesión. En la cabecera quedan solo: secciones, tema, campana, menú de cuenta y carrito.
- Si la cuenta es de personal (ADM, REC, ENT o CON), el menú de cuenta muestra "Ir al panel administrativo" en lugar de Mi cuenta y Mis pedidos. Hoy un administrador entra a Mi cuenta y ve tres avisos de "La cuenta no está vinculada a un cliente".
- El paso al botón "Menú" de celular se ajusta para que nunca haya elementos fuera de la cabecera a 1440, 1366, 1280, 1024 y 768 px.
- **Todas las páginas con la misma cabecera** generada desde un solo lugar (como el menú del panel): hoy `cliente/login.html` ("Inscríbete") pierde el formato, y `mi-cuenta.html` y `mis-pedidos.html` no tienen el enlace Rutinas.

### 1.3 "Crear cuenta" deja la pantalla en negro [E9]

Desde el diálogo "Inicia sesión" del carrito, el enlace "Crear cuenta" lleva a `cliente/login.html#registro` y la pantalla queda en negro, sin formulario. Corregir para que abra el formulario de registro visible y con foco en el primer campo. Revisar también el enlace "Acceso administrativo" de ese diálogo.

### 1.4 Formularios del panel genérico: "No se pudo preparar el formulario" [E16]

En Personal (Cargos, Turnos, Empleados), Clases (Clases, Horarios, Horarios por clase) y Membresías (Promociones), arriba de cada tabla aparece "No se pudo preparar el formulario" y no se puede crear ni editar. Encontrar la causa en `controllers/admin-generico.controller.js`: es probable que venga del cambio que deja de pedir las opciones o los metadatos de tablas que el rol no puede leer, o de una petición a `/meta` u `/opciones` que falla. Con ADM todos los formularios deben cargar. Con otros roles, el formulario solo aparece si el rol puede escribir en la tabla, y si no puede, no se muestra ningún aviso de error.

### 1.5 Botón "Cancelar" de los formularios [E14]

En todos los formularios y diálogos, "Cancelar" no funciona hasta llenar los campos obligatorios, o hay que pulsarlo dos veces. Cancelar debe cerrar al primer clic sin validar nada (`type="button"` o `formnovalidate`), sin mostrar errores, y devolver el foco al botón que abrió el formulario.

### 1.6 Menú del panel: no se ve en qué sección estás [E12]

Al entrar a una pantalla de un grupo (por ejemplo Caja en Recepción), el nombre del grupo se vuelve invisible. Pasa en todos los grupos.

Causa: el botón del grupo recibe `active` y la regla `.pf-admin > header .nav-link.active` le pone texto `#111111`, pero el fondo amarillo no llega al `dropdown-toggle`.

Cómo debe quedar:

- El grupo actual se ve como "Dashboard" activo: píldora amarilla con texto oscuro.
- Dentro del desplegable, la página actual con fondo amarillo suave y `aria-current="page"`.
- Migas debajo del título de cada página: "Recepción / Caja".
- Contraste del estado activo, hover y foco en los dos temas.

### 1.7 Cabecera del panel según el rol [E19]

- La cabecera dice "Administrador" con cualquier cuenta. Debe mostrar el rol de la cuenta: Administrador, Recepción, Entrenador o Contabilidad, y el nombre de la persona en el menú de usuario.
- Logo recortado: hoy se ve `logo-planeta.png` dentro de una caja de 44 × 40 px y no se lee "FITNESS". Usar `logo-planeta-compact.webp` (o una versión simple), de 40 a 44 px de alto, ancho automático, sin relleno ni caja de fondo, con `object-fit: contain`. Revisar también el login del panel y el tema claro.

## 2. Sitio público

### 2.1 Entrenadores [E2]

- Las fotos se deforman o se recortan mal. La imagen se ajusta al cuadro y no al revés: proporción vertical (4:5), `object-fit: cover` y `object-position: top`, para que se vea la cara aunque se recorte.
- Las fotos no corresponden: el de boxeo ("Entrenador Uno") tiene a una mujer haciendo abdominales y "Entrenador Tres" solo muestra cuerdas. Usar imágenes acordes a la especialidad hasta tener las reales.
- Un entrenador sin foto en `presentacion.model.js` recibe la del Entrenador Uno. Usar una imagen genérica o las iniciales.
- Ordenar las tarjetas por nombre (hoy salen Dos, Tres, Uno, Cuatro).

### 2.2 Rutinas [E3]

La sección Rutinas del inicio está vacía. Mostrar los niveles (de `/niveles`) con lo que se ofrece en cada uno y qué planes incluyen rutina personalizada (`incluyeRutina` de `/membresias`), con un enlace a Planes.

### 2.3 Servicios [E4]

En la versión anterior cada servicio tenía su descripción; ahora solo sale el nombre. Recuperar la descripción de cada servicio (de la API si viene, o de `presentacion.model.js` como antes).

### 2.4 Contacto [E5]

- "Horarios de atención" aparece vacío. La API los devuelve en `/gimnasio` (lunes a viernes 06:00 a 21:00, sábado 09:00 a 12:00, domingo cerrado), pero nada llena `data-gimnasio-horarios`. Pintarla, con "Cerrado" donde `abierto = N`.
- Mostrar también el teléfono del gimnasio.
- El teléfono del formulario está como obligatorio, pero el backend lo acepta vacío: dejarlo opcional.

### 2.5 Nutrición

El botón del inicio dice "Solicitar cita" y el pie de la foto habla de agendar hora. No se manejan citas: cambiar el botón a "Solicitar información" y quitar la frase de la agenda.

### 2.6 Pagar un plan [E10]

Al pagar un plan, el checkout muestra las opciones de los productos ("pagar en efectivo al retirar"). Un plan no se retira: para planes debe decir "Pagar en recepción" (efectivo o transferencia en el gimnasio) y explicar que el plan se activa cuando recepción cobra. Separar los textos de planes y de productos.

### 2.7 Checkout con transferencia

Al elegir transferencia se pide la referencia, pero no se dice a qué cuenta transferir. Mostrar banco, tipo y número de cuenta, titular y RUC. Si la API no los tiene, ponerlos en `models/config.js` y avisar en el informe.

### 2.8 Mis pedidos y Mi cuenta [E8]

- Ocultar "Anterior" y "Siguiente" cuando hay una sola página.
- En "Mis planes", si la cuenta no tiene ficha de cliente, mostrar "Acércate a recepción para vincular tu cuenta" (o el enlace al panel si es personal), no un aviso amarillo.
- Número de pedido: el número es único en todo el sistema (es lo normal, así lo identifica recepción y no se repite). Para que el cliente no se confunda, mostrarlo como "Pedido N.º 12" y agregar un orden propio de la lista ("Tu pedido 3 de 8", o la fecha). Ver sección 7.

### 2.9 Celular

Debajo de la imagen principal queda una franja negra vacía antes de Planes. Ajustar la altura de la portada.

## 3. Panel: diseño general

### 3.1 Una sola plantilla de página [E13, E17]

Hay dos estilos de página (las del panel genérico y las hechas a mano: Pedidos, Productos, Ventas, Caja). Aplicar a las 22 páginas:

- Encabezado: migas, `h1`, una línea de descripción y, a la derecha, el botón principal ("Nueva inscripción", "Nuevo registro"). En celular el botón va debajo, a todo el ancho.
- Mismo ancho máximo y márgenes. Cada bloque (filtros, tabla, formulario) en una tarjeta con el mismo relleno, radio y separación.
- Filtros arriba de la tabla, en una fila, con su botón al final.
- Formularios en línea con todas las etiquetas a la misma altura y los textos de ayuda debajo de su campo, sin empujar a los demás. Botones de acción en su propia fila.

Casos concretos: Ventas en mostrador (el campo "Cédula del cliente" queda más arriba que Producto, Cantidad y Descuento, y el mensaje y el botón "Cobrar venta" quedan flotando); Pedidos (sin descripción, filtros a otra altura, tabla fuera de tarjeta); Productos e Inventario (columnas con otros anchos); Usuarios (botones fuera de la tabla); Otras tablas ("Nuevo registro" debajo de la tabla).

### 3.2 Tablas [E17]

- **Encabezado repetido:** en Membresías, Clases, Personal y Otras tablas sale la fila de títulos, el nombre de la tabla en medio y otra vez los títulos. Debe quedar un solo encabezado, con el nombre de la tabla en el `caption` (puede estar oculto visualmente).
- Encabezado blanco (`table-light`) sobre panel oscuro: usar uno que siga el tema.
- Títulos con nombres internos (`nombre`, `servicioId`, `duracion`, `pagaIva`, `horaInicio`, `cargoId`, `turnoId`, `aforoMax`, `descripcion`, `porcentaje`): crear un diccionario de etiquetas en español y usarlo en todas las tablas y formularios del panel genérico.
- Columnas con ids (servicio, cargo, turno, nivel, instructor): mostrar el nombre, no el código.
- La palabra "vacío": reemplazar según el caso por "No aplica", "No caduca", "Sin nivel", "Sin roles", o una celda vacía con texto oculto para lectores de pantalla.
- Más de dos acciones por fila: agrupar en un botón "Acciones" con menú (Inscripciones tiene seis botones; Usuarios también se desborda).
- Fechas y dinero alineados a la derecha, sin partirse, fechas cortas (22/11/2026 12:50).
- Ocultar la paginación con una sola página.

### 3.3 Colores del panel

Cambiar el primario azul de Bootstrap por el amarillo de la marca con texto oscuro (azul solo para enlaces si hace falta). Acciones secundarias, de peligro y de advertencia con los colores de la marca, revisando contraste.

### 3.4 Celular y tableta

- El botón de tema queda solo en una segunda línea: ponerlo dentro del menú o en la fila del botón de menú.
- En Entradas, Ventas y Caja, en celular, las tablas de muchas columnas como tarjetas apiladas.

### 3.5 Formularios del panel genérico

Mismo diccionario de etiquetas. Las claves foráneas (plan, servicio, cargo, turno, instructor, proveedor) siempre como lista desplegable con nombres.

## 4. Panel: pantalla por pantalla

### 4.1 Dashboard [E18, E20]

- Cada indicador es un enlace a su pantalla con el filtro aplicado (por ejemplo, "Pedidos por atender" abre Pedidos con estado R).
- Los accesos directos van al final del dashboard, después de los indicadores.
- Marcar entrada y salida de asistencia queda solo en el dashboard. En Personal se quitan esos botones y queda solo el reporte de asistencia.

### 4.2 Entradas y aforo [E21]

- **Pase diario en recepción:** cuando llega alguien a pagar el día, recepción debe poder hacerlo desde Entradas en un solo paso: botón "Cobrar pase diario" (también cuando la cédula existe pero no tiene inscripción activa) que crea la inscripción del plan diario con su cobro (`POST /admin/inscripciones` con el plan diario y `pagos`) y registra la entrada enseguida. Si la cédula no existe, primero el alta rápida del cliente (o CONSUMIDOR FINAL para el pase diario) y luego el cobro.
- Si la persona tiene una inscripción web pendiente de cobro, decirlo ("Tiene una inscripción web pendiente de cobro") con un botón para cobrarla.
- La barra de aforo vacía (0 de 75) casi no se ve: darle borde o fondo.

### 4.3 Inscripciones [E14]

- Acciones agrupadas (3.2). Estado con etiqueta corta ("Pendiente de pago"), la explicación en el detalle.
- "Nueva inscripción":
  - No mostrar el total ni "los montos cuadran" hasta tener cliente y plan.
  - Promoción como lista de las vigentes para el plan elegido (si no hay, el campo no aparece).
  - Cédula del ADM que autoriza solo si la promoción lo pide, como lista de empleados con ADM.
  - Acompañantes con un buscador de clientes que los agrega a una lista, con el límite de personas del plan a la vista (no "cédulas separadas por coma").
  - Mostrar el nombre del titular al escribir su cédula.

### 4.4 Clientes

En Nivel, CONSUMIDOR FINAL muestra "vacío": mostrar "No aplica".

### 4.5 Pedidos web

- Plantilla (3.1).
- En pedidos pendientes salen a la vez "Reportar pago" y "Cobrar y convertir en venta": "Reportar pago" solo para transferencia y "Cobrar" solo para efectivo.
- No ofrecer "Reportar pago" en pedidos en efectivo.
- Mostrar la cantidad de productos ("3 productos") sin abrir el desplegable.

### 4.6 Ventas en mostrador y facturación [E13, E22]

- Alineación del formulario (3.1). Al escribir la cédula, mostrar el nombre del cliente.
- Mostrar desde el inicio la tabla de líneas (vacía) y el resumen de totales. Los productos se agregan desde un buscador por nombre o código, no solo desde un desplegable. El total que se cobra lo calcula el servidor; la pantalla muestra el estimado y se ajusta si el servidor corrige.
- Desactivar "Cobrar venta" mientras no haya productos.
- **Factura al cobrar:** al terminar de cobrar una venta, una inscripción o un pedido convertido en venta, ofrecer directamente "Generar factura" en el mismo diálogo (por defecto a nombre del cliente de la operación, o a CONSUMIDOR FINAL), para que cada venta quede con su factura sin tener que buscarla después. La contadora solo genera las que falten y registra el número del SRI.
- **Vista de la factura generada:** al generarla, mostrar la factura con su formato (datos del gimnasio, cliente, líneas, subtotales, IVA, total, número de factura y, cuando exista, el número del SRI) con opción de imprimir. En las listas, la factura se identifica por su número de factura, no por el número de venta.

### 4.7 Productos

- Filtro por estado que por defecto muestre solo los activos (hay productos de prueba "Producto de integración").
- Igualar el ancho de las columnas con el resto del panel o pasar el formulario a un diálogo.

### 4.8 Inventario

Caducidad vacía como "No caduca". Ordenar lotes por producto y luego por caducidad.

### 4.9 Compras y Aliados [E15]

Hoy dicen que los proveedores o aliados "se administran en Otras tablas". Agregar en cada pantalla una pestaña con la lista y el formulario de proveedores (tabla `proveedor`) o aliados (`profesional_aliado`), reutilizando el panel genérico.

### 4.10 Membresías, Clases y Personal [E16, E17]

Arreglar los formularios (1.4), un solo encabezado y etiquetas en español (3.2). En Membresías, "ingresos" en planes por tiempo debe decir "No aplica".

### 4.11 Usuarios

- Acciones agrupadas.
- Cuenta sin roles: "Sin roles" en rojo, con texto.
- El administrador asigna y quita roles a cada cuenta con casillas (ya existe). Mostrar debajo de cada rol una línea con lo que permite, para que se entienda qué acceso da. Los permisos van por rol (no por persona), según `RESPUESTAS_BACKEND_PARA_FRONTEND.md`.

### 4.12 Datos del gimnasio

- El horario se edita por siete días, pero en la base está como "Lunes a viernes", "Sábado" y "Domingo", y por eso de lunes a viernes salen abiertos con horas vacías. Mostrar y editar exactamente las filas que vienen de la API.
- RUC de solo lectura arriba de todo, si la API lo trae.

### 4.13 Otras tablas

Botón "Nuevo registro" en el encabezado y oculto en tablas de solo lectura. Etiquetas y un solo encabezado.

### 4.14 Reportes

- Mostrar el resultado con forma: fechas locales, títulos en español ("Por vencer", "Días") y cada grupo como tabla con `caption`.
- Activar el botón CSV cuando hay resultado, o quitarlo si el backend no lo ofrece para ese reporte.
- Fechas por defecto: el último mes.

### 4.15 Caja

- Sin turno abierto, la página pide `/admin/caja/turnos/actual` y el backend responde 404. Tratarlo como "sin turno" sin registrar error.
- Fechas "Desde" y "Hasta" de cuadres por defecto en la semana actual.

## 5. Seguridad de la información por rol [E22]

Cada rol debe ver solo lo que usa. Revisar con las cuentas de prueba que el menú, las pantallas, las columnas y los botones respetan los permisos reales (`RESPUESTAS_BACKEND_PARA_FRONTEND.md`):

- Que el entrenador no vea datos de dinero, ventas ni caja, y en clientes solo lo necesario para sus rutinas.
- Que la contadora vea facturas, cuadres, cierres y reportes, sin acciones de mostrador (vender, cobrar, abrir caja).
- Que recepción no vea costos de productos ni reportes que no le corresponden.
- Que un botón que el rol no puede usar no aparezca, ni siquiera desactivado.

El backend sigue siendo el que protege; esto es para que cada interfaz muestre solo lo necesario.

## 6. Avisar al equipo del backend (no es tarea de este agente)

Anotar en el informe final, para el equipo:

- Productos "Producto de integración PF17..." y la cuenta `staff-test@planetafitness.ec` creados por las pruebas en la base de Render.
- Razón social del gimnasio con el texto de ejemplo "REEMPLAZAR PROPIETARIA".
- Horario guardado con un formato distinto al del panel (4.12).
- Pedidos en efectivo en estado "Pago reportado".
- `GET /admin/caja/turnos/actual` podría responder 200 con `null` en vez de 404.
- Datos bancarios del gimnasio para el checkout (2.7), si no existen en la API.

## 7. Decisiones del equipo (aplicar la opción por defecto)

| Tema | Por defecto |
|---|---|
| Número de pedido [E8] | Se mantiene el número único del sistema; la lista del cliente muestra además un orden propio o la fecha |
| ¿La contadora genera facturas? [E22] | Sí, solo las que falten, como dice la matriz. La factura normal se genera al cobrar (4.6) |
| Permisos por persona [observaciones] | No: se asignan roles. Cambiar permisos por persona necesita cambios en el backend |

## 8. Cómo comprobar

| Punto | Prueba |
|---|---|
| 1.1 | Bajar despacio por el inicio: cada sección marca su enlace al llegar su título. Clic de Planes a Contacto: llega sin recorrer y marcando solo Contacto. Recargar con `#tienda` y desde el pie: aparece directo en Tienda |
| 1.2 | Con cliente y con personal, nada sale de la cabecera a 1440, 1366, 1280, 1024 y 768 px, y todas las páginas tienen la misma cabecera |
| 1.3 | "Crear cuenta" desde el carrito abre el registro |
| 1.4 | Con ADM, todos los formularios del panel genérico cargan sin aviso de error |
| 1.5 | "Cancelar" cierra al primer clic en todos los formularios |
| 1.6 y 1.7 | El grupo actual se ve en amarillo, con migas; la cabecera muestra el rol correcto y el logo completo |
| 3.1 y 3.2 | En las 22 pantallas, título, botón y tarjetas en la misma posición; ninguna tabla repite el encabezado, muestra nombres internos ni "vacío" |
| 4.2 | Recepción cobra un pase diario y registra la entrada en un solo paso |
| 4.6 | Venta cobrada, factura generada desde el mismo diálogo y vista lista para imprimir |
| 5 | Con REC, ENT y CON, cada uno ve solo lo de su rol |
| Responsive | Recorrido completo a 375 y 768 px sin desbordes ni textos cortados |
| General | Lighthouse de accesibilidad con 95 o más en inicio, dashboard, inscripciones y ventas |

## 9. Informe final

Crear `RESULTADOS_CORRECCIONES_DISENO.md` con:

1. Una tabla con cada punto (incluido su **[E#]**), su estado y el archivo.
2. Lo que quedó pendiente y por qué.
3. Los avisos para el backend (sección 6) y las decisiones aplicadas (sección 7).
4. El resultado del CI y del recorrido responsive.

En el chat responder solo "listo".
