# Especificación de Proyecto — Gestión de Negocio de Maquillaje

## Contexto
Aplicación de gestión para un negocio de maquillista independiente. Proyecto piloto,
completamente separado de cualquier otro sistema.

**Estado actual:** la base ya está construida y funcionando — React + Vite + Supabase,
desplegada en `aremakeup.netlify.app`, con git gestionado por Claude Code Desktop. Este
documento se actualiza para fusionar un diseño visual generado en Claude Design con la
estructura ya creada.

## Stack tecnológico
- **Frontend:** React + Vite
- **Backend / Base de datos:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Netlify (despliegue continuo desde GitHub)
- **Control de versiones:** Git local (gestionado directamente por Claude Code)
- **Conectividad:** Siempre en línea — sin requerimiento de modo offline.

## Estructura de la app — dos modos

### Modo Maquillista (administración — uso de tu esposa)
Navegación inferior con 6 pestañas:
1. **Agenda** — calendario semanal, citas del día, recordatorio interno + un toque para WhatsApp
2. **Clientas** — lista + ficha individual (total gastado, última visita, notas, historial)
3. **Servicios** — catálogo con precio y duración
4. **Finanzas** — ingresos y gastos consolidados, abonos pendientes con acción "Cobrar"
5. **Compras** — *(agregada en esta fusión — el diseño original no la incluía)*
6. **Galería** — *(agregada en esta fusión — fotos antes/después por trabajo)*

### Modo Clienta (portal de autoservicio — uso de las clientas)
Navegación inferior con 2 pestañas:
1. **Reservar** — elige servicio, fecha y hora; ve si el servicio requiere abono
2. **Mis citas** — historial de sus propias citas reservadas

Requiere que cada clienta tenga su propia cuenta (Supabase Auth), vinculada a su
registro en la tabla `clientas`. Supuesto de trabajo: registro por cuenta propia
(email o teléfono) — ajustable si prefieres que sea por invitación.

## Alcance del MVP
1. Clientas (datos, historial, preferencias)
2. Agenda de citas
3. Ingresos
4. Gastos
5. Compras de insumos/materiales
6. Catálogo de servicios y precios
7. Catálogo de productos (bitácora de marca, presentación y desempeño)
8. Galería de trabajos (fotos antes/después)
9. Portal de autoservicio para clientas (reservar + ver sus citas)

## Modelo de datos

### `clientas`
- nombre
- teléfono
- email (opcional)
- redes sociales (opcional)
- notas / preferencias (alergias, tono de piel, tipo de trabajo favorito)
- fecha de registro
- **auth_user_id** — relación a Supabase Auth; nulo si la clienta aún no se ha
  registrado en el portal de autoservicio

### `servicios`
- nombre (ej. "Maquillaje social", "Peinado", "Paquete novia")
- descripción
- precio base
- duración estimada

### `citas`
- clienta (relación)
- fecha / hora
- estatus: Agendada → Confirmada → Realizada → Cancelada
- anticipo_pagado (booleano)
- monto_anticipo
- notas
- **origen**: Creada por maquillista / Reservada por clienta
- **Nota:** cuando una clienta reserva desde el portal, la cita entra con estatus
  "Agendada" y aparece en la Agenda de la maquillista igual que cualquier otra,
  para que ella la confirme.

### `cita_servicios` (tabla intermedia)
- cita (relación)
- servicio (relación)
- Permite que una cita incluya varios servicios (ej. maquillaje + peinado)

### `ingresos`
- monto
- fecha
- método de pago
- concepto
- cita relacionada (opcional — puede haber ingresos sin cita, ej. venta de producto)
- **Regla de negocio:** cuando se marca un anticipo en una cita, debe generarse
  automáticamente un registro correspondiente en `ingresos`.

### `gastos`
- fecha
- categoría
- monto
- descripción
- proveedor (opcional)

### `productos` (catálogo)
- nombre
- marca
- presentación / tamaño (ej. "30 ml", "paleta 12 tonos")
- estado de desempeño: Funcionó / No funcionó / En prueba
- motivo (si no funcionó — texto libre, para no repetir la compra)
- notas de durabilidad / observaciones
- fecha de primer registro

### `compras`
- producto (relación a `productos`)
- proveedor
- fecha
- cantidad
- costo unitario
- costo total
- **Nota:** registro simple tipo bitácora, sin control de inventario.

### `galeria` (nueva)
- clienta (relación, opcional)
- cita (relación, opcional — a qué trabajo corresponde)
- foto_antes (archivo — Supabase Storage)
- foto_despues (archivo — Supabase Storage)
- etiqueta / descripción (ej. "Maquillaje de novia — boda de junio")
- fecha

## Recordatorios de citas
No se usa la API oficial de WhatsApp Business — requiere verificación de negocio ante
Meta, contratar un proveedor externo (BSP), aprobación de plantillas de mensaje y costo
por mensaje enviado; desproporcionado para el alcance de este proyecto.

En su lugar: recordatorio **interno** dentro de la app (aviso de citas próximas) + un
botón que abre WhatsApp con el mensaje ya redactado (enlace `wa.me`), para que tu esposa
solo dé un toque para enviarlo desde su propio WhatsApp. Sin costo, sin aprobación
externa, mismo resultado para la clienta.

## PWA (Progressive Web App)
La app debe poder instalarse desde el navegador del celular ("Agregar a pantalla de
inicio"), abrir a pantalla completa sin la barra del navegador, y contar con un ícono
propio. Sigue siendo la misma aplicación web alojada en Netlify — no es una app nativa,
no requiere tienda de aplicaciones.

Implementación sugerida: `vite-plugin-pwa`, con:
- `manifest.json` (nombre, ícono, color de tema — según la paleta del diseño de Claude Design)
- Service worker básico para carga rápida y funcionamiento parcial sin conexión
- Íconos en los tamaños estándar (192x192, 512x512)

## Diseño visual
Fuente: handoff de Claude Design (`App_de_control_para_maquillista-handoff.zip`),
archivo principal `Maquillista App.dc.html`. Contiene paleta, tipografía, layout y
componentes de las pantallas de Agenda, Clientas, Servicios, Finanzas y Galería, más
el portal de Clienta (Reservar, Mis citas). Las pantallas de Compras no existen en el
mockup — deben construirse siguiendo el mismo lenguaje visual (colores, tipografía,
espaciados) del resto de la app.

## Próximo paso sugerido
1. Copiar la carpeta del handoff de diseño (`App_de_control_para_maquillista-handoff`)
   dentro de la carpeta del proyecto, para que Claude Code pueda leer los archivos
   directamente.
2. Reemplazar el `CLAUDE.md` anterior por esta versión actualizada.
3. Pedir a Claude Code que implemente la fusión: recrear pixel-perfect las pantallas
   del diseño sobre la estructura ya construida, agregando las pantallas de Compras,
   Galería y el portal de Clienta que no estaban en el mockup original, conectado todo
   a las tablas reales de Supabase, y que agregue la capacidad de PWA (manifest,
   service worker, íconos) para poder instalarse desde el celular.
