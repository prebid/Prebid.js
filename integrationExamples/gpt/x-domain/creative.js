function renderAd(ev) {
    var key = ev.message ? 'message' : 'data';
    var adObject = {};
    try {
      adObject = JSON.parse(ev[key]);
    } catch (e) {
      return;
    }

    if (adObject.ad || adObject.adUrl) {
      var height = adObject.height;
      var width = adObject.width;
      var url = adObject.adUrl;
      var ad = adObject.ad;
      var doc = window.document;

      // if (doc === document || adObject.mediaType === 'video') {
      //     // utils.logError('Error trying to write ad. Ad render call ad id ' + id + ' was prevented
      // // from writing to the main document.');
      // } else

      if (ad) {
        doc.write(ad);
        doc.close();
        setRenderSize(doc, width, height);
      } else if (url) {
        doc.write('<IFRAME SRC="' + url + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + width + '" HEIGHT="' + height + '"></IFRAME>');
        doc.close();
        setRenderSize(doc, width, height);
      } else {
        // utils.logError('Error trying to write ad. No ad for bid response id: ' + id);
      }
    }
  }

function requestAdFromPrebid() {
  var message = JSON.stringify({
    message: 'Prebid Request',
    adId: window.prebidAdId
  });
  window.parent.postMessage(message, '*');
}

function listenAdFromPrebid() {
  window.addEventListener('message', renderAd, false);
}

function setRenderSize(doc, width, height) {
  if (doc.defaultView && doc.defaultView.frameElement) {
    doc.defaultView.frameElement.width = width;
    doc.defaultView.frameElement.height = height;
  }
}

listenAdFromPrebid();
requestAdFromPrebid();
