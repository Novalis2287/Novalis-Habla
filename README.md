# Novalis Habla

App de Clínica Novalis para comunicarse con los pacientes por WhatsApp Business: mensajes con plantillas, documentos PDF, recordatorios de revisión semestral y seguimiento de primeras visitas.

Funciona en iPhone, Android y Windows como app web instalable (PWA).

## Qué hace

- **Pacientes**: lista con buscador. Al abrir un paciente hay dos opciones, «Enviar mensaje» y «Enviar PDF», y un botón «Datos del paciente».
- **Envíos sin coste**: la app abre WhatsApp con el chat del paciente y el texto ya escrito; solo hay que pulsar enviar. No usa la API de pago de WhatsApp.
- **PDF**: el mensaje lleva un enlace a una página de vista previa, y WhatsApp muestra una tarjeta con aspecto de documento. Al tocarla se abre el PDF.
- **Plantillas de la clínica**: «Bienvenida a Novalis», «Cómo llegar», «Conócenos» y «Tras la valoración», las primeras de la lista y editables. Las palabras entre llaves se rellenan solas (ver [Variables](#variables-de-las-plantillas)).
- **Tarjetas de vista previa**: cada enlace pasa por una página de la app (`/ubicacion`, `/conocenos`, `/d/<id>`, `/p/<id>`) con imagen, título y descripción, que es lo que WhatsApp enseña como tarjeta. WhatsApp solo muestra la tarjeta del primer enlace, así que cada mensaje lleva uno solo.
- **Tras la valoración**: al elegir esa plantilla se seleccionan PDF de la biblioteca y fotos intraorales del paciente. La app crea con ello una página personal del paciente y pone en el mensaje un único enlace a ella.
- **Revisiones**: quién tiene la revisión semestral vencida o próxima, con recordatorio a un toque.
- **Seguimiento**: primeras visitas, cómo nos han conocido, estado del plan (aceptado, pensando, no aceptado), anotaciones, fecha para volver a llamar y estadísticas por mes.
- **Ajustes**: plantillas, biblioteca de PDF y, para el administrador, los enlaces de la clínica (Google Maps, Instagram y Facebook) y los usuarios con acceso.

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

### 4. Enlaces de la clínica

En **Ajustes → Enlaces de la clínica** el administrador pone las direcciones de Google Maps, Instagram y Facebook. No están en el código: se guardan en la base de datos y se pueden cambiar cuando haga falta.

### Actualizar una instalación

Si cambia `supabase/esquema.sql`, vuelve a ejecutarlo entero en **SQL Editor** (con el correo del administrador en la última línea). Está hecho para poder ejecutarse más de una vez.

### Instalar la app

- **iPhone**: abrir en Safari → Compartir → **Añadir a pantalla de inicio**.
- **Android**: abrir en Chrome → menú → **Añadir a pantalla de inicio** o **Instalar app**.
- **Windows**: abrir en Chrome o Edge → icono de instalar en la barra de direcciones. Para enviar desde el ordenador, WhatsApp de escritorio o WhatsApp Web tiene que estar vinculado al WhatsApp Business de la clínica. En **Ajustes → WhatsApp en este ordenador** se elige cuál se usa: WhatsApp Web en una pestaña nueva por envío (el navegador no permite reutilizar una ya abierta), WhatsApp Web en la misma pestaña de la app (sin pestañas nuevas; se vuelve con la flecha Atrás) o la aplicación de escritorio (todos los envíos van a la misma ventana).

## Variables de las plantillas

| Variable | Se cambia por |
| --- | --- |
| `{nombre}` | Nombre de pila del paciente |
| `{enlace_maps}` | Página «Cómo llegar a Clínica Novalis», que abre Google Maps |
| `{enlace_conocenos}` | Página «Conoce Clínica Novalis», con los botones de Instagram y Facebook |
| `{enlace_instagram}`, `{enlace_facebook}` | Páginas que llevan directamente a cada red |
| `{enlaces_documentos}` | Solo en «Tras la valoración»: enlace a la página personal del paciente |
| `{documento}`, `{enlace}` | Solo en «Envío de documento»: título y enlace del PDF |

Un texto entre asteriscos, como `*Clínica Novalis*`, sale en negrita en WhatsApp.

## Privacidad

- Los datos de pacientes están solo en la base de datos, y solo los ven los usuarios autorizados (`supabase/esquema.sql`).
- Nadie puede crear una cuenta si el administrador no ha autorizado antes su correo.
- Los PDF de la biblioteca son públicos para quien tenga el enlace. Deben ser documentos generales, nunca informes de un paciente.
- Las fotos intraorales son datos de salud y se tratan aparte:
  - Se guardan en un almacén privado; antes de subirlas se reducen y se les quitan los datos ocultos de la cámara.
  - La página personal del paciente tiene una dirección aleatoria de 32 caracteres, imposible de adivinar, y caduca a los 30 días. Las fotos se sirven con enlaces firmados que caducan a la vez.
  - La tarjeta de WhatsApp de esa página no lleva ningún dato del paciente.
  - En **Datos del paciente** se ven las páginas que siguen disponibles y se pueden retirar: el enlace deja de funcionar y las fotos se borran. También se borran al borrar al paciente y cuando la página caduca.

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
| `netlify/functions` | Páginas que abre el paciente: PDF (`/d/<id>`), enlaces de la clínica (`/ubicacion`, `/conocenos`…) y página personal (`/p/<id>`) |
| `netlify/lib` | Diseño y utilidades comunes de esas páginas |
| `supabase` | Tablas y reglas de acceso de la base de datos |
| `public` | Iconos, imágenes de las tarjetas de WhatsApp, manifiesto y service worker |
