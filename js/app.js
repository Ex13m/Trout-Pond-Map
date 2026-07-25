/* ============================================================
   TroutMap Europe — app logic
   ============================================================ */
(function () {
  'use strict';

  var BASE_VENUES = window.VENUES || [];
  var USER_KEY = 'troutmap_user_venues';

  function loadUserVenues() {
    try {
      var arr = JSON.parse(localStorage.getItem(USER_KEY) || '[]');
      return Array.isArray(arr) ? arr.filter(function (v) {
        return v && v.id && v.name && isFinite(v.lat) && isFinite(v.lng);
      }) : [];
    } catch (e) { return []; }
  }
  function saveUserVenues(arr) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(arr)); return true; }
    catch (e) { return false; }
  }

  var userVenues = loadUserVenues();
  var communityVenues = [];
  var VENUES = BASE_VENUES.concat(userVenues);
  function rebuildVenues() {
    // свои локальные копии уже отправленных в базу не дублируем
    var commIds = {};
    communityVenues.forEach(function (v) { commIds[v.name.toLowerCase()] = true; });
    var mine = userVenues.filter(function (v) { return !v._sentName || !commIds[v._sentName.toLowerCase()]; });
    VENUES = BASE_VENUES.concat(communityVenues, mine);
  }

  // Общая база сообщества (Netlify Blobs) — тихо пропускаем, если API нет
  function loadCommunity() {
    if (!window.fetch) return;
    fetch('/api/community-venues')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        if (!data || !Array.isArray(data.venues)) return;
        communityVenues = data.venues.filter(function (v) {
          return v && v.name && isFinite(v.lat) && isFinite(v.lng);
        }).map(function (v) {
          v._community = true;
          if (!v.biome) v.biome = BIOME_BY_CC[v.country] || 'meadow';
          return v;
        });
        rebuildVenues();
        if (window.Assistant) window.Assistant.setVenues(VENUES);
        refresh();
      })
      .catch(function () { /* статический хостинг без функций — ок */ });
  }

  var COUNTRY_NAMES = {
    it: 'Италия', fr: 'Франция', es: 'Испания', pt: 'Португалия',
    de: 'Германия', at: 'Австрия', ch: 'Швейцария', si: 'Словения',
    cz: 'Чехия', sk: 'Словакия', hu: 'Венгрия', pl: 'Польша',
    lt: 'Литва', lv: 'Латвия', ee: 'Эстония', fi: 'Финляндия',
    se: 'Швеция', no: 'Норвегия', dk: 'Дания', be: 'Бельгия',
    nl: 'Нидерланды', gb: 'Великобритания', ie: 'Ирландия', hr: 'Хорватия',
    bg: 'Болгария', ro: 'Румыния'
  };

  function flagEmoji(cc) {
    if (!cc || cc.length !== 2) return '🏳️';
    var A = 0x1F1E6;
    var up = cc.toUpperCase();
    return String.fromCodePoint(A + up.charCodeAt(0) - 65, A + up.charCodeAt(1) - 65);
  }

  // Атмосферные фото сгенерированы через Higgsfield AI (см. README)
  var IMG_CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_2vVGC2DWe2MM7XDhdxjTNwWTi4E/';
  var IMG = {
    alpineHero: IMG_CDN + 'hf_20260722_150959_7865e3a4-3b15-4d1f-8090-f8cf13c2f974_min.webp',
    laghetto: IMG_CDN + 'hf_20260722_151001_5d18cf93-a27b-4f5c-bc04-a67403acabc6_min.webp',
    meadow: IMG_CDN + 'hf_20260722_151005_0f9a8d99-8811-44f5-add0-0a1083324df9_min.webp',
    nordic: IMG_CDN + 'hf_20260722_151007_e5cc4c5c-1d19-4cbe-a9af-b14877af0604_min.webp',
    forestMisty: IMG_CDN + 'hf_20260722_205120_2c0d47b8-18dc-4423-8d3b-59f5896ffeae_min.webp',
    autumnPond: IMG_CDN + 'hf_20260722_205122_b5b21258-26b5-45fc-84fc-9169530841af_min.webp',
    mountainRes: IMG_CDN + 'hf_20260722_205123_407dcb3b-c077-4f4e-88ae-299d3d5434ec_min.webp',
    lowlandGold: IMG_CDN + 'hf_20260722_205130_1236ecb3-9281-4999-8c0d-6c1fbe5df15a_min.webp',
    nordicRocky: IMG_CDN + 'hf_20260722_205134_78fd352e-777c-46a4-87f5-e7b554dfe08e_min.webp',
    compPond: IMG_CDN + 'hf_20260722_205121_e3b56308-cf57-4167-8e91-4ac69b216494_min.webp',
    chalkStream: IMG_CDN + 'hf_20260722_205131_069692ba-cdf6-45d5-b9db-0c62cb0e2329_min.webp'
  };
  // Пул вариантов на биом — карточки не повторяются подряд
  var BIOME_POOL = {
    laghetto: [IMG.laghetto, IMG.compPond, IMG.lowlandGold, IMG.autumnPond],
    alpine: [IMG.alpineHero, IMG.mountainRes, IMG.forestMisty],
    forest: [IMG.forestMisty, IMG.autumnPond, IMG.compPond, IMG.laghetto],
    meadow: [IMG.meadow, IMG.lowlandGold, IMG.chalkStream, IMG.autumnPond],
    nordic: [IMG.nordic, IMG.nordicRocky, IMG.forestMisty]
  };
  function biomeKey(v) {
    return Object.prototype.hasOwnProperty.call(BIOME_POOL, v.biome) ? v.biome : 'forest';
  }
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }
  function venueImage(v) {
    if (v.photo && /^https:\/\//i.test(v.photo)) return v.photo;
    var pool = BIOME_POOL[biomeKey(v)];
    return pool[hashStr(String(v.id) + v.name) % pool.length];
  }
  // Фолбэк-цепочка: реальное фото → биом-заставка → градиент
  function imgTag(v, attrs) {
    var main = venueImage(v);
    var fb = BIOME_POOL[biomeKey(v)][0];
    var fallback = (main === fb) ? '' : ' data-fb="' + fb + '"';
    return '<img ' + (attrs || '') + fallback + ' src="' + main + '" ' +
      'onerror="if(this.dataset.fb){this.src=this.dataset.fb;delete this.dataset.fb}else{this.remove()}">';
  }
  function safeUrl(u) {
    return (typeof u === 'string' && /^https?:\/\//i.test(u)) ? u : null;
  }

  var WMO = {
    0: ['☀️', 'Ясно'], 1: ['🌤️', 'Малооблачно'], 2: ['⛅', 'Облачно'], 3: ['☁️', 'Пасмурно'],
    45: ['🌫️', 'Туман'], 48: ['🌫️', 'Изморозь'],
    51: ['🌦️', 'Морось'], 53: ['🌦️', 'Морось'], 55: ['🌧️', 'Сильная морось'],
    61: ['🌧️', 'Небольшой дождь'], 63: ['🌧️', 'Дождь'], 65: ['🌧️', 'Ливень'],
    66: ['🌧️', 'Ледяной дождь'], 67: ['🌧️', 'Ледяной дождь'],
    71: ['🌨️', 'Небольшой снег'], 73: ['🌨️', 'Снег'], 75: ['❄️', 'Сильный снег'], 77: ['🌨️', 'Снежные зёрна'],
    80: ['🌦️', 'Ливни местами'], 81: ['🌧️', 'Ливни'], 82: ['⛈️', 'Сильные ливни'],
    85: ['🌨️', 'Снегопад'], 86: ['🌨️', 'Сильный снегопад'],
    95: ['⛈️', 'Гроза'], 96: ['⛈️', 'Гроза с градом'], 99: ['⛈️', 'Гроза с градом']
  };
  function wmo(code) { return WMO[code] || ['🌡️', '—']; }

  /* ---------- State ---------- */
  var state = {
    filters: { cr: false, year: false, country: null, near: false },
    query: '',
    userPos: null,
    selectedId: null,
    listMode: false
  };

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, v) { return window.I18N ? window.I18N.t(k, v) : k; };

  // Применяет переводы к статической разметке (data-i18n / -ph / -aria)
  function applyI18n(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  var els = {
    splash: $('splash'), splashEnter: $('splash-enter'), splashCount: $('splash-count'),
    search: $('search-input'), searchClear: $('search-clear'),
    chips: $('chips'), chipCountry: $('chip-country'), chipCountryLabel: $('chip-country-label'),
    chipNear: $('chip-near'),
    viewToggle: $('view-toggle'), iconList: $('icon-list'), iconMap: $('icon-map'),
    listView: $('list-view'), listContainer: $('list-container'),
    resultsPill: $('results-pill'),
    fabLocate: $('fab-locate'),
    countryModal: $('country-modal'), countryGrid: $('country-grid'),
    aboutModal: $('about-modal'), brandBtn: $('brand-btn'),
    sheet: $('sheet'), sheetPanel: $('sheet-panel'), sheetGrip: $('sheet-grip'),
    sheetScroll: $('sheet-scroll'), sheetContent: $('sheet-content'),
    sheetBackdrop: $('sheet-backdrop'),
    toast: $('toast')
  };

  /* ---------- Map ---------- */
  var map = L.map('map', { zoomControl: true, attributionControl: true, tap: true })
    .setView([49.5, 9.5], 5);

  /* Базовые слои: спутник (по умолчанию), рельеф, схема */
  var darkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var LAYER_KEY = 'troutmap_layer';
  var OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

  var BASE_LAYERS = {
    sat: {
      labelKey: 'layer.sat',
      make: function () {
        var img = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics', maxZoom: 19
        });
        var labels = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
          attribution: OSM_ATTR + ' &copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 19
        });
        return L.layerGroup([img, labels]);
      }
    },
    topo: {
      labelKey: 'layer.topo',
      make: function () {
        return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: OSM_ATTR + ', SRTM · &copy; <a href="https://opentopomap.org/">OpenTopoMap</a> (CC-BY-SA)', maxZoom: 17
        });
      }
    },
    scheme: {
      labelKey: 'layer.scheme',
      make: function () {
        // Всегда светлая читаемая карта (CARTO Voyager), не зависит от темы
        return L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: OSM_ATTR + ' &copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 19
        });
      }
    }
  };

  var currentLayerKey = null, currentLayer = null;
  function setBaseLayer(key) {
    if (!BASE_LAYERS[key] || key === currentLayerKey) return;
    if (currentLayer) map.removeLayer(currentLayer);
    currentLayer = BASE_LAYERS[key].make();
    currentLayer.addTo(map);
    currentLayerKey = key;
    try { localStorage.setItem(LAYER_KEY, key); } catch (e) {}
  }
  var storedLayer = null;
  try { storedLayer = localStorage.getItem(LAYER_KEY); } catch (e) {}
  setBaseLayer(BASE_LAYERS[storedLayer] ? storedLayer : 'sat');

  // Переключатель слоёв
  (function () {
    var modal = document.getElementById('layers-modal');
    var grid = document.getElementById('layer-grid');
    var fab = document.getElementById('fab-layers');
    function render() {
      grid.innerHTML = Object.keys(BASE_LAYERS).map(function (k) {
        return '<button class="country-btn' + (k === currentLayerKey ? ' is-active' : '') + '" data-layer="' + k + '">' +
          t(BASE_LAYERS[k].labelKey) + '</button>';
      }).join('');
    }
    fab.addEventListener('click', function () {
      render();
      modal.hidden = false;
      var panel = modal.querySelector('.modal__panel');
      if (panel) panel.focus({ preventScroll: true });
    });
    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) { modal.hidden = true; return; }
      var btn = e.target.closest('[data-layer]');
      if (btn) { setBaseLayer(btn.getAttribute('data-layer')); modal.hidden = true; }
    });
  })();

  var cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 46,
    iconCreateFunction: function (c) {
      var n = c.getChildCount();
      var size = n < 10 ? 36 : n < 30 ? 42 : 48;
      return L.divIcon({
        html: '<div class="cluster" style="width:' + size + 'px;height:' + size + 'px">' + n + '</div>',
        className: '', iconSize: [size, size]
      });
    }
  });
  map.addLayer(cluster);

  var markers = {}; // id -> marker
  var userMarker = null;

  function pinIcon(v, selected) {
    var cls = 'pin' + (v.catchAndRelease === 'partial' ? ' pin--partial' : '') +
      (v._user ? ' pin--user' : '') + (v._community ? ' pin--community' : '') +
      (selected ? ' pin--selected' : '');
    return L.divIcon({
      className: '',
      html: '<div class="' + cls + '"><div class="pin__dot"><span>🐟</span></div></div>',
      iconSize: [34, 34], iconAnchor: [17, 30]
    });
  }

  function buildMarkers() {
    cluster.clearLayers();
    markers = {};
    filtered().forEach(function (v) {
      var m = L.marker([v.lat, v.lng], { icon: pinIcon(v, v.id === state.selectedId), alt: v.name });
      m.on('click', function (ev) {
        if (picking) { map.fire('click', { latlng: ev.latlng }); return; }
        selectVenue(v.id, false);
      });
      markers[v.id] = m;
      cluster.addLayer(m);
    });
  }

  /* ---------- Filtering ---------- */
  function norm(s) { return (s || '').toString().toLowerCase(); }

  function filtered() {
    var q = norm(state.query);
    return VENUES.filter(function (v) {
      if (state.filters.cr && v.catchAndRelease !== true) return false;
      if (state.filters.year && !/круглый год/i.test(v.season || '')) return false;
      if (state.filters.country && v.country !== state.filters.country) return false;
      if (q) {
        var hay = norm(v.name) + ' ' + norm(v.location) + ' ' + norm(COUNTRY_NAMES[v.country]);
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function distKm(a, b, c, d) {
    var R = 6371, dLat = (c - a) * Math.PI / 180, dLng = (d - b) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function withDistance(list) {
    if (!state.userPos) return list;
    return list.map(function (v) {
      v._dist = distKm(state.userPos[0], state.userPos[1], v.lat, v.lng);
      return v;
    }).sort(function (a, b) { return a._dist - b._dist; });
  }

  function refresh() {
    buildMarkers();
    renderList();
    // Открытая карточка могла выпасть из фильтра — закрываем, чтобы не врать
    if (state.selectedId && !markers[state.selectedId]) closeSheet();
    var n = filtered().length;
    els.resultsPill.textContent = n === 0 ? t('results.none')
      : t('results.count') + ' ' + n + (state.filters.country ? ' · ' + (COUNTRY_NAMES[state.filters.country] || '') : '');
  }

  /* ---------- List view ---------- */
  function crBadge(v) {
    if (v.catchAndRelease === true) return '<span class="badge badge--cr">' + esc(t('cr.full')) + '</span>';
    if (v.catchAndRelease === 'partial') return '<span class="badge badge--partial">' + esc(t('cr.partial')) + '</span>';
    return '<span class="badge">' + esc(t('cr.none')) + '</span>';
  }

  function esc(s) {
    return (s || '').toString().replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderList() {
    var list = withDistance(filtered().slice());
    if (!list.length) {
      els.listContainer.innerHTML =
        '<div class="empty"><div class="empty__icon">🎣</div><p><b>' + esc(t('results.none')) + '</b></p></div>';
      return;
    }
    els.listContainer.innerHTML = list.map(function (v) {
      return '<article class="vcard" role="button" tabindex="0" data-id="' + esc(v.id) + '" aria-label="' + esc(v.name) + ', ' + esc(COUNTRY_NAMES[v.country] || v.country) + '">' +
        '<div class="vcard__photo ph--' + biomeKey(v) + '">' + imgTag(v, 'loading="lazy" alt=""') +
        '<span class="vcard__flag">' + flagEmoji(v.country) + ' ' + esc(COUNTRY_NAMES[v.country] || v.country) + '</span>' +
        (v._dist != null ? '<span class="vcard__dist">' + Math.round(v._dist) + ' км</span>' : '') +
        '</div>' +
        '<div class="vcard__body">' +
        '<div class="vcard__name">' + esc(v.name) + '</div>' +
        '<div class="vcard__loc">📍 ' + esc(v.location) + '</div>' +
        '<div class="vcard__badges">' +
        (v._user ? '<span class="badge badge--user">' + esc(t('badge.mine')) + '</span>' : '') +
        (v._community ? '<span class="badge badge--community">' + esc(t('badge.communityShort')) + '</span>' : '') + crBadge(v) +
        (v.price ? '<span class="badge badge--price">' + esc(v.price) + '</span>' : '') +
        '</div></div></article>';
    }).join('');
  }

  els.listContainer.addEventListener('click', function (e) {
    var card = e.target.closest('.vcard');
    if (card) selectVenue(card.getAttribute('data-id'), true);
  });
  els.listContainer.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest('.vcard');
    if (card) { e.preventDefault(); selectVenue(card.getAttribute('data-id'), true); }
  });

  /* ---------- Venue detail sheet ---------- */
  function selectVenue(id, fromList) {
    var v = VENUES.find(function (x) { return x.id === id; });
    if (!v) return;
    var prev = state.selectedId;
    state.selectedId = id;
    if (prev && markers[prev]) markers[prev].setIcon(pinIcon(VENUES.find(function (x) { return x.id === prev; }), false));
    if (markers[id]) markers[id].setIcon(pinIcon(v, true));

    if (fromList && state.listMode) toggleView(false);
    map.flyTo([v.lat, v.lng], Math.max(map.getZoom(), 11), { duration: 0.8 });

    renderDetail(v);
    openSheet();
    loadWeather(v);
  }

  function renderDetail(v) {
    var cn = COUNTRY_NAMES[v.country] || v.country;
    var site = safeUrl(v.website);
    var gmaps = 'https://www.google.com/maps/dir/?api=1&destination=' + Number(v.lat) + ',' + Number(v.lng);
    var html =
      '<div class="vd">' +
      '<div class="vd__photo ph--' + biomeKey(v) + '">' + imgTag(v, 'alt="' + esc(v.name) + '"') +
      (v.photo
        ? (/wikimedia/.test(v.photo) ? '<span class="vd__photo-note">' + esc(t('card.photoWiki')) + '</span>' : '')
        : '<span class="vd__photo-note">' + esc(t('card.photoIllustrative')) + '</span>') +
      '<button class="vd__close" id="vd-close" aria-label="' + esc(t('card.close')) + '">✕</button></div>' +

      '<div class="vd__head">' +
      '<h2 class="vd__name">' + esc(v.name) + '</h2>' +
      '<div class="vd__loc">' + flagEmoji(v.country) + ' ' + esc(cn) + ' · 📍 ' + esc(v.location) + '</div>' +
      '</div>' +

      '<div class="vd__badges">' +
      (v._user ? '<span class="badge badge--user">' + esc(t('badge.mineFull')) + '</span>' : '') +
      (v._community ? '<span class="badge badge--community">' + esc(t('badge.community')) + '</span>' : '') +
      crBadge(v) +
      (v.price ? '<span class="badge badge--price">💶 ' + esc(v.price) + '</span>' : '') +
      (v.season ? '<span class="badge">📅 ' + esc(v.season) + '</span>' : '') +
      '</div>' +

      (v.description ? '<p class="vd__desc">' + esc(v.description) + '</p>' : '') +

      '<div class="vd__actions">' +
      '<a class="btn btn--route" href="' + gmaps + '" target="_blank" rel="noopener">' + esc(t('card.route')) + '</a>' +
      (site ? '<a class="btn btn--ghost" href="' + esc(site) + '" target="_blank" rel="noopener">' + esc(t('card.website')) + '</a>' : '') +
      '</div>' +
      (v._user
        ? '<div class="vd__actions">' +
          (v._sentName
            ? '<span class="btn btn--ghost" aria-disabled="true">' + esc(t('my.inBase')) + '</span>'
            : '<button class="btn btn--ghost" id="vd-propose" type="button">' + esc(t('my.propose')) + '</button>') +
          '<button class="btn btn--ghost btn--danger" id="vd-delete" type="button">' + esc(t('my.delete')) + '</button>' +
          '</div>'
        : '') +

      '<div class="vd__section"><h3>' + esc(t('card.weather')) + '</h3><div id="weather-box" class="weather--loading">' + esc(t('card.weatherLoading')) + '</div></div>' +

      '<div class="vd__section"><h3>' + esc(t('card.info')) + '</h3><div class="info-grid">' +
      infoItem(t('card.rules'), v.rules) +
      infoItem(t('card.season'), v.season) +
      infoItem(t('card.price'), v.price) +
      infoItem(t('card.species'), (v.species || []).join(', ')) +
      '</div></div>' +

      ((v.facilities && v.facilities.length)
        ? '<div class="vd__section"><h3>' + esc(t('card.facilities')) + '</h3><div class="tags">' +
          v.facilities.map(function (f) { return '<span class="tag">' + esc(f) + '</span>'; }).join('') +
          '</div></div>'
        : '') +

      '<p class="vd__source">' +
      (site ? '<a href="' + esc(site) + '" target="_blank" rel="noopener">' + esc(t('card.website')) + '</a>' : '') +
      '</p>' +
      '</div>';

    els.sheetContent.innerHTML = html;
    els.sheetScroll.scrollTop = 0;
    var closeBtn = document.getElementById('vd-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
    var delBtn = document.getElementById('vd-delete');
    if (delBtn) delBtn.addEventListener('click', function () {
      if (window.confirm(t('my.deleteConfirm', { name: v.name }))) deleteUserVenue(v.id);
    });
    var propBtn = document.getElementById('vd-propose');
    if (propBtn) propBtn.addEventListener('click', function () { proposeToBase(v, propBtn); });
  }

  // Отправка своего водоёма в общую базу (Netlify Function).
  // Если API недоступен (статический хостинг) — фолбэк на GitHub issue.
  function proposeToBase(v, btn) {
    btn.disabled = true;
    btn.textContent = t('my.sending');
    var payload = {};
    Object.keys(v).forEach(function (k) { if (k.charAt(0) !== '_' && k !== 'id') payload[k] = v[k]; });
    fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (data) { return { status: r.status, data: data }; });
    }).then(function (res) {
      if (res.status === 201) {
        v._sentName = v.name;
        saveUserVenues(userVenues);
        toast(t('my.sentOk', { n: res.data.remainingToday }));
        loadCommunity();
        renderDetail(v);
      } else if (res.status === 429) {
        toast(t('my.limitReached'));
        btn.disabled = false; btn.textContent = t('my.propose');
      } else if (res.status === 409) {
        toast(t('my.duplicate'));
        v._sentName = v.name;
        saveUserVenues(userVenues);
        renderDetail(v);
      } else {
        toast(t('my.rejected'));
        btn.disabled = false; btn.textContent = t('my.propose');
      }
    }).catch(function () {
      // нет API — предлагаем через GitHub
      btn.disabled = false; btn.textContent = t('my.propose');
      toast(t('my.apiDown'));
      window.open(proposeUrl(v), '_blank', 'noopener');
    });
  }

  function infoItem(label, value, wide) {
    if (!value) return '';
    return '<div class="info-item' + (wide ? ' info-item--wide' : '') + '">' +
      '<div class="info-item__label">' + label + '</div>' +
      '<div class="info-item__value">' + esc(value) + '</div></div>';
  }

  /* ---------- Weather (Open-Meteo) ---------- */
  var weatherCache = {};

  function loadWeather(v) {
    var box = document.getElementById('weather-box');
    if (!box) return;
    var key = v.id;
    var cached = weatherCache[key];
    if (cached && Date.now() - cached.t < 30 * 60 * 1000) {
      renderWeather(box, cached.data);
      return;
    }
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + v.lat + '&longitude=' + v.lng +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,precipitation,cloud_cover' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=auto&forecast_days=4&wind_speed_unit=ms';
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        weatherCache[key] = { t: Date.now(), data: data };
        // Пользователь мог уже открыть другой водоём
        if (state.selectedId !== v.id) return;
        var b = document.getElementById('weather-box');
        if (b) renderWeather(b, data);
      })
      .catch(function () {
        if (state.selectedId !== v.id) return;
        var b = document.getElementById('weather-box');
        if (b) { b.className = 'weather--error'; b.textContent = t('card.weatherError'); }
      });
  }

  function windDir(deg) {
    if (deg == null || !isFinite(deg)) return '—';
    var dirs = t('wind.dirs').split(',');
    return dirs[Math.round(deg / 45) % 8];
  }
  // Open-Meteo может вернуть null в отдельных полях
  function num(x, fmt) { return (x == null || !isFinite(x)) ? '—' : fmt(x); }

  function biteScore(cur) {
    // Простая эвристика, понятная рыболову: давление + ветер + осадки
    var score = 3;
    var p = cur.pressure_msl;
    if (p != null && p >= 1008 && p <= 1022) score++;
    if (p != null && (p < 1000 || p > 1030)) score--;
    var w = cur.wind_speed_10m;
    if (w != null && w >= 1 && w <= 5) score++;
    if (w > 9) score -= 2; else if (w > 7) score--;
    if (cur.precipitation > 4) score--;
    if (cur.cloud_cover != null && cur.cloud_cover >= 30 && cur.cloud_cover <= 90) score++;
    score = Math.max(1, Math.min(5, score));
    return { score: score, label: t('bite.' + score) };
  }

  function renderWeather(box, data) {
    try { renderWeatherInner(box, data); }
    catch (e) { box.className = 'weather--error'; box.textContent = t('card.weatherNA'); }
  }

  function renderWeatherInner(box, data) {
    var cur = data.current, daily = data.daily;
    if (!cur || !daily || !daily.time) { box.className = 'weather--error'; box.textContent = t('card.weatherNA'); return; }
    var ico = wmo(cur.weather_code);
    var bite = biteScore(cur);
    var stars = '★★★★★'.slice(0, bite.score) + '☆☆☆☆☆'.slice(0, 5 - bite.score);

    var days = '';
    var dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    for (var i = 1; i < Math.min(4, daily.time.length); i++) {
      var d = new Date(daily.time[i] + 'T12:00:00');
      var di = wmo(daily.weather_code[i]);
      days += '<div class="weather__day"><div>' + dayNames[d.getDay()] + '</div>' +
        '<div class="d-ico">' + di[0] + '</div>' +
        '<div class="d-max">' + num(daily.temperature_2m_max[i], Math.round) + '°</div>' +
        '<div class="d-min">' + num(daily.temperature_2m_min[i], Math.round) + '°</div></div>';
    }

    box.className = 'weather';
    box.innerHTML =
      '<div class="weather__now">' +
      '<div class="weather__icon">' + ico[0] + '</div>' +
      '<div><div class="weather__temp">' + num(cur.temperature_2m, Math.round) + '°C</div>' +
      '<div class="weather__meta">' + ico[1] + ' · ощущается ' + num(cur.apparent_temperature, Math.round) + '°</div></div>' +
      '</div>' +
      '<div class="weather__stats">' +
      '<div class="weather__stat"><b>' + num(cur.wind_speed_10m, function (x) { return x.toFixed(1); }) + ' м/с</b><span>ветер, ' + windDir(cur.wind_direction_10m) + '</span></div>' +
      '<div class="weather__stat"><b>' + num(cur.pressure_msl, Math.round) + '</b><span>гПа</span></div>' +
      '<div class="weather__stat"><b>' + num(cur.cloud_cover, Math.round) + '%</b><span>облачность</span></div>' +
      '</div>' +
      '<div class="weather__days">' + days + '</div>' +
      '<div class="weather__bite">🎯 ' + esc(t('card.bite')) + ' <b>' + stars + '</b> — ' + esc(bite.label) + '</div>';
  }

  /* ---------- Bottom sheet mechanics ---------- */
  function openSheet() {
    els.sheet.hidden = false;
    // force reflow so transition plays
    void els.sheetPanel.offsetHeight;
    els.sheet.classList.add('is-open');
  }
  function closeSheet() {
    els.sheet.classList.remove('is-open', 'is-full');
    var prev = state.selectedId;
    if (prev && markers[prev]) {
      var pv = VENUES.find(function (x) { return x.id === prev; });
      if (pv) markers[prev].setIcon(pinIcon(pv, false));
    }
    state.selectedId = null;
    setTimeout(function () { if (!state.selectedId) els.sheet.hidden = true; }, 380);
  }
  els.sheetBackdrop.addEventListener('click', function () {
    els.sheet.classList.remove('is-full');
  });

  // Drag: grip toggles half <-> full <-> closed
  (function () {
    var startY = 0, curY = 0, dragging = false;
    var grip = els.sheetGrip;
    grip.addEventListener('touchstart', function (e) {
      dragging = true; startY = curY = e.touches[0].clientY;
      els.sheet.classList.add('is-dragging');
    }, { passive: true });
    grip.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      curY = e.touches[0].clientY;
      var dy = curY - startY;
      if (dy > 0) els.sheetPanel.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    function endDrag(apply) {
      if (!dragging) return;
      dragging = false;
      els.sheet.classList.remove('is-dragging');
      els.sheetPanel.style.transform = '';
      if (!apply) return;
      var dy = curY - startY;
      if (dy > 90) {
        if (els.sheet.classList.contains('is-full')) els.sheet.classList.remove('is-full');
        else closeSheet();
      } else if (dy < -60) {
        els.sheet.classList.add('is-full');
      }
    }
    grip.addEventListener('touchend', function () { endDrag(true); });
    // Звонок/шторка уведомлений обрывают жест — не оставляем шторку зависшей
    grip.addEventListener('touchcancel', function () { endDrag(false); });
    grip.addEventListener('click', function () {
      els.sheet.classList.toggle('is-full');
    });
  })();

  /* ---------- View toggle ---------- */
  function toggleView(toList) {
    state.listMode = (typeof toList === 'boolean') ? toList : !state.listMode;
    els.listView.hidden = !state.listMode;
    els.iconList.hidden = state.listMode;
    els.iconMap.hidden = !state.listMode;
    els.resultsPill.classList.toggle('is-hidden', state.listMode);
    if (state.listMode) renderList();
    else map.invalidateSize();
  }
  els.viewToggle.addEventListener('click', function () { toggleView(); });

  /* ---------- Search ---------- */
  var searchTimer;
  els.search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    var val = els.search.value;
    els.searchClear.hidden = !val;
    searchTimer = setTimeout(function () {
      state.query = val.trim();
      refresh();
      if (state.query) {
        var list = filtered();
        if (list.length && !state.listMode) {
          var bounds = L.latLngBounds(list.map(function (v) { return [v.lat, v.lng]; }));
          map.fitBounds(bounds.pad(0.25), { maxZoom: 10 });
        }
      }
    }, 250);
  });
  els.searchClear.addEventListener('click', function () {
    els.search.value = ''; els.searchClear.hidden = true;
    state.query = ''; refresh();
  });

  /* ---------- Filter chips ---------- */
  els.chips.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var f = chip.getAttribute('data-filter');
    if (f === 'cr' || f === 'year') {
      state.filters[f] = !state.filters[f];
      chip.setAttribute('aria-pressed', state.filters[f]);
      refresh();
    }
  });

  els.chipCountry.addEventListener('click', function () {
    els.chipCountry.setAttribute('aria-expanded', 'true');
    openModal(els.countryModal);
  });
  els.chipNear.addEventListener('click', locateUser);

  /* ---------- Country modal ---------- */
  function buildCountryGrid() {
    var counts = {};
    VENUES.forEach(function (v) { counts[v.country] = (counts[v.country] || 0) + 1; });
    var codes = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var html = '<button class="country-btn' + (!state.filters.country ? ' is-active' : '') + '" data-cc="">🌍 <span class="name">' + esc(t('country.all')) + '</span><span class="cnt">' + VENUES.length + '</span></button>';
    codes.forEach(function (cc) {
      html += '<button class="country-btn' + (state.filters.country === cc ? ' is-active' : '') + '" data-cc="' + esc(cc) + '">' +
        flagEmoji(cc) + ' <span class="name">' + esc(COUNTRY_NAMES[cc] || cc.toUpperCase()) + '</span>' +
        '<span class="cnt">' + counts[cc] + '</span></button>';
    });
    els.countryGrid.innerHTML = html;
  }
  els.countryGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('.country-btn');
    if (!btn) return;
    var cc = btn.getAttribute('data-cc') || null;
    state.filters.country = cc;
    els.chipCountry.classList.toggle('is-active', !!cc);
    els.chipCountryLabel.textContent = cc ? '· ' + flagEmoji(cc) : '';
    closeModal(els.countryModal);
    refresh();
    if (cc) {
      var list = filtered();
      if (list.length) {
        map.fitBounds(L.latLngBounds(list.map(function (v) { return [v.lat, v.lng]; })).pad(0.2));
      }
    }
  });

  /* ---------- Modals ---------- */
  function openModal(m) {
    buildCountryGrid();
    m.hidden = false;
    var panel = m.querySelector('.modal__panel');
    if (panel) panel.focus({ preventScroll: true });
  }
  function closeModal(m) {
    m.hidden = true;
    if (m === els.countryModal) {
      els.chipCountry.setAttribute('aria-expanded', 'false');
      els.chipCountry.focus({ preventScroll: true });
    }
  }
  [els.countryModal, els.aboutModal].forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) closeModal(m);
    });
  });
  els.brandBtn.addEventListener('click', function () { els.aboutModal.hidden = false; });

  /* ---------- Geolocation ---------- */
  function locateUser() {
    if (!navigator.geolocation) { toast(t('geo.unsupported')); return; }
    toast(t('geo.locating'));
    navigator.geolocation.getCurrentPosition(function (pos) {
      state.userPos = [pos.coords.latitude, pos.coords.longitude];
      els.fabLocate.classList.add('is-active');
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker(state.userPos, {
        radius: 8, color: '#fff', weight: 2.5, fillColor: '#2a7fff', fillOpacity: 1
      }).addTo(map);
      map.flyTo(state.userPos, 8, { duration: 1 });
      var nearest = withDistance(filtered().slice())[0];
      if (nearest && nearest._dist != null) {
        toast(t('geo.nearest', { name: nearest.name, km: Math.round(nearest._dist) }));
      }
      renderList();
    }, function () {
      toast(t('geo.failed'));
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }
  els.fabLocate.addEventListener('click', locateUser);

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 3200);
  }

  /* ---------- Versioning / «Что нового» ---------- */
  var CHANGELOG = window.CHANGELOG || [];
  var APP_VERSION = CHANGELOG.length ? CHANGELOG[0].version : '';
  var SEEN_KEY = 'troutmap_seen_version';

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  setText('splash-version', APP_VERSION ? 'v' + APP_VERSION : '');
  setText('about-version', APP_VERSION ? 'v' + APP_VERSION : '');
  setText('about-version-full', APP_VERSION ? t('about.version') + ' ' + APP_VERSION : '');

  var whatsnewModal = $('whatsnew-modal');

  function renderWhatsnew() {
    var list = document.getElementById('whatsnew-list');
    if (!list) return;
    list.innerHTML = CHANGELOG.map(function (rel, i) {
      return '<section class="wn' + (i === 0 ? ' wn--latest' : '') + '">' +
        '<div class="wn__head"><span class="wn__ver">v' + esc(rel.version) + '</span>' +
        (i === 0 ? '<span class="wn__badge">' + esc(t('whatsnew.current')) + '</span>' : '') +
        '<span class="wn__date">' + esc(rel.date) + '</span></div>' +
        '<h3 class="wn__title">' + esc(rel.title) + '</h3>' +
        '<ul class="wn__items">' + rel.items.map(function (it) {
          return '<li>' + esc(it) + '</li>';
        }).join('') + '</ul></section>';
    }).join('');
  }

  function openWhatsnew() {
    renderWhatsnew();
    whatsnewModal.hidden = false;
    var panel = whatsnewModal.querySelector('.modal__panel');
    if (panel) panel.focus({ preventScroll: true });
    try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch (e) { /* приватный режим */ }
  }

  var whatsnewBtn = document.getElementById('btn-whatsnew');
  if (whatsnewBtn) whatsnewBtn.addEventListener('click', function () {
    closeModal(els.aboutModal);
    openWhatsnew();
  });
  whatsnewModal.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) whatsnewModal.hidden = true;
  });

  function stripEmoji(s) {
    // частицы плохо собирают эмодзи — оставляем чистый текст
    return s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/^\s+/, '');
  }

  function playUpdateAnimation(opts) {
    opts = opts || {};
    if (!window.UpdateFX) { openWhatsnew(); return; }
    var rel = CHANGELOG[0];
    var narrow = window.innerWidth < 600;
    var lines = [
      { text: t('whatsnew.title').replace(/[^\wА-Яа-яЁёÀ-ž ]/g, '').trim().toUpperCase() || 'UPDATE', size: narrow ? 13 : 16, color: '#7a9c97' },
      { text: 'v' + rel.version, size: narrow ? 64 : 92, color: '#7fe0d4' },
      { text: rel.title, size: narrow ? 20 : 28, color: '#e8f5f2' }
    ];
    rel.items.slice(0, 3).forEach(function (it) {
      lines.push({ text: stripEmoji(it), size: narrow ? 12.5 : 16, color: '#a9c4bf' });
    });
    window.UpdateFX.play({
      lines: lines,
      hold: 5000,
      onDone: function (played) {
        if (!played && !opts.replay) openWhatsnew(); // фолбэк только для авто-показа
      }
    });
    try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch (e) {}
  }
  // Клик по версии на сайте — повторить анимацию «прилетел-улетел»
  function bindVersionReplay(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('is-clickable');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    var run = function () {
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !window.UpdateFX) { closeModal(els.aboutModal); openWhatsnew(); return; }
      closeModal(els.aboutModal);
      whatsnewModal.hidden = true;
      playUpdateAnimation({ replay: true });
    };
    el.addEventListener('click', run);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); } });
  }
  bindVersionReplay('splash-version');
  bindVersionReplay('about-version');

  function maybeShowWhatsnew() {
    if (!APP_VERSION) return;
    var seen = null;
    try { seen = localStorage.getItem(SEEN_KEY); } catch (e) { return; }
    if (seen === APP_VERSION) return;      // уже видел эту версию
    if (seen === null) {                    // первый визит — не пугаем окном
      try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch (e) {}
      return;
    }
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !window.UpdateFX) { openWhatsnew(); return; }
    playUpdateAnimation();
  }

  /* ---------- Добавление своих водоёмов ---------- */
  var BIOME_BY_CC = {
    it: 'laghetto', fi: 'nordic', se: 'nordic', no: 'nordic', dk: 'nordic',
    ee: 'nordic', lv: 'nordic', lt: 'nordic', ch: 'alpine', at: 'alpine',
    si: 'alpine', bg: 'alpine', ro: 'forest', hr: 'meadow',
    de: 'forest', cz: 'forest', sk: 'forest', pl: 'forest', hu: 'forest'
  };

  var addModal = $('add-modal');
  var addForm = $('add-form');
  var afError = $('af-error');
  var picking = false;

  function fillCountrySelect() {
    var sel = $('af-country');
    var prev = sel.value;
    var codes = Object.keys(COUNTRY_NAMES).sort(function (a, b) {
      return COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b], 'ru');
    });
    sel.innerHTML = codes.map(function (cc) {
      return '<option value="' + cc + '">' + flagEmoji(cc) + ' ' + esc(COUNTRY_NAMES[cc]) + '</option>';
    }).join('');
    sel.value = prev || 'cz';
  }
  fillCountrySelect();

  function openAddModal() {
    addModal.hidden = false;
    afError.hidden = true;
    var panel = addModal.querySelector('.modal__panel');
    if (panel) panel.focus({ preventScroll: true });
  }
  $('fab-add').addEventListener('click', openAddModal);
  addModal.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) addModal.hidden = true;
  });

  // Выбор точки на карте
  $('af-pick').addEventListener('click', function () {
    addModal.hidden = true;
    picking = true;
    if (state.listMode) toggleView(false);
    document.getElementById('map').classList.add('is-picking');
    toast(t('add.pickToast'));
  });
  map.on('click', function (e) {
    if (!picking) return;
    picking = false;
    document.getElementById('map').classList.remove('is-picking');
    $('af-lat').value = e.latlng.lat.toFixed(5);
    $('af-lng').value = e.latlng.lng.toFixed(5);
    openAddModal();
  });

  function showFormError(msg) {
    afError.textContent = msg;
    afError.hidden = false;
  }

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('af-name').value.trim();
    var lat = parseFloat(String($('af-lat').value).replace(',', '.'));
    var lng = parseFloat(String($('af-lng').value).replace(',', '.'));
    var website = $('af-website').value.trim();

    if (!name) return showFormError(t('add.errName'));
    if (!isFinite(lat) || !isFinite(lng)) return showFormError(t('add.errCoords'));
    if (lat < 34 || lat > 72 || lng < -11 || lng > 42) return showFormError(t('add.errEurope'));
    if (website && !/^https?:\/\//i.test(website)) return showFormError(t('add.errUrl'));

    var cc = $('af-country').value;
    var crRaw = $('af-cr').value;
    var venue = {
      id: 'u' + Date.now().toString(36),
      name: name,
      country: cc,
      location: $('af-location').value.trim(),
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
      precision: 'approx',
      biome: BIOME_BY_CC[cc] || 'meadow',
      description: $('af-desc').value.trim(),
      species: [],
      catchAndRelease: crRaw === 'true' ? true : (crRaw === 'partial' ? 'partial' : false),
      rules: null,
      price: $('af-price').value.trim() || null,
      season: $('af-season').value.trim() || null,
      website: website || null,
      facilities: [],
      _user: true
    };

    userVenues.push(venue);
    if (!saveUserVenues(userVenues)) {
      userVenues.pop();
      return showFormError(t('add.errStore'));
    }
    rebuildVenues();
    addForm.reset();
    $('af-country').value = 'cz';
    addModal.hidden = true;
    refresh();
    toast(t('my.added'));
    selectVenue(venue.id, false);
  });

  function deleteUserVenue(id) {
    userVenues = userVenues.filter(function (v) { return v.id !== id; });
    saveUserVenues(userVenues);
    rebuildVenues();
    closeSheet();
    refresh();
    toast(t('my.deleted'));
  }

  function proposeUrl(v) {
    var clean = {};
    Object.keys(v).forEach(function (k) { if (k.charAt(0) !== '_') clean[k] = v[k]; });
    var body = 'Предлагаю добавить водоём в базу TroutMap Europe:\n\n```json\n' +
      JSON.stringify(clean, null, 2) + '\n```\n\nИсточник/подтверждение: ' + (v.website || '(добавьте ссылку)');
    return 'https://github.com/Ex13m/Trout-Pond-Map/issues/new?title=' +
      encodeURIComponent('Новый водоём: ' + v.name) + '&body=' + encodeURIComponent(body);
  }

  /* ---------- Языки ---------- */
  function renderLangRow(id) {
    var box = document.getElementById(id);
    if (!box || !window.I18N) return;
    box.innerHTML = window.I18N.LANGS.map(function (lang) {
      var m = window.I18N.LANG_META[lang];
      return '<button class="lang-btn' + (lang === window.I18N.get() ? ' is-active' : '') +
        '" data-lang="' + lang + '" lang="' + lang + '">' + m.flag + ' ' + esc(m.name) + '</button>';
    }).join('');
  }
  function renderLangRows() { renderLangRow('splash-lang'); renderLangRow('about-lang'); }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-lang]');
    if (btn && window.I18N) window.I18N.setLang(btn.getAttribute('data-lang'));
  });

  // Точечная перерисовка динамики при смене языка
  window.onLangChange = function () {
    applyI18n(document);
    renderLangRows();
    setText('about-version-full', APP_VERSION ? t('about.version') + ' ' + APP_VERSION : '');
    els.chipCountry.setAttribute('aria-label', t('chip.country'));
    refresh();
    if (state.selectedId) { var sv = VENUES.find(function (x) { return x.id === state.selectedId; }); if (sv) { renderDetail(sv); loadWeather(sv); } }
    if (window.Assistant) window.Assistant.rerender();
    fillCountrySelect();
  };

  applyI18n(document);
  renderLangRows();

  /* ---------- Помощник ---------- */
  if (window.Assistant) {
    window.Assistant.setVenues(VENUES);
    window.Assistant.onOpenVenue = function (id) { selectVenue(id, false); };
    var fabAsst = $('fab-assistant');
    if (fabAsst) fabAsst.addEventListener('click', function () { window.Assistant.open(); });
    var asstModal = $('assistant-modal');
  }

  /* ---------- Splash ---------- */
  els.splashCount.textContent = VENUES.length;
  els.splashEnter.addEventListener('click', function () {
    els.splash.classList.add('is-hidden');
    setTimeout(function () { els.splash.remove(); }, 600);
    map.invalidateSize();
    maybeShowWhatsnew();
  });

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var wn = document.getElementById('whatsnew-modal');
      var am = document.getElementById('add-modal');
      var lm = document.getElementById('layers-modal');
      var asm = document.getElementById('assistant-modal');
      if (wn && !wn.hidden) wn.hidden = true;
      else if (am && !am.hidden) am.hidden = true;
      else if (lm && !lm.hidden) lm.hidden = true;
      else if (asm && !asm.hidden) asm.hidden = true;
      else if (!els.countryModal.hidden) closeModal(els.countryModal);
      else if (!els.aboutModal.hidden) closeModal(els.aboutModal);
      else if (!els.sheet.hidden) closeSheet();
    }
  });

  /* ---------- Init ---------- */
  refresh();
  loadCommunity();
})();
