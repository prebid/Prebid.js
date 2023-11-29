import {render} from './renderers/display/renderer.js';
import {
  EVENT_AD_RENDER_FAILED,
  EVENT_AD_RENDER_SUCCEEDED,
  ERROR_EXCEPTION,
  MESSAGE_REQUEST,
  MESSAGE_RESPONSE,
  MESSAGE_EVENT
} from './constants.js';

const mkFrame = (() => {
  const DEFAULTS = {
    frameBorder: 0,
    scrolling: 'no',
    marginHeight: 0,
    marginWidth: 0,
    topMargin: 0,
    leftMargin: 0,
    allowTransparency: 'true',
  };
  return (doc, attrs) => {
    const frame = doc.createElement('iframe');
    Object.entries(Object.assign({}, attrs, DEFAULTS))
      .forEach(([k, v]) => frame.setAttribute(k, v));
    return frame;
  }
})()

export function renderer(win = window) {
  return function ({adId, pubUrl, clickUrl}) {
    const pubDomain = new URL(pubUrl, window.location).origin;
    function sendMessage(type, payload, transfer) {
      win.parent.postMessage(JSON.stringify(Object.assign({message: type, adId}, payload)), pubDomain, transfer);
    }
    function cb(err) {
      sendMessage(MESSAGE_EVENT, {
        event: err == null ? EVENT_AD_RENDER_SUCCEEDED : EVENT_AD_RENDER_FAILED,
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
      if (data.message === MESSAGE_RESPONSE && data.adId === adId) {
        try {
          render(data, {cb, mkFrame}, win.document);
        } catch (e) {
          // eslint-disable-next-line standard/no-callback-literal
          cb({ reason: ERROR_EXCEPTION, message: e.message })
        }
      }
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = onMessage;
    sendMessage(MESSAGE_REQUEST, {
      options: {clickUrl}
    }, [channel.port2]);
    win.addEventListener('message', onMessage, false);
  }
}
window.renderAd = renderer();
