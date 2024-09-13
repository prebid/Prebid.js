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
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const region = timezone.split('/')[0];

      switch (region) {
        case 'Europe':
          adUrl = adUrls['EU'];
          break;
        case 'Asia':
          adUrl = adUrls['SGP'];
          break;
        default: adUrl = adUrls['US_EAST'];
      }
    } catch (err) {
      adUrl = adUrls['US_EAST'];
    }
  }

  return adUrl;
};
