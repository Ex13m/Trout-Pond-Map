/* TroutMap Europe — анимированный курсор.
   Точка следует мгновенно, кольцо — с плавным «догоном» и лёгким
   покачиванием, как поплавок. На тач-устройствах и при reduced-motion
   отключается (используется системный курсор). */
(function () {
  'use strict';

  var isTouch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el = document.getElementById('cursor');
  if (!el || isTouch || reduced) { if (el) el.remove(); return; }

  document.body.classList.add('has-custom-cursor');
  var ring = el.querySelector('.cursor__ring');
  var dot = el.querySelector('.cursor__dot');

  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var rx = mx, ry = my;
  var visible = false;
  var t = 0;

  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (!visible) { visible = true; el.classList.add('is-visible'); rx = mx; ry = my; }
    dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    // подсветка над интерактивным
    var target = e.target;
    var interactive = target.closest && target.closest('button, a, input, select, textarea, .vcard, .chip, .leaflet-marker-icon, [role="button"], label');
    el.classList.toggle('is-active', !!interactive);
  }, { passive: true });

  window.addEventListener('mousedown', function () { el.classList.add('is-down'); });
  window.addEventListener('mouseup', function () { el.classList.remove('is-down'); });
  document.addEventListener('mouseleave', function () { visible = false; el.classList.remove('is-visible'); });

  function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    t += 0.05;
    var bob = Math.sin(t) * 1.2; // лёгкое покачивание поплавка
    ring.style.transform = 'translate(' + rx + 'px,' + (ry + bob) + 'px)';
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
