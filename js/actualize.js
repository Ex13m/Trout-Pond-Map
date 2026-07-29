/* TroutMap Europe — «Актуализировать»: журнал волн обновления базы.
   Пароль → анимированная лента последних 10 волн (дата/время, модель,
   токены с каунт-апом), скоринг трат по моделям с остатком в %,
   тап по волне — красивое окно деталей (что найдено/дополнено/улучшено,
   описание эвристической оптимизации).
   Все строки — через реестр i18n. */
(function () {
  'use strict';

  var T = function (k, v) { return window.I18N ? window.I18N.t(k, v) : k; };
  var RUNS = window.UPDATE_RUNS || [];
  var BUDGETS = window.UPDATE_BUDGETS || {};
  var UNLOCK_KEY = 'troutmap_actualize_ok';

  var modal, feedBox, scoreBox, passBox, detailBox;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtInt(n) { return Number(n).toLocaleString('ru-RU'); }

  function fmtDate(iso) {
    var d = new Date(iso);
    var p = function (x) { return String(x).padStart(2, '0'); };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() +
      ' · ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function modelShort(m) { return String(m).replace(/^claude-/, ''); }

  /* ---- Каунт-ап чисел ---- */
  function countUp(el, target, suffix) {
    var start = null, dur = 900;
    function step(ts) {
      if (!start) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtInt(Math.round(target * eased)) + (suffix || '');
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---- Скоринг по моделям ---- */
  function renderScore() {
    var spent = {};
    RUNS.forEach(function (r) {
      spent[r.model] = (spent[r.model] || 0) + (r.tokens || 0);
    });
    var models = Object.keys(BUDGETS);
    scoreBox.innerHTML = models.map(function (m, i) {
      var s = spent[m] || 0;
      var b = BUDGETS[m] || 1;
      var left = Math.max(0, 100 - (s / b) * 100);
      return '<div class="act-score" style="animation-delay:' + (i * 90) + 'ms">' +
        '<div class="act-score__row"><b class="act-score__model">' + esc(modelShort(m)) + '</b>' +
        '<span class="act-score__tok" data-tok="' + s + '">0</span></div>' +
        '<div class="act-bar"><div class="act-bar__fill" data-left="' + left.toFixed(1) + '"></div>' +
        '<span class="act-bar__label" data-leftlabel="' + left.toFixed(0) + '">' + T('act.left', { p: '0' }) + '</span></div>' +
        '</div>';
    }).join('');
    // запуск анимаций
    requestAnimationFrame(function () {
      scoreBox.querySelectorAll('.act-score__tok').forEach(function (el) {
        countUp(el, Number(el.getAttribute('data-tok')));
      });
      scoreBox.querySelectorAll('.act-bar__fill').forEach(function (el) {
        var left = Number(el.getAttribute('data-left'));
        setTimeout(function () { el.style.width = left + '%'; }, 150);
        el.classList.toggle('is-low', left < 20);
      });
      scoreBox.querySelectorAll('.act-bar__label').forEach(function (el) {
        var target = Number(el.getAttribute('data-leftlabel'));
        var n = 0;
        var timer = setInterval(function () {
          n += Math.max(1, Math.round(target / 30));
          if (n >= target) { n = target; clearInterval(timer); }
          el.textContent = T('act.left', { p: n });
        }, 30);
      });
    });
  }

  /* ---- Лента волн ---- */
  function renderFeed() {
    var runs = RUNS.slice(0, 10);
    feedBox.innerHTML = runs.map(function (r, i) {
      var running = r.status === 'running';
      return '<button class="act-run" data-run="' + i + '" style="animation-delay:' + (i * 70) + 'ms">' +
        '<div class="act-run__top">' +
        '<span class="act-run__date">🕒 ' + esc(fmtDate(r.ts)) + '</span>' +
        '<span class="act-run__model">' + esc(modelShort(r.model)) + '</span>' +
        '</div>' +
        '<div class="act-run__title">' + esc(r.title) + '</div>' +
        '<div class="act-run__bottom">' +
        (running
          ? '<span class="act-run__running">⏳ ' + esc(T('act.running')) + '</span>'
          : '<span class="act-run__tok" data-tok="' + (r.tokens || 0) + '">0</span>') +
        '<span class="act-run__more">' + esc(T('act.details')) + ' →</span>' +
        '</div></button>';
    }).join('');
    requestAnimationFrame(function () {
      feedBox.querySelectorAll('.act-run__tok').forEach(function (el) {
        countUp(el, Number(el.getAttribute('data-tok')), ' tok');
      });
    });
  }

  /* ---- Детали волны ---- */
  function openDetail(idx) {
    var r = RUNS[idx];
    if (!r) return;
    var list = function (title, items, icon) {
      if (!items || !items.length) return '';
      return '<h4 class="act-d__h">' + icon + ' ' + esc(title) + '</h4><ul class="act-d__list">' +
        items.map(function (x, i) {
          return '<li style="animation-delay:' + (i * 60) + 'ms">' + esc(x) + '</li>';
        }).join('') + '</ul>';
    };
    detailBox.innerHTML =
      '<button class="act-d__back" id="act-back">← ' + esc(T('act.back')) + '</button>' +
      '<div class="act-d__head">' +
      '<div class="act-d__title">' + esc(r.title) + '</div>' +
      '<div class="act-d__meta">🕒 ' + esc(fmtDate(r.ts)) + ' · 🤖 ' + esc(r.model) +
      (r.status === 'running' ? ' · ⏳ ' + esc(T('act.running')) : ' · <b class="act-d__tok">' + fmtInt(r.tokens) + ' tok</b>') +
      '</div></div>' +
      list(T('act.found'), r.added, '🆕') +
      list(T('act.improved'), r.improved, '🔧') +
      '<h4 class="act-d__h">🧠 ' + esc(T('act.optimization')) + '</h4>' +
      '<p class="act-d__opt">' + esc(r.optimization) + '</p>';
    modal.classList.add('is-detail');
    document.getElementById('act-back').addEventListener('click', function () {
      modal.classList.remove('is-detail');
    });
  }

  /* ---- Пароль ---- */
  function unlocked() {
    try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; }
  }

  function showJournal() {
    passBox.hidden = true;
    document.getElementById('act-journal').hidden = false;
    renderScore();
    renderFeed();
  }

  function tryPassword(pass) {
    var err = document.getElementById('act-pass-error');
    var btn = document.getElementById('act-pass-btn');
    btn.disabled = true;
    btn.textContent = T('act.checking');
    // серверная проверка + постановка запроса в очередь
    fetch('/api/actualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    }).then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); })
      .then(function (res) {
        btn.disabled = false;
        btn.textContent = T('act.enter');
        if (res.s === 200 && res.d.ok) {
          try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
          showJournal();
        } else {
          err.textContent = T('act.wrongPass');
          err.hidden = false;
        }
      })
      .catch(function () {
        // API нет (локальный запуск) — офлайн-проверка тем же паролем
        btn.disabled = false;
        btn.textContent = T('act.enter');
        if (pass === 'TroutAreaMaps02') {
          try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
          showJournal();
        } else {
          err.textContent = T('act.wrongPass');
          err.hidden = false;
        }
      });
  }

  function open() {
    modal.hidden = false;
    modal.classList.remove('is-detail');
    var panel = modal.querySelector('.modal__panel');
    if (panel) panel.focus({ preventScroll: true });
    if (unlocked()) showJournal();
    else {
      passBox.hidden = false;
      document.getElementById('act-journal').hidden = true;
      setTimeout(function () {
        var inp = document.getElementById('act-pass-input');
        if (inp) inp.focus();
      }, 60);
    }
  }

  function init() {
    modal = document.getElementById('actualize-modal');
    if (!modal) return;
    feedBox = document.getElementById('act-feed');
    scoreBox = document.getElementById('act-score-box');
    passBox = document.getElementById('act-pass');
    detailBox = document.getElementById('act-detail');

    document.getElementById('act-pass-form').addEventListener('submit', function (e) {
      e.preventDefault();
      tryPassword(document.getElementById('act-pass-input').value);
    });
    feedBox.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-run]');
      if (btn) openDetail(Number(btn.getAttribute('data-run')));
    });
    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) modal.hidden = true;
    });
    var fab = document.getElementById('fab-actualize');
    if (fab) fab.addEventListener('click', open);
  }

  window.Actualize = { init: init, open: open };
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
