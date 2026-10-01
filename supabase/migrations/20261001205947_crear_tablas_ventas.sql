-- Parte 1: Modelo de datos de ventas
-- Adaptado a la tabla real: products (id bigint, stock)

create table ventas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagada', 'cancelada')),
  total numeric(10, 2) not null,
  nombre_completo text not null,
  direccion text not null,
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

create table detalle_venta (
  id bigint generated always as identity primary key,
  venta_id uuid not null references ventas(id) on delete cascade,
  product_id bigint not null references products(id),
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10, 2) not null
);

-- RLS: solo SELECT de registros propios; sin INSERT/UPDATE desde el cliente
alter table ventas enable row level security;
alter table detalle_venta enable row level security;

create policy "ver mis ventas" on ventas
  for select using (auth.uid() = user_id);

create policy "ver mi detalle" on detalle_venta
  for select using (
    exists (
      select 1 from ventas v
      where v.id = venta_id and v.user_id = auth.uid()
    )
  );

-- Confirmar pago + descontar stock (solo service role vía Edge Function)
create or replace function confirmar_venta(p_session_id text)
returns void
language plpgsql
security definer
as $$
declare
  v_venta ventas%rowtype;
begin
  select * into v_venta
  from ventas
  where stripe_session_id = p_session_id
  for update;

  if not found or v_venta.estado <> 'pendiente' then
    return;
  end if;

  update products p
  set stock = p.stock - d.cantidad
  from detalle_venta d
  where d.venta_id = v_venta.id
    and d.product_id = p.id;

  update ventas
  set estado = 'pagada'
  where id = v_venta.id;
end;
$$;

revoke execute on function confirmar_venta(text) from public, anon, authenticated;
