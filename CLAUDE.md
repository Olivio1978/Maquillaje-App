# Especificación de Proyecto — Gestión de Negocio de Maquillaje

## Contexto
Aplicación de gestión para un negocio de maquillista independiente. Proyecto piloto,
completamente separado de cualquier otro sistema. Objetivo: registrar clientas, agenda
de citas, y control financiero (ingresos, gastos, compras).

## Stack tecnológico
- **Frontend:** React + Vite
- **Backend / Base de datos:** Supabase (PostgreSQL + Auth)
- **Hosting:** Netlify
- **Control de versiones:** Git local (gestionado directamente por Claude Code)
- **Conectividad:** Siempre en línea — sin requerimiento de modo offline. No se necesita
  lógica de sincronización ni almacenamiento local persistente.

## Alcance del MVP
1. Clientas (datos, historial, preferencias)
2. Agenda de citas
3. Ingresos
4. Gastos
5. Compras de insumos/materiales
6. Catálogo de servicios y precios
7. Catálogo de productos (bitácora de marca, presentación y desempeño)

## Modelo de datos propuesto

### `clientas`
- nombre
- teléfono
- email (opcional)
- redes sociales (opcional)
- notas / preferencias (alergias, tono de piel, tipo de trabajo favorito)
- fecha de registro

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
  automáticamente un registro correspondiente en `ingresos` para que los reportes
  financieros cuadren sin doble captura.

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
- **Propósito:** bitácora de desempeño de producto. Al comprar algo por primera vez
  se da de alta aquí con sus detalles; las compras posteriores solo referencian este
  catálogo.

### `compras`
- producto (relación a `productos`)
- proveedor
- fecha
- cantidad
- costo unitario
- costo total
- **Nota:** registro simple tipo bitácora. Sin control de inventario (no hay
  entradas/salidas de stock, solo el registro histórico de la compra).

## Próximo paso sugerido
1. Abrir Claude Code Desktop → pestaña "Code"
2. Crear una carpeta nueva vacía en el equipo para este proyecto (o un repositorio
   nuevo en GitHub y clonarlo localmente)
3. Abrir esa carpeta como sesión de trabajo en Claude Code
4. Guardar este documento como `CLAUDE.md` dentro de la carpeta del proyecto (o
   pegarlo como primer mensaje) para que Claude Code lo use como contexto inicial
5. Pedir a Claude Code que inicialice el proyecto (Vite + React), configure el
   cliente de Supabase, y haga el primer commit
