import {writeAd} from './writer.js';
import {
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED,
  EXCEPTION,
  PREBID_EVENT,
  PREBID_REQUEST,
  PREBID_RESPONSE
} from './constants.js';

export function renderer(win = window) {
  return function ({adId, pubUrl, clickUrl}) {
    const pubDomain = new URL(pubUrl, window.location).origin;
    function sendMessage(type, payload, transfer) {
      win.parent.postMessage(JSON.stringify(Object.assign({message: type, adId}, payload)), pubDomain, transfer);
    }
    function cb(err) {
      sendMessage(PREBID_EVENT, {
        event: err == null ? AD_RENDER_SUCCEEDED : AD_RENDER_FAILED,
        info: err
      });
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
          writeAd(data, cb, win.document);
        } catch (e) {
          // eslint-disable-next-line standard/no-callback-literal
          cb({ reason: EXCEPTION, message: e.message })
        }
      }
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = onMessage;
    sendMessage(PREBID_REQUEST, {
      options: {clickUrl}
    }, [channel.port2]);
    win.addEventListener('message', onMessage, false);
  }
}
window.renderAd = renderer();
