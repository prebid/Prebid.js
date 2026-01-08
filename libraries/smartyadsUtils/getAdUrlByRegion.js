import { getTimeZone } from '../timezone/timezone.js';

const adUrls = {
  US_EAST: 'https://n1.smartyads.com/?c=o&m=prebid&secret_key=prebid_js',
  EU: 'https://n2.smartyads.com/?c=o&m=prebid&secret_key=prebid_js',
  SGP: 'https://n6.smartyads.com/?c=o&m=prebid&secret_key=prebid_js'
};

export function getAdUrlByRegion(bid) {
  let adUrl;

  if (bid.params.region && adUrls[bid.params.region]) {
    adUrl = adUrls[bid.params.region];
  } else {
    const region = getTimeZone().split('/')[0];

    switch (region) {
      case 'Europe':
        adUrl = adUrls['EU'];
        break;
      case 'Asia':
        adUrl = adUrls['SGP'];
        break;
      default: adUrl = adUrls['US_EAST'];
    }
  }

  return adUrl;
};
