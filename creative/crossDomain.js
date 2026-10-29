import {
  ERROR_EXCEPTION,
  EVENT_AD_RENDER_FAILED,
  EVENT_AD_RENDER_SUCCEEDED,
  MESSAGE_EVENT,
  MESSAGE_REQUEST,
  MESSAGE_RESPONSE,
  PB_LOCATOR
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
  };
})();

function isPrebidWindow(win) {
  return !!win.frames[PB_LOCATOR];
}

export function renderer(win) {
  /**
   * Return the window to postMessage into. In order of precedence, this is:
   *  - the `depth`-th ancestor, if provided;
   *  - the first ancestor that has a frame named '__pb_locator__',
   *  - the first ancestor whose `frames` are not readable,
   *  - the immediate parent.
   */
  function locatePrebid(depth) {
    let target = win.parent;
    if (depth > 0) {
      for (let i = 1; i < depth && target !== win.top; i++) {
        target = target.parent;
      }
      return target;
    }
    try {
      while (target !== win.top && !isPrebidWindow(target)) {
        target = target.parent;
      }
      if (!isPrebidWindow(target)) target = win.parent;
    } catch (e) {
    }
    return target;
  }

  return function ({ adId, pubUrl, allowNullOrigin, token, parent: depth, ...rest }) {
    const targetOrigin = (() => {
      let origin;
      try {
        origin = new URL(pubUrl).origin;
      } catch (e) {
        origin = 'null';
      }
      if (origin !== 'null') return origin;
      if (allowNullOrigin) return '*';
      return new URL(pubUrl, window.location).origin;
    })();

    const makeMessage = (type, payload) => JSON.stringify(Object.assign({ message: type, adId }, payload));

    const target = locatePrebid(depth);

    function setupChannel(type, payload, onResponse) {
      const channel = new MessageChannel();
      if (typeof onResponse === 'function') {
        channel.port1.onmessage = guard(onResponse);
      }
      target.postMessage(makeMessage(type, Object.assign({ token }, payload)), targetOrigin, [channel.port2]);
      return (type, payload) => channel.port1.postMessage(makeMessage(type, payload));
    }

    const handshakeChannel = setupChannel(MESSAGE_REQUEST, { options: rest }, onMessage);
    const sendMessage = token != null
      ? handshakeChannel
      : setupChannel;

    function onError(e) {
      sendMessage(MESSAGE_EVENT, {
        event: EVENT_AD_RENDER_FAILED,
        info: {
          reason: e?.reason || ERROR_EXCEPTION,
          message: e?.message
        }
      });
      // eslint-disable-next-line no-console
      e?.stack && console.error(e);
    }

    function guard(fn) {
      return function () {
        try {
          return fn.apply(this, arguments);
        } catch (e) {
          onError(e);
        }
      };
    }

    const forward = [];
    let handshakeComplete;

    function onMessage(ev) {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      if (!handshakeComplete && data.message === MESSAGE_RESPONSE && data.adId === adId) {
        handshakeComplete = true;
        const renderer = mkFrame(win.document, {
          width: 0,
          height: 0,
          style: 'display: none'
        });
        renderer.onload = guard(function () {
          const W = renderer.contentWindow;
          // NOTE: on Firefox, `Promise.resolve(P)` or `new Promise((resolve) => resolve(P))`
          // does not appear to work if P comes from another frame
          W.Promise.resolve(W.render(data, { sendMessage, mkFrame, onMessage: (cb) => forward.push(guard(cb)) }, win)).then(
            () => sendMessage(MESSAGE_EVENT, { event: EVENT_AD_RENDER_SUCCEEDED }),
            onError
          );
        });
        // Attach 'srcdoc' after 'onload', otherwise the latter seems to randomly run prematurely in tests
        // https://stackoverflow.com/questions/62087163/iframe-onload-event-when-content-is-set-from-srcdoc
        renderer.srcdoc = `<script>${data.renderer}</script>`;
        win.document.body.appendChild(renderer);
      } else if (handshakeComplete) {
        forward.forEach(cb => cb(data));
      }
    }
  };
}

window.pbRender = renderer(window);
