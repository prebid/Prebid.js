import {mkFrame, writeAd} from './writer.js';
import {
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED,
  PREBID_EVENT,
  PREBID_RESPONSE,
  PREBID_REQUEST,
  EXCEPTION
} from './constants.js';

export function renderer(win = window) {
  return function ({adId, pubUrl, clickUrl}) {
    const pubDomain = (() => {
      const a = win.document.createElement('a');
      a.href = pubUrl;
      return a.protocol + '//' + a.host;
    })();
    function cb(err) {
      const payload = {
        message: PREBID_EVENT,
        adId,
        event: err == null ? AD_RENDER_SUCCEEDED : AD_RENDER_FAILED,
      }
      if (err != null) payload.info = err;
      win.parent.postMessage(JSON.stringify(payload), pubDomain)
    }
    function onMessage(ev) {
      let data = {};
      try {
        data = JSON.parse(ev[ev.message ? 'message' : 'data']);
      } catch (e) {
        return;
      }
      if (data.message === PREBID_RESPONSE && data.adId === adId) {
        try {
          let doc = win.document
          if (data.ad) {
            doc = mkFrame(doc, {width: data.width, height: data.height}).contentDocument;
            doc.open();
          }
          writeAd(data, cb, doc);
        } catch (e) {
          // eslint-disable-next-line standard/no-callback-literal
          cb({ reason: EXCEPTION, message: e.message })
        }
      }
    }

    const request = JSON.stringify({
      message: PREBID_REQUEST,
      adId,
      options: {
        clickUrl
      }
    });
    const channel = new MessageChannel();
    channel.port1.onmessage = onMessage;
    win.parent.postMessage(request, pubDomain, [channel.port2]);
    win.addEventListener('message', onMessage, false);
  }
}
window.renderAd = renderer();
