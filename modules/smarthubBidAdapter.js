import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {
  buildPlacementProcessingFunction,
  buildRequestsBase,
  interpretResponseBuilder,
  isBidRequestValid,
  getUserSyncs as baseSync
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'smarthub';
const SYNC_URLS = {
  '1': 'https://us.shb-sync.com',
  '4': 'https://us4.shb-sync.com',
};

const ALIASES = {
  'attekmi': {area: '1', pid: '300'},
  'markapp': {area: '4', pid: '360'},
  'jdpmedia': {area: '1', pid: '382'},
  'tredio': {area: '4', pid: '337'},
  'felixads': {area: '1', pid: '406'},
  'artechnology': {area: '1', pid: '420'},
  'adinify': {area: '1', pid: '424'},
  'addigi': {area: '1', pid: '425'},
  'jambojar': {area: '1', pid: '426'},
  'anzu': {area: '1', pid: '445'},
  'amcom': {area: '1', pid: '397'},
  'adastra': {area: '1', pid: '33'},
  'radiantfusion': {area: '1', pid: '455'},
};

const BASE_URLS = {
  'attekmi': 'https://prebid.attekmi.co/pbjs',
  'smarthub': 'https://prebid.attekmi.co/pbjs',
  'markapp': 'https://markapp-prebid.attekmi.co/pbjs',
  'markapp-apac': 'https://markapp-apac-prebid.attekmi.co/pbjs',
  'jdpmedia': 'https://jdpmedia-prebid.attekmi.co/pbjs',
  'tredio': 'https://tredio-prebid.attekmi.co/pbjs',
  'felixads': 'https://felixads-prebid.attekmi.co/pbjs',
  'artechnology': 'https://artechnology-prebid.attekmi.co/pbjs',
  'adinify': 'https://adinify-prebid.attekmi.co/pbjs',
  'addigi': 'https://addigi-prebid.attekmi.co/pbjs',
  'jambojar': 'https://jambojar-prebid.attekmi.co/pbjs',
  'jambojar-apac': 'https://jambojar-apac-prebid.attekmi.co/pbjs',
  'anzu': 'https://anzu-prebid.attekmi.co/pbjs',
  'amcom': 'https://amcom-prebid.attekmi.co/pbjs',
  'adastra': 'https://adastra-prebid.attekmi.co/pbjs',
  'radiantfusion': 'https://radiantfusion-prebid.attekmi.co/pbjs',
};

const adapterState = {};

const _getPartnerUrl = (partner) => {
  const region = ALIASES[partner]?.region;
  const partnerName = region ? `${partner}-${String(region).toLocaleLowerCase()}` : partner;

  const urls = Object.keys(BASE_URLS);
  if (urls.includes(partnerName)) {
    return BASE_URLS[partnerName];
  }

  return `${BASE_URLS[BIDDER_CODE]}?partnerName=${partnerName}`;
}

const _getPartnerName = (bid) => String(bid.params?.partnerName || bid.bidder).toLowerCase();

const getPlacementReqData = buildPlacementProcessingFunction({
  addPlacementType() {},
  addCustomFieldsToPlacement(bid, bidderRequest, placement) {
    const { seat, token, iabCat, minBidfloor, pos } = bid.params;
    Object.assign(placement, {
      partnerName: _getPartnerName(bid),
      seat,
      token,
      iabCat,
      minBidfloor,
      pos,
    });
  }
})

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const bidsByPartner = validBidRequests.reduce((bidsByPartner, bid) => {
    const partner = _getPartnerName(bid);
    if (bid.params?.region) {
      const region = String(bid.params.region).toLocaleLowerCase();
      ALIASES[partner].region = region;
    }
    Object.assign(adapterState, ALIASES[partner]);
    (bidsByPartner[partner] = bidsByPartner[partner] || []).push(bid);
    return bidsByPartner;
  }, {});
  return Object.entries(bidsByPartner).map(([partner, validBidRequests]) => {
    return buildRequestsBase({
      adUrl: _getPartnerUrl(partner),
      bidderRequest,
      validBidRequests,
      placementProcessingFunction: getPlacementReqData
    })
  })
}

const getUserSyncs = (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  const syncs = baseSync('')(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent);
  const syncUrl = SYNC_URLS[adapterState.area];
  const pid = adapterState.pid;

  return syncs.map(sync => ({
    ...sync,
    url: `${syncUrl}${sync.url}&pid=${pid}`
  }));
};

export const spec = {
  code: BIDDER_CODE,
  aliases: Object.keys(ALIASES),
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: isBidRequestValid(['seat', 'token'], 'every'),
  buildRequests,
  interpretResponse: interpretResponseBuilder({
    addtlBidValidation(bid) {
      return bid.hasOwnProperty('netRevenue')
    }
  }),
  getUserSyncs
};

registerBidder(spec);
