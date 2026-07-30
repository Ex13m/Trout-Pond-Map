/* TroutMap Europe — телеметрия ошибок (сигнал контура самоулучшения).
   Ловит window.onerror и unhandledrejection, шлёт в /api/telemetry.
   Максимум 5 отправок за сессию, дубли не шлются, при отсутствии API
   молчит. Персональных данных не собирает. */
(function () {
  'use strict';

  var sent = 0;
  var seen = {};
  var MAX = 5;

  function version() {
    try { return (window.CHANGELOG && window.CHANGELOG[0]) ? window.CHANGELOG[0].version : ''; }
    catch (e) { return ''; }
  }

  function report(message, source, line, stack) {
    if (sent >= MAX || !window.fetch) return;
    var key = String(message).slice(0, 120);
    if (seen[key]) return;
    seen[key] = true;
    sent++;
    try {
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          message: String(message).slice(0, 500),
          source: source ? String(source).slice(0, 200) : null,
          line: line || null,
          stack: stack ? String(stack).slice(0, 1200) : null,
          url: location.pathname + location.hash,
          version: version()
        })
      }).catch(function () { /* офлайн/локальный запуск — ок */ });
    } catch (e) { /* не мешаем приложению */ }
  }

  window.addEventListener('error', function (e) {
    // ошибки загрузки ресурсов (img/script) не шлём — ими занимается фолбэк
    if (e.target && e.target !== window && !(e instanceof ErrorEvent)) return;
    report(e.message || 'unknown error', e.filename, e.lineno, e.error && e.error.stack);
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason || {};
    report('unhandledrejection: ' + (r.message || String(r)).slice(0, 300), null, null, r.stack);
  });
})();
