# Novalis Habla

App de Clínica Novalis para comunicarse con los pacientes por WhatsApp Business: mensajes con plantillas, documentos PDF, recordatorios de revisión semestral y seguimiento de primeras visitas.

Funciona en iPhone, Android y Windows como app web instalable (PWA).

## Qué hace

- **Pacientes**: lista con buscador. Al abrir un paciente hay dos opciones, «Enviar mensaje» y «Enviar PDF», y un botón «Datos del paciente».
- **Envíos sin coste**: la app abre WhatsApp con el chat del paciente y el texto ya escrito; solo hay que pulsar enviar. No usa la API de pago de WhatsApp.
- **PDF**: el mensaje lleva un enlace a una página de vista previa, y WhatsApp muestra una tarjeta con aspecto de documento. Al tocarla se abre el PDF.
- **Revisiones**: quién tiene la revisión semestral vencida o próxima, con recordatorio a un toque.
- **Seguimiento**: primeras visitas, cómo nos han conocido, estado del plan (aceptado, pensando, no aceptado), anotaciones, fecha para volver a llamar y estadísticas por mes.
- **Ajustes**: plantillas, biblioteca de PDF y, para el administrador, los usuarios con acceso.

## Modo demostración

Sin base de datos configurada, la app arranca con pacientes **inventados** que se guardan solo en ese dispositivo. Sirve para probarla. En este repositorio no hay ni debe haber datos reales de pacientes, ni claves.

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo. En la región elige una de la Unión Europea (por ejemplo, Fráncfort).
2. Abre **SQL Editor**, pega el contenido completo de [`supabase/esquema.sql`](supabase/esquema.sql), cambia el correo de la última línea por el del administrador (en minúsculas) y pulsa **Run**.
3. En **Authentication**, deja activada la confirmación del correo (viene así por defecto).
4. En los ajustes del proyecto, apartado **API**, copia la **Project URL** y la clave pública (**anon** o **publishable**). Esta clave no es secreta: el acceso lo controlan las reglas de la base de datos. La clave **service_role** sí es secreta y no se usa en ningún sitio.

### 2. Publicación (Netlify)

1. En [netlify.com](https://www.netlify.com), crea un sitio nuevo a partir de este repositorio de GitHub. La configuración de compilación ya está en `netlify.toml`.
2. En **Environment variables** añade:
   - `VITE_SUPABASE_URL`: la Project URL.
   - `VITE_SUPABASE_ANON_KEY`: la clave pública.
3. Vuelve a publicar el sitio para que tome las variables.
4. En Supabase, **Authentication → URL Configuration**, pon en **Site URL** la dirección del sitio de Netlify. Así los enlaces de los correos de confirmación llevan a la app.

### 3. Primer acceso

1. Abre la app, pulsa **Crear cuenta** con el correo del administrador y confirma con el enlace que llega por correo.
2. En **Ajustes → Usuarios con acceso** autoriza los correos del resto del equipo. Cada persona crea después su cuenta con ese correo.

### Instalar la app

- **iPhone**: abrir en Safari → Compartir → **Añadir a pantalla de inicio**.
- **Android**: abrir en Chrome → menú → **Añadir a pantalla de inicio** o **Instalar app**.
- **Windows**: abrir en Chrome o Edge → icono de instalar en la barra de direcciones. Para enviar desde el ordenador, WhatsApp de escritorio o WhatsApp Web tiene que estar vinculado al WhatsApp Business de la clínica.

## Privacidad

- Los datos de pacientes están solo en la base de datos, y solo los ven los usuarios autorizados (`supabase/esquema.sql`).
- Nadie puede crear una cuenta si el administrador no ha autorizado antes su correo.
- Los PDF de la biblioteca son públicos para quien tenga el enlace. Deben ser documentos generales, nunca informes de un paciente.

## Desarrollo

```
npm install
npm run dev
```

Para usar la base de datos en local, copia `.env.example` como `.env` y rellena los dos valores.

| Carpeta | Contenido |
| --- | --- |
| `src/pantallas` | Las pantallas de la app |
| `src/lib` | Datos, estado compartido y utilidades |
| `netlify/functions` | Página de vista previa de los PDF (`/d/<id>`) |
| `supabase` | Tablas y reglas de acceso de la base de datos |
| `public` | Iconos, manifiesto y service worker |
