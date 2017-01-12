// this script can be returned by an ad server delivering a cross domain iframe, into which the
// creative will be rendered, e.g. DFP delivering a SafeFrame

// set these domains as fits your environment and ensure matching protocols
// alternatively this can be passed as a macro on the query string of the ad server call, for
// example `%%PUBLISHER_DOMAIN%%`.
const publisherDomain = 'http://localhost:9999';
const adServerDomain = 'http://tpc.googlesyndication.com';

function renderAd(ev) {
    var key = ev.message ? 'message' : 'data';
    var adObject = {};
    try {
      adObject = JSON.parse(ev[key]);
    } catch (e) {
      return;
    }

    if (adObject.ad || adObject.adUrl) {
      var doc = window.document;
      var ad = adObject.ad;
      var url = adObject.adUrl;
      var width = adObject.width;
      var height = adObject.height;

      if (adObject.mediaType === 'video') {
        console.log('Error trying to write ad.');
      } else

      if (ad) {
        doc.write(ad);
        doc.close();
      } else if (url) {
        doc.write('<IFRAME SRC="' + url + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + width + '" HEIGHT="' + height + '"></IFRAME>');
        doc.close();
      } else {
        console.log('Error trying to write ad. No ad for bid response id: ' + id);
      }
    }
  }

function requestAdFromPrebid() {
  var message = JSON.stringify({
    message: 'Prebid Request',
    adId: '%%PATTERN:hb_adid%%',
    adServerDomain
  });
  window.parent.postMessage(message, publisherDomain);
}

function listenAdFromPrebid() {
  window.addEventListener('message', renderAd, false);
}

listenAdFromPrebid();
requestAdFromPrebid();
