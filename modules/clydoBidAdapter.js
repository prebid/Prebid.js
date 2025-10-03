import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepSetValue, deepAccess, isFn } from '../src/utils.js';
import { toOrtbNativeRequest } from '../src/native.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'clydo';
const METHOD = 'POST';
const params = {
  region: "{{region}}",
  partnerId: "{{partnerId}}"
}
const BASE_ENDPOINT_URL = `https://${params.region}.clydo.io/${params.partnerId}`

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  userSync: {
    topics: false,
  },
  isBidRequestValid: function(bid) {
    if (!bid || !bid.params) return false;
    const { partnerId, region } = bid.params;
    if (typeof partnerId !== 'string' || partnerId.length === 0) return false;
    if (typeof region !== 'string') return false;
    const allowedRegions = ['us', 'usw', 'eu', 'apac'];
    return allowedRegions.includes(region);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const data = converter.toORTB({bidRequests: validBidRequests, bidderRequest});
    const { partnerId, region } = validBidRequests[0].params;

    if (Array.isArray(data.imp)) {
      data.imp.forEach((imp, index) => {
        const srcBid = validBidRequests[index] || validBidRequests[0];
        const bidderParams = deepAccess(srcBid, 'params') || {};
        deepSetValue(data, `imp.${index}.ext.clydo`, bidderParams);

        const mediaTypes = deepAccess(srcBid, 'mediaTypes') || {};
        if (mediaTypes.video && !imp.video) {
          imp.video = {};
        }
        if (mediaTypes.native && !imp.native) {
          imp.native = {};
        }

        const mediaType = imp.banner ? 'banner' : (imp.video ? 'video' : (imp.native ? 'native' : '*'));
        let floor = deepAccess(srcBid, 'params.floor');
        if (!floor && isFn(srcBid.getFloor)) {
          const floorInfo = srcBid.getFloor({currency: 'USD', mediaType, size: '*'});
          if (floorInfo && typeof floorInfo.floor === 'number') {
            floor = floorInfo.floor;
          }
        }
        if (typeof floor === 'number') {
          deepSetValue(data, `imp.${index}.bidfloor`, floor);
          deepSetValue(data, `imp.${index}.bidfloorcur`, 'USD');
        }

        if (imp.native && !imp.native.request) {
          const nativeParams = srcBid.nativeParams || deepAccess(srcBid, 'mediaTypes.native');
          if (nativeParams) {
            const ortbNative = toOrtbNativeRequest(nativeParams);
            if (ortbNative) {
              deepSetValue(data, `imp.${index}.native.request`, JSON.stringify(ortbNative));
              deepSetValue(data, `imp.${index}.native.ver`, '1.2');
            }
          }
        }
      });
    }

    const schain = deepAccess(validBidRequests, '0.schain');
    if (schain) {
      deepSetValue(data, 'source.ext.schain', schain);
    }

    const eids = deepAccess(validBidRequests, '0.userIdAsEids');
    if (Array.isArray(eids)) {
      deepSetValue(data, 'user.ext.eids', eids);
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      deepSetValue(data, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(data, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
    }
    if (bidderRequest && typeof bidderRequest.uspConsent === 'string') {
      deepSetValue(data, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }
    if (bidderRequest && bidderRequest.gppConsent) {
      deepSetValue(data, 'regs.gpp', bidderRequest.gppConsent.gppString);
      deepSetValue(data, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections);
    }
    const ENDPOINT_URL = BASE_ENDPOINT_URL
      .replace(params.partnerId, partnerId)
      .replace(params.region, region);

    return [{
      method: METHOD,
      url: ENDPOINT_URL,
      data,
    }]
  },
  interpretResponse: function(serverResponse, request) {
    let bids = [];
    let body = serverResponse.body || {};
    if (body) {
      const normalized = Array.isArray(body.seatbid)
        ? {
            ...body,
            seatbid: body.seatbid.map(seat => ({
              ...seat,
              bid: (seat.bid || []).map(b => {
                if (typeof b?.adm === 'string') {
                  try {
                    const parsed = JSON.parse(b.adm);
                    if (parsed && parsed.native && Array.isArray(parsed.native.assets)) {
                      return {...b, adm: JSON.stringify(parsed.native)};
                    }
                  } catch (e) {}
                }
                return b;
              })
            }))
          }
        : body;
      bids = converter.fromORTB({response: normalized, request: request.data}).bids;
    }
    return bids;
  },
}
registerBidder(spec);
