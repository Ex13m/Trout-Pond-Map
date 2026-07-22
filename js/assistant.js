/* TroutMap Europe — электронный помощник.
   Лёгкий бот на правилах: быстрые темы + разбор свободного вопроса по
   ключевым словам и по базе водоёмов. Все тексты берутся из реестра i18n,
   поэтому помощник автоматически говорит на выбранном языке.
   Публичный API:
     window.Assistant.open()
     window.Assistant.onOpenVenue = function(id){}  // назначает app.js
     window.Assistant.rerender()                    // после смены языка */
(function () {
  'use strict';

  var T = function (k, v) { return window.I18N ? window.I18N.t(k, v) : k; };

  var TOPICS = [
    { id: 'find', q: 'assistant.q.find', a: 'assistant.a.find', kw: { ru: ['найти', 'поиск', 'искать', 'ближ', 'фильтр'], en: ['find', 'search', 'near', 'filter'], cs: ['najít', 'hledat', 'blíz', 'filtr'] } },
    { id: 'cr', q: 'assistant.q.cr', a: 'assistant.a.cr', kw: { ru: ['c&r', 'отпуст', 'поймал', 'релиз', 'безбород', 'крюч'], en: ['c&r', 'release', 'catch', 'barbless', 'hook'], cs: ['c&r', 'pusť', 'chyť', 'háč'] } },
    { id: 'add', q: 'assistant.q.add', a: 'assistant.a.add', kw: { ru: ['добав', 'свой', 'предлож', 'база'], en: ['add', 'submit', 'my own', 'base'], cs: ['přidat', 'vlastní', 'poslat', 'báz'] } },
    { id: 'layers', q: 'assistant.q.layers', a: 'assistant.a.layers', kw: { ru: ['тёмн', 'темн', 'чёрн', 'черн', 'слой', 'спутник', 'рельеф', 'карта не'], en: ['dark', 'black', 'layer', 'satellite', 'terrain'], cs: ['tmav', 'čern', 'vrstv', 'satelit', 'terén'] } },
    { id: 'weather', q: 'assistant.q.weather', a: 'assistant.a.weather', kw: { ru: ['погод', 'клёв', 'клев', 'прогноз', 'ветер', 'давлен'], en: ['weather', 'bite', 'forecast', 'wind', 'pressure'], cs: ['počas', 'záběr', 'předpov', 'vítr', 'tlak'] } }
  ];

  var modal, log, chipsBox, form, input;
  var venues = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function bubble(role, html) {
    var div = document.createElement('div');
    div.className = 'asst-msg asst-msg--' + role;
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function renderChips() {
    chipsBox.innerHTML = TOPICS.map(function (topic) {
      return '<button class="asst-chip" data-topic="' + topic.id + '">' + esc(T(topic.q)) + '</button>';
    }).join('');
  }

  function greet() {
    log.innerHTML = '';
    bubble('bot', esc(T('assistant.greeting')));
  }

  function answerTopic(topic) {
    bubble('bot', esc(T(topic.a)));
  }

  // Поиск водоёма по названию/городу/стране в свободном вопросе
  function tryVenueLookup(text) {
    var q = text.toLowerCase();
    var hits = venues.filter(function (v) {
      var hay = (v.name + ' ' + (v.location || '')).toLowerCase();
      return q.length > 2 && hay.indexOf(q) !== -1;
    }).slice(0, 4);
    if (!hits.length) {
      // по отдельным словам длиной 4+
      var words = q.split(/[\s,.;]+/).filter(function (w) { return w.length >= 4; });
      if (words.length) {
        hits = venues.filter(function (v) {
          var hay = (v.name + ' ' + (v.location || '')).toLowerCase();
          return words.some(function (w) { return hay.indexOf(w) !== -1; });
        }).slice(0, 4);
      }
    }
    if (!hits.length) return false;
    var html = hits.map(function (v) {
      return '<button class="asst-venue" data-venue="' + esc(v.id) + '">📍 ' + esc(v.name) +
        (v.location ? ' <span>· ' + esc(v.location) + '</span>' : '') + '</button>';
    }).join('');
    bubble('bot', html);
    return true;
  }

  function handle(text) {
    text = text.trim();
    if (!text) return;
    bubble('user', esc(text));
    var lang = window.I18N ? window.I18N.get() : 'ru';
    var low = text.toLowerCase();

    // 1) ключевые слова тем
    for (var i = 0; i < TOPICS.length; i++) {
      var kw = TOPICS[i].kw[lang] || TOPICS[i].kw.ru;
      for (var j = 0; j < kw.length; j++) {
        if (low.indexOf(kw[j]) !== -1) { answerTopic(TOPICS[i]); return; }
      }
    }
    // 2) поиск водоёма
    if (tryVenueLookup(text)) return;
    // 3) фолбэк
    bubble('bot', esc(T('assistant.fallback')));
  }

  function open() {
    if (!modal) return;
    modal.hidden = false;
    if (!log.children.length) greet();
    renderChips();
    var panel = modal.querySelector('.modal__panel');
    if (panel) panel.focus({ preventScroll: true });
    setTimeout(function () { if (input) input.focus(); }, 60);
  }

  function init() {
    modal = document.getElementById('assistant-modal');
    if (!modal) return;
    log = document.getElementById('assistant-log');
    chipsBox = document.getElementById('assistant-chips');
    form = document.getElementById('assistant-form');
    input = document.getElementById('assistant-input');

    chipsBox.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-topic]');
      if (!btn) return;
      var topic = TOPICS.filter(function (t) { return t.id === btn.getAttribute('data-topic'); })[0];
      if (topic) { bubble('user', esc(T(topic.q))); answerTopic(topic); }
    });

    log.addEventListener('click', function (e) {
      var vb = e.target.closest('[data-venue]');
      if (vb && typeof window.Assistant.onOpenVenue === 'function') {
        modal.hidden = true;
        window.Assistant.onOpenVenue(vb.getAttribute('data-venue'));
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handle(input.value);
      input.value = '';
    });

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) modal.hidden = true;
    });
  }

  window.Assistant = {
    init: init,
    open: open,
    setVenues: function (v) { venues = v || []; },
    rerender: function () { if (modal && !modal.hidden) { greet(); renderChips(); } },
    onOpenVenue: null
  };

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
