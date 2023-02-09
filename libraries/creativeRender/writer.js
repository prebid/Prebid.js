import {NO_AD} from './constants.js';

const IFRAME_ATTRS = {
  frameBorder: 0,
  scrolling: 'no',
  marginHeight: 0,
  marginWidth: 0,
  topMargin: 0,
  leftMargin: 0,
  allowTransparency: 'true',
};

export function mkFrame(doc, attrs) {
  const frame = doc.createElement('iframe');
  attrs = Object.assign({}, attrs, IFRAME_ATTRS);
  Object.entries(attrs).forEach(([k, v]) => frame.setAttribute(k, v));
  doc.body.appendChild(frame);
  return frame;
}

export function writeAd({ad, adUrl, width, height}, cb, doc = document) {
  if (!ad && !adUrl) {
    // eslint-disable-next-line standard/no-callback-literal
    cb({reason: NO_AD, message: 'Missing ad markup or URL'});
  } else {
    if (adUrl && !ad) {
      mkFrame(doc, {width, height, src: adUrl})
    } else {
      doc.write(ad);
      doc.close();
    }
    cb();
  }
}
