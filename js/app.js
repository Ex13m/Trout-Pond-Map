/* ============================================================
   TroutMap Europe — app logic
   ============================================================ */
(function () {
  'use strict';

  var VENUES = window.VENUES || [];

  var COUNTRY_NAMES = {
    it: 'Италия', fr: 'Франция', es: 'Испания', pt: 'Португалия',
    de: 'Германия', at: 'Австрия', ch: 'Швейцария', si: 'Словения',
    cz: 'Чехия', sk: 'Словакия', hu: 'Венгрия', pl: 'Польша',
    lt: 'Литва', lv: 'Латвия', ee: 'Эстония', fi: 'Финляндия',
    se: 'Швеция', no: 'Норвегия', dk: 'Дания', be: 'Бельгия',
    nl: 'Нидерланды', gb: 'Великобритания', ie: 'Ирландия', hr: 'Хорватия'
  };

  function flagEmoji(cc) {
    if (!cc || cc.length !== 2) return '🏳️';
    var A = 0x1F1E6;
    var up = cc.toUpperCase();
    return String.fromCodePoint(A + up.charCodeAt(0) - 65, A + up.charCodeAt(1) - 65);
  }

  // Атмосферные фото сгенерированы через Higgsfield AI (см. README)
  var IMG_CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_2vVGC2DWe2MM7XDhdxjTNwWTi4E/';
  var BIOME_IMG = {
    alpine: IMG_CDN + 'hf_20260722_150959_7865e3a4-3b15-4d1f-8090-f8cf13c2f974_min.webp',
    laghetto: IMG_CDN + 'hf_20260722_151001_5d18cf93-a27b-4f5c-bc04-a67403acabc6_min.webp',
    forest: IMG_CDN + 'hf_20260722_151003_3cdf9f88-5070-4242-9320-31f35b13daff_min.webp',
    meadow: IMG_CDN + 'hf_20260722_151005_0f9a8d99-8811-44f5-add0-0a1083324df9_min.webp',
    nordic: IMG_CDN + 'hf_20260722_151007_e5cc4c5c-1d19-4cbe-a9af-b14877af0604_min.webp',
    release: IMG_CDN + 'hf_20260722_151008_22db8205-27e8-41c8-b3ac-f8195c6f4d94_min.webp'
  };
  function venueImage(v) {
    return BIOME_IMG[v.biome] || BIOME_IMG.forest;
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

  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  L.tileLayer('https://{s}.basemaps.cartocdn.com/' + (dark ? 'dark_all' : 'rastertiles/voyager') + '/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  }).addTo(map);

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
    var cls = 'pin' + (v.catchAndRelease === 'partial' ? ' pin--partial' : '') + (selected ? ' pin--selected' : '');
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
      m.on('click', function () { selectVenue(v.id, false); });
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
    var n = filtered().length;
    els.resultsPill.textContent = n === 0 ? 'Ничего не найдено'
      : 'Водоёмов: ' + n + (state.filters.country ? ' · ' + (COUNTRY_NAMES[state.filters.country] || '') : '');
  }

  /* ---------- List view ---------- */
  function crBadge(v) {
    if (v.catchAndRelease === true) return '<span class="badge badge--cr">✓ Поймал-отпустил</span>';
    if (v.catchAndRelease === 'partial') return '<span class="badge badge--partial">◐ C&amp;R частично</span>';
    return '<span class="badge">Изъятие разрешено</span>';
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
        '<div class="empty"><div class="empty__icon">🎣</div><p><b>Ничего не нашлось</b><br>Попробуйте снять фильтры или изменить запрос</p></div>';
      return;
    }
    els.listContainer.innerHTML = list.map(function (v) {
      return '<button class="vcard" data-id="' + v.id + '">' +
        '<div class="vcard__photo ph--' + (v.biome || 'forest') + '"><img loading="lazy" src="' + venueImage(v) + '" alt="" onerror="this.remove()">' +
        '<span class="vcard__flag">' + flagEmoji(v.country) + ' ' + esc(COUNTRY_NAMES[v.country] || v.country) + '</span>' +
        (v._dist != null ? '<span class="vcard__dist">' + Math.round(v._dist) + ' км</span>' : '') +
        '</div>' +
        '<div class="vcard__body">' +
        '<div class="vcard__name">' + esc(v.name) + '</div>' +
        '<div class="vcard__loc">📍 ' + esc(v.location) + '</div>' +
        '<div class="vcard__badges">' + crBadge(v) +
        (v.price ? '<span class="badge badge--price">' + esc(v.price) + '</span>' : '') +
        '</div></div></button>';
    }).join('');
  }

  els.listContainer.addEventListener('click', function (e) {
    var card = e.target.closest('.vcard');
    if (card) selectVenue(card.getAttribute('data-id'), true);
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
    var gmaps = 'https://www.google.com/maps/dir/?api=1&destination=' + v.lat + ',' + v.lng;
    var html =
      '<div class="vd">' +
      '<div class="vd__photo ph--' + (v.biome || 'forest') + '"><img src="' + venueImage(v) + '" alt="' + esc(v.name) + '" onerror="this.remove()">' +
      '<span class="vd__photo-note">фото иллюстративное</span>' +
      '<button class="vd__close" id="vd-close" aria-label="Закрыть">✕</button></div>' +

      '<div class="vd__head">' +
      '<h2 class="vd__name">' + esc(v.name) + '</h2>' +
      '<div class="vd__loc">' + flagEmoji(v.country) + ' ' + esc(cn) + ' · 📍 ' + esc(v.location) + '</div>' +
      '</div>' +

      '<div class="vd__badges">' + crBadge(v) +
      (v.price ? '<span class="badge badge--price">💶 ' + esc(v.price) + '</span>' : '') +
      (v.season ? '<span class="badge">📅 ' + esc(v.season) + '</span>' : '') +
      '</div>' +

      (v.description ? '<p class="vd__desc">' + esc(v.description) + '</p>' : '') +

      '<div class="vd__actions">' +
      '<a class="btn btn--route" href="' + gmaps + '" target="_blank" rel="noopener">🧭 Маршрут</a>' +
      (v.website ? '<a class="btn btn--ghost" href="' + esc(v.website) + '" target="_blank" rel="noopener">🌐 Сайт</a>' : '') +
      '</div>' +

      '<div class="vd__section"><h3>Погода на водоёме</h3><div id="weather-box" class="weather--loading">Загружаю прогноз…</div></div>' +

      '<div class="vd__section"><h3>Информация</h3><div class="info-grid">' +
      infoItem('Правила', v.rules) +
      infoItem('Сезон', v.season) +
      infoItem('Цена', v.price) +
      infoItem('Кто плавает', (v.species || []).join(', ')) +
      '</div></div>' +

      ((v.facilities && v.facilities.length)
        ? '<div class="vd__section"><h3>Инфраструктура</h3><div class="tags">' +
          v.facilities.map(function (f) { return '<span class="tag">' + esc(f) + '</span>'; }).join('') +
          '</div></div>'
        : '') +

      '<p class="vd__source">Данные ориентировочные, собраны из открытых источников' +
      (v.website ? ' — актуальность проверяйте на <a href="' + esc(v.website) + '" target="_blank" rel="noopener">сайте водоёма</a>.' : '.') +
      (v.precision === 'approx' ? ' Координаты приблизительные.' : '') + '</p>' +
      '</div>';

    els.sheetContent.innerHTML = html;
    els.sheetScroll.scrollTop = 0;
    var closeBtn = document.getElementById('vd-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
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
        // Sheet may have moved to another venue while loading
        if (state.selectedId !== v.id) return;
        var b = document.getElementById('weather-box');
        if (b) renderWeather(b, data);
      })
      .catch(function () {
        var b = document.getElementById('weather-box');
        if (b) { b.className = 'weather--error'; b.textContent = 'Не удалось загрузить погоду. Проверьте соединение.'; }
      });
  }

  function windDir(deg) {
    var dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    return dirs[Math.round(deg / 45) % 8];
  }

  function biteScore(cur) {
    // Simple heuristic anglers appreciate: pressure + wind + precipitation
    var score = 3;
    var p = cur.pressure_msl;
    if (p >= 1008 && p <= 1022) score++;
    if (p < 1000 || p > 1030) score--;
    var w = cur.wind_speed_10m;
    if (w >= 1 && w <= 5) score++;
    if (w > 9) score -= 2; else if (w > 7) score--;
    if (cur.precipitation > 4) score--;
    if (cur.cloud_cover >= 30 && cur.cloud_cover <= 90) score++;
    score = Math.max(1, Math.min(5, score));
    var labels = { 1: 'слабый клёв', 2: 'ниже среднего', 3: 'умеренный клёв', 4: 'хороший клёв', 5: 'отличный клёв' };
    return { score: score, label: labels[score] };
  }

  function renderWeather(box, data) {
    var cur = data.current, daily = data.daily;
    if (!cur || !daily) { box.className = 'weather--error'; box.textContent = 'Прогноз недоступен.'; return; }
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
        '<div class="d-max">' + Math.round(daily.temperature_2m_max[i]) + '°</div>' +
        '<div class="d-min">' + Math.round(daily.temperature_2m_min[i]) + '°</div></div>';
    }

    box.className = 'weather';
    box.innerHTML =
      '<div class="weather__now">' +
      '<div class="weather__icon">' + ico[0] + '</div>' +
      '<div><div class="weather__temp">' + Math.round(cur.temperature_2m) + '°C</div>' +
      '<div class="weather__meta">' + ico[1] + ' · ощущается ' + Math.round(cur.apparent_temperature) + '°</div></div>' +
      '</div>' +
      '<div class="weather__stats">' +
      '<div class="weather__stat"><b>' + cur.wind_speed_10m.toFixed(1) + ' м/с</b><span>ветер, ' + windDir(cur.wind_direction_10m) + '</span></div>' +
      '<div class="weather__stat"><b>' + Math.round(cur.pressure_msl) + '</b><span>гПа</span></div>' +
      '<div class="weather__stat"><b>' + Math.round(cur.cloud_cover) + '%</b><span>облачность</span></div>' +
      '</div>' +
      '<div class="weather__days">' + days + '</div>' +
      '<div class="weather__bite">🎯 Прогноз клёва: <b>' + stars + '</b> — ' + bite.label + '</div>';
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
    grip.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      els.sheet.classList.remove('is-dragging');
      els.sheetPanel.style.transform = '';
      var dy = curY - startY;
      if (dy > 90) {
        if (els.sheet.classList.contains('is-full')) els.sheet.classList.remove('is-full');
        else closeSheet();
      } else if (dy < -60) {
        els.sheet.classList.add('is-full');
      }
    });
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

  els.chipCountry.addEventListener('click', function () { openModal(els.countryModal); });
  els.chipNear.addEventListener('click', locateUser);

  /* ---------- Country modal ---------- */
  function buildCountryGrid() {
    var counts = {};
    VENUES.forEach(function (v) { counts[v.country] = (counts[v.country] || 0) + 1; });
    var codes = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var html = '<button class="country-btn' + (!state.filters.country ? ' is-active' : '') + '" data-cc="">🌍 Все страны<span class="cnt">' + VENUES.length + '</span></button>';
    codes.forEach(function (cc) {
      html += '<button class="country-btn' + (state.filters.country === cc ? ' is-active' : '') + '" data-cc="' + cc + '">' +
        flagEmoji(cc) + ' ' + (COUNTRY_NAMES[cc] || cc.toUpperCase()) +
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
  function openModal(m) { buildCountryGrid(); m.hidden = false; }
  function closeModal(m) { m.hidden = true; }
  [els.countryModal, els.aboutModal].forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) closeModal(m);
    });
  });
  els.brandBtn.addEventListener('click', function () { els.aboutModal.hidden = false; });

  /* ---------- Geolocation ---------- */
  function locateUser() {
    if (!navigator.geolocation) { toast('Геолокация не поддерживается'); return; }
    toast('Определяю местоположение…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      state.userPos = [pos.coords.latitude, pos.coords.longitude];
      els.fabLocate.classList.add('is-active');
      els.chipNear.setAttribute('aria-pressed', 'true');
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker(state.userPos, {
        radius: 8, color: '#fff', weight: 2.5, fillColor: '#2a7fff', fillOpacity: 1
      }).addTo(map);
      map.flyTo(state.userPos, 8, { duration: 1 });
      var nearest = withDistance(filtered().slice())[0];
      if (nearest && nearest._dist != null) {
        toast('Ближайший: ' + nearest.name + ' — ' + Math.round(nearest._dist) + ' км');
      }
      renderList();
    }, function () {
      toast('Не удалось определить местоположение');
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

  /* ---------- Splash ---------- */
  els.splashCount.textContent = VENUES.length;
  els.splashEnter.addEventListener('click', function () {
    els.splash.classList.add('is-hidden');
    setTimeout(function () { els.splash.remove(); }, 600);
    map.invalidateSize();
  });

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!els.countryModal.hidden) closeModal(els.countryModal);
      else if (!els.aboutModal.hidden) closeModal(els.aboutModal);
      else if (!els.sheet.hidden) closeSheet();
    }
  });

  /* ---------- Init ---------- */
  refresh();
})();
