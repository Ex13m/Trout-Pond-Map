/* TroutMap Europe — анимация справки об обновлении.
   Рой частиц слетается → кристаллизуется в НАСТОЯЩИЙ чёткий текст →
   держится (по умолчанию 10 с) с глитч-эффектом → рассыпается обратно
   в частицы и разлетается. Тап — пропустить.
   API: window.UpdateFX.play({ lines: [{text, size, color}], hold, onDone }) */
(function () {
  'use strict';

  function play(opts) {
    var lines = (opts && opts.lines) || [];
    var hold = (opts && opts.hold) || 10000;
    var onDone = (opts && opts.onDone) || function () {};
    if (!lines.length || !window.requestAnimationFrame) { onDone(false); return; }

    var W = window.innerWidth, H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var canvas = document.createElement('canvas');
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:300;' +
      'background:rgba(5,18,17,0);transition:background .5s;cursor:pointer;';
    canvas.setAttribute('aria-label', 'Справка об обновлении. Коснитесь, чтобы закрыть');
    canvas.setAttribute('role', 'img');
    document.body.appendChild(canvas);
    requestAnimationFrame(function () { canvas.style.background = 'rgba(5,18,17,0.94)'; });

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    /* --- Офскрин с ЦВЕТНЫМ чётким текстом (он же источник частиц) --- */
    var off = document.createElement('canvas');
    off.width = W * dpr; off.height = H * dpr;
    var octx = off.getContext('2d');
    octx.scale(dpr, dpr);
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';

    var pad = 12;
    var totalH = 0;
    lines.forEach(function (l) { totalH += l.size * 1.4 + pad; });
    var y = (H - totalH) / 2 + 10;
    lines.forEach(function (l) {
      var size = l.size;
      octx.font = '800 ' + size + 'px Manrope, system-ui, sans-serif';
      while (size > 9 && octx.measureText(l.text).width > W - 32) {
        size -= 1;
        octx.font = '800 ' + size + 'px Manrope, system-ui, sans-serif';
      }
      y += size * 1.4 / 2;
      octx.fillStyle = l.color || '#e8f5f2';
      octx.fillText(l.text, W / 2, y);
      y += size * 1.4 / 2 + pad;
    });

    // Тонированные копии для RGB-расщепления в глитче
    function tinted(color) {
      var c = document.createElement('canvas');
      c.width = off.width; c.height = off.height;
      var cx = c.getContext('2d');
      cx.drawImage(off, 0, 0);
      cx.globalCompositeOperation = 'source-in';
      cx.fillStyle = color;
      cx.fillRect(0, 0, c.width, c.height);
      return c;
    }
    var offRed = tinted('#ff4d4d');
    var offCyan = tinted('#33ffe0');

    /* --- Сэмплинг точек для частиц --- */
    var img;
    try { img = octx.getImageData(0, 0, off.width, off.height).data; }
    catch (e) { canvas.remove(); onDone(false); return; }

    var MAX = (W < 600 ? 5500 : 8000);
    var step = 2;
    function collect(st) {
      var pts = [];
      var stD = st * dpr;
      for (var yy = 0; yy < off.height; yy += stD) {
        for (var xx = 0; xx < off.width; xx += stD) {
          var i4 = ((yy | 0) * off.width + (xx | 0)) * 4;
          if (img[i4 + 3] > 128) {
            pts.push([xx / dpr, yy / dpr, 'rgb(' + img[i4] + ',' + img[i4 + 1] + ',' + img[i4 + 2] + ')']);
          }
        }
      }
      return pts;
    }
    var targets = collect(step);
    while (targets.length > MAX && step < 5) { step += 1; targets = collect(step); }
    if (targets.length < 60) { canvas.remove(); onDone(false); return; }

    var parts = targets.map(function (t) {
      var edge = Math.random();
      var sx, sy;
      if (edge < 0.25) { sx = -30 - Math.random() * W; sy = Math.random() * H; }
      else if (edge < 0.5) { sx = W + 30 + Math.random() * W; sy = Math.random() * H; }
      else if (edge < 0.75) { sx = Math.random() * W; sy = -30 - Math.random() * H; }
      else { sx = Math.random() * W; sy = H + 30 + Math.random() * H; }
      var ang = Math.random() * Math.PI * 2;
      var v = 3 + Math.random() * 9;
      return {
        sx: sx, sy: sy, tx: t[0], ty: t[1], color: t[2],
        delay: Math.random() * 450,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        size: Math.random() < 0.85 ? 1.6 : 2.4
      };
    });

    /* --- Фазы: fly → solidify → hold → dissolve+scatter --- */
    var FLY = 1400, SOLID = 650, SCATTER = 950;
    var phase = 'fly', phaseStart = null, done = false;
    var glitch = 0, nextGlitch = 800, bands = [];

    function ease(x) { return 1 - Math.pow(1 - x, 3); }

    function finish() {
      if (done) return;
      done = true;
      canvas.style.background = 'rgba(5,18,17,0)';
      setTimeout(function () { canvas.remove(); onDone(true); }, 520);
    }
    function toScatter() {
      if (phase === 'scatter') return;
      phase = 'scatter';
      phaseStart = performance.now();
    }
    canvas.addEventListener('click', toScatter);

    function drawParticles(el, mode, alphaMul) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], x, y2, a = alphaMul;
        if (mode === 'fly') {
          var k = Math.max(0, Math.min(1, (el - p.delay) / FLY));
          var e = ease(k);
          x = p.sx + (p.tx - p.sx) * e;
          y2 = p.sy + (p.ty - p.sy) * e;
          a = (0.25 + 0.75 * e) * alphaMul;
        } else { // scatter
          var k2 = Math.min(1, el / SCATTER);
          x = p.tx + p.vx * k2 * 60 * k2;
          y2 = p.ty + p.vy * k2 * 60 * k2 + 120 * k2 * k2;
          a = (1 - k2) * alphaMul;
        }
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }

    // Рисует чёткий текст; во время глитча — с RGB-расщеплением и сдвигом полос
    function drawText(alpha) {
      ctx.globalAlpha = alpha;
      var g = glitch > 0;
      if (g) {
        ctx.globalAlpha = alpha * 0.55;
        ctx.drawImage(offRed, -3, 0, W, H);
        ctx.drawImage(offCyan, 3, 0, W, H);
        ctx.globalAlpha = alpha;
      }
      if (g && bands.length) {
        var prevY = 0;
        for (var b = 0; b <= bands.length; b++) {
          var bandY = b < bands.length ? bands[b].y : H;
          var srcY = prevY * dpr, srcH = (bandY - prevY) * dpr;
          if (srcH > 0) ctx.drawImage(off, 0, srcY, off.width, srcH, 0, prevY, W, bandY - prevY);
          if (b < bands.length) {
            var bd = bands[b];
            var bh = Math.min(bd.h, H - bd.y);
            ctx.drawImage(off, 0, bd.y * dpr, off.width, bh * dpr, bd.dx, bd.y, W, bh);
            prevY = bd.y + bh;
          }
        }
      } else {
        ctx.drawImage(off, 0, 0, W, H);
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (done) return;
      if (phaseStart === null) phaseStart = now;
      var el = now - phaseStart;
      ctx.clearRect(0, 0, W, H);

      if (phase === 'fly') {
        drawParticles(el, 'fly', 1);
        if (el > FLY + 480) { phase = 'solid'; phaseStart = now; }
      } else if (phase === 'solid') {
        // кристаллизация: частицы гаснут, чёткий текст проявляется
        var k = Math.min(1, el / SOLID);
        drawParticles(FLY + 500, 'fly', 1 - k);
        drawText(k);
        if (k >= 1) { phase = 'hold'; phaseStart = now; nextGlitch = 700; }
      } else if (phase === 'hold') {
        if (el > nextGlitch) {
          glitch = 4 + Math.floor(Math.random() * 4);
          bands = [];
          for (var b = 0; b < 3; b++) {
            bands.push({ y: Math.random() * (H - 60), h: 8 + Math.random() * 42, dx: (Math.random() - 0.5) * 30 });
          }
          bands.sort(function (a, b2) { return a.y - b2.y; });
          nextGlitch = el + 600 + Math.random() * 900;
        }
        if (glitch > 0) glitch--;
        drawText(1);
        if (el > hold) toScatter();
      } else { // scatter: текст растворяется, частицы разлетаются
        var k3 = Math.min(1, el / SCATTER);
        if (k3 < 0.35) drawText(1 - k3 / 0.35);
        drawParticles(el, 'scatter', 1);
        if (el > SCATTER) { finish(); return; }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.UpdateFX = { play: play };
})();
