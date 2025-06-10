import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {
  buildPlacementProcessingFunction,
  buildRequestsBase,
  interpretResponseBuilder,
  isBidRequestValid
} from '../libraries/teqblazeUtils/bidderUtils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'smarthub';
const SYNC_URLS = {
  '1': 'https://us.shb-sync.com',
  '4': 'https://us4.shb-sync.com'
};
const ALIASES = {
  'attekmi': {area: '1', pid: '300'},
  'markapp': {area: '4', pid: '360'},
  'jdpmedia': {area: '1', pid: '382'},
  'tredio': {area: '4', pid: '337'},
  'felixads': {area: '1', pid: '406'},
  'vimayx': {area: '1', pid: '399'},
  'artechnology': {area: '1', pid: '420'},
  'adinify': {area: '1', pid: '424'},
  'addigi': {area: '1', pid: '425'},
  'jambojar': {area: '1', pid: '426'},
};
const BASE_URLS = {
  attekmi: 'https://prebid.attekmi.com/pbjs',
  smarthub: 'https://prebid.attekmi.com/pbjs',
  markapp: 'https://markapp-prebid.attekmi.com/pbjs',
  jdpmedia: 'https://jdpmedia-prebid.attekmi.com/pbjs',
  tredio: 'https://tredio-prebid.attekmi.com/pbjs',
  felixads: 'https://felixads-prebid.attekmi.com/pbjs',
  vimayx: 'https://vimayx-prebid.attekmi.com/pbjs',
  artechnology: 'https://artechnology-prebid.attekmi.com/pbjs',
  adinify: 'https://adinify-prebid.attekmi.com/pbjs',
  addigi: 'https://addigi-prebid.attekmi.com/pbjs',
  jambojar: 'https://jambojar-prebid.attekmi.com/pbjs',
};
const adapterState = {};

const _getPartnerUrl = (partnerName) => {
  const aliases = Object.keys(ALIASES);
  if (aliases.includes(partnerName)) {
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
  const type = syncOptions.iframeEnabled ? 'iframe' : 'image';
  const syncUrl = SYNC_URLS[adapterState.area];
  const pidParam = adapterState.pid;
  const mainUrl = `${syncUrl}/${type}?pid=${pidParam}&pbjs=1`;
  const regParams = [mainUrl];

  if (gdprConsent && gdprConsent.consentString) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      regParams.push(`&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`);
    } else {
      regParams.push(`&gdpr=0&gdpr_consent=${gdprConsent.consentString}`);
    }
  }

  if (uspConsent && uspConsent.consentString) {
    regParams.push(`&ccpa_consent=${uspConsent.consentString}`);
  }

  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    regParams.push(`&gpp=${gppConsent.gppString}&gpp_sid=${gppConsent.applicableSections.join(',')}`);
  }

  const coppa = config.getConfig('coppa') ? 1 : 0;
  regParams.push(`&coppa=${coppa}`);

  return [{
    type,
    url: regParams.join('')
  }];
}

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
