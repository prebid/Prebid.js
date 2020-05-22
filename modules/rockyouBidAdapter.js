import * as utils from '../src/utils';
import { Renderer } from '../src/Renderer';
import { BANNER, VIDEO } from '../src/mediaTypes';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'rockyou';

const BASE_REQUEST_PATH = 'https://tas.rockyou.net/servlet/rotator/';
const IFRAME_SYNC_URL = 'https://prebid.tas-sync.rockyou.net/usersync2/prebid';
const VAST_PLAYER_LOCATION = 'https://rya-static.rockyou.com/rya/js/PreBidPlayer.js';
export const ROTATION_ZONE = 'prod';

let isBidRequestValid = (bid) => {
  return !!bid.params && !!bid.params.placementId;
};

/**
* The RockYou Ad Serving system currently only accepts one placementId
* per Ad request. For this reason, the first placementId indicated
* will be chosen as the predominant placementId for this request.
*/
let determineOptimalPlacementId = (bidRequest) => {
  return bidRequest.params.placementId;
}

let determineOptimalRequestId = (bidRequest) => {
  return bidRequest.bidId;
}

let buildSiteComponent = (bidRequest) => {
  let topLocation = utils.getTopWindowLocation();

  let site = {
    domain: topLocation.hostname,
    page: topLocation.href,
    ref: topLocation.origin
  };

  return site;
}

let buildDeviceComponent = (bidRequest) => {
  let device = {
    js: 1,
    language: ('language' in navigator) ? navigator.language : null
  };

  return device;
};

let extractValidSize = (bidRequest) => {
  let width = null;
  let height = null;

  let requestedSizes = [];
  let mediaTypes = bidRequest.mediaTypes;
  if (mediaTypes && ((mediaTypes.banner && mediaTypes.banner.sizes) || (mediaTypes.video && mediaTypes.video.playerSize))) {
    if (mediaTypes.banner) {
      requestedSizes = mediaTypes.banner.sizes;
    } else {
      requestedSizes = [mediaTypes.video.playerSize];
    }
  } else if (!utils.isEmpty(bidRequest.sizes)) {
    requestedSizes = bidRequest.sizes
  }

  // Ensure the size array is normalized
  let conformingSize = utils.parseSizesInput(requestedSizes);

  if (!utils.isEmpty(conformingSize) && conformingSize[0] != null) {
    // Currently only the first size is utilized
    let splitSizes = conformingSize[0].split('x');

    width = parseInt(splitSizes[0]);
    height = parseInt(splitSizes[1]);
  }

  return {
    w: width,
    h: height
  };
};

let generateVideoComponent = (bidRequest) => {
  let impSize = extractValidSize(bidRequest);

  return {
    w: impSize.w,
    h: impSize.h
  }
}

let generateBannerComponent = (bidRequest) => {
  let impSize = extractValidSize(bidRequest);

  return {
    w: impSize.w,
    h: impSize.h
  }
}

let generateImpBody = (bidRequest) => {
  let mediaTypes = bidRequest.mediaTypes;

  let banner = null;
  let video = null;

  // Assume banner if the mediatype is not included
  if (mediaTypes && mediaTypes.video) {
    video = generateVideoComponent(bidRequest);
  } else {
    banner = generateBannerComponent(bidRequest);
  }

  return {
    id: bidRequest.index,
    banner: banner,
    video: video
  };
}

let generatePayload = (bidRequest) => {
  // Generate the expected OpenRTB payload

  let payload = {
    id: determineOptimalRequestId(bidRequest),
    site: buildSiteComponent(bidRequest),
    device: buildDeviceComponent(bidRequest),
    imp: [generateImpBody(bidRequest)]
  };

  return JSON.stringify(payload);
};

let overridableProperties = (request) => {
  let rendererLocation = VAST_PLAYER_LOCATION;
  let baseRequestPath = BASE_REQUEST_PATH;
  let rotationZone = ROTATION_ZONE;

  if (!utils.isEmpty(request.rendererOverride)) {
    rendererLocation = request.rendererOverride;
  }

  if (request.params) {
    if (!utils.isEmpty(request.params.baseRequestPath)) {
      baseRequestPath = request.params.baseRequestPath;
    }

    if (!utils.isEmpty(request.params.rotationZone)) {
      rotationZone = request.params.rotationZone;
    }
  }

  return {
    rendererLocation,
    baseRequestPath,
    rotationZone
  }
}

let buildRequests = (validBidRequests, requestRoot) => {
  const requestType = 'POST';

  let requestUrl = null;
  let requestPayload = null;
  let mediaTypes = null;
  let adUnitCode = null;
  let rendererOverride = null;

  let results = [];
  // Due to the nature of how URLs are generated, there must
  // be at least one bid request present for this to function
  // correctly
  if (!utils.isEmpty(validBidRequests)) {
    results = validBidRequests.map(
      bidRequest => {
        let serverLocations = overridableProperties(bidRequest);

        // requestUrl is the full endpoint w/ relevant adspot paramters
        let placementId = determineOptimalPlacementId(bidRequest);
        requestUrl = `${serverLocations.baseRequestPath}${placementId}/0/vo?z=${serverLocations.rotationZone}`;

        // requestPayload is the POST body JSON for the OpenRtb request
        requestPayload = generatePayload(bidRequest);

        mediaTypes = bidRequest.mediaTypes;
        adUnitCode = bidRequest.adUnitCode;
        rendererOverride = bidRequest.rendererOverride;

        return {
          method: requestType,
          type: requestType,
          url: requestUrl,
          data: requestPayload,
          mediaTypes,
          requestId: requestRoot.bidderRequestId,
          bidId: bidRequest.bidId,
          adUnitCode,
          rendererOverride
        };
      }
    );
  }

  return results;
};

let outstreamRender = (bid) => {
  // push to render queue because player may not be loaded yet
  bid.renderer.push(() => {
    let adUnitCode = bid.renderer.config.adUnitCode;

    try {
      RockYouVastPlayer.render(adUnitCode, bid, playerCallbacks(bid.renderer));
    } catch (pbe) {
      utils.logError(pbe);
    }
  });
}

let rockYouEventTranslation = (rockYouEvent) => {
  let translated;
  switch (rockYouEvent) {
    case 'LOAD':
      translated = 'loaded';
      break;
    case 'IMPRESSION':
      translated = 'impression';
      break;
    case 'COMPLETE':
    case 'ERROR':
      translated = 'ended'
      break;
  }

  return translated;
}

let playerCallbacks = (renderer) => (id, eventName) => {
  eventName = rockYouEventTranslation(eventName);

  if (eventName) {
    renderer.handleVideoEvent({ id, eventName });
  }
};

let generateRenderer = (bid, adUnitCode, rendererLocation) => {
  let renderer = Renderer.install({
    url: rendererLocation,
    config: {
      adText: `RockYou Outstream Video Ad`,
      adUnitCode: adUnitCode
    },
    id: bid.id
  });

  bid.renderer = renderer;

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  renderer.setEventHandlers({
    impression: () => utils.logMessage('RockYou outstream video impression event'),
    loaded: () => utils.logMessage('RockYou outstream video loaded event'),
    ended: () => {
      utils.logMessage('RockYou outstream renderer video event');
      document.querySelector(`#${adUnitCode}`).style.display = 'none';
    }
  });

  return renderer;
};

let interpretResponse = (serverResponse, request) => {
  let responses = [];

  if (serverResponse.body) {
    let responseBody = serverResponse.body;

    if (responseBody != null) {
      let seatBids = responseBody.seatbid;

      if (!(utils.isEmpty(seatBids) ||
            utils.isEmpty(seatBids[0].bid))) {
        let bid = seatBids[0].bid[0];

        // handle any values that may end up undefined
        let nullify = (value) => typeof value === 'undefined' ? null : value;

        let ttl = null;
        if (bid.ext) {
          ttl = nullify(bid.ext.ttl);
        }

        let bidWidth = nullify(bid.w);
        let bidHeight = nullify(bid.h);

        let bannerCreative = null;
        let videoXml = null;
        let mediaType = null;
        let renderer = null;

        if (request.mediaTypes && request.mediaTypes.video) {
          videoXml = bid.adm;
          mediaType = VIDEO;

          let serversideLocations = overridableProperties(request);

          renderer = generateRenderer(bid, request.adUnitCode, serversideLocations.rendererLocation);
        } else {
          bannerCreative = bid.adm;
        }

        let response = {
          requestId: request.bidId,
          cpm: bid.price,
          width: bidWidth,
          height: bidHeight,
          ad: bannerCreative,
          ttl: ttl,
          creativeId: bid.adid,
          netRevenue: true,
          currency: responseBody.cur,
          vastUrl: null,
          vastXml: videoXml,
          dealId: null,
          mediaType: mediaType,
          renderer: renderer
        };

        responses.push(response);
      }
    }
  }

  return responses;
};

let getUserSyncs = (syncOptions, serverResponses) => {
  const syncs = []

  if (syncOptions.iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: IFRAME_SYNC_URL
    });
  }

  return syncs;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ry'],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  getUserSyncs: getUserSyncs,
  supportedMediaTypes: [BANNER, VIDEO]
};

export const internals = {
  playerCallbacks,
  generateRenderer
}

registerBidder(spec);
