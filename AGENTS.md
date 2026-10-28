# AGENTS.md

## What this project is
Single-file static web app: `index.html` (pt-BR) — "RINALDO • Controle de Estoque".
No build step, no package manager, no backend. State lives entirely in the browser
(`localStorage` key `rinaldo-v2`, session in `rinaldo-session`), so there is nothing
to migrate or seed. Tailwind and jsPDF load from CDNs at runtime (needs network in
the browser).

## Running it
`docker compose -f docker-compose.base44.yml up -d` → http://localhost:3000
(nginx:alpine serving the bind-mounted repo; edits appear on browser refresh, so
call `reload_preview` after source changes — there is no live-reload server).

Seeded login: `admin@rinaldo.local` / `123456` (defined in `index.html` defaults).

## Quirks worth knowing
- `.base44/nginx.dev.conf` replaces nginx's main config and sets `user root;`:
  the sandbox checkout is root-owned with 700 permissions, so nginx's default
  worker user gets 403 on every file. Keep that line for sandbox use only.
- Config serves with `Cache-Control: no-store` so edits are not cached in preview.
- Deleting records in the UI goes through `confirm()`; product/user delete
  handlers are globals invoked from inline `onclick` attributes.

## Verification tip
Drive the real UI: sign in, add a product via "+ Produto" (modal), assert it in
`#productTable` and in `localStorage`. Cross-tab sync uses `BroadcastChannel`,
which also emits a "Dados atualizados em outra aba" toast in a single tab — expected.
