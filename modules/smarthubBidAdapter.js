import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {
  buildPlacementProcessingFunction,
  buildRequestsBase,
  interpretResponseBuilder,
  isBidRequestValid
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'smarthub';
const ALIASES = [
  {code: 'attekmi'},
  {code: 'markapp'},
  {code: 'jdpmedia'},
  {code: 'tredio'},
  {code: 'felixads'},
  {code: 'vimayx'},
  {code: 'artechnology'},
  {code: 'adinify'},
  {code: 'addigi'},
  {code: 'jambojar'},
];
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

const _getUrl = (partnerName) => {
  const aliases = ALIASES.map(el => el.code);
  if (aliases.includes(partnerName)) {
    return BASE_URLS[partnerName];
  }

  return `${BASE_URLS[BIDDER_CODE]}?partnerName=${partnerName}`;
}

const getPartnerName = (bid) => String(bid.params?.partnerName || bid.bidder).toLowerCase();

const getPlacementReqData = buildPlacementProcessingFunction({
  addPlacementType() {},
  addCustomFieldsToPlacement(bid, bidderRequest, placement) {
    const { seat, token, iabCat, minBidfloor, pos } = bid.params;
    Object.assign(placement, {
      partnerName: getPartnerName(bid),
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
    const partner = getPartnerName(bid);
    (bidsByPartner[partner] = bidsByPartner[partner] || []).push(bid);
    return bidsByPartner;
  }, {});
  return Object.entries(bidsByPartner).map(([partner, validBidRequests]) => {
    return buildRequestsBase({
      adUrl: _getUrl(partner),
      bidderRequest,
      validBidRequests,
      placementProcessingFunction: getPlacementReqData
    })
  })
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: isBidRequestValid(['seat', 'token'], 'every'),
  buildRequests,
  interpretResponse: interpretResponseBuilder({
    addtlBidValidation(bid) {
      return bid.hasOwnProperty('netRevenue')
    }
  })
};

registerBidder(spec);
