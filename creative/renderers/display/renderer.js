import {ERROR_NO_AD} from '../../constants.js';

export function render({ad, adUrl, width, height}, {cb, mkFrame}, doc = document) {
  if (!ad && !adUrl) {
    // eslint-disable-next-line standard/no-callback-literal
    cb({reason: ERROR_NO_AD, message: 'Missing ad markup or URL'});
  } else {
    const attrs = {width, height};
    if (adUrl && !ad) {
      attrs.src = adUrl
    } else {
      attrs.srcdoc = ad;
    }
    doc.body.appendChild(mkFrame(doc, attrs));
    cb();
  }
}

window.render = render;
