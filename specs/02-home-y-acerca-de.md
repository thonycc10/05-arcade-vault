# SPEC 02 — Home (landing) y Acerca de

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-16
> **Objective:** Portar a Next.js las pantallas Home y Acerca de/Contacto de `references/templates/home-about/`, moviendo la Biblioteca a `/biblioteca` y dejando el Home en `/`.

## Por qué existe esta spec

SPEC 01 dejó la Biblioteca en `/`. El template `home-about/` añade una landing (`home.jsx`) y una página `about.jsx` (misión + formulario de contacto) y un nav con 4 links (`nav.jsx`: Inicio, Biblioteca, Salón de la Fama, Acerca de). Para que el Home sea la raíz hay que reubicar la Biblioteca y actualizar todos los enlaces que hoy apuntan a `/` queriendo decir "biblioteca". Los estilos de estas pantallas **no** están en `app/globals.css`; hay que portarlos desde `references/templates/home-about/styles.css` (líneas ~931–1700).

## Scope

**In:**

- Rutas App Router:
  - `/` → Home (`home.jsx`): hero con siluetas flotantes, "¿Por qué Arcade Vault?", vista previa de 6 juegos, stats, actividad en vivo + top jugadores, precios + FAQ, CTA final.
  - `/biblioteca` → Biblioteca (el contenido actual de `app/page.tsx`, movido sin cambios de diseño).
  - `/acerca` → Acerca de + Contacto (`about.jsx`).
- Nav (desktop + panel móvil): añadir "Inicio" (`/`) y "Acerca de" (`/acerca`); "Biblioteca" pasa a `/biblioteca`. Orden como el template: Inicio, Biblioteca, Salón de la Fama, Acerca de.
- Actualizar enlaces que hoy significan "biblioteca" y apuntan a `/`: `app/juegos/[id]/page.tsx` ("VOLVER AL VAULT"), `components/hall-of-fame.tsx` ("VOLVER A LA BIBLIOTECA"), `components/game-player.tsx` ("VOLVER AL VAULT") → `/biblioteca`.
- Redirecciones tras login / invitado en `components/auth-form.tsx` siguen yendo a `/` (ahora el Home).
- Datos mock hardcodeados como en el template, en `lib/data.ts`: `RECENT_SCORES` y `TOP_TODAY` (actividad en vivo y top del día). Textos de features, stats, precios y FAQ viven inline en los componentes de página, como en el template.
- Efecto `reveal` (aparición al hacer scroll) con `IntersectionObserver` en un Client Component pequeño; respeta `prefers-reduced-motion`.
- Formulario de contacto mock: validación de campos vacíos (animación `shake`), pantalla de éxito estilo terminal "VAULT-OS // TERMINAL", botón "ENVIAR OTRO MENSAJE". Sin envío real ni persistencia.
- Port de CSS del Home y About a `app/globals.css` (solo reglas que no existan ya; no duplicar `.field`, `.btn`, `.neon-*`, `.pixel`).
- Metadata por página (`/` → "Arcade Vault", `/acerca` → "Acerca de").
- Textos en español, idénticos al template. Responsive según los `@media` del template.
- Usar la skill `/frontend-design` para cualquier ajuste visual (regla del CLAUDE.md).

**Out of scope (para otras specs):**

- Envío real del formulario de contacto (email, API route, DB).
- Datos reales para "actividad en vivo", "top jugadores · hoy" y stats; no se conectan a `av_scores` ni a `seededScores`.
- Rediseñar o cambiar la Biblioteca, el detalle, el reproductor, auth o salón (solo se cambian sus links).
- Redirección `/` → `/biblioteca` para URLs viejas (no hay usuarios ni SEO que proteger todavía).
- Plan de precios real / pagos (la sección PRECIOS es decorativa; el CTA lleva a `/auth`).
- Tests automatizados, i18n.

## Data model

```ts
// lib/data.ts (añadir)
export type RecentScore = {
  player: string;            // "NEONFOX"
  game: string;              // "Caída" (nombre visible, no id)
  score: number;             // 184220
  ago: string;               // "hace 2 min"
  color: "cyan" | "magenta" | "yellow" | "green";
};
export const RECENT_SCORES: RecentScore[];   // 7 filas, valores idénticos al template

export type TopPlayer = { rank: number; player: string; score: number };
export const TOP_TODAY: TopPlayer[];          // 5 filas, valores idénticos al template
```

Convenciones:

- Valores y orden idénticos a `home.jsx`.
- Números con `toLocaleString("es-ES")`.
- Sin nuevo uso de `localStorage`.
- Formulario de contacto: estado local de React (`{ name, email, msg }`), nada se guarda.

## Implementation plan

Antes de escribir código: leer en `node_modules/next/dist/docs/` lo relativo a Cache Components, Server vs Client Components y `Link`/rutas (ya consultado en SPEC 01; revisar solo si algo cambia).

1. **Mover la Biblioteca.** Crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (metadata `Biblioteca · Arcade Vault` incluida). Dejar `app/page.tsx` temporalmente como redirect/placeholder simple. Verificar: `/biblioteca` renderiza igual que antes; `npm run lint` pasa.
2. **Actualizar nav y enlaces.** En `components/nav.tsx`: añadir "Inicio" y "Acerca de" (desktop y panel móvil), `isHome = pathname === "/"`, `isLibrary = pathname.startsWith("/biblioteca") || pathname.startsWith("/juegos")`, `isAbout`. Cambiar a `/biblioteca` los 3 enlaces de "volver" listados en Scope. Verificar: ningún enlace "volver" lleva al Home por error; link activo correcto en cada ruta.
3. **Datos mock.** Añadir `RECENT_SCORES` y `TOP_TODAY` a `lib/data.ts`. Verificar: `npm run lint`.
4. **CSS.** Portar a `app/globals.css` las reglas de Home y About desde `references/templates/home-about/styles.css` (`.home*`, `.home-silos`, `.section-*`, `.feature-*`, `.mini-*`, `.home-stats`/`.stat-*`, `.home-final`, `.reveal`, `.about*`, `.highlight*`, `.contact*`, `.terminal-success`, `.shake`, `.activity-*`, `.ticker`/`.tick-row`, `.top-*`, `.pricing-*`/`.price-card`/`.faq-*`, `@keyframes` y `@media` asociados). Omitir lo ya existente. Añadir bloque `@media (prefers-reduced-motion: reduce)` que deje `.reveal` visible y sin transición. Verificar: `npm run build` compila CSS sin errores.
5. **Reveal.** Crear `components/reveal.tsx` (Client Component): envuelve secciones y añade clase `in` con `IntersectionObserver` (threshold 0.12, `unobserve` tras activar). Verificar: al hacer scroll las secciones aparecen; sin errores de hidratación.
6. **Home.** Reemplazar `app/page.tsx` por el Home (Server Component) con las secciones del template. Crear `components/home-silhouettes.tsx` y `components/feature-icon.tsx` (SVG pixel, sin estado). Tarjetas de juego (`MiniCard`) como `<Link href="/juegos/[id]">`; CTAs como `<Link>`: "EXPLORAR JUEGOS" → `/biblioteca`, "CREAR CUENTA" / "EMPEZAR GRATIS" → `/auth`, "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" → `/biblioteca`, "VER SALÓN" → `/salon`. Mini-rail usa `GAMES.slice(0, 6)`. Verificar: cada CTA navega a su destino; `/` muestra las 6 mini-tarjetas.
7. **Acerca de.** Crear `app/acerca/page.tsx` (Server Component: misión, 3 highlights, divisor) + `components/contact-form.tsx` (Client: estado local, validación, shake, terminal de éxito) + `components/highlight-icon.tsx`. Metadata `title: "Acerca de"`. Verificar: enviar con campos vacíos hace shake; con datos válidos muestra terminal con el nombre en mayúsculas; "ENVIAR OTRO MENSAJE" resetea el formulario.
8. **Revisión visual y limpieza.** Comparar `/` y `/acerca` contra `references/templates/home-about/arcade-vault-standalone.html` en escritorio y ≤ 768 px; ajustes con `/frontend-design` si hace falta. Verificar: `npm run build` y `npm run lint` sin errores.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen y cargan sin errores en consola las rutas `/`, `/biblioteca` y `/acerca`; las rutas de SPEC 01 (`/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`) siguen funcionando.
- [ ] `/biblioteca` muestra las 8 tarjetas y el filtro por categoría funciona igual que antes.
- [ ] `/` muestra las secciones en este orden: hero, ¿POR QUÉ ARCADE VAULT? (4 tarjetas), JUEGOS DISPONIBLES AHORA (6 mini-tarjetas), stats (3 bloques), ACTIVIDAD EN VIVO (7 puntuaciones + 5 top jugadores), PRECIOS (1 plan + 3 FAQ), CTA final.
- [ ] Desktop y panel móvil del nav muestran: Inicio, Biblioteca, Salón de la Fama, Acerca de; el link activo coincide con la ruta (`/juegos/*` marca Biblioteca).
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" llevan a `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS" a `/auth`; "VER SALÓN" a `/salon`; clic en una mini-tarjeta lleva a `/juegos/<id>`.
- [ ] Los botones "volver" del detalle, salón y reproductor llevan a `/biblioteca`.
- [ ] Login o "Jugar como invitado" en `/auth` redirige a `/`.
- [ ] Las secciones con `reveal` empiezan ocultas y se muestran al entrar al viewport; con `prefers-reduced-motion: reduce` se ven siempre.
- [ ] En `/acerca`, enviar con algún campo vacío no envía y aplica `shake`; con los 3 campos llenos muestra el terminal con `GRACIAS, <NOMBRE EN MAYÚSCULAS>.`; "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [ ] El formulario de contacto no hace ninguna petición de red ni escribe en `localStorage`.
- [ ] En ancho ≤ 768 px no hay scroll horizontal en `/` ni `/acerca`; `.feature-grid`, `.mini-rail`, `.activity-grid`, `.pricing-grid` y `.contact-grid` colapsan según los `@media` del template.
- [ ] No hay errores de hidratación en consola en `/`, `/biblioteca` y `/acerca`, con y sin `av_user`.
- [ ] No quedan reglas CSS duplicadas de `.field`, `.btn`, `.neon-*` ni `.pixel` en `globals.css`.

## Decisions

- **Sí:** Home en `/` y Biblioteca en `/biblioteca`. Igual que el template (Inicio ≠ Biblioteca) y la landing queda como raíz.
- **No:** Home en `/home` con Biblioteca en `/`. Raíz sin landing, mala práctica.
- **Sí:** incluir About en esta spec (decisión del usuario), aunque toca dos pantallas. Comparten CSS, `reveal` y nav, así que separarlas duplicaría trabajo.
- **Sí:** datos de actividad/top/stats hardcodeados como en el template. Coherente con MVP visual; derivarlos de `GAMES`/`seededScores` cambiaría valores y textos.
- **No:** conectar la actividad a `av_scores`. Queda para la spec de ranking real.
- **Sí:** portar CSS a `globals.css` (no `home.css` aparte). Mantiene la convención de un solo archivo de estilos.
- **Sí:** `reveal` como Client Component con `IntersectionObserver` y soporte de `prefers-reduced-motion`; páginas como Server Components.
- **Sí:** formulario de contacto solo mock (estado local). Envío real requiere backend (fuera de alcance).
- **Sí:** login/invitado siguen redirigiendo a `/` (ahora Home), sin cambiar `auth-form.tsx`.
- **No:** redirect `/` → `/biblioteca` para URLs antiguas. Sin tráfico real que proteger.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Enlaces a `/` olvidados que antes significaban "biblioteca" | Paso 2 lista los 3 conocidos; `grep -rn 'href="/"' app components` al final y revisar cada uno. |
| Conflicto de reglas CSS portadas con las existentes (`.btn`, `.field`, `@keyframes`) | Comparar antes de pegar; omitir duplicados; verificar visualmente `/biblioteca`, `/auth`, `/salon` tras el port. |
| `.reveal` oculta contenido si JS falla o antes de hidratar | Contenido solo oculto por CSS hasta que `Reveal` actúa; `prefers-reduced-motion` lo muestra siempre; revisar que no haya parpadeo grave en carga. |
| `IntersectionObserver` y hydration mismatch | `Reveal` solo añade clases en `useEffect`; el HTML inicial es idéntico server/client. |
| Siluetas SVG y animaciones afectan rendimiento en móvil | Reutilizar CSS del template (`pointer-events: none`, `opacity`); revisar en ≤ 768 px. |
| `cacheComponents: true` y `params`/APIs dinámicas | Las páginas nuevas no usan datos dinámicos ni `params`; seguir como en SPEC 01. |

## What is **not** in this spec

- Envío real de mensajes de contacto.
- Datos reales de actividad, ranking o stats.
- Cambios de diseño en Biblioteca, detalle, reproductor, auth o salón.
- Redirects de URLs antiguas.
- Pagos o planes de precios reales.
- Tests automatizados e i18n.
