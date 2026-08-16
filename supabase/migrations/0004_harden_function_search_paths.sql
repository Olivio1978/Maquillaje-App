-- Corrige dos hallazgos del linter de seguridad de Supabase tras aplicar
-- la migración 0003.

-- is_admin() solo lo debe poder invocar un usuario ya autenticado (todas las
-- políticas que lo usan exigen "to authenticated"); el rol anon no lo necesita.
revoke execute on function is_admin() from anon;

-- Fija el search_path del trigger existente (0001_init.sql) — buena práctica
-- de seguridad, evita el secuestro de funciones vía un search_path mutable.
create or replace function fn_generar_ingreso_anticipo()
returns trigger
language plpgsql
security invoker
set search_path = public
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
