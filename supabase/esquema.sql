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

-- Plantillas de mensajes. "uso" distingue las especiales:
--   revision   → recordatorio de revisión semestral (envío con un toque)
--   pdf        → texto que acompaña al enlace de un documento
--   valoracion → antes de enviarla se eligen documentos y fotos, y lleva el enlace
--                a la página personal del paciente
-- "orden" coloca las plantillas en la lista (las de la clínica van primero).
create table if not exists public.plantillas (
  id     uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto  text not null,
  uso    text not null default 'general',
  orden  integer not null default 100,
  creado timestamptz not null default now()
);
alter table public.plantillas add column if not exists orden integer not null default 100;
alter table public.plantillas drop constraint if exists plantillas_uso_check;
alter table public.plantillas add constraint plantillas_uso_check
  check (uso in ('general', 'revision', 'pdf', 'valoracion'));

-- Biblioteca de documentos (PDF e imágenes PNG o JPG). El archivo está en el almacenamiento, en "ruta".
create table if not exists public.documentos (
  id          text primary key,
  titulo      text not null,
  descripcion text not null default '',
  ruta        text not null,
  creado      timestamptz not null default now()
);

-- Ajustes sueltos de la clínica: la lista "cómo nos ha conocido" (origenes) y los
-- enlaces fijos de la clínica (enlaces: Google Maps, Instagram y Facebook).
create table if not exists public.ajustes (
  clave text primary key,
  valor jsonb not null
);

-- Páginas personales de pacientes (/p/<id>): las fotos intraorales y los PDF que se
-- le envían tras la valoración. El id es largo y aleatorio, y la página caduca.
-- "fotos" guarda, por cada foto, su ruta en el almacenamiento y un enlace firmado
-- que caduca a la vez que la página.
create table if not exists public.paginas (
  id          text primary key check (id ~ '^[a-z0-9]{32}$'),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  documentos  text[] not null default '{}',
  fotos       jsonb not null default '[]',
  caduca      timestamptz not null,
  creado      timestamptz not null default now(),
  autor       text not null default ''
);
create index if not exists paginas_paciente on public.paginas (paciente_id, creado desc);

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
alter table public.paginas     enable row level security;

-- Datos de la clínica: todos los usuarios autorizados comparten lo mismo.
do $$
declare t text;
begin
  foreach t in array array['pacientes', 'anotaciones', 'envios', 'plantillas', 'paginas'] loop
    execute format('drop policy if exists clinica on public.%I', t);
    execute format(
      'create policy clinica on public.%I for all to authenticated
         using (public.autorizado()) with check (public.autorizado())', t);
  end loop;
end $$;

-- Ajustes: los autorizados los ven y los cambian, salvo los enlaces de la clínica,
-- que solo cambia el administrador. Esos enlaces son públicos (los leen las páginas
-- de vista previa que abre el paciente).
drop policy if exists clinica on public.ajustes;
drop policy if exists ajustes_ver on public.ajustes;
create policy ajustes_ver on public.ajustes for select to anon, authenticated
  using (clave = 'enlaces' or public.autorizado());

drop policy if exists ajustes_cambiar on public.ajustes;
create policy ajustes_cambiar on public.ajustes for all to authenticated
  using (public.autorizado() and (clave <> 'enlaces' or public.es_admin()))
  with check (public.autorizado() and (clave <> 'enlaces' or public.es_admin()));

-- Página personal de un paciente: la tabla no es pública. Quien abre el enlace solo
-- puede pedir SU página, con el id completo, y solo mientras no haya caducado.
create or replace function public.pagina_paciente(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'caduca', p.caduca,
    'fotos', coalesce((select jsonb_agg(f ->> 'url') from jsonb_array_elements(p.fotos) f), '[]'::jsonb),
    'documentos', coalesce((
      select jsonb_agg(jsonb_build_object('titulo', d.titulo, 'descripcion', d.descripcion, 'ruta', d.ruta) order by d.titulo)
      from documentos d where d.id = any (p.documentos)), '[]'::jsonb))
  from paginas p
  where p.id = p_id and p.caduca > now();
$$;
revoke all on function public.pagina_paciente(text) from public;
grant execute on function public.pagina_paciente(text) to anon, authenticated;

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
-- Almacenamiento de la biblioteca (documentos e imágenes generales, nunca datos de pacientes)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', true, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
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

-- Fotos intraorales: son datos de salud. El almacén es PRIVADO: solo los usuarios
-- autorizados suben, ven y borran. El paciente las ve con enlaces firmados que caducan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fotos_subir on storage.objects;
create policy fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.autorizado());

drop policy if exists fotos_ver on storage.objects;
create policy fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.autorizado());

drop policy if exists fotos_quitar on storage.objects;
create policy fotos_quitar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.autorizado());

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

-- Enlaces de la clínica: se rellenan desde la app (Ajustes), no aquí.
insert into public.ajustes (clave, valor)
values ('enlaces', '{"maps": "", "instagram": "", "facebook": ""}')
on conflict (clave) do nothing;

-- Plantillas de la clínica, las primeras de la lista. Se añaden una sola vez:
-- si después se editan o se borran en la app, no vuelven a aparecer.
insert into public.plantillas (titulo, texto, uso, orden)
select * from (values
  ('Bienvenida a Novalis',
   E'{nombre}, te damos la más cordial bienvenida a Clínica Novalis.\n\nEs un placer contar con tu confianza. Nuestro equipo cuida cada detalle para ofrecerte una atención personalizada y una odontología de la máxima calidad.\n\nQuedamos a tu disposición por este medio para cualquier consulta.\n\n*Clínica Novalis*',
   'general', 1),
  ('Cómo llegar',
   E'{nombre}, para facilitarte la llegada, te compartimos nuestra ubicación:\n\n📍 {enlace_maps}\n\nSerá un placer recibirte.\n\n*Clínica Novalis*',
   'general', 2),
  ('Conócenos',
   E'{nombre}, te invitamos a conocer Clínica Novalis a través de la experiencia de nuestros pacientes y del trabajo que realizamos cada día:\n\n✨ {enlace_conocenos}\n\n*Clínica Novalis*',
   'general', 3),
  ('Tras la valoración',
   E'{nombre}, gracias por tu visita.\n\nTal como te comentamos en la valoración, ponemos a tu disposición tus fotografías intraorales y una selección de documentos sobre salud dental, preparados por nuestro equipo para acompañarte en tu tratamiento:\n\n📄 {enlaces_documentos}\n\nEste enlace es personal y confidencial. Para cualquier duda, estaremos encantados de atenderte.\n\n*Clínica Novalis*',
   'valoracion', 4)
) as clinica (titulo, texto, uso, orden)
where not exists (select 1 from public.ajustes where clave = 'plantillas_clinica');

insert into public.ajustes (clave, valor)
values ('plantillas_clinica', 'true')
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- Administrador: CAMBIA ESTE CORREO por el tuyo (en minúsculas) antes de ejecutar
-- ---------------------------------------------------------------------------

insert into public.usuarios (email, nombre, admin)
values ('tu-correo@ejemplo.com', 'Administrador', true)
on conflict (email) do nothing;
