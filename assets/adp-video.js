(function () {
  'use strict';

  var SCENES = Array.prototype.slice.call(document.querySelectorAll('.scene'));

  var TITLES = [
    'Introdução',
    '1 · E-mail de ativação',
    '2 · Preencha os dados',
    '3 · Verificação de segurança',
    '4 · Usuário e senha',
    '5 · Confirmação',
    '6 · Acesse o portal',
    'Contato do RH'
  ];

  var DURATIONS = [9000, 16000, 16000, 15000, 16000, 14000, 17000, 12000];

  var SCRIPTS = [
    'RH Informa: atualização de uso do ADP. A VARD utiliza a plataforma ADP para o seu acesso. Acompanhe os seis passos para atualizar o seu cadastro.',
    'Passo um: receba o e-mail de ativação. A mensagem chega de security services noreply, do domínio ADP. Abra o e-mail e clique no botão Inscreva-se agora.',
    'Passo dois: preencha as informações solicitadas. Informe nome completo, CPF, data de nascimento, telefone e e-mail. Ao finalizar o preenchimento, clique em Continuar.',
    'Passo três: realize a verificação de segurança. Escolha a opção SMS, informe o código recebido no celular e clique em Continuar.',
    'Passo quatro: crie seu usuário e senha. Defina o seu ID de usuário e uma senha com letra minúscula, maiúscula, número e símbolo. Aceite os termos e clique em Criar conta.',
    'Passo cinco: confirmação do cadastro. Ao concluir o processo, será exibida a mensagem de que sua conta foi criada com sucesso. Guarde o seu ID de usuário.',
    'Passo seis: acesse o portal ADP. Com o cadastro concluído, use o seu ID de usuário e senha no link expert.hcm.adp.com barra adpweb, ou leia o QR code com o celular.',
    'Em caso de dúvidas, procure o RH: atendimento presencial de segunda a sexta, das onze e vinte ao meio-dia e vinte, ou pelo WhatsApp, oitenta e um, nove nove oito quatro cinco, três dois zero zero.'
  ];

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
  var voiceOn = true;

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
    li.textContent = SCRIPTS[i];
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
})();
