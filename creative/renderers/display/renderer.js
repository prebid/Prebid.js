import {ERROR_NO_AD, EVENT_AD_RENDER_FAILED, EVENT_AD_RENDER_SUCCEEDED, MESSAGE_EVENT} from './constants.js';

export function render({ad, adUrl, width, height}, {sendMessage, mkFrame}, doc = document) {
  if (!ad && !adUrl) {
    sendMessage(MESSAGE_EVENT, {
      event: EVENT_AD_RENDER_FAILED,
      info: {
        reason: ERROR_NO_AD,
        message: 'Missing ad markup or URL'
      }
    });
  } else {
    const attrs = {width, height};
    if (adUrl && !ad) {
      attrs.src = adUrl;
    } else {
      attrs.srcdoc = ad;
    }
    doc.body.appendChild(mkFrame(doc, attrs));
    sendMessage(MESSAGE_EVENT, {event: EVENT_AD_RENDER_SUCCEEDED});
  }
}

window.render = render;
