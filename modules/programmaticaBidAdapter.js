import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { deepAccess, parseSizesInput, isArray } from '../src/utils.js';

const BIDDER_CODE = 'programmatica';
const DEFAULT_ENDPOINT = 'asr.programmatica.com';
const SYNC_ENDPOINT = 'sync.programmatica.com';
const ADOMAIN = 'programmatica.com';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    let valid = bid.params.siteId && bid.params.placementId;

    return !!valid;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let requests = [];
    for (const bid of validBidRequests) {
      let endpoint = bid.params.endpoint || DEFAULT_ENDPOINT;

      requests.push({
        method: 'GET',
        url: `https://${endpoint}/get`,
        data: {
          site_id: bid.params.siteId,
          placement_id: bid.params.placementId,
          prebid: true,
        },
        bidRequest: bid,
      });
    }

    return requests;
  },

  interpretResponse: function(serverResponse, request) {
    if (!serverResponse?.body?.content?.data) {
      return [];
    }

    const bidResponses = [];
    const body = serverResponse.body;

    let mediaType = BANNER;
    let ad, vastXml;
    let width;
    let height;

    let sizes = getSize(body.size);
    if (isArray(sizes)) {
      [width, height] = sizes;
    }

    if (body.type.format != '') {
      // banner
      ad = body.content.data;
      if (body.content.imps?.length) {
        for (const imp of body.content.imps) {
          ad += `<script src="${imp}"></script>`;
        }
      }
    } else {
      // video
      vastXml = body.content.data;
      mediaType = VIDEO;

      if (!width || !height) {
        const pSize = deepAccess(request.bidRequest, 'mediaTypes.video.playerSize');
        const reqSize = getSize(pSize);
        if (isArray(reqSize)) {
          [width, height] = reqSize;
        }
      }
    }

    const bidResponse = {
      requestId: request.bidRequest.bidId,
      cpm: body.cpm,
      currency: body.currency || 'USD',
      width: parseInt(width),
      height: parseInt(height),
      creativeId: body.id,
      netRevenue: true,
      ttl: TIME_TO_LIVE,
      ad: ad,
      mediaType: mediaType,
      vastXml: vastXml,
      meta: {
        advertiserDomains: [ADOMAIN],
      }
    };

    if ((mediaType === VIDEO && request.bidRequest.mediaTypes?.video) || (mediaType === BANNER && request.bidRequest.mediaTypes?.banner)) {
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    if (!hasPurpose1Consent(gdprConsent)) {
      return syncs;
    }

    let params = `usp=${uspConsent ?? ''}&consent=${gdprConsent?.consentString ?? ''}`;
    if (typeof gdprConsent?.gdprApplies === 'boolean') {
      params += `&gdpr=${Number(gdprConsent.gdprApplies)}`;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `//${SYNC_ENDPOINT}/match/sp.ifr?${params}`
      });
    }

    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `//${SYNC_ENDPOINT}/match/sp?${params}`
      });
    }

    return syncs;
  },

  onTimeout: function(timeoutData) {},
  onBidWon: function(bid) {},
  onSetTargeting: function(bid) {},
  onBidderError: function() {},
  supportedMediaTypes: [ BANNER, VIDEO ]
}

registerBidder(spec);

function getSize(paramSizes) {
  const parsedSizes = parseSizesInput(paramSizes);
  const sizes = parsedSizes.map(size => {
    const [width, height] = size.split('x');
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    return [w, h];
  });

  return sizes[0] || null;
}
