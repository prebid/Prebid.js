/**
 * creative.js
 *
 * This file is inserted into the prebid creative as a placeholder for the winning prebid creative. It should support the following formats:
 * - Banner
 * - Outstream Video
 * - Mobile
 * - AMP creatives
 * - All safeFrame creatives
 */

const pbjs = {};

/**
 * @param  {object} doc
 * @param  {string} adId
 * @param  {object} dataObject
 */
pbjs.renderAd = function(doc, adId, dataObject) {
  if (isAMP(dataObject)) {
    console.log('render AMP path');
    renderAmpAd(dataObject.host, dataObject.uuid);
  } else if (typeof dataObject !== 'object' || dataObject.mediaType === '') {
    // legacy render
    if (isCrossDomain()) {
      console.log('cross domain render');
      // render via postMessage
      renderCrossDomain(adId, dataObject.pubUrl);
    } else {
      console.log('legacy banner render');
      renderLegacy(doc, adId);
    }
  } else {
    // assume legacy?
    renderLegacy(doc, adId);
  }
};

function getEmptyIframe(height, width) {
  var frame = document.createElement('iframe');
  frame.setAttribute('FRAMEBORDER', 0);
  frame.setAttribute('SCROLLING', 'no');
  frame.setAttribute('MARGINHEIGHT', 0);
  frame.setAttribute('MARGINWIDTH', 0);
  frame.setAttribute('TOPMARGIN', 0);
  frame.setAttribute('LEFTMARGIN', 0);
  frame.setAttribute('ALLOWTRANSPARENCY', 'true');
  frame.setAttribute('width', width);
  frame.setAttribute('height', height);
  return frame;
}

function renderLegacy(doc, adId) {
  var w = window;
  for (i = 0; i < 10; i++) {
    w = w.parent;
    if (w.pbjs) {
      try {
        w.pbjs.renderAd(document, adId);
        break;
      } catch (e) {
        continue;
      }
    }
  }
}

function renderCrossDomain(adId, pubUrl) {
  var urlParser = document.createElement('a');
  urlParser.href = pubUrl;
  var publisherDomain = urlParser.protocol + '//' + urlParser.host;
  var adServerDomain = urlParser.protocol + '//tpc.googlesyndication.com';

  function renderAd(ev) {
    var key = ev.message ? 'message' : 'data';
    var adObject = {};
    try {
      adObject = JSON.parse(ev[key]);
    } catch (e) {
      return;
    }

    var origin = ev.origin || ev.originalEvent.origin;
    if (adObject.message && adObject.message === 'Prebid Response' &&
        publisherDomain === origin &&
        adObject.adId === adId &&
        (adObject.ad || adObject.adUrl)) {
      var body = window.document.body;
      var ad = adObject.ad;
      var url = adObject.adUrl;
      var width = adObject.width;
      var height = adObject.height;

      if (adObject.mediaType === 'video') {
        console.log('Error trying to write ad.');
      } else

      if (ad) {
        var frame = document.createElement('iframe');
        frame.setAttribute('FRAMEBORDER', 0);
        frame.setAttribute('SCROLLING', 'no');
        frame.setAttribute('MARGINHEIGHT', 0);
        frame.setAttribute('MARGINWIDTH', 0);
        frame.setAttribute('TOPMARGIN', 0);
        frame.setAttribute('LEFTMARGIN', 0);
        frame.setAttribute('ALLOWTRANSPARENCY', 'true');
        frame.setAttribute('width', width);
        frame.setAttribute('height', height);
        body.appendChild(frame);
        frame.contentDocument.open();
        frame.contentDocument.write(ad);
        frame.contentDocument.close();
      } else if (url) {
        body.insertAdjacentHTML('beforeend', '<IFRAME SRC="' + url + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + width + '" HEIGHT="' + height + '"></IFRAME>');
      } else {
        console.log('Error trying to write ad. No ad for bid response id: ' + id);
      }
    }
  }

  function requestAdFromPrebid() {
    var message = JSON.stringify({
      message: 'Prebid Request',
      adId: adId,
      adServerDomain: adServerDomain
    });
    window.parent.postMessage(message, publisherDomain);
  }

  function listenAdFromPrebid() {
    window.addEventListener('message', renderAd, false);
  }

  listenAdFromPrebid();
  requestAdFromPrebid();
}

function renderAmpAd(cacheHost, uuid) {
  if (cacheHost === '') {
    cacheHost = 'prebid.adnxs.com';
  }
  // TODO pass in /path from creative since it might change
  var adUrl = 'https://' + cacheHost + '/pbc/v1/cache?uuid=' + uuid;

  var handler = function(json) {
    // this effectively writes out the ad content to the existing iframe without destroying the document.
    var content = JSON.parse(json);
    // TODO change format to ORTB banner response.
    // Fire Imps URLS as required
    if (content.ad) {
      writeAdHtml(content.ad);
    } else if (content.adUrl) {
      writeAdUrl(content.adUrl, content.height, content.width);
    }
  };
  sendRequest(adUrl, handler);
}

function writeAdUrl(adUrl, height, width) {
  var iframe = getEmptyIframe(height, width);
  iframe.src = adUrl;
  document.body.appendChild(iframe);
}

function writeAdHtml(markup) {
  var parsed = parseHtml(markup.replace('><', '> <'));
  const givenNodes = parsed.body.childNodes;
  for (let j = 0; j < givenNodes.length; j++) {
    document.body.appendChild(givenNodes[j]);
  }
  var scripts = parsed.querySelectorAll('script');
  for (let i = 0; i < scripts.length; i++) {
    domEval(scripts[i].innerHTML);
    scripts[i].parentNode.removeChild(scripts[i]);
  }
}

function isAMP(dataObject) {
  // TODO update this check when AMP provides the `context` object into the DFP safeframe
  // currently we consider cross domain + uuid enough for AMP case
  return typeof dataObject.uuid === 'string' && isCrossDomain();
}

function isCrossDomain() {
  let isCrossDomain = true;
  try {
    if (window.top.document) {} // will throw in x-domain
    isCrossDomain = false;
  } catch (e) {}
  return isCrossDomain;
}

function domEval(code, doc) {
  doc = doc || document;

  const script = doc.createElement('script');

  script.text = code;
  doc.head.appendChild(script);
}

function parseHtml(payload) {
  const parser = new DOMParser();
  return parser.parseFromString(payload, 'text/html');
}

function sendRequest(url, callback) {
  function reqListener() {
    callback(oReq.responseText);
  }

  const oReq = new XMLHttpRequest();
  oReq.addEventListener('load', reqListener);
  oReq.open('GET', url);
  oReq.send();
}

// function render() {
//   const { height, width, ad, mediaType, adUrl, renderer } = bid;

//   if (renderer && renderer.url) {
//     renderer.render(bid);
//   } else if ((doc === document && !utils.inIframe()) || mediaType === 'video') {
//     utils.logError(`Error trying to write ad. Ad render call ad id ${id} was prevented from writing to the main document.`);
//   } else if (ad) {
//     doc.write(ad);
//     doc.close();
//     setRenderSize(doc, width, height);
//   } else if (adUrl) {
//     const iframe = utils.createInvisibleIframe();
//     iframe.height = height;
//     iframe.width = width;
//     iframe.style.display = 'inline';
//     iframe.style.overflow = 'hidden';
//     iframe.src = adUrl;

//     utils.insertElement(iframe, doc, 'body');
//     setRenderSize(doc, width, height);
//   }
// }
