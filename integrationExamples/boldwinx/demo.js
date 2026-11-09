// Shared helpers for the BoldwinX demo pages: epid from the URL, the step log, the VAST pixel list
// and the outstream player.
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

  // The ad unit code is also the id of its slot; the label above the slot has the id <code>-label.
  function hideSlot(code) {
    document.getElementById(code).hidden = true;
    document.getElementById(code + '-label').hidden = true;
  }

  // Outstream renderer for Prebid: BoldwinX has no player of its own, so the page gives one (Google IMA).
  function renderOutstream(bid) {
    var slot = document.getElementById(bid.adUnitCode);
    var video = document.createElement('video');
    video.muted = true;
    video.setAttribute('playsinline', '');
    var adContainer = el('div', 'ad-container');
    slot.append(video, adContainer);

    var displayContainer = new google.ima.AdDisplayContainer(adContainer, video);
    var adsLoader = new google.ima.AdsLoader(displayContainer);
    var request = new google.ima.AdsRequest();
    request.adsResponse = bid.vastXml;
    request.linearAdSlotWidth = slot.clientWidth;
    request.linearAdSlotHeight = slot.clientHeight;
    request.setAdWillAutoPlay(true);
    request.setAdWillPlayMuted(true);

    adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onError);
    adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, function (e) {
      var adsManager = e.getAdsManager(video);
      adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onError);
      adsManager.addEventListener(google.ima.AdEvent.Type.IMPRESSION, function () {
        log('Video ad started: the player opened the impression pixels', 'Boldwin pixel, burl and nurl, each once', 'ok');
      });
      adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, function () {
        adsManager.destroy();
        slot.replaceChildren();
        slot.classList.add('done');
        document.getElementById(bid.adUnitCode + '-label').hidden = true;
        log('Video ad finished', 'The block closes.');
      });
      log('Video ad is ready', 'It starts when half of the block is on the screen.');
      whenHalfVisible(slot, function () {
        displayContainer.initialize();
        adsManager.init(slot.clientWidth, slot.clientHeight, google.ima.ViewMode.NORMAL);
        adsManager.setVolume(0);
        adsManager.start();
        addSoundButton(slot, adsManager);
      });
    });
    adsLoader.requestAds(request);

    function onError(e) {
      log('The player could not play the video ad', e.getError().getMessage(), 'error');
      hideSlot(bid.adUnitCode);
    }
  }

  function whenHalfVisible(node, callback) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].intersectionRatio >= 0.5) {
        observer.disconnect();
        callback();
      }
    }, { threshold: 0.5 });
    observer.observe(node);
  }

  function addSoundButton(slot, adsManager) {
    var button = el('button', 'button sound', 'Sound on');
    button.addEventListener('click', function () {
      adsManager.setVolume(1);
      button.remove();
    });
    slot.appendChild(button);
  }

  window.demo = {
    epid: epid,
    log: log,
    showVastPixels: showVastPixels,
    requireEpid: requireEpid,
    hideSlot: hideSlot,
    renderOutstream: renderOutstream
  };
})();
