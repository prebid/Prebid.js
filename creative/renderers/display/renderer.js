import {ERROR_NO_AD} from './constants.js';

export function render({ad, adUrl, width, height}, {mkFrame}, win) {
  if (!ad && !adUrl) {
    throw {
      reason: ERROR_NO_AD,
      message: 'Missing ad markup or URL'
    };
  } else {
    if (height == null) {
      const body = win.document?.body;
      [body, body?.parentElement].filter(elm => elm?.style != null).forEach(elm => elm.style.height = '100%');
    }
    const doc = win.document;
    const attrs = {width: width ?? '100%', height: height ?? '100%'};
    if (adUrl && !ad) {
      attrs.src = adUrl;
    } else {
      attrs.srcdoc = ad;
    }
    doc.body.appendChild(mkFrame(doc, attrs));
  }
}

window.render = render;
