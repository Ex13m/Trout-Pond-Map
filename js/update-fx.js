/* TroutMap Europe — анимация справки об обновлении.
   Текст версии материализуется из роя летящих частиц, держится
   с глитч-эффектом, затем разлетается. Тап — пропустить.
   API: window.UpdateFX.play({ lines: [{text, size, color}], hold, onDone }) */
(function () {
  'use strict';

  function play(opts) {
    var lines = (opts && opts.lines) || [];
    var hold = (opts && opts.hold) || 5000;
    var onDone = (opts && opts.onDone) || function () {};
    if (!lines.length || !window.requestAnimationFrame) { onDone(false); return; }

    var W = window.innerWidth, H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var canvas = document.createElement('canvas');
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:300;' +
      'background:rgba(5,18,17,0);transition:background .5s;cursor:pointer;';
    canvas.setAttribute('aria-label', 'Анимация обновления. Коснитесь, чтобы пропустить');
    canvas.setAttribute('role', 'img');
    document.body.appendChild(canvas);
    requestAnimationFrame(function () { canvas.style.background = 'rgba(5,18,17,0.93)'; });

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    /* --- Разметка текста в офскрин-канвасе и сэмплинг точек --- */
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    var octx = off.getContext('2d');
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#fff';

    var pad = 10;
    var totalH = 0;
    lines.forEach(function (l) { totalH += l.size * 1.35 + pad; });
    var y = (H - totalH) / 2 + 20;
    var meta = [];
    lines.forEach(function (l) {
      var size = l.size;
      octx.font = '800 ' + size + 'px Manrope, system-ui, sans-serif';
      // ужимаем строку в экран
      while (size > 9 && octx.measureText(l.text).width > W - 36) {
        size -= 1;
        octx.font = '800 ' + size + 'px Manrope, system-ui, sans-serif';
      }
      y += size * 1.35 / 2;
      octx.fillText(l.text, W / 2, y);
      meta.push({ yMid: y, color: l.color || '#e8f5f2' });
      y += size * 1.35 / 2 + pad;
    });

    var img;
    try { img = octx.getImageData(0, 0, W, H).data; }
    catch (e) { canvas.remove(); onDone(false); return; }

    var MAX = (W < 600 ? 5500 : 8000);
    var step = 2;
    function collect(st) {
      var pts = [];
      for (var yy = 0; yy < H; yy += st) {
        for (var xx = 0; xx < W; xx += st) {
          if (img[(yy * W + xx) * 4 + 3] > 128) pts.push([xx, yy]);
        }
      }
      return pts;
    }
    var targets = collect(step);
    while (targets.length > MAX && step < 5) { step += 1; targets = collect(step); }
    if (targets.length < 60) { canvas.remove(); onDone(false); return; }

    function lineColor(yy) {
      var best = meta[0].color, dist = Infinity;
      for (var i = 0; i < meta.length; i++) {
        var d = Math.abs(meta[i].yMid - yy);
        if (d < dist) { dist = d; best = meta[i].color; }
      }
      return best;
    }

    /* --- Частицы --- */
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
        sx: sx, sy: sy, tx: t[0], ty: t[1],
        delay: Math.random() * 500,
        jx: (Math.random() - 0.5) * 1.6, jy: (Math.random() - 0.5) * 1.6,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        color: lineColor(t[1]),
        size: Math.random() < 0.85 ? 1.6 : 2.4
      };
    });

    var FLY = 1400, SCATTER = 900;
    var t0 = null, phase = 'fly', phaseStart = 0, glitch = 0, nextGlitch = 900, bands = [];
    var done = false;

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

    function frame(now) {
      if (done) return;
      if (t0 === null) { t0 = now; phaseStart = now; }
      var el = now - phaseStart;
      ctx.clearRect(0, 0, W, H);

      if (phase === 'fly' && el > FLY + 500) { phase = 'hold'; phaseStart = now; el = 0; }
      if (phase === 'hold' && el > hold) { toScatter(); el = 0; }

      // глитч-полосы в фазе удержания
      if (phase === 'hold') {
        if (el > nextGlitch) {
          glitch = 3 + Math.floor(Math.random() * 3);
          bands = [];
          for (var b = 0; b < 3; b++) {
            bands.push({ y: Math.random() * H, h: 8 + Math.random() * 46, dx: (Math.random() - 0.5) * 26 });
          }
          nextGlitch = el + 500 + Math.random() * 800;
        }
        if (glitch > 0) glitch--;
      }

      var rgb = glitch > 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], x, y2, a = 1;
        if (phase === 'fly') {
          var k = Math.max(0, Math.min(1, (el - p.delay) / FLY));
          var e = ease(k);
          x = p.sx + (p.tx - p.sx) * e;
          y2 = p.sy + (p.ty - p.sy) * e;
          a = 0.25 + 0.75 * e;
        } else if (phase === 'hold') {
          x = p.tx + Math.sin((el + i * 37) / 300) * p.jx;
          y2 = p.ty + Math.cos((el + i * 53) / 340) * p.jy;
        } else {
          var k2 = Math.min(1, el / SCATTER);
          x = p.tx + p.vx * k2 * 60 * k2;
          y2 = p.ty + p.vy * k2 * 60 * k2 + 120 * k2 * k2;
          a = 1 - k2;
        }
        if (rgb) {
          for (var bi = 0; bi < bands.length; bi++) {
            var bd = bands[bi];
            if (y2 > bd.y && y2 < bd.y + bd.h) { x += bd.dx; break; }
          }
        }
        ctx.globalAlpha = a;
        if (rgb && (i & 7) === 0) {
          ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x - 2, y2, p.size, p.size);
          ctx.fillStyle = '#4dffe0'; ctx.fillRect(x + 2, y2, p.size, p.size);
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      if (phase === 'scatter' && el > SCATTER) { finish(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.UpdateFX = { play: play };
})();
