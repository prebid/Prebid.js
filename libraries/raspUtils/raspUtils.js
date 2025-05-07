import { deepAccess } from '../../src/utils.js';

export function parseNativeResponse(ad) {
  if (!(ad.data?.fields && ad.data?.meta)) {
    return false;
  }

  const { click, Thirdpartyimpressiontracker, Thirdpartyimpressiontracker2, thirdPartyClickTracker2, imp, impression, impression1, impressionJs1, image, Image, title, leadtext, url, Calltoaction, Body, Headline, Thirdpartyclicktracker, adInfo, partner_logo: partnerLogo } = ad.data.fields;

  const { dsaurl, height, width, adclick } = ad.data.meta;
  const emsLink = ad.ems_link;
  const link = adclick + (url || click);
  const nativeResponse = {
    sendTargetingKeys: false,
    title: title || Headline || '',
    image: {
      url: image || Image || '',
      width,
      height
    },
    icon: {
      url: partnerLogo || '',
      width,
      height
    },
    clickUrl: link,
    cta: Calltoaction || '',
    body: leadtext || Body || '',
    body2: adInfo || '',
    sponsoredBy: deepAccess(ad, 'data.meta.advertiser_name', null) || '',
  };

  nativeResponse.impressionTrackers = [emsLink, imp, impression, impression1, Thirdpartyimpressiontracker, Thirdpartyimpressiontracker2].filter(Boolean);
  nativeResponse.javascriptTrackers = [impressionJs1].map(url => url ? `<script async src=${url}></script>` : null).filter(Boolean);
  nativeResponse.clickTrackers = [Thirdpartyclicktracker, thirdPartyClickTracker2].filter(Boolean);

  if (dsaurl) {
    nativeResponse.privacyLink = dsaurl;
  }

  return nativeResponse
}
