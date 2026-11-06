// Shared helpers for the BoldwinX demo pages: epid from the URL, the step log and the VAST pixel list.
(function () {
  var params = new URLSearchParams(location.search);
  var epid = (params.get('epid') || '').trim();
  var started = Date.now();

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function log(title, detail, kind) {
    var list = document.getElementById('log');
    var row = el('li', kind || '');
    row.appendChild(el('span', 'time', ((Date.now() - started) / 1000).toFixed(1) + 's'));
    row.appendChild(el('span', 'title', title));
    if (detail) row.appendChild(el('span', 'detail', detail));
    list.appendChild(row);
  }

  // Shows only host, path and price of each <Impression> URL; the rest of the query is a long token.
  function describePixel(url) {
    try {
      var u = new URL(url);
      var price = u.searchParams.get('p');
      return u.host + u.pathname + (price != null ? '  p=' + price : '');
    } catch (e) {
      return url;
    }
  }

  function showVastPixels(vastXml) {
    var doc = new DOMParser().parseFromString(vastXml, 'text/xml');
    var urls = Array.prototype.map.call(doc.querySelectorAll('Impression'), function (n) {
      return n.textContent.trim();
    });
    var list = document.getElementById('pixels');
    list.innerHTML = '';
    urls.forEach(function (url) {
      list.appendChild(el('li', null, describePixel(url)));
    });
    return urls.length;
  }

  function requireEpid() {
    document.getElementById('epid').textContent = epid || 'not set';
    if (epid) return true;
    var form = document.getElementById('epid-form');
    form.hidden = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = form.elements.epid.value.trim();
      if (value) location.search = '?epid=' + encodeURIComponent(value);
    });
    log('No epid in the page address', 'Enter the epid from Boldwin above.', 'error');
    return false;
  }

  window.demo = { epid: epid, log: log, showVastPixels: showVastPixels, requireEpid: requireEpid };
})();
