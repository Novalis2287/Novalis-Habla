-- Novalis Habla · base de datos (Supabase)
--
-- Cómo usarlo: en Supabase abre "SQL Editor", pega TODO este archivo,
-- cambia el correo de la última línea por el del administrador y pulsa "Run".
-- Se puede ejecutar más de una vez sin estropear nada.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Personas con acceso a la app. Solo el administrador puede modificarla.
create table if not exists public.usuarios (
  email  text primary key check (email = lower(email)),
  nombre text not null default '',
  admin  boolean not null default false,
  creado timestamptz not null default now()
);

create table if not exists public.pacientes (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null,
  telefono             text not null default '',
  proxima_revision     date,
  recordatorio_enviado date,
  primera_visita       date,
  origen               text,
  estado_plan          text check (estado_plan in ('aceptado', 'pensando', 'no_aceptado')),
  volver_a_llamar      date,
  creado               timestamptz not null default now()
);

-- Anotaciones con fecha de cada paciente (llamadas, comentarios…).
create table if not exists public.anotaciones (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  fecha       timestamptz not null default now(),
  texto       text not null,
  autor       text not null default ''
);
create index if not exists anotaciones_paciente on public.anotaciones (paciente_id, fecha desc);

-- Historial de envíos: qué se envió a cada paciente y cuándo.
create table if not exists public.envios (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  fecha       timestamptz not null default now(),
  tipo        text not null check (tipo in ('mensaje', 'pdf')),
  titulo      text not null default '',
  texto       text not null default '',
  autor       text not null default ''
);
create index if not exists envios_paciente on public.envios (paciente_id, fecha desc);

-- Plantillas de mensajes. "uso" distingue las dos especiales:
--   revision → recordatorio de revisión semestral (envío con un toque)
--   pdf      → texto que acompaña al enlace de un documento
create table if not exists public.plantillas (
  id     uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto  text not null,
  uso    text not null default 'general' check (uso in ('general', 'revision', 'pdf')),
  creado timestamptz not null default now()
);

-- Biblioteca de PDF. El archivo está en el almacenamiento, en "ruta".
create table if not exists public.documentos (
  id          text primary key,
  titulo      text not null,
  descripcion text not null default '',
  ruta        text not null,
  creado      timestamptz not null default now()
);

-- Ajustes sueltos de la clínica (por ejemplo, la lista "cómo nos ha conocido").
create table if not exists public.ajustes (
  clave text primary key,
  valor jsonb not null
);

-- ---------------------------------------------------------------------------
-- Quién puede entrar
-- ---------------------------------------------------------------------------

create or replace function public.autorizado() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from usuarios where email = lower(auth.jwt() ->> 'email'));
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from usuarios where email = lower(auth.jwt() ->> 'email') and admin);
$$;

-- Nadie puede crear una cuenta si su correo no está antes en la lista de usuarios.
create or replace function public.comprobar_alta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from usuarios where email = lower(new.email)) then
    raise exception 'correo_no_autorizado';
  end if;
  return new;
end;
$$;

drop trigger if exists comprobar_alta on auth.users;
create trigger comprobar_alta before insert on auth.users
  for each row execute function public.comprobar_alta();

-- ---------------------------------------------------------------------------
-- Permisos (seguridad por filas): sin estar en la lista no se ve ni se toca nada
-- ---------------------------------------------------------------------------

alter table public.usuarios    enable row level security;
alter table public.pacientes   enable row level security;
alter table public.anotaciones enable row level security;
alter table public.envios      enable row level security;
alter table public.plantillas  enable row level security;
alter table public.documentos  enable row level security;
alter table public.ajustes     enable row level security;

-- Datos de la clínica: todos los usuarios autorizados comparten lo mismo.
do $$
declare t text;
begin
  foreach t in array array['pacientes', 'anotaciones', 'envios', 'plantillas', 'ajustes'] loop
    execute format('drop policy if exists clinica on public.%I', t);
    execute format(
      'create policy clinica on public.%I for all to authenticated
         using (public.autorizado()) with check (public.autorizado())', t);
  end loop;
end $$;

-- Usuarios: los autorizados ven la lista; solo el administrador la cambia,
-- y no puede modificar ni borrar su propia ficha (para no quedarse fuera).
drop policy if exists usuarios_ver on public.usuarios;
create policy usuarios_ver on public.usuarios for select to authenticated
  using (public.autorizado());

drop policy if exists usuarios_alta on public.usuarios;
create policy usuarios_alta on public.usuarios for insert to authenticated
  with check (public.es_admin() and admin = false);

drop policy if exists usuarios_cambio on public.usuarios;
create policy usuarios_cambio on public.usuarios for update to authenticated
  using (public.es_admin() and email <> lower(auth.jwt() ->> 'email'))
  with check (public.es_admin() and admin = false);

drop policy if exists usuarios_baja on public.usuarios;
create policy usuarios_baja on public.usuarios for delete to authenticated
  using (public.es_admin() and email <> lower(auth.jwt() ->> 'email'));

-- Documentos: la ficha (título y enlace) es pública para que WhatsApp pueda
-- mostrar la tarjeta de vista previa. Solo los autorizados añaden o borran.
drop policy if exists documentos_ver on public.documentos;
create policy documentos_ver on public.documentos for select to anon, authenticated
  using (true);

drop policy if exists documentos_alta on public.documentos;
create policy documentos_alta on public.documentos for insert to authenticated
  with check (public.autorizado());

drop policy if exists documentos_cambio on public.documentos;
create policy documentos_cambio on public.documentos for update to authenticated
  using (public.autorizado()) with check (public.autorizado());

drop policy if exists documentos_baja on public.documentos;
create policy documentos_baja on public.documentos for delete to authenticated
  using (public.autorizado());

-- ---------------------------------------------------------------------------
-- Almacenamiento de los PDF (documentos generales, nunca datos de pacientes)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', true, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists documentos_subir on storage.objects;
create policy documentos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.autorizado());

drop policy if exists documentos_quitar on storage.objects;
create policy documentos_quitar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.autorizado());

-- ---------------------------------------------------------------------------
-- Contenido inicial
-- ---------------------------------------------------------------------------

insert into public.plantillas (titulo, texto, uso)
select * from (values
  ('Recordatorio de revisión',
   'Hola {nombre}, te escribimos de Clínica Novalis. Ya toca tu revisión semestral. ¿Te viene bien que te demos cita? Puedes responder a este mensaje o llamarnos. ¡Gracias!',
   'revision'),
  ('Envío de documento',
   'Hola {nombre}, te enviamos desde Clínica Novalis el documento «{documento}»: {enlace}',
   'pdf'),
  ('Indicaciones tras el tratamiento',
   'Hola {nombre}, esperamos que te encuentres bien tras el tratamiento de hoy. Si tienes cualquier molestia o duda, escríbenos o llámanos. Clínica Novalis.',
   'general')
) as inicial (titulo, texto, uso)
where not exists (select 1 from public.plantillas);

insert into public.ajustes (clave, valor)
values ('origenes', '["Recomendación", "Google", "Redes sociales", "Pasaba por la clínica", "Otro"]')
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- Administrador: CAMBIA ESTE CORREO por el tuyo (en minúsculas) antes de ejecutar
-- ---------------------------------------------------------------------------

insert into public.usuarios (email, nombre, admin)
values ('tu-correo@ejemplo.com', 'Administrador', true)
on conflict (email) do nothing;
