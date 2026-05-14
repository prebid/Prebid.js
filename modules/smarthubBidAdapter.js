import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  buildPlacementProcessingFunction,
  buildRequestsBase,
  interpretResponseBuilder,
  isBidRequestValid,
  getUserSyncs as baseSync
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'smarthub';
const DEFAULT_PROVIDER = 'attekmi';
const DEFAULT_REGION = 'us_east';

const SYNC_URLS = {
  '1': 'https://us.shb-sync.com',
  '4': 'https://us4.shb-sync.com',
};

const ALIASES = {
  'attekmi': { area: '1', pid: '300' },
  'markapp': { area: '4', pid: '360' },
  'jdpmedia': { area: '1', pid: '382' },
  'tredio': { area: '4', pid: '337' },
  'felixads': { area: '1', pid: '406' },
  'artechnology': { area: '1', pid: '420' },
  'adinify': { area: '1', pid: '424' },
  'addigi': { area: '1', pid: '425' },
  'jambojar': { area: '1', pid: '426' },
  'anzu': { area: '1', pid: '445' },
  'amcom': { area: '1', pid: '397' },
  'adastra': { area: '1', pid: '33' },
  'radiantfusion': { area: '1', pid: '455' },
};

const BASE_URL_TEMPLATES = {
  'attekmi-us_east': 'https://prebid.attekmi.co/pbjs',
  'attekmi-apac': 'https://prebid-apac.attekmi.co/pbjs',
  'attekmi-eu': 'https://prebid-eu.attekmi.co/pbjs',
};

const PARTNER_ENDPOINTS = {
  markapp: {
    us_east: 'https://markapp-prebid.attekmi.co/pbjs',
    apac: 'https://markapp-apac-prebid.attekmi.co/pbjs',
  },
  jdpmedia: {
    us_east: 'https://jdpmedia-prebid.attekmi.co/pbjs',
  },
  tredio: {
    us_east: 'https://tredio-prebid.attekmi.co/pbjs',
  },
  felixads: {
    us_east: 'https://felixads-prebid.attekmi.co/pbjs',
  },
  artechnology: {
    us_east: 'https://artechnology-prebid.attekmi.co/pbjs',
  },
  adinify: {
    us_east: 'https://adinify-prebid.attekmi.co/pbjs',
  },
  addigi: {
    us_east: 'https://addigi-prebid.attekmi.co/pbjs',
  },
  jambojar: {
    us_east: 'https://jambojar-prebid.attekmi.co/pbjs',
    apac: 'https://jambojar-apac-prebid.attekmi.co/pbjs',
  },
  anzu: {
    us_east: 'https://anzu-prebid.attekmi.co/pbjs',
  },
  amcom: {
    us_east: 'https://amcom-prebid.attekmi.co/pbjs',
  },
  adastra: {
    us_east: 'https://adastra-prebid.attekmi.co/pbjs',
  },
  radiantfusion: {
    us_east: 'https://radiantfusion-prebid.attekmi.co/pbjs',
  }
};

// -- codespace --

const normalizeRegion = (region) => {
  if (!region) return DEFAULT_REGION;
  return String(region).toLowerCase();
};

const resolveEndpoint = ({ partner, region, seat, token }) => {
  const normalizedRegion = normalizeRegion(region);
  const partnerEndpoints = PARTNER_ENDPOINTS[partner];

  const partnerEndpoint =
    partnerEndpoints?.[normalizedRegion] ||
    partnerEndpoints?.[DEFAULT_REGION];

  if (partnerEndpoint) {
    const params = new URLSearchParams({ seat, token });

    return `${partnerEndpoint}?${params.toString()}`;
  }

  const providerKey = `${DEFAULT_PROVIDER}-${normalizedRegion}`;

  const base =
    BASE_URL_TEMPLATES[providerKey] ||
    BASE_URL_TEMPLATES[`${DEFAULT_PROVIDER}-us_east`];

  const params = new URLSearchParams({ partnerName: partner, seat, token });

  return `${base}?${params.toString()}`;
};

const getPartnerName = (bid) => {
  const paramName = bid.params?.partnerName;
  const bidder = bid.bidder;

  return String(paramName || bidder).toLowerCase();
};

const getPlacementReqData = buildPlacementProcessingFunction({
  addPlacementType() {},
  addCustomFieldsToPlacement(bid, bidderRequest, placement) {
    const { seat, token, iabCat, minBidfloor, pos, region } = bid.params;

    Object.assign(placement, {
      partnerName: getPartnerName(bid),
      seat,
      token,
      iabCat,
      minBidfloor,
      pos,
      region: normalizeRegion(region)
    });
  }
})

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const bidsByKey = {};

  validBidRequests.forEach((bid) => {
    const partner = getPartnerName(bid);
    const region = normalizeRegion(bid.params?.region);
    const { seat, token } = bid.params || {};

    const key = `${partner}|${region}|${seat}|${token}`;

    (bidsByKey[key] = bidsByKey[key] || []).push(bid);
  });

  return Object.values(bidsByKey).map((bids) => {
    const partner = getPartnerName(bids[0]);
    const region = normalizeRegion(bids[0].params.region);
    const { seat, token } = bids[0].params || {};
    const endpoint = resolveEndpoint({ partner, region, seat, token });

    const request = buildRequestsBase({
      adUrl: endpoint,
      bidderRequest,
      validBidRequests: bids,
      placementProcessingFunction: getPlacementReqData
    });

    return {
      ...request,
      validBidRequests: bids
    };
  });
};

const baseInterpretResponse = interpretResponseBuilder({
  addtlBidValidation(bid) {
    return bid.hasOwnProperty('netRevenue');
  }
});

const interpretResponse = (serverResponse, request = {}) => {
  const bids = request.validBidRequests || [];
  if (!bids.length) {
    return baseInterpretResponse(serverResponse);
  }

  const partner = getPartnerName(bids[0]);
  const alias = ALIASES[partner] || { area: '1', pid: '300' };

  serverResponse.partner = partner;
  serverResponse.area = alias.area;
  serverResponse.pid = alias.pid;

  return baseInterpretResponse(serverResponse);
};

const getUserSyncs = (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  let res = serverResponses?.find?.(r => r.partner && r.area && r.pid);

  if (!res) {
    res = ALIASES[DEFAULT_PROVIDER];
  }

  const { area, pid } = res;

  const syncUrl = SYNC_URLS[area];

  if (!syncUrl || !pid) {
    return [];
  }

  const syncs = baseSync(syncUrl)(
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent,
    gppConsent
  );

  return syncs.map(sync => ({
    ...sync,
    url: `${sync.url}&pid=${pid}`
  }));
};

export const spec = {
  code: BIDDER_CODE,
  aliases: Object.keys(ALIASES),
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: isBidRequestValid(['seat', 'token'], 'every'),
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
