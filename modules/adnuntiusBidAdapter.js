import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isStr, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'adnuntius';
const BIDDER_CODE_DEAL_ALIAS_BASE = 'adndeal';
const BIDDER_CODE_DEAL_ALIASES = [1, 2, 3, 4, 5].map(num => {
  return BIDDER_CODE_DEAL_ALIAS_BASE + num;
});
const ENDPOINT_URL = 'https://ads.adnuntius.delivery/i';
const ENDPOINT_URL_EUROPE = 'https://europe.delivery.adnuntius.com/i';
const GVLID = 855;
const DEFAULT_VAST_VERSION = 'vast4'
const MAXIMUM_DEALS_LIMIT = 5;
const VALID_BID_TYPES = ['netBid', 'grossBid'];

const checkSegment = function (segment) {
  if (isStr(segment)) return segment;
  if (segment.id) return segment.id
}

const getSegmentsFromOrtb = function (ortb2) {
  const userData = deepAccess(ortb2, 'user.data');
  let segments = [];
  if (userData) {
    userData.forEach(userdat => {
      if (userdat.segment) {
        segments.push(...userdat.segment.filter(checkSegment).map(checkSegment));
      }
    });
  }
  return segments
}

const handleMeta = function () {
  const storage = getStorageManager({ bidderCode: BIDDER_CODE })
  let adnMeta = null
  if (storage.localStorageIsEnabled()) {
    adnMeta = JSON.parse(storage.getDataFromLocalStorage('adn.metaData'))
  }
  return (adnMeta !== null) ? adnMeta.reduce((acc, cur) => { return { ...acc, [cur.key]: cur.value } }, {}) : {}
}

const getUsi = function (meta, ortb2, bidderRequest) {
  let usi = (meta !== null && meta.usi) ? meta.usi : false;
  if (ortb2 && ortb2.user && ortb2.user.id) { usi = ortb2.user.id }
  return usi
}

const validateBidType = function(bidTypeOption) {
  return VALID_BID_TYPES.indexOf(bidTypeOption || '') > -1 ? bidTypeOption : 'bid';
}

const AU_ID_REGEX = new RegExp('^[0-9A-Fa-f]{1,20}$');

export const spec = {
  code: BIDDER_CODE,
  aliases: BIDDER_CODE_DEAL_ALIASES,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    // The auId MUST be a hexadecimal string
    const validAuId = AU_ID_REGEX.test(bid.params.auId);
    return !!(validAuId && (bid.bidId || (bid.params.member && bid.params.invCode)));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const networks = {};
    const bidRequests = {};
    const requests = [];
    const request = [];
    const ortb2 = bidderRequest.ortb2 || {};
    const bidderConfig = config.getConfig();

    const adnMeta = handleMeta()
    const usi = getUsi(adnMeta, ortb2, bidderRequest)
    const segments = getSegmentsFromOrtb(ortb2);
    const tzo = new Date().getTimezoneOffset();
    const gdprApplies = deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    const consentString = deepAccess(bidderRequest, 'gdprConsent.consentString');

    request.push('tzo=' + tzo)
    request.push('format=json')

    if (gdprApplies !== undefined) request.push('consentString=' + consentString);
    if (segments.length > 0) request.push('segments=' + segments.join(','));
    if (usi) request.push('userId=' + usi);
    if (bidderConfig.useCookie === false) request.push('noCookies=true');
    if (bidderConfig.maxDeals > 0) request.push('ds=' + Math.min(bidderConfig.maxDeals, MAXIMUM_DEALS_LIMIT));
    for (let i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i]
      let network = bid.params.network || 'network';
      const maxDeals = Math.max(0, Math.min(bid.params.maxDeals || 0, MAXIMUM_DEALS_LIMIT));
      const targeting = bid.params.targeting || {};

      if (bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context !== 'outstream') {
        network += '_video'
      }

      bidRequests[network] = bidRequests[network] || [];
      bidRequests[network].push(bid);

      networks[network] = networks[network] || {};
      networks[network].adUnits = networks[network].adUnits || [];
      if (bidderRequest && bidderRequest.refererInfo) networks[network].context = bidderRequest.refererInfo.page;
      if (adnMeta) networks[network].metaData = adnMeta;
      const adUnit = { ...targeting, auId: bid.params.auId, targetId: bid.bidId, maxDeals: maxDeals }
      if (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) adUnit.dimensions = bid.mediaTypes.banner.sizes
      networks[network].adUnits.push(adUnit);
    }

    const networkKeys = Object.keys(networks)
    for (let j = 0; j < networkKeys.length; j++) {
      const network = networkKeys[j];
      const networkRequest = [...request]
      if (network.indexOf('_video') > -1) { networkRequest.push('tt=' + DEFAULT_VAST_VERSION) }
      const requestURL = gdprApplies ? ENDPOINT_URL_EUROPE : ENDPOINT_URL
      requests.push({
        method: 'POST',
        url: requestURL + '?' + networkRequest.join('&'),
        data: JSON.stringify(networks[network]),
        bid: bidRequests[network]
      });
    }

    return requests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const adUnits = serverResponse.body.adUnits;

    let validatedBidType = validateBidType(config.getConfig().bidType);
    if (bidRequest.bid) {
      bidRequest.bid.forEach(b => {
        if (b.params && b.params.bidType) {
          validatedBidType = validateBidType(b.params.bidType);
        }
      });
    }

    function buildAdResponse(bidderCode, ad, adUnit, dealCount) {
      const destinationUrls = ad.destinationUrls || {};
      const advertiserDomains = [];
      for (const value of Object.values(destinationUrls)) {
        advertiserDomains.push(value.split('/')[2])
      }
      const adResponse = {
        bidderCode: bidderCode,
        requestId: adUnit.targetId,
        cpm: ad[validatedBidType] ? ad[validatedBidType].amount * 1000 : 0,
        width: Number(ad.creativeWidth),
        height: Number(ad.creativeHeight),
        creativeId: ad.creativeId,
        currency: (ad.bid) ? ad.bid.currency : 'EUR',
        dealId: ad.dealId || '',
        dealCount: dealCount,
        meta: {
          advertiserDomains: advertiserDomains
        },
        netRevenue: false,
        ttl: 360,
      };
      // Deal bids provide the rendered ad content along with the
      // bid; whereas regular bids have it stored on the ad-unit.
      const isDeal = dealCount > 0;
      const renderSource = isDeal ? ad : adUnit;
      if (renderSource.vastXml) {
        adResponse.vastXml = renderSource.vastXml
        adResponse.mediaType = VIDEO
      } else {
        adResponse.ad = renderSource.html
      }
      return adResponse;
    }

    const bidsById = bidRequest.bid.reduce((response, bid) => {
      return {
        ...response,
        [bid.bidId]: bid
      };
    }, {});

    const hasBidAdUnits = adUnits.filter((au) => {
      const bid = bidsById[au.targetId];
      if (bid && bid.bidder && BIDDER_CODE_DEAL_ALIASES.indexOf(bid.bidder) < 0) {
        return au.matchedAdCount > 0;
      } else {
        // We do NOT accept bids when using this adaptor via one of the
        // "deals" aliases; those requests are for ONLY getting deals from Adnuntius
        return false;
      }
    });
    const hasDealsAdUnits = adUnits.filter((au) => {
      return au.deals && au.deals.length > 0;
    });

    const dealAdResponses = hasDealsAdUnits.reduce((response, au) => {
      const bid = bidsById[au.targetId];
      if (bid) {
        (au.deals || []).forEach((deal, i) => {
          response.push(buildAdResponse(bid.bidder, deal, au, i + 1));
        });
      }
      return response;
    }, []);

    const bidAdResponses = hasBidAdUnits.reduce((response, au) => {
      const bid = bidsById[au.targetId];
      if (bid) {
        response.push(buildAdResponse(bid.bidder, au.ads[0], au, 0));
      }
      return response;
    }, []);

    return [...dealAdResponses, ...bidAdResponses];
  }
}
registerBidder(spec);
