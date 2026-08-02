-- Estatus de pago de la cita (independiente del estatus de progreso de la cita)
alter table citas
  add column if not exists estado_pago text not null default 'Sin pagar'
    check (estado_pago in ('Sin pagar', 'Con anticipo', 'Pagada'));

-- Evita agendar dos citas en la misma fecha y hora exacta (no puede atender a
-- dos clientas al mismo tiempo). Las citas canceladas no cuentan como conflicto,
-- ya que liberan el horario.
create unique index if not exists uq_citas_fecha_hora_activas
  on citas(fecha_hora)
  where estatus <> 'Cancelada';

-- Backfill: citas existentes con anticipo ya registrado deben reflejarlo en el
-- nuevo estado_pago en vez de quedarse en el default 'Sin pagar'.
update citas
set estado_pago = 'Con anticipo'
where anticipo_pagado = true and estado_pago = 'Sin pagar';
