-- Fusión con el diseño de Claude Design: portal de autoservicio para clientas,
-- galería de trabajos, y control de acceso por rol (maquillista vs clienta).
-- Ver CLAUDE.md para la especificación completa.

-- ── citas: origen de la reserva ─────────────────────────────────────────
alter table citas
  add column if not exists origen text not null default 'Creada por maquillista'
    check (origen in ('Creada por maquillista', 'Reservada por clienta'));

-- ── servicios: si requieren anticipo para reservar desde el portal ─────
alter table servicios
  add column if not exists requiere_anticipo boolean not null default false;
alter table servicios
  add column if not exists monto_anticipo_sugerido numeric(10,2);

-- ── galeria: fotos de antes/después por trabajo ─────────────────────────
create table if not exists galeria (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid references clientas(id) on delete set null,
  cita_id uuid references citas(id) on delete set null,
  foto_antes_path text,
  foto_despues_path text,
  etiqueta text,
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_galeria_clienta_id on galeria(clienta_id);
create index if not exists idx_galeria_fecha on galeria(fecha);

alter table galeria enable row level security;

-- ── bucket de Storage para las fotos de la galería (privado) ───────────
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', false)
on conflict (id) do nothing;

-- ── control de acceso por rol ────────────────────────────────────────
-- No hay un solo administrador fijo: cualquier usuario autenticado que NO
-- tenga una fila propia en `clientas` (auth_user_id = auth.uid()) es la
-- maquillista. Las clientas siempre se crean junto con su fila en
-- `clientas` durante el registro en el portal (ver AuthContext.signUpClienta).
-- security definer: esta función se usa DENTRO de las políticas RLS de
-- `clientas`. Si corriera con los privilegios del invocador, su propia
-- consulta a `clientas` volvería a evaluar esas políticas (que llaman a
-- is_admin()), causando recursión infinita. Al correr con los privilegios
-- del dueño se evita ese ciclo; el search_path fijo evita el secuestro de
-- funciones, y el acceso se limita a los roles autenticados.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from clientas c where c.auth_user_id = auth.uid()
  );
$$;

revoke execute on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- Elimina las políticas permisivas anteriores (acceso total a cualquier
-- usuario autenticado) en las tablas que ya existían.
do $$
declare
  t text;
begin
  foreach t in array array['clientas','servicios','citas','cita_servicios','ingresos','gastos','productos','compras']
  loop
    execute format('drop policy if exists "authenticated_full_access" on %I;', t);
  end loop;
end;
$$;

-- clientas: la maquillista ve y administra todo; cada clienta solo ve/edita
-- su propia fila, y puede crearla una vez durante su registro.
create policy "admin_full_access" on clientas for all
  to authenticated using (is_admin()) with check (is_admin());
create policy "clienta_select_own" on clientas for select
  to authenticated using (auth_user_id = auth.uid());
create policy "clienta_update_own" on clientas for update
  to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy "clienta_insert_own" on clientas for insert
  to authenticated with check (auth_user_id = auth.uid());

-- servicios: la maquillista administra el catálogo; las clientas solo
-- necesitan leerlo para reservar.
create policy "admin_full_access" on servicios for all
  to authenticated using (is_admin()) with check (is_admin());
create policy "clienta_select_all" on servicios for select
  to authenticated using (true);

-- citas: la maquillista ve y administra todas; cada clienta ve y crea
-- únicamente las suyas, siempre marcadas como reservadas desde el portal.
create policy "admin_full_access" on citas for all
  to authenticated using (is_admin()) with check (is_admin());
create policy "clienta_select_own" on citas for select
  to authenticated using (
    exists (select 1 from clientas c where c.id = citas.clienta_id and c.auth_user_id = auth.uid())
  );
create policy "clienta_insert_own" on citas for insert
  to authenticated with check (
    origen = 'Reservada por clienta'
    and exists (select 1 from clientas c where c.id = citas.clienta_id and c.auth_user_id = auth.uid())
  );

-- cita_servicios: sigue el mismo acceso que la cita a la que pertenece.
create policy "admin_full_access" on cita_servicios for all
  to authenticated using (is_admin()) with check (is_admin());
create policy "clienta_select_own" on cita_servicios for select
  to authenticated using (
    exists (
      select 1 from citas ci join clientas c on c.id = ci.clienta_id
      where ci.id = cita_servicios.cita_id and c.auth_user_id = auth.uid()
    )
  );
create policy "clienta_insert_own" on cita_servicios for insert
  to authenticated with check (
    exists (
      select 1 from citas ci join clientas c on c.id = ci.clienta_id
      where ci.id = cita_servicios.cita_id and c.auth_user_id = auth.uid()
    )
  );

-- ingresos, gastos, productos, compras: información financiera y de
-- insumos, exclusiva de la maquillista.
create policy "admin_full_access" on ingresos for all
  to authenticated using (is_admin()) with check (is_admin());
create policy "admin_full_access" on gastos for all
  to authenticated using (is_admin()) with check (is_admin());
create policy "admin_full_access" on productos for all
  to authenticated using (is_admin()) with check (is_admin());
create policy "admin_full_access" on compras for all
  to authenticated using (is_admin()) with check (is_admin());

-- galeria: exclusiva de la maquillista (el portal de clienta no la incluye).
create policy "admin_full_access" on galeria for all
  to authenticated using (is_admin()) with check (is_admin());

-- storage.objects: solo la maquillista sube/lee/borra fotos del bucket "galeria".
drop policy if exists "admin_full_access_galeria_storage" on storage.objects;
create policy "admin_full_access_galeria_storage" on storage.objects for all
  to authenticated
  using (bucket_id = 'galeria' and is_admin())
  with check (bucket_id = 'galeria' and is_admin());
