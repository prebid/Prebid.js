import type { CreativeAttribute } from 'iab-adcom';
import type { Device } from 'iab-openrtb/v25';

import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';
import { config } from '../../src/config.js';
import type {
  BaseBidderRequest,
  BidRequest
} from '../../src/adapterManager.ts';
import type {
  AdapterRequest,
  AdapterResponse,
  ServerResponse
} from '../../src/adapters/bidderFactory.ts';
import {
  CONSENT_GDPR,
  CONSENT_GPP,
  CONSENT_USP,
  type ConsentData
} from '../../src/consentHandler.ts';
import type { SyncType } from '../../src/userSync.ts';
import type { BidderCode, Size } from '../../src/types/common.d.ts';
import type { DeepPartial } from '../../src/types/objects.d.ts';

const PROTOCOL_PATTERN = /^[a-z0-9.+-]+:/i;

// ── TeqBlaze-specific types ───────────────────────────────────────────────────

type Mode = 'every' | 'some';

interface TeqBlazeBidParams {
  placementId?: string | number;
  endpointId?: string | number;
}

interface RequestBody {
  deviceWidth: number;
  deviceHeight: number;
  language: string;
  secure: 0 | 1;
  host: string;
  page: string;
  placements: Placement[];
  coppa: 0 | 1;
  tmax: number;
  bcat?: string[];
  badv?: string[];
  bapp?: string[];
  ccpa?: string;
  gdpr?: { consentString: string };
  gpp?: string;
  gpp_sid?: number[];
  device?: DeepPartial<Device>;
}

interface Placement {
  bidId: string;
  schain: unknown;
  bidfloor: number | undefined;
  adFormat?: string;
  sizes?: Size | Size[];
  playerSize?: Size | Size[];
  minduration?: number;
  maxduration?: number;
  mimes?: string[];
  protocols?: number[];
  startdelay?: number;
  placement?: number;
  plcmt?: number;
  skip?: number | boolean;
  skipafter?: number;
  minbitrate?: number;
  maxbitrate?: number;
  delivery?: number[];
  playbackmethod?: number[];
  api?: number[];
  linearity?: number;
  native?: unknown;
  ext?: { tid?: string };
  eids?: unknown[];
  gpid?: string;
  battr?: CreativeAttribute[];
  placementId?: string | number;
  endpointId?: string | number;
  type?: 'publisher' | 'network';
}

interface PlacementProcessingConfig {
  addPlacementType?: (bid: BidRequest<BidderCode>, bidderRequest: BaseBidderRequest<BidderCode>, placement: Placement) => void;
  addCustomFieldsToPlacement?: (bid: BidRequest<BidderCode>, bidderRequest: BaseBidderRequest<BidderCode>, placement: Placement) => void;
}

interface BuildRequestsBaseConfig {
  adUrl: string;
  validBidRequests: BidRequest<BidderCode>[];
  bidderRequest: BaseBidderRequest<BidderCode>;
  placementProcessingFunction?: (bid: BidRequest<BidderCode>, bidderRequest: BaseBidderRequest<BidderCode>) => Placement;
}

// ── Implementation ────────────────────────────────────────────────────────────

const isBidResponseValid = (bid: any): boolean => {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency) {
    return false;
  }

  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl || bid.vastXml);
    case NATIVE:
      return Boolean(bid.native && bid.native.impressionTrackers && bid.native.impressionTrackers.length);
    default:
      return false;
  }
};

const getBidFloor = (bid: BidRequest<BidderCode>): number => {
  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });

    return bidFloor?.floor;
  } catch (err) {
    return 0;
  }
};

const createBasePlacement = (bid: BidRequest<BidderCode>, bidderRequest: BaseBidderRequest<BidderCode>): Placement => {
  const { bidId, mediaTypes, transactionId, userIdAsEids, ortb2Imp } = bid;
  const schain = bidderRequest?.ortb2?.source?.ext?.schain || {};
  const bidfloor = getBidFloor(bid);

  const placement: Placement = {
    bidId,
    schain,
    bidfloor
  };

  if (mediaTypes && mediaTypes[BANNER]) {
    placement.adFormat = BANNER;
    placement.sizes = mediaTypes[BANNER].sizes;
    placement.battr = mediaTypes[BANNER].battr;
  } else if (mediaTypes && mediaTypes[VIDEO]) {
    placement.adFormat = VIDEO;
    placement.playerSize = mediaTypes[VIDEO].playerSize;
    placement.minduration = mediaTypes[VIDEO].minduration;
    placement.maxduration = mediaTypes[VIDEO].maxduration;
    placement.mimes = mediaTypes[VIDEO].mimes;
    placement.protocols = mediaTypes[VIDEO].protocols;
    placement.startdelay = mediaTypes[VIDEO].startdelay;
    placement.placement = mediaTypes[VIDEO].placement;
    placement.plcmt = mediaTypes[VIDEO].plcmt;
    placement.skip = mediaTypes[VIDEO].skip;
    placement.skipafter = mediaTypes[VIDEO].skipafter;
    placement.minbitrate = mediaTypes[VIDEO].minbitrate;
    placement.maxbitrate = mediaTypes[VIDEO].maxbitrate;
    placement.delivery = mediaTypes[VIDEO].delivery;
    placement.playbackmethod = mediaTypes[VIDEO].playbackmethod;
    placement.api = mediaTypes[VIDEO].api;
    placement.linearity = mediaTypes[VIDEO].linearity;
    placement.battr = mediaTypes[VIDEO].battr;
  } else if (mediaTypes && mediaTypes[NATIVE]) {
    placement.native = mediaTypes[NATIVE];
    placement.adFormat = NATIVE;
  }

  if (transactionId) {
    placement.ext = placement.ext || {};
    placement.ext.tid = transactionId;
  }

  if (userIdAsEids && userIdAsEids.length) {
    placement.eids = userIdAsEids;
  }

  if (ortb2Imp?.ext?.gpid) {
    placement.gpid = ortb2Imp.ext.gpid as string;
  }

  return placement;
};

const defaultPlacementType = (bid: BidRequest<BidderCode>, _bidderRequest: BaseBidderRequest<BidderCode>, placement: Placement): void => {
  const { placementId, endpointId } = bid.params as TeqBlazeBidParams;

  if (placementId) {
    placement.placementId = placementId;
    placement.type = 'publisher';
  } else if (endpointId) {
    placement.endpointId = endpointId;
    placement.type = 'network';
  }
};

const checkIfObjectHasKey = (keys: string[], obj: Record<string, unknown>, mode: Mode = 'some'): boolean => {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = obj[key];

    if (mode === 'some' && val) return true;
    if (mode === 'every' && !val) return false;
  }

  return mode === 'every';
}

export const isBidRequestValid =
    (keys: string[] = ['placementId', 'endpointId'], mode?: Mode) =>
      (bid: BidRequest<BidderCode>): boolean => {
        const { params, bidId, mediaTypes } = bid;
        let valid = Boolean(bidId && params && checkIfObjectHasKey(keys, params, mode));

        if (mediaTypes && mediaTypes[BANNER]) {
          valid = valid && Boolean(mediaTypes[BANNER] && mediaTypes[BANNER].sizes);
        } else if (mediaTypes && mediaTypes[VIDEO]) {
          valid = valid && Boolean(mediaTypes[VIDEO] && mediaTypes[VIDEO].playerSize);
        } else if (mediaTypes && mediaTypes[NATIVE]) {
          valid = valid && Boolean(mediaTypes[NATIVE]);
        } else {
          valid = false;
        }

        return valid;
      };

export const buildRequestsBase = (config: BuildRequestsBaseConfig): AdapterRequest => {
  const { adUrl, validBidRequests, bidderRequest } = config;
  const placementProcessingFunction = config.placementProcessingFunction || buildPlacementProcessingFunction();
  const device = bidderRequest?.ortb2?.device;
  const page = bidderRequest?.refererInfo?.page || '';

  const proto = PROTOCOL_PATTERN.exec(page);
  const protocol = proto?.[0];

  const placements: Placement[] = [];
  const request: RequestBody = {
    deviceWidth: device?.w || 0,
    deviceHeight: device?.h || 0,
    language: device?.language?.split('-')[0] || '',
    secure: protocol === 'https:' ? 1 : 0,
    host: bidderRequest?.refererInfo?.domain || '',
    page,
    placements,
    coppa: bidderRequest?.ortb2?.regs?.coppa ? 1 : 0,
    tmax: bidderRequest.timeout,
    bcat: bidderRequest?.ortb2?.bcat,
    badv: bidderRequest?.ortb2?.badv,
    bapp: bidderRequest?.ortb2?.bapp
  };

  if (bidderRequest.uspConsent) {
    request.ccpa = bidderRequest.uspConsent;
  }

  if (bidderRequest.gdprConsent) {
    request.gdpr = {
      consentString: bidderRequest.gdprConsent.consentString
    };
  }

  if (bidderRequest.gppConsent) {
    request.gpp = bidderRequest.gppConsent.gppString;
    request.gpp_sid = bidderRequest.gppConsent.applicableSections;
  } else if (bidderRequest.ortb2?.regs?.gpp) {
    request.gpp = bidderRequest.ortb2.regs.gpp;
    request.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
  }

  if (bidderRequest?.ortb2?.device) {
    request.device = bidderRequest.ortb2.device;
  }

  const len = validBidRequests.length;
  for (let i = 0; i < len; i++) {
    const bid = validBidRequests[i];
    placements.push(placementProcessingFunction(bid, bidderRequest));
  }

  return {
    method: 'POST',
    url: adUrl,
    data: request
  };
};

export const buildRequests =
    (adUrl: string) =>
      (validBidRequests: BidRequest<BidderCode>[] = [], bidderRequest: BaseBidderRequest<BidderCode>): AdapterRequest => {
        const placementProcessingFunction = buildPlacementProcessingFunction();

        return buildRequestsBase({ adUrl, validBidRequests, bidderRequest, placementProcessingFunction });
      };

export function interpretResponseBuilder({ addtlBidValidation = (_bid: any): boolean => true } = {}) {
  return function (serverResponse: ServerResponse): AdapterResponse {
    const response = [];
    for (let i = 0; i < serverResponse.body.length; i++) {
      const resItem = serverResponse.body[i];
      if (isBidResponseValid(resItem) && addtlBidValidation(resItem)) {
        const advertiserDomains = resItem.adomain && resItem.adomain.length ? resItem.adomain : [];
        resItem.meta = { ...resItem.meta, advertiserDomains };

        response.push(resItem);
      }
    }

    return response;
  }
}

export const interpretResponse = interpretResponseBuilder();

export const getUserSyncs = (syncUrl: string) => (
  syncOptions: { iframeEnabled: boolean; pixelEnabled: boolean },
  _serverResponses: ServerResponse[],
  gdprConsent: null | ConsentData[typeof CONSENT_GDPR],
  uspConsent: null | ConsentData[typeof CONSENT_USP],
  gppConsent: null | ConsentData[typeof CONSENT_GPP]
): { type: SyncType; url: string }[] => {
  if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
    return [];
  }

  const type: SyncType = syncOptions.iframeEnabled ? 'iframe' : 'image';
  let url = syncUrl + `/${type}?pbjs=1`;

  if (gdprConsent && gdprConsent.consentString) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      url += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      url += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
    }
  }

  if (uspConsent) {
    url += `&ccpa_consent=${uspConsent}`;
  }

  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    url += '&gpp=' + gppConsent.gppString;
    url += '&gpp_sid=' + gppConsent.applicableSections.join(',');
  }

  const coppa = config.getConfig('coppa') ? 1 : 0;
  url += `&coppa=${coppa}`;

  return [{
    type,
    url
  }];
};

export const buildPlacementProcessingFunction =
    (config?: PlacementProcessingConfig) =>
      (bid: BidRequest<BidderCode>, bidderRequest: BaseBidderRequest<BidderCode>): Placement => {
        const addPlacementType = config?.addPlacementType ?? defaultPlacementType;

        const placement = createBasePlacement(bid, bidderRequest);

        addPlacementType(bid, bidderRequest, placement);

        if (config?.addCustomFieldsToPlacement) {
          config.addCustomFieldsToPlacement(bid, bidderRequest, placement);
        }

        return placement;
      };
