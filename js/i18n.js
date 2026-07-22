/* TroutMap Europe — реестр языков (i18n registry).
   ПРАВИЛО: каждый ключ ОБЯЗАН иметь перевод на все языки из LANGS.
   При добавлении новой функции добавляйте её строки сюда сразу на всех
   языках. Функция validateRegistry() при загрузке проверяет полноту и
   ругается в консоль, если где-то пропущен перевод — так ничего не теряется. */
(function () {
  'use strict';

  var LANGS = ['ru', 'en', 'cs'];
  var LANG_META = {
    ru: { flag: '🇷🇺', name: 'Русский' },
    en: { flag: '🇬🇧', name: 'English' },
    cs: { flag: '🇨🇿', name: 'Čeština' }
  };

  // ---- Реестр строк. Ключ → { ru, en, cs } ----
  var S = {
    // Сплэш
    'splash.tagline': {
      ru: 'Форелевые водоёмы Европы для ловли в стиле trout area · поймал — отпустил',
      en: 'Europe’s trout-area waters for ultralight catch-and-release fishing',
      cs: 'Pstruhové revíry Evropy pro trout area — chyť a pusť'
    },
    'splash.enter': { ru: 'Открыть карту', en: 'Open the map', cs: 'Otevřít mapu' },
    'splash.count': { ru: 'водоёмов в базе:', en: 'waters in the database:', cs: 'revírů v databázi:' },

    // Топбар / поиск / чипы
    'search.placeholder': { ru: 'Водоём, город, страна…', en: 'Water, town, country…', cs: 'Revír, město, země…' },
    'search.clear': { ru: 'Очистить', en: 'Clear', cs: 'Vymazat' },
    'view.toggle': { ru: 'Переключить вид карта/список', en: 'Toggle map / list view', cs: 'Přepnout mapu / seznam' },
    'chip.cr': { ru: '🐟 Только C&R', en: '🐟 C&R only', cs: '🐟 Jen C&R' },
    'chip.year': { ru: '📅 Круглый год', en: '📅 Year-round', cs: '📅 Celoročně' },
    'chip.country': { ru: '🌍 Страна', en: '🌍 Country', cs: '🌍 Země' },
    'chip.near': { ru: '📍 Рядом со мной', en: '📍 Near me', cs: '📍 V okolí' },

    // Пилюля результатов
    'results.count': { ru: 'Водоёмов:', en: 'Waters:', cs: 'Revírů:' },
    'results.none': { ru: 'Ничего не найдено', en: 'Nothing found', cs: 'Nic nenalezeno' },

    // FAB
    'fab.layers': { ru: 'Слой карты', en: 'Map layer', cs: 'Vrstva mapy' },
    'fab.add': { ru: 'Добавить водоём', en: 'Add a water', cs: 'Přidat revír' },
    'fab.locate': { ru: 'Моё местоположение', en: 'My location', cs: 'Moje poloha' },
    'fab.assistant': { ru: 'Помощник', en: 'Assistant', cs: 'Asistent' },

    // Слои
    'layers.title': { ru: 'Слой карты', en: 'Map layer', cs: 'Vrstva mapy' },
    'layer.sat': { ru: '🛰 Спутник', en: '🛰 Satellite', cs: '🛰 Satelit' },
    'layer.topo': { ru: '⛰ Рельеф', en: '⛰ Terrain', cs: '⛰ Terén' },
    'layer.scheme': { ru: '🗺 Схема', en: '🗺 Map', cs: '🗺 Schéma' },

    // Страны
    'country.title': { ru: 'Страна', en: 'Country', cs: 'Země' },
    'country.all': { ru: 'Все страны', en: 'All countries', cs: 'Všechny země' },

    // Карточка водоёма
    'card.route': { ru: '🧭 Маршрут', en: '🧭 Directions', cs: '🧭 Trasa' },
    'card.website': { ru: '🌐 Сайт', en: '🌐 Website', cs: '🌐 Web' },
    'card.weather': { ru: 'Погода на водоёме', en: 'Weather at the water', cs: 'Počasí na revíru' },
    'card.weatherLoading': { ru: 'Загружаю прогноз…', en: 'Loading forecast…', cs: 'Načítám předpověď…' },
    'card.weatherError': { ru: 'Не удалось загрузить погоду. Проверьте соединение.', en: 'Couldn’t load weather. Check your connection.', cs: 'Počasí se nepodařilo načíst. Zkontrolujte připojení.' },
    'card.weatherNA': { ru: 'Прогноз недоступен.', en: 'Forecast unavailable.', cs: 'Předpověď není dostupná.' },
    'card.info': { ru: 'Информация', en: 'Details', cs: 'Informace' },
    'card.rules': { ru: 'Правила', en: 'Rules', cs: 'Pravidla' },
    'card.season': { ru: 'Сезон', en: 'Season', cs: 'Sezóna' },
    'card.price': { ru: 'Цена', en: 'Price', cs: 'Cena' },
    'card.species': { ru: 'Кто плавает', en: 'Fish species', cs: 'Druhy ryb' },
    'card.facilities': { ru: 'Инфраструктура', en: 'Facilities', cs: 'Zázemí' },
    'card.bite': { ru: 'Прогноз клёва:', en: 'Bite forecast:', cs: 'Předpověď záběru:' },
    'card.photoIllustrative': { ru: 'фото иллюстративное', en: 'illustrative photo', cs: 'ilustrační foto' },
    'card.photoWiki': { ru: 'фото: Wikimedia Commons', en: 'photo: Wikimedia Commons', cs: 'foto: Wikimedia Commons' },
    'card.close': { ru: 'Закрыть', en: 'Close', cs: 'Zavřít' },

    // C&R бейджи
    'cr.full': { ru: '✓ Поймал-отпустил', en: '✓ Catch & release', cs: '✓ Chyť a pusť' },
    'cr.partial': { ru: '◐ C&R частично', en: '◐ Partial C&R', cs: '◐ Částečně C&R' },
    'cr.none': { ru: 'Изъятие разрешено', en: 'Harvest allowed', cs: 'Ponechání povoleno' },
    'badge.mine': { ru: '⭐ Моё', en: '⭐ Mine', cs: '⭐ Moje' },
    'badge.mineFull': { ru: '⭐ Добавлено вами', en: '⭐ Added by you', cs: '⭐ Přidáno vámi' },
    'badge.community': { ru: '🌐 От сообщества', en: '🌐 Community', cs: '🌐 Od komunity' },
    'badge.communityShort': { ru: '🌐 Сообщество', en: '🌐 Community', cs: '🌐 Komunita' },

    // Свои водоёмы
    'my.propose': { ru: '📮 В общую базу', en: '📮 Submit to base', cs: '📮 Do společné báze' },
    'my.inBase': { ru: '✓ В общей базе', en: '✓ In the shared base', cs: '✓ Ve společné bázi' },
    'my.delete': { ru: '🗑 Удалить', en: '🗑 Delete', cs: '🗑 Smazat' },
    'my.deleteConfirm': { ru: 'Удалить «{name}» с этого устройства?', en: 'Delete “{name}” from this device?', cs: 'Smazat „{name}“ z tohoto zařízení?' },
    'my.deleted': { ru: 'Водоём удалён', en: 'Water removed', cs: 'Revír smazán' },
    'my.added': { ru: 'Водоём добавлен ✓', en: 'Water added ✓', cs: 'Revír přidán ✓' },
    'my.sending': { ru: 'Отправляю…', en: 'Sending…', cs: 'Odesílám…' },
    'my.sentOk': { ru: 'В общей базе ✓ Осталось сегодня: {n}', en: 'In the shared base ✓ Left today: {n}', cs: 'Ve společné bázi ✓ Dnes zbývá: {n}' },
    'my.limitReached': { ru: 'Лимит: не больше 10 добавлений в день. Попробуйте завтра.', en: 'Limit: max 10 additions per day. Try tomorrow.', cs: 'Limit: max 10 přidání denně. Zkuste zítra.' },
    'my.duplicate': { ru: 'Такой водоём уже есть в общей базе.', en: 'This water is already in the shared base.', cs: 'Tento revír už ve společné bázi je.' },
    'my.rejected': { ru: 'Не принято: проверьте название и координаты.', en: 'Rejected: check the name and coordinates.', cs: 'Zamítnuto: zkontrolujte název a souřadnice.' },
    'my.apiDown': { ru: 'API недоступен — открываю GitHub…', en: 'API unavailable — opening GitHub…', cs: 'API nedostupné — otevírám GitHub…' },

    // Форма добавления
    'add.title': { ru: '➕ Добавить водоём', en: '➕ Add a water', cs: '➕ Přidat revír' },
    'add.hint': { ru: 'Водоём сохранится на этом устройстве. Вставьте ссылку на сайт водоёма — или заполните вручную. Потом его можно предложить в общую базу.', en: 'The water is saved on this device. Paste the water’s website — or fill it in manually. You can submit it to the shared base later.', cs: 'Revír se uloží na tomto zařízení. Vložte odkaz na web revíru — nebo vyplňte ručně. Později jej lze poslat do společné báze.' },
    'add.website': { ru: 'Ссылка на сайт водоёма', en: 'Water’s website link', cs: 'Odkaz na web revíru' },
    'add.name': { ru: 'Название *', en: 'Name *', cs: 'Název *' },
    'add.namePh': { ru: 'Например: Лесное форелевое озеро', en: 'E.g. Forest trout lake', cs: 'Např. Lesní pstruhové jezero' },
    'add.country': { ru: 'Страна *', en: 'Country *', cs: 'Země *' },
    'add.mode': { ru: 'Режим ловли', en: 'Fishing mode', cs: 'Režim lovu' },
    'add.location': { ru: 'Город / регион', en: 'Town / region', cs: 'Město / region' },
    'add.locationPh': { ru: 'Ближайший город, область', en: 'Nearest town, region', cs: 'Nejbližší město, kraj' },
    'add.coords': { ru: 'Координаты *', en: 'Coordinates *', cs: 'Souřadnice *' },
    'add.latPh': { ru: 'Широта, напр. 50.08', en: 'Latitude, e.g. 50.08', cs: 'Šířka, např. 50.08' },
    'add.lngPh': { ru: 'Долгота, напр. 14.42', en: 'Longitude, e.g. 14.42', cs: 'Délka, např. 14.42' },
    'add.pick': { ru: '🎯 Указать точку на карте', en: '🎯 Pick a point on the map', cs: '🎯 Vybrat bod na mapě' },
    'add.pricePh': { ru: 'Напр.: 20 € / день', en: 'E.g. €20 / day', cs: 'Např. 20 € / den' },
    'add.seasonPh': { ru: 'Напр.: Круглый год', en: 'E.g. Year-round', cs: 'Např. Celoročně' },
    'add.descPh': { ru: 'Пара предложений о водоёме, правилах, рыбе', en: 'A couple of sentences about the water, rules, fish', cs: 'Pár vět o revíru, pravidlech, rybách' },
    'add.desc': { ru: 'Описание', en: 'Description', cs: 'Popis' },
    'add.submit': { ru: 'Сохранить водоём', en: 'Save water', cs: 'Uložit revír' },
    'add.pickToast': { ru: 'Коснитесь карты в месте водоёма', en: 'Tap the map at the water’s spot', cs: 'Klepněte na mapu v místě revíru' },
    'add.errName': { ru: 'Укажите название водоёма.', en: 'Enter the water’s name.', cs: 'Zadejte název revíru.' },
    'add.errCoords': { ru: 'Укажите координаты — числами или точкой на карте.', en: 'Set coordinates — as numbers or a point on the map.', cs: 'Zadejte souřadnice — čísly nebo bodem na mapě.' },
    'add.errEurope': { ru: 'Координаты вне Европы. Проверьте широту и долготу.', en: 'Coordinates outside Europe. Check latitude and longitude.', cs: 'Souřadnice mimo Evropu. Zkontrolujte šířku a délku.' },
    'add.errUrl': { ru: 'Ссылка должна начинаться с http:// или https://', en: 'The link must start with http:// or https://', cs: 'Odkaz musí začínat http:// nebo https://' },
    'add.errStore': { ru: 'Не удалось сохранить (хранилище недоступно).', en: 'Couldn’t save (storage unavailable).', cs: 'Nelze uložit (úložiště nedostupné).' },
    'mode.cr': { ru: 'Поймал-отпустил', en: 'Catch & release', cs: 'Chyť a pusť' },
    'mode.partial': { ru: 'C&R частично', en: 'Partial C&R', cs: 'Částečně C&R' },
    'mode.harvest': { ru: 'Изъятие разрешено', en: 'Harvest allowed', cs: 'Ponechání povoleno' },

    // О проекте
    'about.title': { ru: 'О проекте', en: 'About', cs: 'O projektu' },
    'about.p1': {
      ru: 'TroutMap Europe — независимый гид по коммерческим форелевым водоёмам Европы, где ловят в стиле trout area: ультралайт, безбородые одинарные крючки и принцип «поймал — отпустил».',
      en: 'TroutMap Europe is an independent guide to Europe’s commercial trout waters fished trout-area style: ultralight tackle, barbless single hooks and catch-and-release.',
      cs: 'TroutMap Europe je nezávislý průvodce komerčními pstruhovými revíry Evropy pro styl trout area: ultralight, bezprotihrotové jednoháčky a chyť a pusť.'
    },
    'about.p2': {
      ru: 'Данные собраны из открытых источников: сайтов водоёмов, федераций и календарей соревнований. Цены и правила ориентировочные — перед поездкой сверяйтесь с сайтом водоёма.',
      en: 'Data is gathered from open sources: venue sites, federations and competition calendars. Prices and rules are indicative — check the venue’s site before your trip.',
      cs: 'Data pocházejí z veřejných zdrojů: webů revírů, svazů a kalendářů závodů. Ceny a pravidla jsou orientační — před cestou ověřte na webu revíru.'
    },
    'about.whatsnew': { ru: '✨ Что нового в', en: '✨ What’s new in', cs: '✨ Co je nového v' },
    'about.credits': { ru: 'Погода — Open-Meteo · Карта — © OpenStreetMap, © CARTO, © Esri, © OpenTopoMap · Фото — Wikimedia Commons (CC) и AI-иллюстрации', en: 'Weather — Open-Meteo · Map — © OpenStreetMap, © CARTO, © Esri, © OpenTopoMap · Photos — Wikimedia Commons (CC) and AI illustrations', cs: 'Počasí — Open-Meteo · Mapa — © OpenStreetMap, © CARTO, © Esri, © OpenTopoMap · Fotky — Wikimedia Commons (CC) a AI ilustrace' },
    'about.version': { ru: 'версия', en: 'version', cs: 'verze' },

    // Что нового
    'whatsnew.title': { ru: '✨ Что нового', en: '✨ What’s new', cs: '✨ Co je nového' },
    'whatsnew.current': { ru: 'текущая', en: 'current', cs: 'aktuální' },
    'whatsnew.ok': { ru: 'Понятно', en: 'Got it', cs: 'Rozumím' },
    'whatsnew.replay': { ru: 'Показать анимацию версии — коснитесь номера версии', en: 'Replay version animation — tap the version number', cs: 'Přehrát animaci verze — klepněte na číslo verze' },

    // Помощник
    'assistant.title': { ru: '🎣 Помощник', en: '🎣 Assistant', cs: '🎣 Asistent' },
    'assistant.greeting': { ru: 'Привет! Я помогу разобраться с картой. Спросите или выберите тему:', en: 'Hi! I’ll help you use the map. Ask me or pick a topic:', cs: 'Ahoj! Pomůžu vám s mapou. Zeptejte se nebo zvolte téma:' },
    'assistant.placeholder': { ru: 'Ваш вопрос…', en: 'Your question…', cs: 'Váš dotaz…' },
    'assistant.send': { ru: 'Отправить', en: 'Send', cs: 'Odeslat' },
    'assistant.fallback': { ru: 'Не совсем понял. Попробуйте одну из тем ниже 👇', en: 'Not sure I got that. Try one of the topics below 👇', cs: 'Úplně jsem nerozuměl. Zkuste jedno z témat níže 👇' },
    'assistant.q.cr': { ru: 'Что такое C&R?', en: 'What is C&R?', cs: 'Co je C&R?' },
    'assistant.a.cr': { ru: 'C&R (catch & release) — «поймал-отпустил». Рыбу аккуратно отпускают. В trout area ловят на безбородые одинарные крючки без насадки. Бейдж «✓ Поймал-отпустил» — строгий C&R, «◐ частично» — есть и режим с изъятием.', en: 'C&R (catch & release) means you gently release the fish. Trout area uses barbless single hooks and no bait. The “✓ Catch & release” badge means strict C&R, “◐ Partial” means a harvest option also exists.', cs: 'C&R (chyť a pusť) — rybu šetrně pustíte. Trout area se loví na bezprotihrotové jednoháčky bez nástrahy. Odznak „✓ Chyť a pusť“ = přísné C&R, „◐ Částečně“ = existuje i režim s ponecháním.' },
    'assistant.q.find': { ru: 'Как найти водоём?', en: 'How to find a water?', cs: 'Jak najít revír?' },
    'assistant.a.find': { ru: 'Ищите через строку поиска (название, город, страна), фильтруйте по стране и C&R, или нажмите 📍 — покажу ближайшие к вам. Тапните маркер или карточку, чтобы открыть подробности и погоду.', en: 'Use the search bar (name, town, country), filter by country and C&R, or tap 📍 to see the nearest to you. Tap a marker or card to open details and weather.', cs: 'Použijte vyhledávání (název, město, země), filtrujte podle země a C&R, nebo klepněte na 📍 pro nejbližší. Klepnutím na značku či kartu otevřete detail a počasí.' },
    'assistant.q.add': { ru: 'Как добавить свой водоём?', en: 'How to add my water?', cs: 'Jak přidat svůj revír?' },
    'assistant.a.add': { ru: 'Нажмите «+» на карте. Вставьте ссылку на сайт или заполните вручную, координаты можно поставить тапом по карте. Водоём сохранится у вас; кнопкой «📮 В общую базу» его увидят все (лимит 10 в день).', en: 'Tap “+” on the map. Paste a website or fill it in manually; set coordinates by tapping the map. It’s saved for you; “📮 Submit to base” makes it visible to everyone (10/day limit).', cs: 'Klepněte na „+“ na mapě. Vložte web nebo vyplňte ručně; souřadnice lze zadat klepnutím na mapu. Uloží se vám; tlačítko „📮 Do společné báze“ jej zpřístupní všem (limit 10/den).' },
    'assistant.q.layers': { ru: 'Карта тёмная / слои', en: 'Dark map / layers', cs: 'Tmavá mapa / vrstvy' },
    'assistant.a.layers': { ru: 'Нажмите кнопку слоёв на карте и выберите Спутник, Рельеф или Схему. По умолчанию — спутник. Выбор запоминается.', en: 'Tap the layers button on the map and pick Satellite, Terrain or Map. Satellite is the default. Your choice is remembered.', cs: 'Klepněte na tlačítko vrstev a zvolte Satelit, Terén nebo Schéma. Výchozí je satelit. Volba se zapamatuje.' },
    'assistant.q.weather': { ru: 'Про погоду и клёв', en: 'Weather & bite', cs: 'Počasí a záběr' },
    'assistant.a.weather': { ru: 'В карточке водоёма — текущая погода и прогноз на 3 дня (Open-Meteo). «Прогноз клёва» ★ — простая эвристика по давлению, ветру и облачности; это ориентир, а не гарантия.', en: 'Each card shows current weather and a 3-day forecast (Open-Meteo). The “bite forecast” ★ is a simple heuristic from pressure, wind and cloud cover — a hint, not a guarantee.', cs: 'V kartě je aktuální počasí a předpověď na 3 dny (Open-Meteo). „Předpověď záběru“ ★ je jednoduchá heuristika z tlaku, větru a oblačnosti — vodítko, ne záruka.' },

    // Прогноз клёва
    'bite.1': { ru: 'слабый клёв', en: 'poor bite', cs: 'slabý záběr' },
    'bite.2': { ru: 'ниже среднего', en: 'below average', cs: 'podprůměrný' },
    'bite.3': { ru: 'умеренный клёв', en: 'moderate bite', cs: 'mírný záběr' },
    'bite.4': { ru: 'хороший клёв', en: 'good bite', cs: 'dobrý záběr' },
    'bite.5': { ru: 'отличный клёв', en: 'excellent bite', cs: 'výborný záběr' },
    'wind.dirs': { ru: 'С,СВ,В,ЮВ,Ю,ЮЗ,З,СЗ', en: 'N,NE,E,SE,S,SW,W,NW', cs: 'S,SV,V,JV,J,JZ,Z,SZ' },

    // Геолокация
    'geo.unsupported': { ru: 'Геолокация не поддерживается', en: 'Geolocation not supported', cs: 'Geolokace není podporována' },
    'geo.locating': { ru: 'Определяю местоположение…', en: 'Getting your location…', cs: 'Zjišťuji polohu…' },
    'geo.nearest': { ru: 'Ближайший: {name} — {km} км', en: 'Nearest: {name} — {km} km', cs: 'Nejbližší: {name} — {km} km' },
    'geo.failed': { ru: 'Не удалось определить местоположение', en: 'Couldn’t get your location', cs: 'Polohu se nepodařilo zjistit' }
  };

  var current = 'ru';

  function detect() {
    var stored = null;
    try { stored = localStorage.getItem('troutmap_lang'); } catch (e) {}
    if (stored && LANGS.indexOf(stored) !== -1) return stored;
    var nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) !== -1 ? nav : 'ru';
  }

  function t(key, vars) {
    var entry = S[key];
    var str = entry ? (entry[current] || entry.ru) : key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return str;
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) return;
    current = lang;
    try { localStorage.setItem('troutmap_lang', lang); } catch (e) {}
    document.documentElement.setAttribute('lang', lang);
    if (typeof window.onLangChange === 'function') window.onLangChange(lang);
  }

  // Самопроверка полноты: ни один ключ не должен остаться без перевода
  function validateRegistry() {
    var missing = [];
    Object.keys(S).forEach(function (key) {
      LANGS.forEach(function (lang) {
        var v = S[key][lang];
        if (typeof v !== 'string' || !v.length) missing.push(key + ' [' + lang + ']');
      });
    });
    if (missing.length) {
      console.warn('[i18n] Пропущены переводы (' + missing.length + '):\n' + missing.join('\n'));
    }
    return missing;
  }

  current = detect();
  document.documentElement.setAttribute('lang', current);
  validateRegistry();

  window.I18N = {
    LANGS: LANGS,
    LANG_META: LANG_META,
    t: t,
    setLang: setLang,
    get: function () { return current; },
    validate: validateRegistry,
    has: function (key) { return !!S[key]; }
  };
})();
