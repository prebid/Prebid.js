import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isStr, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'adnuntius';
const BIDDER_DEAL_ALIAS = 'adndeal';
const ENDPOINT_URL = 'https://ads.adnuntius.delivery/i';
const ENDPOINT_URL_EUROPE = 'https://europe.delivery.adnuntius.com/i';
const GVLID = 855;
const DEFAULT_VAST_VERSION = 'vast4'
const MAXIMUM_DEALS_LIMIT = 5;

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
  const meta = (adnMeta !== null) ? adnMeta.reduce((acc, cur) => { return { ...acc, [cur.key]: cur.value } }, {}) : {}
  return meta
}

const getUsi = function (meta, ortb2, bidderRequest) {
  let usi = (meta !== null && meta.usi) ? meta.usi : false;
  if (ortb2 && ortb2.user && ortb2.user.id) { usi = ortb2.user.id }
  return usi
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  aliases: [...Array(MAXIMUM_DEALS_LIMIT)].map((_, index) => BIDDER_DEAL_ALIAS + (index + 1)),
  isBidRequestValid: function (bid) {
    return !!(bid.bidId || (bid.params.member && bid.params.invCode));
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
    if (bidderConfig.useCookie === false) request.push('noCookies=true')
    if (bidderConfig.maxDeals > 0) request.push('ds=' + Math.min(bidderConfig.maxDeals, MAXIMUM_DEALS_LIMIT))
    for (var i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i]
      let network = bid.params.network || 'network';
      let maxDeals = Math.max(0, Math.min(bid.params.maxDeals || 0, MAXIMUM_DEALS_LIMIT));
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
    for (var j = 0; j < networkKeys.length; j++) {
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

    function buildAdResponse(ad, adUnit, isDeal, dealCount) {
      let destinationUrls = ad.destinationUrls || {};
      let advertiserDomains = [];
      for (const value of Object.values(destinationUrls)) {
        advertiserDomains.push(value.split('/')[2])
      }
      let adResponse = {
        bidderCode: isDeal ? BIDDER_DEAL_ALIAS + (dealCount || 1) : BIDDER_CODE,
        requestId: adUnit.targetId,
        cpm: (ad.bid) ? ad.bid.amount * 1000 : 0,
        width: Number(ad.creativeWidth),
        height: Number(ad.creativeHeight),
        creativeId: ad.creativeId,
        currency: (ad.bid) ? ad.bid.currency : 'EUR',
        dealId: ad.dealId || '',
        meta: {
          advertiserDomains: advertiserDomains
        },
        netRevenue: false,
        ttl: 360,
      };
      // Deal bids provide the rendered ad content along with the
      // bid; whereas regular bids have it stored on the ad-unit.
      let renderSource = isDeal ? ad : adUnit;
      if (renderSource.vastXml) {
        adResponse.vastXml = renderSource.vastXml
        adResponse.mediaType = VIDEO
      } else {
        adResponse.ad = renderSource.html
      }
      return adResponse;
    }

    const bidResponsesById = adUnits.reduce((response, adUnit) => {
      let deals = adUnit.deals || [];
      if ((adUnit.matchedAdCount + deals.length) > 0) {
        let adResponses = [];
        if (adUnit.matchedAdCount === 1) {
          adResponses.push(buildAdResponse(adUnit.ads[0], adUnit, false, 0));
        }
        for (let i = 0; i < deals.length; i++) {
          adResponses.push(buildAdResponse(deals[i], adUnit, true, i + 1));
        }
        return {
          ...response,
          [adUnit.targetId]: adResponses
        };
      } else {
        // No bids or deals returned
        return response;
      }
    }, {});

    return bidRequest.bid.map(bid => bid.bidId).reduce((response, adUnitTargetId) => {
      if (bidResponsesById[adUnitTargetId]) {
        response.push(...bidResponsesById[adUnitTargetId])
      }
      return response
    }, []);
  }
}
registerBidder(spec);
