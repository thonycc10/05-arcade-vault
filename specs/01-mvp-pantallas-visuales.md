# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Status:** Approved
> **Depends on:** ninguna
> **Date:** 2026-11-16
> **Objective:** Portar a Next.js las 5 pantallas de `references/templates/` (biblioteca, detalle, reproductor simulado, auth, salón de la fama) como MVP solo visual, sin ningún juego real.

## Por qué existe esta spec

`references/templates/` contiene un prototipo SPA (React UMD + Babel, hash-route). Hay que llevarlo a App Router de Next 16 conservando el diseño. Los estilos y fuentes arcade ya están en `app/globals.css` y `app/layout.tsx` (commit `55204cd`), así que esta spec solo cubre estructura, componentes y datos mock.

## Scope

**In:**

- Rutas App Router reales:
  - `/` → Biblioteca (`biblioteca.jsx`)
  - `/juegos/[id]` → Detalle (`detalle.jsx`)
  - `/juegos/[id]/jugar` → Reproductor simulado (`reproductor.jsx`)
  - `/auth` → Iniciar sesión / Crear cuenta (`auth.jsx`)
  - `/salon` → Salón de la Fama (`salon.jsx`)
- `Nav` (con menú móvil), footer y fondos `av-bg` / `av-noise` en el layout raíz (`nav.jsx`, `app.jsx`, `Arcade Vault.html`).
- Datos mock estáticos: `GAMES`, `CATS`, `PLAYERS`, `seededScores` (`data.jsx`).
- Sesión mock en `localStorage` (`av_user`): cualquier usuario entra, sin validación ni backend.
- Guardado de puntuaciones mock en `localStorage` (`av_scores`) desde el modal "Fin del juego".
- Reproductor simulado: HUD (jugador, puntuación, vidas, nivel), pausa, fin, modal guardar puntuación; puntaje aleatorio por intervalo; arena CRT decorativa.
- Textos en español, tal como en los templates.
- Diseño responsive (menú hamburguesa) según `styles.css`.
- Usar la skill `/frontend-design` para cualquier ajuste visual (regla del CLAUDE.md).

**Out of scope (para otras specs):**

- Cualquier juego real (lógica, canvas, input de teclado).
- Backend, base de datos, API routes.
- Autenticación real (OAuth Google/GitHub, hash de contraseñas, sesiones). Los botones sociales son decorativos.
- Que `av_scores` alimente el Salón de la Fama (el salón sigue usando `seededScores`).
- Sistema de créditos funcional (el contador "CRÉDITOS · 03" es fijo).
- Tests automatizados (no hay runner configurado).
- i18n.

## Data model

```ts
// lib/data.ts
export type Game = {
  id: string;            // "bloque-buster", "caida", "serpentina", "gloton", "invasores", "rocas", "ranaria", "duelo-pixel"
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;         // clase CSS: "cover-bricks", "cover-tetro", ...
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;         // "12.4K"
};
export const GAMES: Game[];
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export type ScoreRow = { rank: number; name: string; score: number; date: string };
export function seededScores(seed: number, count?: number): ScoreRow[];

// localStorage
// "av_user"   → { name: string } | ausente        (máx. 10 chars, mayúsculas)
// "av_scores" → { game: string; score: number; name: string; at: number }[]
```

Convenciones:

- Valores y semilla de `seededScores` idénticos al template (salida determinista).
- Acceso a `localStorage` solo en Client Components, dentro de `useEffect`/handlers y con `try/catch`.
- Números formateados con `toLocaleString("es-ES")`.

## Implementation plan

Antes de escribir código: leer en `node_modules/next/dist/docs/` lo relativo a Cache Components (`cacheComponents: true`), Client Components y `generateStaticParams` / params asíncronos.

1. Crear `lib/data.ts` con `GAMES`, `CATS`, `PLAYERS`, `seededScores` tipados. Verificar: `npm run lint` pasa.
2. Crear `components/user-provider.tsx` (Client Component, contexto con `user`, `login`, `logout`, `saveScore`) sobre `localStorage`. Verificar: compila, sin hydration warnings.
3. Crear `components/nav.tsx` (Client; `usePathname` para activo, menú móvil, botón sesión) y footer. Montar Nav + footer + `av-bg` + `av-noise` + provider en `app/layout.tsx`. Verificar: nav visible en `/`.
4. Reemplazar `app/page.tsx` por la Biblioteca (hero, chips de categoría con filtro, grid de tarjetas con link a `/juegos/[id]`). Filtro en Client Component; página como Server Component.
5. Crear `app/juegos/[id]/page.tsx` (Detalle) con `notFound()` si el id no existe y `generateStaticParams`. Verificar: `/juegos/caida` renderiza, `/juegos/xxx` da 404.
6. Crear `app/auth/page.tsx` + `components/auth-form.tsx` (tabs entrar/crear, campos, invitado, botones sociales decorativos). Login guarda `av_user` y redirige a `/`. Verificar: nav muestra el nombre.
7. Crear `app/salon/page.tsx` + `components/hall-of-fame.tsx` (tabs por juego, podio, tabla, fila "tú" si hay usuario). Verificar: cambiar de tab cambia datos.
8. Crear `app/juegos/[id]/jugar/page.tsx` + `components/game-player.tsx` (HUD, pausa, fin, modal guardar, `av_scores`). Verificar: puntaje sube, pausa lo detiene, guardar muestra toast.
9. Ajustar metadata por página (`title`) y limpiar el scaffold residual de Create Next App.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen las rutas `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon` y las 5 cargan sin errores en consola.
- [ ] `/` muestra las 8 tarjetas de `GAMES`; elegir una categoría muestra solo los juegos de esa categoría; "TODOS" muestra los 8.
- [ ] Clic en una tarjeta navega a `/juegos/<id>`; un id inexistente devuelve 404.
- [ ] El detalle tiene botón que lleva a `/juegos/<id>/jugar`.
- [ ] En `/auth`, el tab "Crear cuenta" muestra el campo de correo; "Iniciar sesión" no.
- [ ] Enviar el formulario con usuario `abc` guarda `av_user` = `{"name":"ABC"}` y redirige a `/`; el nav muestra `ABC`.
- [ ] Tras recargar la página, el usuario sigue en el nav.
- [ ] "Jugar como invitado" redirige a `/` sin `av_user`.
- [ ] Cerrar sesión elimina `av_user` y el nav vuelve a "Iniciar Sesión".
- [ ] `/salon` muestra 8 tabs (uno por juego), podio top 3 y tabla con 12 filas; cambiar de tab cambia las filas.
- [ ] En el reproductor la puntuación sube sola; "PAUSA" la detiene y muestra "EN PAUSA"; "REANUDAR" la reanuda.
- [ ] "FIN" abre el modal con puntuación final; "GUARDAR PUNTUACIÓN" agrega una entrada a `av_scores` y muestra "PUNTUACIÓN GUARDADA".
- [ ] "JUGAR DE NUEVO" reinicia puntos, vidas y nivel; "SALIR" vuelve al detalle.
- [ ] En ancho ≤ 768 px aparece el botón hamburguesa y abre/cierra el panel móvil.
- [ ] No hay errores de hidratación en consola al cargar con y sin `av_user`.
- [ ] No existe lógica de juego real: el reproductor no responde a teclado.

## Decisions

- **Sí:** rutas reales de App Router. Mejor URL/SEO/navegación que el hash-route del prototipo.
- **No:** port literal SPA con estado + hash. Desaprovecha Next.
- **Sí:** auth mock en `localStorage` como en el template. Es MVP visual; sin backend.
- **No:** auth real. Va en otra spec.
- **Sí:** datos mock estáticos en `lib/data.ts`. Salida determinista igual al prototipo.
- **Sí:** reproductor con puntaje simulado. Permite ver HUD, pausa y modal sin implementar juegos.
- **Sí:** `av_scores` se guarda pero no se lee. Deja listo el contrato para una spec futura.
- **Sí:** reutilizar `app/globals.css` y fuentes ya instaladas (commit `55204cd`); no duplicar `styles.css`.
- **Sí:** páginas como Server Components; Client Components solo donde hay estado/`localStorage`.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Hydration mismatch al leer `localStorage` en el primer render | Leer en `useEffect`; render inicial como invitado. |
| `cacheComponents: true` cambia la semántica de params/APIs dinámicas | Leer docs antes (paso 0 del plan); `params` se espera como Promise. |
| `localStorage` bloqueado (modo privado) | `try/catch`; la app funciona sin persistir. |
| Clases de `globals.css` divergen del template | Comparar visualmente cada pantalla contra `references/templates/Arcade Vault.html`. |

## What is **not** in this spec

- Ningún juego real.
- Backend, DB o auth real.
- Salón de la Fama alimentado por puntuaciones reales.
- Créditos funcionales.
- Tests automatizados.
- i18n.
