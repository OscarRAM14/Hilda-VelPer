-- =====================================================================
--  Hilda VelPer · Pasteles y Postres — Base de datos (Supabase)
--  ARCHIVO 1 de 2 · versión 1.1.0
--  Cómo usarlo: Supabase > SQL Editor > New query > pega TODO > Run
--  Se puede correr más de una vez sin romper nada.
-- =====================================================================

-- ---------- PERFILES (usuarios de la app) ----------
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  rol text not null default 'ayudante' check (rol in ('admin','ayudante')),
  activo boolean not null default false,
  creado timestamptz default now()
);

-- Cada vez que alguien se registra, se crea su perfil (inactivo hasta que un admin lo apruebe)
create or replace function public.nuevo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists al_registrar on auth.users;
create trigger al_registrar after insert on auth.users for each row execute function public.nuevo_perfil();

create or replace function public.es_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from perfiles where id = auth.uid() and activo);
$$;
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from perfiles where id = auth.uid() and activo and rol = 'admin');
$$;

-- ---------- NEGOCIO (datos públicos para el catálogo) ----------
create table if not exists negocio (
  id int primary key default 1 check (id = 1),
  nombre text default 'Hilda VelPer',
  lema text default 'Pasteles y Postres',
  whatsapp text default '',
  facebook text default '',
  instagram text default '',
  mensaje_catalogo text default 'Pasteles caseros, cupcakes, gelatinas, galletas caseras… ¡y más!'
);
insert into negocio (id) values (1) on conflict do nothing;

-- ---------- AJUSTES (precio y planeación) ----------
create table if not exists ajustes (
  id int primary key default 1 check (id = 1),
  tarifa_hora numeric default 60,          -- lo que vale 1 hora de trabajo de Hilda
  gastos_fijos_mes numeric default 800,    -- luz, gas, agua, internet que le tocan a la pastelería
  pedidos_mes numeric default 8,           -- pedidos aproximados al mes (para repartir gastos fijos)
  margen_pct numeric default 30,           -- ganancia sobre el costo
  empaque_default numeric default 40,      -- base, caja, etc.
  precio_persona numeric default 0,        -- si cobra por persona (0 = no usar)
  redondeo numeric default 10,             -- redondear precio hacia arriba a múltiplos de...
  dias_compra int default 3,               -- días antes de la entrega para comprar material
  dias_horneado int default 2,             -- días antes para hornear
  dias_decorado int default 1,             -- días antes para decorar
  umbral_grande int default 40,            -- desde cuántas personas es "pastel grande"
  dias_extra_grande int default 1          -- días extra para pastel grande
);
insert into ajustes (id) values (1) on conflict do nothing;

-- ---------- CATÁLOGO ----------
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text default 'Pasteles',
  descripcion text default '',
  precio numeric,              -- null = "a cotizar"
  precio_desde boolean default true,
  personas int,
  foto_url text,
  foto_post_url text,          -- versión editada lista para redes
  publico boolean default true,
  destacado boolean default false,
  receta_id uuid,
  orden int default 0,
  creado timestamptz default now()
);

-- ---------- INSUMOS Y RECETAS ----------
create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  unidad text default 'g' check (unidad in ('g','ml','pz')),
  presentacion_cantidad numeric default 1000,   -- ej. bolsa de 1000 g
  presentacion_precio numeric default 0,        -- ej. $32
  proveedor text default '',
  actualizado timestamptz default now()
);
create table if not exists recetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text default 'base' check (tipo in ('base','relleno','betun','decoracion','otro')),
  rinde_personas numeric default 20,
  horas numeric default 1,
  notas text default ''
);
create table if not exists receta_insumos (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid references recetas(id) on delete cascade,
  insumo_id uuid references insumos(id) on delete cascade,
  cantidad numeric default 0
);

-- ---------- PEDIDOS ----------
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  folio bigint generated always as identity,
  cliente text not null,
  telefono text default '',
  producto_id uuid references productos(id) on delete set null,
  descripcion text default '',
  personas int default 20,
  sabor text default '', relleno text default '', decoracion text default '',
  fecha_entrega timestamptz not null,
  tipo_entrega text default 'recoge' check (tipo_entrega in ('recoge','domicilio')),
  direccion text default '',
  envio numeric default 0,
  precio numeric default 0,
  estado text default 'confirmado' check (estado in ('cotizacion','confirmado','en_proceso','listo','entregado','cancelado')),
  foto_ref_url text,
  notas text default '',
  creado_por uuid default auth.uid(),
  creado timestamptz default now()
);
create table if not exists pedido_recetas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  receta_id uuid references recetas(id) on delete cascade,
  factor numeric default 1
);
create table if not exists pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  monto numeric not null,
  tipo text default 'anticipo' check (tipo in ('anticipo','saldo','otro')),
  metodo text default 'efectivo',
  fecha date default current_date,
  registrado_por uuid default auth.uid(),
  creado timestamptz default now()
);
create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  titulo text not null,
  tipo text default 'otro' check (tipo in ('comprar','hornear','decorar','entregar','otro')),
  fecha date not null,
  hora text,
  asignado_a uuid references perfiles(id) on delete set null,
  hecho boolean default false,
  auto boolean default false,
  creado timestamptz default now()
);

-- ---------- CUENTAS (solo admins) ----------
create table if not exists movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso','gasto')),
  categoria text default 'Materia prima',
  concepto text default '',
  monto numeric not null,
  fecha date default current_date,
  creado timestamptz default now()
);

-- ---------- IDEAS Y MEJORAS (para pasarle a Claude) ----------
create table if not exists mejoras (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  hecho boolean default false,
  autor text,
  creado timestamptz default now()
);

-- =====================================================================
--  SEGURIDAD (RLS)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['perfiles','negocio','ajustes','productos','insumos','recetas','receta_insumos',
                           'pedidos','pedido_recetas','pagos','tareas','movimientos','mejoras'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists p_sel on %I', t);
    execute format('drop policy if exists p_ins on %I', t);
    execute format('drop policy if exists p_upd on %I', t);
    execute format('drop policy if exists p_del on %I', t);
    execute format('drop policy if exists p_pub on %I', t);
  end loop;
end $$;

-- perfiles: cada quien ve el suyo; activos ven a todos (para asignar tareas); admins editan
create policy p_sel on perfiles for select using (id = auth.uid() or es_activo());
create policy p_upd on perfiles for update using (es_admin());

-- negocio: público (lo usa el catálogo); solo admin edita
create policy p_sel on negocio for select using (true);
create policy p_upd on negocio for update using (es_admin());

-- ajustes: lo leen los activos; solo admin edita
create policy p_sel on ajustes for select using (es_activo());
create policy p_upd on ajustes for update using (es_admin());

-- productos: el público ve los publicados; activos ven todo; admin edita
create policy p_pub on productos for select using (publico or es_activo());
create policy p_ins on productos for insert with check (es_admin());
create policy p_upd on productos for update using (es_admin());
create policy p_del on productos for delete using (es_admin());

-- insumos / recetas: los leen los activos (para la lista de compras); admin edita
create policy p_sel on insumos for select using (es_activo());
create policy p_ins on insumos for insert with check (es_admin());
create policy p_upd on insumos for update using (es_admin());
create policy p_del on insumos for delete using (es_admin());
create policy p_sel on recetas for select using (es_activo());
create policy p_ins on recetas for insert with check (es_admin());
create policy p_upd on recetas for update using (es_admin());
create policy p_del on recetas for delete using (es_admin());
create policy p_sel on receta_insumos for select using (es_activo());
create policy p_ins on receta_insumos for insert with check (es_admin());
create policy p_upd on receta_insumos for update using (es_admin());
create policy p_del on receta_insumos for delete using (es_admin());

-- pedidos, tareas, pagos: todos los activos los usan; borrar solo admin
create policy p_sel on pedidos for select using (es_activo());
create policy p_ins on pedidos for insert with check (es_activo());
create policy p_upd on pedidos for update using (es_activo());
create policy p_del on pedidos for delete using (es_admin());
create policy p_sel on pedido_recetas for select using (es_activo());
create policy p_ins on pedido_recetas for insert with check (es_activo());
create policy p_upd on pedido_recetas for update using (es_activo());
create policy p_del on pedido_recetas for delete using (es_activo());
create policy p_sel on tareas for select using (es_activo());
create policy p_ins on tareas for insert with check (es_activo());
create policy p_upd on tareas for update using (es_activo());
create policy p_del on tareas for delete using (es_activo());
create policy p_sel on pagos for select using (es_activo());
create policy p_ins on pagos for insert with check (es_activo());
create policy p_del on pagos for delete using (es_admin());

-- movimientos (cuentas): SOLO admins
create policy p_sel on movimientos for select using (es_admin());
create policy p_ins on movimientos for insert with check (es_admin());
create policy p_upd on movimientos for update using (es_admin());
create policy p_del on movimientos for delete using (es_admin());

-- mejoras: todos los activos
create policy p_sel on mejoras for select using (es_activo());
create policy p_ins on mejoras for insert with check (es_activo());
create policy p_upd on mejoras for update using (es_activo());
create policy p_del on mejoras for delete using (es_admin());

-- =====================================================================
--  FOTOS (Storage)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('fotos','fotos', true)
on conflict (id) do update set public = true;
drop policy if exists fotos_ins on storage.objects;
drop policy if exists fotos_upd on storage.objects;
drop policy if exists fotos_del on storage.objects;
create policy fotos_ins on storage.objects for insert to authenticated with check (bucket_id = 'fotos' and public.es_activo());
create policy fotos_upd on storage.objects for update to authenticated using (bucket_id = 'fotos' and public.es_activo());
create policy fotos_del on storage.objects for delete to authenticated using (bucket_id = 'fotos' and public.es_admin());

-- =====================================================================
--  PASTELES DE EJEMPLO (fotos que vienen en la carpeta img/ejemplos)
--  Solo se insertan si el catálogo está vacío.
-- =====================================================================
insert into productos (nombre, categoria, descripcion, personas, foto_url, destacado, orden)
select * from (values
 ('Pastel Unicornio','Pasteles','Forrado en fondant con orejitas, cuerno dorado y flores de betún.',20,'img/ejemplos/unicornio.jpg',true,1),
 ('Pastel Asador','Pasteles','Parrilla con carne, salchichas y brochetas modeladas en fondant.',20,'img/ejemplos/asador.jpg',true,2),
 ('Pastel Norteño personalizado','Pasteles','Acordeón, sombrero y guitarra en fondant, con nombre.',25,'img/ejemplos/nortenio.jpg',false,3),
 ('Pastel temático Inuyasha','Pasteles','Dos pisos con temática de Inuyasha: traje rojo, rosario y detalles en fondant.',30,'img/ejemplos/inuyasha.jpg',false,4),
 ('Pastel Acuarela + Cupcakes','Pasteles','Betún efecto acuarela con torre de cupcakes para evento.',40,'img/ejemplos/acuarela-cupcakes.jpg',true,5),
 ('Pastel Panda','Pasteles','Betún de estrellita blanco con carita de panda.',20,'img/ejemplos/panda.jpg',false,6),
 ('Pastel Calabaza','Pasteles','Temporada de Halloween, betún naranja de estrellita.',15,'img/ejemplos/calabaza.jpg',false,7),
 ('Pastel de Flores','Pasteles','Dos pisos con rosas de betún.',35,'img/ejemplos/flores-azul.jpg',false,8),
 ('Cupcakes Baby Shower','Cupcakes','Betún rosa con bebé y figuritas de fondant.',12,'img/ejemplos/cupcake-baby.jpg',false,9),
 ('Cupcakes Feliz Cumple','Cupcakes','Chocolate con letras de fondant y chispas.',6,'img/ejemplos/cupcakes-cumple.jpg',false,10),
 ('Gelatina de Frutos Rojos','Gelatinas','Con fruta natural y flor de fresa y piña.',20,'img/ejemplos/gelatina-frutos.jpg',false,11),
 ('Gelatina Floral','Gelatinas','Mosaico de rosas de leche y colores.',20,'img/ejemplos/gelatina-floral.jpg',false,12)
) v(nombre,categoria,descripcion,personas,foto_url,destacado,orden)
where not exists (select 1 from productos);

-- =====================================================================
--  PERMISOS PARA LA APP (necesarios en proyectos nuevos de Supabase)
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on negocio, productos to anon;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.es_activo(), public.es_admin() to anon, authenticated;

-- Fin. Ahora crea las cuentas en la app y corre 02_hacer_admins.sql
