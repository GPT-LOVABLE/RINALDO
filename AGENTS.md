# AGENTS.md

App estático (uma única página `index.html`, sem build, sem backend). Dados ficam no
`localStorage` do navegador — não há banco nem API.

## Rodar / verificar
- `docker compose -f docker-compose.base44.yml up -d` sobe nginx em `http://localhost:3000`.
- Não há passo de build: o nginx serve o repositório via bind mount, então salvar um
  arquivo já muda o que o preview mostra (basta recarregar a página).
- Login padrão (semeado no `localStorage` de um navegador limpo):
  `admin@rinaldo.local` / `123456`.
- O config do nginx (`docker/nginx.base44.conf`) roda o worker como **root** porque o
  bind mount do sandbox chega com permissão 700, e o usuário `nginx` não atravessa o
  diretório. Vale só para o container de preview; não replique em produção.

## Modo Game (scripts para celular)
- `game-mode/game-mode-on.sh` aplica o perfil de desempenho; `game-mode/game-mode-off.sh` reverte.
- Rodam em shell elevado de Android: Brevent (Exec Command), Shizuku (aShell/rish) ou `adb shell`.
- Com `id -u` = 0 (root) o script também mexe em governador de CPU/GPU e no cache do kernel,
  e salva os valores originais em `/data/local/tmp/gamer-mode.bak` para o revert.
- A aba "Modo Game" busca esses dois arquivos por `fetch` e mostra com botão de copiar —
  os arquivos são a única fonte; não duplique o script dentro do HTML.
- Validar sintaxe: `docker compose -f docker-compose.base44.yml exec -T web sh -n /usr/share/nginx/html/game-mode/game-mode-on.sh`.
