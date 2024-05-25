import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';
import { deepAccess } from '../src/utils.js';

/**
 * Get video metadata from bid request
 *
 * @param {BidRequest} bidRequest A valid bid requests that should be sent to the Server.
 * @return video metadata
 */
function getVideoMetadata(bidRequest, bidderRequest) {
  const videoParams = deepAccess(bidRequest, 'params.video', {});

  // As per oRTB 2.5 spec, "A bid request must not contain both an App and a Site object."
  // See section 3.2.14
  // Content object is either from Object: Site or Object: App
  const contentObj = deepAccess(bidderRequest, 'ortb2.site')
    ? deepAccess(bidderRequest, 'ortb2.site.content')
    : deepAccess(bidderRequest, 'ortb2.app.content');

  const parsedContentData = {
    // Store as object keys to ensure uniqueness
    iabcat1: {},
    iabcat2: {},
  };

  deepAccess(contentObj, 'data', []).forEach((data) => {
    if ([4, 5, 6, 7].includes(data?.ext?.segtax)) {
      (Array.isArray(data.segment) ? data.segment : []).forEach((segment) => {
        if (typeof segment.id === 'string') {
          // See https://docs.prebid.org/features/firstPartyData.html#segments-and-taxonomy
          // Only take IAB cats of taxonomy V1
          if (data.ext.segtax === 4) {
            parsedContentData.iabcat1[segment.id] = 1;
          } else {
            // Only take IAB cats of taxonomy V2 or higher
            parsedContentData.iabcat2[segment.id] = 1;
          }
        }
      });
    }
  });

  const videoMetadata = {
    description: videoParams.description || '',
    duration: videoParams.duration || deepAccess(contentObj, 'len', 0),
    iabcat1: Array.isArray(videoParams.iabcat1)
      ? videoParams.iabcat1
      : Array.isArray(deepAccess(contentObj, 'cat'))
        ? contentObj.cat
        : Object.keys(parsedContentData.iabcat1),
    iabcat2: Array.isArray(videoParams.iabcat2)
      ? videoParams.iabcat2
      : Object.keys(parsedContentData.iabcat2),
    id: videoParams.id || deepAccess(contentObj, 'id', ''),
    lang: videoParams.lang || deepAccess(contentObj, 'language', ''),
    private: videoParams.private || false,
    tags: videoParams.tags || deepAccess(contentObj, 'keywords', ''),
    title: videoParams.title || deepAccess(contentObj, 'title', ''),
    topics: videoParams.topics || '',
    xid: videoParams.xid || '',
    livestream: typeof videoParams.livestream === 'number'
      ? !!videoParams.livestream
      : !!deepAccess(contentObj, 'livestream', 0),
  };

  return videoMetadata;
}

export const spec = {
  code: 'dailymotion',
  gvlid: 573,
  supportedMediaTypes: [VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   * The only mandatory parameter for a bid to be valid is the API key.
   * Other parameters are optional.
   *
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (bid?.params) {
      // We only accept video adUnits
      if (!bid?.mediaTypes?.[VIDEO]) return false;

      // As `context`, `placement` & `plcmt` are optional (although recommended)
      // values, we check the 3 of them to see if we are in an instream video context
      const isInstream = bid.mediaTypes[VIDEO].context === 'instream' ||
        bid.mediaTypes[VIDEO].placement === 1 ||
        bid.mediaTypes[VIDEO].plcmt === 1;

      // We only accept instream video context
      if (!isInstream) return false;

      // We need API key
      return typeof bid.params.apiKey === 'string' && bid.params.apiKey.length > 10;
    }

    return false;
  },

  /**
   * Make a server request from the list of valid BidRequests (that already passed the isBidRequestValid call)
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @param {BidderRequest} bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests = [], bidderRequest) => validBidRequests.map(bid => ({
    method: 'POST',
    url: 'https://pb.dmxleo.com',
    data: {
      bidder_request: {
        gdprConsent: {
          apiVersion: deepAccess(bidderRequest, 'gdprConsent.apiVersion', 1),
          consentString: deepAccess(bidderRequest, 'gdprConsent.consentString', ''),
          // Cast boolean in any case (eg: if value is int) to ensure type
          gdprApplies: !!deepAccess(bidderRequest, 'gdprConsent.gdprApplies'),
        },
        refererInfo: {
          page: deepAccess(bidderRequest, 'refererInfo.page', ''),
        },
        uspConsent: deepAccess(bidderRequest, 'uspConsent', ''),
        gppConsent: {
          gppString: deepAccess(bidderRequest, 'gppConsent.gppString') ||
            deepAccess(bidderRequest, 'ortb2.regs.gpp', ''),
          applicableSections: deepAccess(bidderRequest, 'gppConsent.applicableSections') ||
            deepAccess(bidderRequest, 'ortb2.regs.gpp_sid', []),
        },
      },
      config: {
        api_key: bid.params.apiKey
      },
      // Cast boolean in any case (value should be 0 or 1) to ensure type
      coppa: !!deepAccess(bidderRequest, 'ortb2.regs.coppa'),
      // In app context, we need to retrieve additional informations
      ...(!deepAccess(bidderRequest, 'ortb2.site') && !!deepAccess(bidderRequest, 'ortb2.app') ? {
        appBundle: deepAccess(bidderRequest, 'ortb2.app.bundle', ''),
        appStoreUrl: deepAccess(bidderRequest, 'ortb2.app.storeurl', ''),
      } : {}),
      request: {
        adUnitCode: deepAccess(bid, 'adUnitCode', ''),
        auctionId: deepAccess(bid, 'auctionId', ''),
        bidId: deepAccess(bid, 'bidId', ''),
        mediaTypes: {
          video: {
            api: bid.mediaTypes?.[VIDEO]?.api || [],
            mimes: bid.mediaTypes?.[VIDEO]?.mimes || [],
            minduration: bid.mediaTypes?.[VIDEO]?.minduration || 0,
            maxduration: bid.mediaTypes?.[VIDEO]?.maxduration || 0,
            protocols: bid.mediaTypes?.[VIDEO]?.protocols || [],
            skip: bid.mediaTypes?.[VIDEO]?.skip || 0,
            skipafter: bid.mediaTypes?.[VIDEO]?.skipafter || 0,
            skipmin: bid.mediaTypes?.[VIDEO]?.skipmin || 0,
            startdelay: bid.mediaTypes?.[VIDEO]?.startdelay || 0,
            w: bid.mediaTypes?.[VIDEO]?.w || 0,
            h: bid.mediaTypes?.[VIDEO]?.h || 0,
          },
        },
        sizes: bid.sizes || [],
      },
      video_metadata: getVideoMetadata(bid, bidderRequest),
    },
    options: {
      withCredentials: true,
      crossOrigin: true,
    },
  })),

  /**
   * Map the response from the server into a list of bids.
   * As dailymotion prebid server returns an entry with the correct Prebid structure,
   * we directly include it as the only bid in the response.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: serverResponse => serverResponse?.body ? [serverResponse.body] : [],
};

registerBidder(spec);
