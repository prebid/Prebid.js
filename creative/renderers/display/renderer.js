import {ERROR_NO_AD} from './constants.js';

export function render({ad, adUrl, width, height}, {mkFrame}, win) {
  if (!ad && !adUrl) {
    throw {
      reason: ERROR_NO_AD,
      message: 'Missing ad markup or URL'
    };
  } else {
    const doc = win.document;
    const attrs = {width, height};
    if (adUrl && !ad) {
      attrs.src = adUrl;
    } else {
      attrs.srcdoc = ad;
    }
    doc.body.appendChild(mkFrame(doc, attrs));
  }
}

window.render = render;
