import { hasPurpose1Consent } from '../../src/utils/gdpr.js';
import { BANNER, VIDEO } from '../../src/mediaTypes.js';
import { deepAccess, isArray, parseSizesInput } from '../../src/utils.js';

export function getUserSyncs(syncEndpoint, paramNames) {
  return function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];

    if (!hasPurpose1Consent(gdprConsent)) {
      return syncs;
    }

    let params = `${paramNames?.usp ?? 'us_privacy'}=${uspConsent ?? ''}&${paramNames?.consent ?? 'gdpr_consent'}=${gdprConsent?.consentString ?? ''}`;

    if (typeof gdprConsent?.gdprApplies === 'boolean') {
      params += `&gdpr=${Number(gdprConsent.gdprApplies)}`;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `//${syncEndpoint}/match/sp.ifr?${params}`,
      });
    }

    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `//${syncEndpoint}/match/sp?${params}`,
      });
    }

    return syncs;
  }
}

export function sspInterpretResponse(ttl, adomain) {
  return function(serverResponse, request) {
    if (!serverResponse?.body?.content?.data) {
      return [];
    }

    const bidResponses = [];
    const body = serverResponse.body;

    let mediaType = BANNER;
    let ad, vastXml;
    let width;
    let height;

    const sizes = getSize(body.size);
    if (isArray(sizes)) {
      [width, height] = sizes;
    }

    if (body.type.format !== '') {
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
      ttl: ttl,
      ad: ad,
      mediaType: mediaType,
      vastXml: vastXml,
      meta: {
        advertiserDomains: [adomain],
      }
    };

    if ((mediaType === VIDEO && request.bidRequest.mediaTypes?.video) || (mediaType === BANNER && request.bidRequest.mediaTypes?.banner)) {
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  }
}

export function sspBuildRequests(defaultEndpoint) {
  return function(validBidRequests, bidderRequest) {
    const requests = [];
    for (const bid of validBidRequests) {
      const endpoint = bid.params.endpoint || defaultEndpoint;

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
  }
}

export function sspValidRequest(bid) {
  const valid = bid.params.siteId && bid.params.placementId;

  return !!valid;
}

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
