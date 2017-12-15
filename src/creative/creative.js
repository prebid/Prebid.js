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
  // 1 detect type.
  if (dataObject.channel === 'amp') {
    //
    if (dataObject.cacheUrl) {
      // proceed AMP RTC
    } else {
      // proceed legacy amp.
    }
  } else if (dataObject.format === 'banner') {

  } else if (dataObject.format === 'video') {
    // proceed outstream.
  }

  // proceed to render for type

  function renderBanner() {
    if (isCrossDomain) {
      // render via postMessage
    } else {
      // render via parent
    }
  }

  const adUrl = 'https://' + base + '?uuid=' + adId;

  const cb = function(result) {
    result = result.substring(1, result.length - 1);
    console.log(result);
    const parsed = parseHtml(result);
    const scripts = parsed.querySelectorAll('script');
    for (let i = 0; i < scripts.length; i++) {
      domEval(scripts[i].innerHTML);
      scripts[i].parentNode.removeChild(scripts[i]);
    }
    const givenNodes = parsed.body.childNodes;
    for (let j = 0; j < givenNodes.length; j++) {
      document.body.appendChild(givenNodes[j]);
    }
  };
  sendRequest(adUrl, cb);
};

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

function render() {
  const { height, width, ad, mediaType, adUrl, renderer } = bid;

  if (renderer && renderer.url) {
    renderer.render(bid);
  } else if ((doc === document && !utils.inIframe()) || mediaType === 'video') {
    utils.logError(`Error trying to write ad. Ad render call ad id ${id} was prevented from writing to the main document.`);
  } else if (ad) {
    doc.write(ad);
    doc.close();
    setRenderSize(doc, width, height);
  } else if (adUrl) {
    const iframe = utils.createInvisibleIframe();
    iframe.height = height;
    iframe.width = width;
    iframe.style.display = 'inline';
    iframe.style.overflow = 'hidden';
    iframe.src = adUrl;

    utils.insertElement(iframe, doc, 'body');
    setRenderSize(doc, width, height);
  }
}
