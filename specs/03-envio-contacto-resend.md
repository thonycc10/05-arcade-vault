# SPEC 03 — Envío real del formulario de contacto con Resend

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-11-16
> **Objective:** Reemplazar el envío mock del formulario de `/acerca` por un envío real de correo vía Resend usando una Server Action, manteniendo el diseño del template `references/templates/home-about/about.jsx`.

## Por qué existe esta spec

SPEC 02 dejó `/acerca` (misión + highlights + formulario) idéntico al template, pero el formulario es mock: `components/contact-form.tsx` solo cambia estado local y muestra el terminal "VAULT-OS // TERMINAL" sin enviar nada (SPEC 02 dejó el envío real fuera de alcance). Esta spec conecta ese formulario a Resend. La página About **no se rehace**; solo cambia el envío.

## Scope

**In:**

- Dependencia `resend` (SDK oficial) en `package.json`.
- Server Action `sendContactMessage` en `app/acerca/actions.ts` (`"use server"`), invocada desde `components/contact-form.tsx`.
- Validación en servidor: nombre, correo y mensaje no vacíos (tras `trim`), formato de correo válido, longitudes máximas (nombre 80, correo 254, mensaje 2000).
- Honeypot anti-spam: campo oculto (`website`) en el formulario; si llega con valor, el servidor responde éxito simulado sin enviar.
- Envío con Resend:
  - `from`: `CONTACT_FROM_EMAIL` (por defecto `Arcade Vault <onboarding@resend.dev>`, sandbox).
  - `to`: `CONTACT_TO_EMAIL` (correo del dueño de la cuenta Resend).
  - `replyTo`: correo del visitante.
  - `subject`: `[Arcade Vault] Mensaje de <nombre>`.
  - Cuerpo HTML con estilo arcade (fondo oscuro, neón, fuente monoespaciada, estilos inline) + versión `text` plana.
  - Todo valor del usuario se escapa en el HTML.
- Variables de entorno: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (opcional). Documentadas en `.env.example`; `.env.local` no se versiona (ya cubierto por `.env*` en `.gitignore`).
- UX del formulario:
  - Validación de campos vacíos en cliente igual que hoy (`shake`).
  - Estado "enviando": botón deshabilitado con texto `▶ ENVIANDO…`.
  - Éxito: terminal "VAULT-OS // TERMINAL" existente, con `GRACIAS, <NOMBRE EN MAYÚSCULAS>.`; "ENVIAR OTRO MENSAJE" resetea.
  - Error (validación de servidor, fallo de Resend o red): mensaje de error inline sobre el botón, estilo terminal/neón (`> ERROR: ...`), conserva lo escrito y permite reintentar; `shake`.
- Actualizar el comentario "mock" de `contact-form.tsx` y el texto de las líneas `[OK]` del terminal solo si hace falta para que sea veraz (sin cambiar el diseño).
- Textos en español. Usar la skill `/frontend-design` para el estilo del mensaje de error y del correo HTML (regla del CLAUDE.md).

**Out of scope (para otras specs):**

- Dominio propio verificado en Resend (se usa sandbox `onboarding@resend.dev`; en sandbox Resend solo entrega al correo dueño de la cuenta).
- Rate limiting, CAPTCHA o protección avanzada (solo honeypot).
- Persistir mensajes en DB o historial.
- Correo de confirmación/auto-respuesta al visitante.
- Rehacer o rediseñar la página About (ya hecha en SPEC 02).
- React Email u otra librería de plantillas (HTML inline escrito a mano).
- Tests automatizados, i18n.

## Data model

No introduce datos persistentes. Tipos nuevos (solo en memoria):

```ts
// app/acerca/actions.ts
export type ContactInput = {
  name: string;     // máx. 80
  email: string;    // máx. 254, formato válido
  msg: string;      // máx. 2000
  website?: string; // honeypot: debe venir vacío
};

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: string };   // mensaje listo para mostrar al usuario
```

Variables de entorno (`.env.local`, ver `.env.example`):

```
RESEND_API_KEY=re_xxx
CONTACT_TO_EMAIL=tu-correo@ejemplo.com
CONTACT_FROM_EMAIL=Arcade Vault <onboarding@resend.dev>   # opcional
```

## Implementation plan

Antes de escribir código: leer en `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` (Server Actions), `05-server-and-client-components.md` y la guía de `data-security.md`; revisar la doc vigente de Resend (SDK Node, `emails.send`). Con `cacheComponents: true` verificar que la Server Action no requiere cambios de caché.

1. **Dependencia y entorno.** `npm install resend`. Crear `.env.example` con las 3 variables (sin valores reales). Crear `.env.local` local con las claves reales (no se commitea). Verificar: `npm run lint` pasa; `git status` no muestra `.env.local`.
2. **Plantilla de correo.** Crear `lib/contact-email.ts` con `buildContactEmail({ name, email, msg })` → `{ subject, html, text }`; escapa HTML en todos los valores; HTML con estilos inline arcade. Verificar: `npm run lint`; revisar a mano que `<script>` en el mensaje salga escapado.
3. **Server Action.** Crear `app/acerca/actions.ts` con `sendContactMessage(input: ContactInput): Promise<ContactResult>`: honeypot → `{ ok: true }` sin enviar; validación (vacíos, formato, longitudes); verificar que existan `RESEND_API_KEY` y `CONTACT_TO_EMAIL` (si faltan, `{ ok: false, error }` genérico y `console.error` en servidor); `resend.emails.send(...)` con `from`, `to`, `replyTo`, `subject`, `html`, `text`; si Resend devuelve `error` → `{ ok: false, error }` genérico (sin filtrar detalles internos). Verificar: `npm run lint`.
4. **Conectar el formulario.** En `components/contact-form.tsx`: añadir input honeypot oculto (`name="website"`, `tabIndex={-1}`, `autoComplete="off"`, fuera de pantalla con CSS, `aria-hidden`); `onSubmit` valida vacíos en cliente (shake) y llama a la Server Action con `useTransition`; estado `pending` en el botón; en `ok` → terminal de éxito; en error → mensaje inline + shake, sin perder datos. Verificar: con `.env.local` válido, enviar un mensaje llega al correo destino.
5. **Estilos.** Añadir en `app/globals.css` las reglas mínimas: `.contact-error` (estilo terminal/neón, `role="alert"`), `.hp-field` (oculto fuera de pantalla), estado `disabled` del botón si no existe. No duplicar reglas existentes. Verificar: aspecto correcto en escritorio y ≤ 768 px.
6. **Verificación end-to-end y limpieza.** Probar: envío válido, campos vacíos, correo inválido, honeypot lleno (no llega correo), API key inválida (muestra error, no rompe), reintento tras error. Verificar el correo recibido: `Reply-To` = correo del visitante, HTML legible, sin HTML inyectado. `npm run build` y `npm run lint` sin errores; `grep -rn "RESEND_API_KEY" app components` solo aparece en `actions.ts`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `resend` figura en `package.json`; existe `.env.example` con `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`; `.env.local` no está en git.
- [ ] Con las env vars correctas, enviar el formulario con nombre, correo y mensaje válidos entrega un correo a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de <nombre>`.
- [ ] El correo recibido tiene `Reply-To` igual al correo escrito por el visitante y muestra nombre, correo y mensaje en HTML estilo arcade (con versión texto plano).
- [ ] Un mensaje con `<script>alert(1)</script>` llega con el texto escapado (no se interpreta como HTML).
- [ ] Tras enviar con éxito se muestra el terminal con `GRACIAS, <NOMBRE EN MAYÚSCULAS>.`; "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [ ] Con algún campo vacío no se llama a la Server Action y se aplica `shake`.
- [ ] La Server Action rechaza (devuelve `ok: false`) correo con formato inválido y campos que superan las longitudes máximas, aunque se salte la validación del cliente.
- [ ] Con el honeypot lleno la UI muestra éxito pero no se envía ningún correo (`resend.emails.send` no se invoca).
- [ ] Mientras se envía, el botón está deshabilitado y dice `▶ ENVIANDO…`; no se puede enviar dos veces seguidas.
- [ ] Con `RESEND_API_KEY` inválida o ausente se muestra un error inline (`> ERROR: ...`), se conserva lo escrito, no se muestra el terminal de éxito y el mensaje no revela claves ni detalles internos.
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente ni en archivos de `components/`; solo se lee en `app/acerca/actions.ts`.
- [ ] En ancho ≤ 768 px el formulario y el mensaje de error no producen scroll horizontal.
- [ ] No hay errores de hidratación ni errores en consola en `/acerca`.
- [ ] `/`, `/biblioteca`, `/auth`, `/salon` y `/juegos/*` siguen funcionando sin cambios.

## Decisions

- **Sí:** Server Action. La API key queda solo en el servidor, menos código que una API route y se integra con el formulario existente.
- **No:** API Route (`app/api/contacto/route.ts`). Solo valdría la pena si otro cliente consumiera el endpoint.
- **Sí:** remitente sandbox `onboarding@resend.dev` y destino en `CONTACT_TO_EMAIL`. Funciona sin verificar dominio; suficiente para MVP. Limitación: en sandbox Resend solo entrega al correo dueño de la cuenta.
- **No:** dominio propio verificado ahora. Pasa a otra spec cuando haya dominio; bastará cambiar `CONTACT_FROM_EMAIL`.
- **Sí:** `replyTo` = correo del visitante. Responder desde el buzón contesta directo al usuario; el `from` sigue siendo el nuestro (no se suplanta el correo del visitante).
- **Sí:** honeypot + validación en servidor. Defensa barata contra bots y contra clientes que se salten el JS; la validación del cliente es solo UX.
- **No:** rate limiting / CAPTCHA. Requiere infraestructura o servicio extra; se revisa si aparece spam real.
- **Sí:** correo HTML estilo arcade escrito a mano con estilos inline, más versión texto. Coherente con la marca; sin añadir React Email para un solo correo.
- **Sí:** escapar todo valor del usuario en el HTML del correo. Evita inyección de HTML en el buzón del equipo.
- **Sí:** error genérico al usuario y detalle solo en `console.error` del servidor. No filtrar información interna.
- **Sí:** no rehacer el About; solo cambia el envío. La página ya cumple el template desde SPEC 02.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Sandbox de Resend solo entrega al correo dueño de la cuenta; `CONTACT_TO_EMAIL` distinto falla | Documentarlo en `.env.example`; usar el correo de la cuenta Resend; el error se ve inline sin romper la UI. |
| API key filtrada al repo o al cliente | `.env*` ya está en `.gitignore`; la key se lee solo en `actions.ts`; criterio de aceptación con `grep`. |
| Spam o abuso del formulario (sin rate limit) | Honeypot + límites de longitud; spec futura si aparece abuso. |
| Inyección de HTML en el correo | `buildContactEmail` escapa todos los valores; criterio de aceptación con `<script>`. |
| Fallo de Resend o de red deja al usuario sin feedback | Estado de error inline con reintento; el formulario conserva los datos. |
| El terminal de éxito dice `[OK] Conectando…` antes de confirmar el envío | El terminal solo se muestra tras `ok: true` del servidor, así que el texto es veraz. |
| Server Action y `cacheComponents: true` | Revisar la doc antes de implementar; la acción no usa datos cacheados. |
| Doble envío por doble clic | Botón deshabilitado mientras `pending`. |

## What is **not** in this spec

- Dominio propio verificado ni cambio de remitente productivo.
- Rate limiting, CAPTCHA o anti-spam avanzado.
- Guardar mensajes en base de datos o panel de administración.
- Auto-respuesta o correo de confirmación al visitante.
- Cambios de diseño de la página About o de otras pantallas.
- React Email / plantillas externas.
- Tests automatizados e i18n.
