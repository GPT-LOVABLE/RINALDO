# RINALDO

Controle de estoque (Material de Limpeza • Copa • Água) — app estático de página única,
sem build e sem backend. Dados no `localStorage`. Login inicial: `admin@rinaldo.local` / `123456`.

## Rodar localmente

```bash
docker compose -f docker-compose.base44.yml up -d
```

Abre em http://localhost:3000.

## Modo Game (Free Fire / Blood Strike)

Perfil de alto desempenho via Brevent, Shizuku ou ADB — ajusta RAM, animações, taxa de
atualização, GameManager e (com root) CPU/GPU. Não altera o jogo: é só desempenho do aparelho.

1. Copie o script em **Modo Game** no próprio app (aba lateral) ou use os arquivos:
   `game-mode/game-mode-on.sh` e `game-mode/game-mode-off.sh`.
2. Ative a depuração sem fio (Opções do desenvolvedor) e abra o Brevent.
3. Cole o conteúdo em Brevent → Exec Command (ou `aShell`/`rish` do Shizuku, ou `adb shell`).
4. Abra o jogo. Para voltar ao normal, rode `game-mode-off.sh`.

Sem root o script aplica só o que o shell do Android permite; governador de CPU/GPU,
limpeza do cache do kernel e térmica exigem root (o script avisa o que foi ignorado).
