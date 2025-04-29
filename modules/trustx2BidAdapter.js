import {
  logInfo,
  logError,
  logMessage,
  deepAccess,
  deepSetValue,
  mergeDeep,
  ajax
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 */

const BIDDER_CODE = 'trustx2';
const BID_TTL = 300;
const NET_REVENUE = true;
const SUPPORTED_CURRENCY = 'USD';
const OUTSTREAM_PLAYER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
const USYNC_DELETE_URL = 'https://ads.trustx.org/usync-delete';
const ADAPTER_VERSION = '1.0';
const USER_ID_KEY = 'trustx2uid';
const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const ortbAdapterConverter = ortbConverter({
  context: {
    netRevenue: NET_REVENUE,
    ttl: BID_TTL
  },
  imp(buildImp, bidRequest, context) {
    const impression = buildImp(bidRequest, context);

    if (!impression.bidfloor) {
      impression.bidfloor = bidRequest.params.bidfloor || 0;
      impression.bidfloorcur = bidRequest.params.currency || SUPPORTED_CURRENCY;
    }
    return impression;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const requestObj = buildRequest(imps, bidderRequest, context);
    mergeDeep(requestObj, {
      ext: {
        hb: 1,
        prebidver: '$prebid.version$',
        adapterver: ADAPTER_VERSION,
      }
    });

    // GDPR
    if (bidderRequest.gdprConsent) {
      deepSetValue(requestObj, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(requestObj, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest.uspConsent) {
      deepSetValue(requestObj, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    // GPP
    if (bidderRequest.gppConsent?.gppString) {
      deepSetValue(requestObj, 'regs.gpp', bidderRequest.gppConsent.gppString);
      deepSetValue(requestObj, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections);
    } else if (bidderRequest.ortb2?.regs?.gpp) {
      deepSetValue(requestObj, 'regs.gpp', bidderRequest.ortb2.regs.gpp);
      deepSetValue(requestObj, 'regs.gpp_sid', bidderRequest.ortb2.regs.gpp_sid);
    }

    // COPPA
    if (config.getConfig('coppa') === true) {
      deepSetValue(requestObj, 'regs.coppa', 1);
    }

    // DSA
    if (bidderRequest.ortb2?.regs?.ext?.dsa) {
      if (!requestObj.regs) {
        requestObj.regs = {ext: {}};
      }
      if (!requestObj.regs.ext) {
        requestObj.regs.ext = {};
      }
      requestObj.regs.ext.dsa = bidderRequest.ortb2.regs.ext.dsa;
    }

    // User IDs (eIDs)
    if (bidderRequest.bidRequests && bidderRequest.bidRequests.length > 0) {
      const bidRequest = bidderRequest.bidRequests[0];
      if (bidRequest.userIdAsEids && bidRequest.userIdAsEids.length > 0) {
        deepSetValue(requestObj, 'user.ext.eids', bidRequest.userIdAsEids);
      }

      // Supply Chain (schain)
      if (bidRequest.schain) {
        deepSetValue(requestObj, 'source.ext.schain', bidRequest.schain);
      }
    }

    // User Data Segments
    if (bidderRequest.ortb2?.user?.data) {
      const userData = bidderRequest.ortb2.user.data;
      if (Array.isArray(userData) && userData.length > 0) {
        if (!requestObj.user) requestObj.user = {};
        if (!requestObj.user.data) requestObj.user.data = [];
        requestObj.user.data = requestObj.user.data.concat(userData);
      }
    }

    // Site First Party Data
    if (bidderRequest.ortb2?.site) {
      const site = bidderRequest.ortb2.site;
      if (!requestObj.site) requestObj.site = {};

      // Common site fields
      const siteFields = ['name', 'domain', 'page', 'ref', 'search', 'keywords', 'cat', 'pagecat'];
      siteFields.forEach(field => {
        if (site[field]) {
          requestObj.site[field] = site[field];
        }
      });

      // Content data
      if (site.content) {
        if (!requestObj.site.content) requestObj.site.content = {};

        // Copy content fields
        const contentFields = ['id', 'title', 'series', 'season', 'episode', 'genre'];
        contentFields.forEach(field => {
          if (site.content[field]) {
            requestObj.site.content[field] = site.content[field];
          }
        });

        // Content data segments
        if (site.content.data) {
          if (!requestObj.site.content.data) requestObj.site.content.data = [];
          requestObj.site.content.data = requestObj.site.content.data.concat(site.content.data);
        }
      }

      // Site extensions
      if (site.ext) {
        if (!requestObj.site.ext) requestObj.site.ext = {};
        mergeDeep(requestObj.site.ext, site.ext);
      }
    }

    return requestObj;
  },
  bidResponse(buildBidResponse, bid, context) {
    const {bidRequest} = context;
    let responseMediaType;

    if (bid.mtype === 2) {
      responseMediaType = VIDEO;
    } else if (bid.mtype === 1) {
      responseMediaType = BANNER;
    } else {
      responseMediaType = BANNER;
    }

    context.mediaType = responseMediaType;
    context.currency = SUPPORTED_CURRENCY;

    if (responseMediaType === VIDEO) {
      context.vastXml = bid.adm;
    }

    const bidResponseObj = buildBidResponse(bid, context);

    if (responseMediaType === VIDEO && bidRequest.mediaTypes.video.context === 'outstream') {
      bidResponseObj.renderer = setupOutstreamRenderer(bidResponseObj);
      bidResponseObj.adResponse = {
        content: bidResponseObj.vastXml,
        width: bidResponseObj.width,
        height: bidResponseObj.height
      };
    }

    return bidResponseObj;
  }
});

export const spec = {
  code: BIDDER_CODE,
  VERSION: ADAPTER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO],
  ENDPOINT: 'https://ads.trustx.org/pbhb',

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return (
      isParamsValid(bid) &&
      isBannerValid(bid) &&
      isVideoValid(bid)
    );
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests
   * @param {object} bidderRequest bidder request object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const adType = containsVideoRequest(validBidRequests) ? VIDEO : BANNER;
    const requestData = ortbAdapterConverter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context: {contextMediaType: adType}
    });

    let publisherId = validBidRequests[0].params.publisher_id;
    let placementId = validBidRequests[0].params.placement_id;

    if (validBidRequests[0].params.e2etest) {
      logMessage('trustx2 test mode enabled');
      publisherId = 'test';
    }

    let endpointUrl = `${spec.ENDPOINT}?publisher_id=${publisherId}`;

    if (placementId) {
      endpointUrl += `&placement_id=${placementId}`;
    }

    return {
      method: 'POST',
      url: endpointUrl,
      data: requestData
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {object} bidRequest The bid request object.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const userId = deepAccess(serverResponse, 'body.ext.userid');
    if (userId && config.getConfig('localStorageWriteAllowed')) {
      if (storage.localStorageIsEnabled()) {
        storage.setDataInLocalStorage(USER_ID_KEY, userId);
      }
    }

    return ortbAdapterConverter.fromORTB({
      response: serverResponse.body,
      request: bidRequest.data
    }).bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {object[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    logInfo('trustx2.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses);
    let syncElements = [];

    // Early return if sync is completely disabled
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncElements;
    }

    serverResponses.forEach(resp => {
      const userSync = deepAccess(resp, 'body.ext.usersync');
      if (userSync) {
        let syncUrls = [];
        Object.keys(userSync).forEach(key => {
          const value = userSync[key];
          if (value.syncs && value.syncs.length) {
            syncUrls = syncUrls.concat(value.syncs);
          }
        });

        syncUrls.forEach(syncItem => {
          syncElements.push({
            type: syncItem.type === 'iframe' ? 'iframe' : 'image',
            url: syncItem.url
          });
        });

        // Per requirement: If iframeEnabled, return only iframes;
        // if not iframeEnabled but pixelEnabled, return only pixels
        if (syncOptions.iframeEnabled) {
          syncElements = syncElements.filter(s => s.type === 'iframe');
        } else if (syncOptions.pixelEnabled) {
          syncElements = syncElements.filter(s => s.type === 'image');
        }
      }
    });

    logInfo('trustx2.getUserSyncs result=%o', syncElements);
    return syncElements;
  },

  /**
   * Handle data deletion requests
   * This will both delete local storage data and notify the server
   */
  onDataDeletionRequest: function(data) {
    if (storage.localStorageIsEnabled()) {
      storage.removeDataFromLocalStorage(USER_ID_KEY);
    }
    ajax(USYNC_DELETE_URL, null, null, {
      method: 'GET',
      withCredentials: true,
      browsingTopics: false
    });
  },
};

/**
 * Creates an outstream renderer for video ads
 * @param {Bid} bid The bid response
 * @return {Renderer} A renderer for outstream video
 */
function setupOutstreamRenderer(bid) {
  const renderer = Renderer.install({
    id: bid.adId,
    url: OUTSTREAM_PLAYER_URL,
    loaded: false
  });

  renderer.setRender(outstreamRender);

  return renderer;
}

/**
 * Outstream renderer function called by the renderer
 * @param {Object} bid The bid object
 */
function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bid.width, bid.height],
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse
    });
  });
}


/* ========
 * Helpers
 *=========
 */

/**
 * Checks if the bid request has banner media type
 * @param {BidRequest} bidRequest
 * @return {boolean} True if has banner media type
 */
function hasBannerFormat(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner');
}

/**
 * Checks if the bid request has video media type
 * @param {BidRequest|BidRequest[]} bidRequest bid request or array of bid requests
 * @return {boolean} True if has video media type
 */
function containsVideoRequest(bidRequest) {
  if (Array.isArray(bidRequest)) {
    return bidRequest.some(bid => !!deepAccess(bid, 'mediaTypes.video'));
  }
  return !!deepAccess(bidRequest, 'mediaTypes.video');
}

/**
 * Validates basic bid parameters
 * @param {BidRequest} bidRequest
 * @return {boolean} True if parameters are valid
 */
function isParamsValid(bidRequest) {
  if (!bidRequest.params) {
    return false;
  }

  if (bidRequest.params.e2etest) {
    return true;
  }

  if (!bidRequest.params.publisher_id) {
    logError('trustx2 validation failed: Publisher ID (publisher_id) not declared');
    return false;
  }

  if (!bidRequest.params.placement_id) {
    logError('trustx2 validation failed: Placement ID (placement_id) not declared');
    return false;
  }

  const hasMediaType = containsVideoRequest(bidRequest) || hasBannerFormat(bidRequest);
  if (!hasMediaType) {
    return false;
  }

  return true;
}

/**
 * Validates banner bid request
 * @param {BidRequest} bidRequest
 * @return {boolean} True if valid banner bid request
 */
function isBannerValid(bidRequest) {
  // If there's no banner no need to validate
  if (!hasBannerFormat(bidRequest)) {
    return true;
  }

  const banner = deepAccess(bidRequest, 'mediaTypes.banner');
  if (!Array.isArray(banner.sizes)) {
    return false;
  }

  return true;
}

/**
 * Validates video bid request
 * @param {BidRequest} bidRequest
 * @return {boolean} True if valid video bid request
 */
function isVideoValid(bidRequest) {
  // If there's no video no need to validate
  if (!containsVideoRequest(bidRequest)) {
    return true;
  }

  const videoConfig = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidParams = deepAccess(bidRequest, 'params.video', {});
  const params = deepAccess(bidRequest, 'params', {});

  if (params && params.e2etest) {
    return true;
  }

  const consolidatedVideoParams = {
    ...videoConfig,
    ...videoBidParams // Bidder Specific overrides
  };

  if (!Array.isArray(consolidatedVideoParams.mimes) || consolidatedVideoParams.mimes.length === 0) {
    logError('trustx2 validation failed: mimes are invalid');
    return false;
  }

  if (!Array.isArray(consolidatedVideoParams.protocols) || consolidatedVideoParams.protocols.length === 0) {
    logError('trustx2 validation failed: protocols are invalid');
    return false;
  }

  if (!consolidatedVideoParams.context) {
    logError('trustx2 validation failed: context id not declared');
    return false;
  }

  if (consolidatedVideoParams.context !== 'instream' && consolidatedVideoParams.context !== 'outstream') {
    logError('trustx2 validation failed: only context instream or outstream is supported');
    return false;
  }

  if (typeof consolidatedVideoParams.playerSize === 'undefined' || !Array.isArray(consolidatedVideoParams.playerSize) || !Array.isArray(consolidatedVideoParams.playerSize[0])) {
    logError('trustx2 validation failed: player size not declared or is not in format [[w,h]]');
    return false;
  }

  return true;
}

registerBidder(spec);
