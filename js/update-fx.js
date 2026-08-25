/* TroutMap Europe — анимация справки об обновлении.
   Текст версии собирается из ФОРЕЛЕК, приплывающих со всех сторон:
   стайка рыбок занимает свои места → кристаллизуется в чёткий текст →
   держится (5 с) с глитч-эффектом → рассыпается обратно в стайку,
   которая уплывает. Тап — пропустить.
   API: window.UpdateFX.play({ lines: [{text, size, color}], hold, onDone }) */
(function () {
  'use strict';

  // Силуэт форели (тот же мотив, что в спрайте иконок)
  var TROUT_BODY = 'M7 12c2-3.4 5.2-5.4 8.6-5.4 2.9 0 5.3 2 6.9 5.4-1.6 3.4-4 5.4-6.9 5.4-3.4 0-6.6-2-8.6-5.4Z';
  var TROUT_TAIL = 'M7 12 2.4 8.2c.5 1.5 1 2.7 1.9 3.8-.9 1.1-1.4 2.3-1.9 3.8L7 12Z';

  // Кадры виляния хвостом: хвост поворачивается вокруг сустава (7,12)
  var TAIL_FRAMES = [-0.45, -0.22, 0, 0.22, 0.45]; // радианы
  var spriteCache = {};
  function troutFrames(color) {
    if (spriteCache[color]) return spriteCache[color];
    var frames = TAIL_FRAMES.map(function (ang) {
      var c = document.createElement('canvas');
      c.width = 48; c.height = 48;
      var x = c.getContext('2d');
      x.translate(24, 24);
      x.scale(1.9, 1.9);
      x.translate(-12, -12);
      x.fillStyle = color;
      if (window.Path2D) {
        x.fill(new Path2D(TROUT_BODY));
        x.save();
        x.translate(7, 12);
        x.rotate(ang);
        x.translate(-7, -12);
        x.fill(new Path2D(TROUT_TAIL));
        x.restore();
      } else {
        x.fillRect(4, 8, 16, 8); // древний браузер — хоть что-то
      }
      return c;
    });
    spriteCache[color] = frames;
    return frames;
  }

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
    canvas.setAttribute('aria-label', 'Справка об обновлении. Коснитесь, чтобы закрыть');
    canvas.setAttribute('role', 'img');
    document.body.appendChild(canvas);
    requestAnimationFrame(function () { canvas.style.background = 'rgba(5,18,17,0.94)'; });

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    /* --- Офскрин с ЦВЕТНЫМ чётким текстом --- */
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

    /* --- Сэмплинг мест для форелек --- */
    var img;
    try { img = octx.getImageData(0, 0, off.width, off.height).data; }
    catch (e) { canvas.remove(); onDone(false); return; }

    var MAX = (W < 600 ? 700 : 1100);
    var step = 3;
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
    while (targets.length > MAX && step < 9) { step += 1; targets = collect(step); }
    if (targets.length < 40) { canvas.remove(); onDone(false); return; }

    // Стайка: каждая форелька приплывает со своей стороны
    var fish = targets.map(function (t, i) {
      var edge = Math.random();
      var sx, sy;
      if (edge < 0.25) { sx = -40 - Math.random() * W * 0.6; sy = Math.random() * H; }
      else if (edge < 0.5) { sx = W + 40 + Math.random() * W * 0.6; sy = Math.random() * H; }
      else if (edge < 0.75) { sx = Math.random() * W; sy = -40 - Math.random() * H * 0.6; }
      else { sx = Math.random() * W; sy = H + 40 + Math.random() * H * 0.6; }
      var ang = Math.random() * Math.PI * 2;
      var v = 3 + Math.random() * 8;
      return {
        sx: sx, sy: sy, tx: t[0], ty: t[1], color: t[2],
        delay: Math.random() * 600,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        size: 7 + Math.random() * 6,           // размер рыбки
        wamp: 4 + Math.random() * 8,           // амплитуда рысканья по курсу
        wfreq: 0.006 + Math.random() * 0.006,  // частота рысканья
        wag: 0.014 + Math.random() * 0.01,     // скорость виляния хвостом
        phase: Math.random() * Math.PI * 2
      };
    });

    /* --- Фазы: swim-in → solidify → hold → text-out + swim-away --- */
    var SWIM = 1700, SOLID = 650, SCATTER = 1100;
    var phase = 'swim', phaseStart = null, done = false;
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

    function drawFish(now, el, mode, alphaMul) {
      for (var i = 0; i < fish.length; i++) {
        var f = fish[i], x, y2, a = alphaMul, hx, hy;
        if (mode === 'swim') {
          var k = Math.max(0, Math.min(1, (el - f.delay) / SWIM));
          var e = ease(k);
          x = f.sx + (f.tx - f.sx) * e;
          y2 = f.sy + (f.ty - f.sy) * e;
          // лёгкое рысканье поперёк курса, затухает у цели
          var wig = Math.sin(now * f.wfreq + f.phase) * f.wamp * (1 - e);
          var dx = f.tx - f.sx, dy = f.ty - f.sy;
          var len = Math.sqrt(dx * dx + dy * dy) || 1;
          x += (-dy / len) * wig;
          y2 += (dx / len) * wig;
          a = (0.3 + 0.7 * e) * alphaMul;
          hx = dx; hy = dy;               // курс — строго на свою букву
        } else { // scatter: уплывают наружу
          var k2 = Math.min(1, el / SCATTER);
          var e2 = k2 * k2;
          x = f.tx + f.vx * e2 * 70;
          y2 = f.ty + f.vy * e2 * 70;
          a = (1 - k2) * alphaMul;
          hx = f.vx; hy = f.vy;           // курс — направление ухода
        }
        if (a <= 0.02) continue;
        var frames = troutFrames(f.color);
        // пинг-понг кадров хвоста: 0..N-1..0
        var fi = Math.floor(now * f.wag + f.phase * 3) % (TAIL_FRAMES.length * 2 - 2);
        if (fi >= TAIL_FRAMES.length) fi = TAIL_FRAMES.length * 2 - 2 - fi;
        var spr = frames[fi];
        var theta = Math.atan2(hy, hx);
        var w = f.size * 2, h = f.size * 2;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(x, y2);
        if (Math.cos(theta) >= 0) {
          ctx.rotate(theta);              // голова по курсу
        } else {
          ctx.scale(-1, 1);               // влево — зеркалим, чтобы не плыть кверху брюхом
          ctx.rotate(Math.PI - theta);
        }
        ctx.drawImage(spr, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

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

      if (phase === 'swim') {
        drawFish(now, el, 'swim', 1);
        if (el > SWIM + 620) { phase = 'solid'; phaseStart = now; }
      } else if (phase === 'solid') {
        // стайка «схлопывается» в чёткий текст
        var k = Math.min(1, el / SOLID);
        drawFish(now, SWIM + 620, 'swim', 1 - k);
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
      } else { // scatter: текст растворяется, стайка уплывает
        var k3 = Math.min(1, el / SCATTER);
        if (k3 < 0.3) drawText(1 - k3 / 0.3);
        drawFish(now, el, 'scatter', 1);
        if (el > SCATTER) { finish(); return; }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.UpdateFX = { play: play };
})();
