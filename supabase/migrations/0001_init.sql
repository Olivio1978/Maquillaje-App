-- Esquema inicial: gestión de negocio de maquillaje
-- Ver CLAUDE.md para la especificación completa del modelo de datos.

create extension if not exists "pgcrypto";

-- clientas
create table if not exists clientas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  redes_sociales text,
  notas text,
  fecha_registro timestamptz not null default now()
);

-- servicios
create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio_base numeric(10,2) not null,
  duracion_estimada_minutos integer,
  created_at timestamptz not null default now()
);

-- citas
create table if not exists citas (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references clientas(id) on delete restrict,
  fecha_hora timestamptz not null,
  estatus text not null default 'Agendada'
    check (estatus in ('Agendada', 'Confirmada', 'Realizada', 'Cancelada')),
  anticipo_pagado boolean not null default false,
  monto_anticipo numeric(10,2),
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists idx_citas_clienta_id on citas(clienta_id);
create index if not exists idx_citas_fecha_hora on citas(fecha_hora);

-- cita_servicios (tabla intermedia)
create table if not exists cita_servicios (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references citas(id) on delete cascade,
  servicio_id uuid not null references servicios(id) on delete restrict,
  unique (cita_id, servicio_id)
);

-- ingresos
create table if not exists ingresos (
  id uuid primary key default gen_random_uuid(),
  monto numeric(10,2) not null,
  fecha date not null default current_date,
  metodo_pago text,
  concepto text,
  cita_id uuid references citas(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingresos_cita_id on ingresos(cita_id);
create index if not exists idx_ingresos_fecha on ingresos(fecha);

-- gastos
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  categoria text,
  monto numeric(10,2) not null,
  descripcion text,
  proveedor text
);

create index if not exists idx_gastos_fecha on gastos(fecha);

-- productos (catálogo / bitácora de desempeño)
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  marca text,
  presentacion text,
  estado_desempeno text not null default 'En prueba'
    check (estado_desempeno in ('Funcionó', 'No funcionó', 'En prueba')),
  motivo text,
  notas text,
  fecha_primer_registro date not null default current_date
);

-- compras
create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete restrict,
  proveedor text,
  fecha date not null default current_date,
  cantidad numeric(10,2) not null,
  costo_unitario numeric(10,2) not null,
  costo_total numeric(10,2) generated always as (cantidad * costo_unitario) stored
);

create index if not exists idx_compras_producto_id on compras(producto_id);

-- Regla de negocio: al marcar anticipo_pagado en una cita, se genera
-- automáticamente el ingreso correspondiente (evita doble captura).
create or replace function fn_generar_ingreso_anticipo()
returns trigger
language plpgsql
as $$
begin
  if new.anticipo_pagado = true
     and new.monto_anticipo is not null
     and new.monto_anticipo > 0
     and (
       tg_op = 'INSERT'
       or old.anticipo_pagado is distinct from new.anticipo_pagado
       or old.monto_anticipo is distinct from new.monto_anticipo
     )
  then
    insert into ingresos (monto, fecha, concepto, cita_id)
    values (new.monto_anticipo, current_date, 'Anticipo de cita', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generar_ingreso_anticipo on citas;
create trigger trg_generar_ingreso_anticipo
  after insert or update of anticipo_pagado, monto_anticipo on citas
  for each row
  execute function fn_generar_ingreso_anticipo();

-- Row Level Security: acceso solo a usuarios autenticados (Supabase Auth)
alter table clientas enable row level security;
alter table servicios enable row level security;
alter table citas enable row level security;
alter table cita_servicios enable row level security;
alter table ingresos enable row level security;
alter table gastos enable row level security;
alter table productos enable row level security;
alter table compras enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['clientas','servicios','citas','cita_servicios','ingresos','gastos','productos','compras']
  loop
    execute format(
      'drop policy if exists "authenticated_full_access" on %I; ' ||
      'create policy "authenticated_full_access" on %I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end;
$$;
