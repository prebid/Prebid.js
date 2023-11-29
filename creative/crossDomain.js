import {
  ERROR_EXCEPTION,
  EVENT_AD_RENDER_FAILED,
  MESSAGE_EVENT,
  MESSAGE_REQUEST,
  MESSAGE_RESPONSE
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
    function guard(fn) {
      return function () {
        try {
          return fn.apply(this, arguments);
        } catch (e) {
          sendMessage(MESSAGE_EVENT, {
            event: EVENT_AD_RENDER_FAILED,
            info: {
              reason: ERROR_EXCEPTION,
              message: e.message
            }
          })
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    }
    const onMessage = guard(function (ev) {
      let data = {};
      try {
        data = JSON.parse(ev[ev.message ? 'message' : 'data']);
      } catch (e) {
        return;
      }
      if (data.message === MESSAGE_RESPONSE && data.adId === adId) {
        const renderer = mkFrame(win.document, {
          width: 0,
          height: 0,
          style: 'display: none',
          srcdoc: `<script>${data.renderer}</script>`
        });
        renderer.onload = guard(function () {
          renderer.contentWindow.render(data, {sendMessage, mkFrame}, win.document);
        });
        win.document.body.appendChild(renderer);
      }
    })

    const channel = new MessageChannel();
    channel.port1.onmessage = onMessage;
    sendMessage(MESSAGE_REQUEST, {
      options: {clickUrl}
    }, [channel.port2]);
    win.addEventListener('message', function (ev) {
      if (ev.origin === pubDomain) onMessage(ev);
    }, false);
  }
}

window.renderAd = renderer();
