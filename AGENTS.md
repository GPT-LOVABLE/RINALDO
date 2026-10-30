# AGENTS.md

## O que é este repositório
Site estático puro (sem build, sem bundler, sem backend). Dois documentos HTML independentes:

- `adp-video.html` + `assets/adp-video.{css,js}` — vídeo explicativo animado "Atualização de uso ADP" (VARD / RH Informa). É a página servida na raiz do preview.
- `index.html` — aplicativo "RINALDO · Controle de Estoque" (Tailwind + jsPDF por CDN). Continua acessível em `/index.html`.

## Como o ambiente roda
`docker-compose.base44.yml` sobe apenas `nginx:alpine` na porta 3000, com o repositório montado **read-only** em `/usr/share/nginx/html` e a configuração completa do nginx em `docker/base44-nginx.conf` (montada sobre `/etc/nginx/nginx.conf`).

Pontos não óbvios:

- O nginx precisa rodar com `user root;` porque a raiz do repositório no sandbox é `700` — com o usuário padrão (`nobody`) todas as respostas viram **403**. Não remova essa linha nem o mount completo de `nginx.conf`.
- A raiz do site é `adp-video.html` (diretiva `index`), por isso o preview abre no vídeo e o app RINALDO fica em `/index.html`.
- Não existe hot reload: os arquivos são servidos direto do código-fonte, então basta recarregar o preview depois de editar. Se a página parecer em cache, o cabeçalho `Cache-Control: no-store` já está configurado.
- Nada de `npm install` / build. Todo o JavaScript do vídeo é um IIFE em `assets/adp-video.js`.

## Como verificar
```bash
docker compose -f docker-compose.base44.yml up -d
curl -sI http://localhost:3000/          # 200 — vídeo
curl -sI http://localhost:3000/index.html # 200 — app RINALDO
```
No player, o roteiro/narração fica em `TITLES`, `DURATIONS` e `SCRIPTS` (`assets/adp-video.js`); as cenas correspondentes são as `<section class="scene">` de `adp-video.html`, na mesma ordem e quantidade (8 cenas: introdução, 6 passos e contato do RH). Ao adicionar ou remover uma cena, ajuste os três arrays.

A narração usa `SpeechSynthesis` do navegador (pt-BR) e depende de vozes instaladas no sistema; sem voz disponível o vídeo continua funcionando pelas legendas na parte inferior do palco.
