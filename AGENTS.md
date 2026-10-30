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

## MP4 com voz (`tools/video-render`)

`assets/adp-explicativo.mp4` (1280x720, 25 fps, H.264/AAC, ~3,3 MB) é gerado a partir do próprio player:

```bash
docker build -t adp-video-render tools/video-render      # uma vez (ffmpeg + Piper + Chromium)
docker compose -f docker-compose.base44.yml up -d        # o serviço web precisa estar no ar
docker run --rm --network app_default \
  -v "$PWD":/repo:ro -v "$PWD/assets":/out adp-video-render
```

Pipeline do `render.js`: Piper (`pt_BR-faber-medium`) sintetiza cada roteiro de `assets/narration.js` → monta uma faixa wav contínua com voz + 0,7 s de respiro por cena → abre `adp-video.html?render=1&d=<durações>` e captura **quadro a quadro** com `window.__renderFrame(ms)` → encoda vídeo + áudio.

Pontos não óbvios:

- A captura é quadro a quadro de propósito: o `recordVideo` do Playwright grava com taxa variável e, ao reencodar, acumulava ~2,5 s de deriva entre voz e imagem no fim do vídeo.
- O modo render (`?render=1`) esconde cabeçalho/controles, fixa o palco em 1280x720 e congela as animações CSS no instante pedido; o visitante normal nunca o aciona.
- `assets/narration.js` é a fonte única de títulos e textos. Se alterar o texto, as durações mudam: rode o gerador e copie os valores da linha `durações:` do log para o array `DURATIONS` de `assets/adp-video.js`, mantendo player web e MP4 no mesmo ritmo.
- A voz é sintética (Piper, offline). Para voz humana, basta regravar o áudio e remontar com o mesmo `narracao.wav`, mantendo as durações das cenas.
