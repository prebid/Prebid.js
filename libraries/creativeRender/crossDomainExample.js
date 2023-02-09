import {renderer} from './crossDomain.js';

window.renderAd = renderer();

const params = {
  adId: '%%PATTERN:hb_adid%%',
  clickUrl: '%%CLICK_URL_UNESC%%',
  publisherDomain: (() => {
    const a = document.createElement('a');
    a.href = '%%PATTERN:url%%';
    return a.protocol + '//' + a.hostname;
  })()
}

window.renderAd(params);
