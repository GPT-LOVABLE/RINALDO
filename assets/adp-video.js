(function () {
  'use strict';

  var SCENES = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var NARRATION = window.NARRATION || [];

  var TITLES = NARRATION.map(function (n) { return n.title; });
  var SCRIPTS = NARRATION.map(function (n) { return n.script; });

  /* valores iguais aos do MP4 gerado (narração + respiro), ver tools/video-render */
  var DURATIONS = [9082, 9280, 10394, 8026, 10151, 9419, 12693, 15120];

  var params = new URLSearchParams(window.location.search);
  var RENDER = params.get('render') === '1';

  /* ?d=12000,9000,... fixa a duração de cada cena (usado na gravação do MP4) */
  if (params.get('d')) {
    var custom = params.get('d').split(',').map(Number);
    if (custom.length === SCENES.length && custom.every(function (v) { return v > 0; })) DURATIONS = custom;
  }

  var TOTAL = DURATIONS.reduce(function (a, b) { return a + b; }, 0);
  var CUM = DURATIONS.map(function (_, i) {
    return DURATIONS.slice(0, i).reduce(function (a, b) { return a + b; }, 0);
  });

  var stage = document.getElementById('stage');
  var stageInner = document.getElementById('stageInner');
  var caption = document.getElementById('caption');
  var chromeStep = document.getElementById('chromeStep');
  var playBtn = document.getElementById('playBtn');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var restartBtn = document.getElementById('restartBtn');
  var voiceBtn = document.getElementById('voiceBtn');
  var fullBtn = document.getElementById('fullBtn');
  var bar = document.getElementById('bar');
  var fill = document.getElementById('fill');
  var timeLabel = document.getElementById('time');
  var poster = document.getElementById('poster');
  var posterPlay = document.getElementById('posterPlay');
  var chaptersBox = document.getElementById('chapters');
  var scriptList = document.getElementById('scriptList');
  var player = document.getElementById('player');

  var idx = 0;
  var playing = false;
  var acc = 0;
  var startedAt = 0;
  var raf = 0;
  var finished = false;
  var voiceOn = !RENDER;

  /* ---------- tela cheia / escala ---------- */
  function fit() {
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    if (!w || !h) return;
    var scale = Math.min(w / 1280, h / 720);
    var x = (w - 1280 * scale) / 2;
    var y = (h - 720 * scale) / 2;
    stageInner.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
  }
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
  document.addEventListener('fullscreenchange', function () {
    setTimeout(fit, 60);
  });

  /* ---------- narração ---------- */
  var ptVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var voices = window.speechSynthesis.getVoices() || [];
    ptVoice = voices.filter(function (v) { return /^pt[-_]BR/i.test(v.lang); })[0] ||
      voices.filter(function (v) { return /^pt/i.test(v.lang); })[0] || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
  } else {
    voiceBtn.style.display = 'none';
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function speak(i) {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    stopSpeech();
    var u = new SpeechSynthesisUtterance(SCRIPTS[i]);
    u.lang = 'pt-BR';
    u.rate = 1.03;
    u.pitch = 1;
    if (ptVoice) u.voice = ptVoice;
    window.speechSynthesis.speak(u);
  }

  /* ---------- render ---------- */
  function fmt(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function render(i) {
    idx = i;
    SCENES.forEach(function (s, j) { s.classList.toggle('active', j === i); });
    Array.prototype.forEach.call(chaptersBox.children, function (c, j) {
      c.classList.toggle('on', j === i);
    });
    chromeStep.textContent = i === 0 ? 'Introdução' : i === SCENES.length - 1 ? 'Fale com o RH' : 'Passo ' + i + ' de 6';
    caption.textContent = SCRIPTS[i];
    timeLabel.textContent = fmt(CUM[i]) + ' / ' + fmt(TOTAL);
    fill.style.width = (CUM[i] / TOTAL * 100) + '%';
  }

  /* ---------- loop ---------- */
  function tick() {
    if (!playing) return;
    var elapsed = acc + (performance.now() - startedAt);

    if (elapsed >= DURATIONS[idx]) {
      if (idx < SCENES.length - 1) {
        go(idx + 1);
        return;
      }
      finish();
      return;
    }

    fill.style.width = ((CUM[idx] + elapsed) / TOTAL * 100) + '%';
    timeLabel.textContent = fmt(CUM[idx] + elapsed) + ' / ' + fmt(TOTAL);
    raf = requestAnimationFrame(tick);
  }

  function go(i) {
    acc = 0;
    startedAt = performance.now();
    finished = false;
    render(i);
    if (playing) {
      speak(i);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }
  }

  function play() {
    if (finished) {
      go(0);
      finished = false;
    }
    playing = true;
    poster.classList.add('hidden');
    playBtn.textContent = '❚❚';
    playBtn.setAttribute('aria-label', 'Pausar');
    startedAt = performance.now();
    speak(idx);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    if (playing) acc += performance.now() - startedAt;
    playing = false;
    playBtn.textContent = '▶';
    playBtn.setAttribute('aria-label', 'Reproduzir');
    cancelAnimationFrame(raf);
    stopSpeech();
  }

  function toggle() {
    playing ? pause() : play();
  }

  function finish() {
    playing = false;
    finished = true;
    playBtn.textContent = '▶';
    playBtn.setAttribute('aria-label', 'Reproduzir novamente');
    fill.style.width = '100%';
    timeLabel.textContent = fmt(TOTAL) + ' / ' + fmt(TOTAL);
    stopSpeech();
  }

  function prev() {
    if (acc + (playing ? performance.now() - startedAt : 0) > 2500) go(idx);
    else go(Math.max(0, idx - 1));
  }

  function next() {
    if (idx >= SCENES.length - 1) { go(0); finish(); return; }
    go(idx + 1);
  }

  /* ---------- capítulos e roteiro ---------- */
  TITLES.forEach(function (title, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chapter';
    b.textContent = title;
    b.addEventListener('click', function () {
      go(i);
      if (!playing) play();
    });
    chaptersBox.appendChild(b);

    var li = document.createElement('li');
    var faixa = document.createElement('b');
    faixa.textContent = fmt(CUM[i]) + '–' + fmt(CUM[i] + DURATIONS[i]) + ' · ';
    li.appendChild(faixa);
    li.appendChild(document.createTextNode(SCRIPTS[i]));
    scriptList.appendChild(li);
  });

  /* ---------- eventos ---------- */
  playBtn.addEventListener('click', toggle);
  poster.addEventListener('click', function () { if (!playing) play(); });
  posterPlay.addEventListener('click', function (e) { e.stopPropagation(); play(); });
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  restartBtn.addEventListener('click', function () { finished = false; go(0); if (!playing) play(); });

  voiceBtn.addEventListener('click', function () {
    voiceOn = !voiceOn;
    voiceBtn.classList.toggle('on', voiceOn);
    voiceBtn.textContent = voiceOn ? '🔊' : '🔇';
    if (voiceOn && playing) speak(idx);
    if (!voiceOn) stopSpeech();
  });

  fullBtn.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (player.requestFullscreen) player.requestFullscreen();
  });

  bar.addEventListener('click', function (e) {
    var rect = bar.getBoundingClientRect();
    var ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    var target = ratio * TOTAL;
    var i = 0;
    while (i < CUM.length - 1 && CUM[i + 1] <= target) i++;
    acc = target - CUM[i];
    startedAt = performance.now();
    finished = false;
    render(i);
    if (playing) { speak(i); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    fill.style.width = (target / TOTAL * 100) + '%';
    timeLabel.textContent = fmt(target) + ' / ' + fmt(TOTAL);
  });

  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowRight') next();
    else if (e.code === 'ArrowLeft') prev();
  });

  /* QR code: aviso caso a imagem externa não carregue */
  var qrImg = document.querySelector('.qr img');
  if (qrImg) {
    qrImg.addEventListener('error', function () {
      qrImg.parentNode.classList.add('noimg');
    });
  }

  render(0);
  fit();

  /* Gravação do MP4 (tools/video-render): palco 1280x720 sem controles e
     __renderFrame(ms) congela a cena no instante pedido, para gravar quadro a quadro. */
  if (RENDER) {
    document.body.classList.add('is-render');
    poster.classList.add('hidden');
    fit();
    window.__renderFrame = function (ms) {
      var i = 0;
      while (i < CUM.length - 1 && CUM[i + 1] <= ms) i++;
      render(i);
      void document.body.offsetHeight;
      var local = Math.max(0, ms - CUM[i]);
      var anims = document.getAnimations ? document.getAnimations() : [];
      anims.forEach(function (a) {
        try { a.pause(); a.currentTime = local; } catch (e) { /* animação já descartada */ }
      });
      return i;
    };
    window.__renderFrame(0);
  }
})();
