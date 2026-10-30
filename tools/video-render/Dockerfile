FROM node:22-bookworm

# ffmpeg (montagem do vídeo), piper (voz pt-BR) e fontes (texto + emojis do player)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-pip fonts-noto-color-emoji fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages -q piper-tts \
    && mkdir -p /models && cd /models \
    && python3 -m piper.download_voices pt_BR-faber-medium

ENV PIPER_MODEL=/models/pt_BR-faber-medium.onnx

# Chromium do Playwright para gravar o player HTML
WORKDIR /opt/render
RUN npm init -y >/dev/null && npm install --silent playwright@1.55.0 \
    && npx playwright install --with-deps chromium

COPY render.js /opt/render/render.js
CMD ["node", "/opt/render/render.js"]
