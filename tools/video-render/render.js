'use strict';

/*
 * Gera assets/adp-explicativo.mp4 a partir de adp-video.html, com narração em pt-BR.
 *
 *  1. sintetiza a narração de cada cena (Piper) definida em assets/narration.js
 *  2. monta a faixa de áudio contínua: cada cena dura voz + respiro
 *  3. captura o player quadro a quadro em modo render (?render=1&d=...), 25 fps, 1280x720
 *  4. encoda vídeo + narração em H.264/AAC
 *
 * A captura quadro a quadro garante sincronia exata com o áudio (a gravação de vídeo
 * do Chromium tem taxa variável e provocava deriva de alguns segundos no fim).
 *
 * Uso (da raiz do repositório, com o serviço web no ar):
 *   docker build -t adp-video-render tools/video-render
 *   docker run --rm --network app_default \
 *     -v "$PWD":/repo:ro -v "$PWD/assets":/out adp-video-render
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const REPO = process.env.REPO_DIR || '/repo';
const OUT_DIR = process.env.OUT_DIR || '/out';
const PAGE_URL = process.env.PAGE_URL || 'http://web/adp-video.html';
const MODEL = process.env.PIPER_MODEL || '/models/pt_BR-faber-medium.onnx';
const TMP = '/tmp/render';
const PAD_MS = 700;
const FPS = 25;
const WIDTH = 1280;
const HEIGHT = 720;
const OUT_FILE = path.join(OUT_DIR, 'adp-explicativo.mp4');

function ff(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error'].concat(args));
}

function mediaDuration(file) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file
  ]).toString().trim();
  return parseFloat(out);
}

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  global.window = {};
  require(path.join(REPO, 'assets/narration.js'));
  const scenes = global.window.NARRATION;
  if (!scenes || !scenes.length) throw new Error('assets/narration.js não definiu cenas');

  // 1 + 2: voz por cena e faixa contínua
  const durations = [];
  const padded = [];
  scenes.forEach((scene, i) => {
    const voice = path.join(TMP, `voz${i}.wav`);
    execFileSync('python3', [
      '-m', 'piper', '--model', MODEL, '--output_file', voice, '--length_scale', '1.0'
    ], { input: scene.script });

    const voiceSec = mediaDuration(voice);
    const sceneMs = Math.round((voiceSec + PAD_MS / 1000) * 1000);
    durations.push(sceneMs);

    const paddedFile = path.join(TMP, `cena${i}.wav`);
    ff(['-i', voice, '-af', 'apad', '-t', (sceneMs / 1000).toFixed(3), '-ar', '48000', '-ac', '2', paddedFile]);
    padded.push(paddedFile);
    console.log(`cena ${i + 1}: voz ${voiceSec.toFixed(2)}s → ${(sceneMs / 1000).toFixed(2)}s`);
  });

  const listFile = path.join(TMP, 'lista.txt');
  fs.writeFileSync(listFile, padded.map((p) => `file '${p}'`).join('\n'));
  const narration = path.join(TMP, 'narracao.wav');
  ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'pcm_s16le', narration]);

  const totalMs = durations.reduce((a, b) => a + b, 0);
  console.log(`total ${(totalMs / 1000).toFixed(1)}s — durações: ${durations.join(',')}`);

  // 3: captura quadro a quadro
  const framesDir = path.join(TMP, 'frames');
  fs.mkdirSync(framesDir);

  const browser = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.goto(`${PAGE_URL}?render=1&d=${durations.join(',')}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => typeof window.__renderFrame === 'function', null, { timeout: 15000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
  await page
    .waitForFunction(() => {
      const img = document.querySelector('.qr img');
      return !img || img.complete;
    }, null, { timeout: 10000 })
    .catch(() => console.log('aviso: QR code não carregou, seguindo sem ele'));

  const step = 1000 / FPS;
  const totalFrames = Math.round(totalMs / step);
  const t0 = Date.now();
  for (let f = 0; f < totalFrames; f++) {
    await page.evaluate((ms) => window.__renderFrame(ms), f * step);
    await page.screenshot({
      path: path.join(framesDir, String(f).padStart(5, '0') + '.jpg'),
      type: 'jpeg',
      quality: 94,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT }
    });
    if (f % 250 === 0) console.log(`quadro ${f}/${totalFrames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  await browser.close();
  console.log(`${totalFrames} quadros em ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  // 4: encoda vídeo + narração
  ff([
    '-framerate', String(FPS), '-start_number', '0', '-i', path.join(framesDir, '%05d.jpg'),
    '-i', narration,
    '-t', (totalMs / 1000).toFixed(3),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
    OUT_FILE
  ]);

  console.log(`ok: ${OUT_FILE} — ${mediaDuration(OUT_FILE).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
