import {deepAccess, deepSetValue, getBidIdParameter, getUniqueIdentifierStr, logWarn, mergeDeep} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {hasPurpose1Consent} from '../src/utils/gpdr.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {loadExternalScript} from '../src/adloader.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'improvedigital';
const CREATIVE_TTL = 300;

const AD_SERVER_BASE_URL = 'https://ad.360yield.com';
const BASIC_ADS_BASE_URL = 'https://ad.360yield-basic.com';
const PB_ENDPOINT = 'pb';
const EXTEND_URL = 'https://pbs.360yield.com/openrtb2/auction';
const IFRAME_SYNC_URL = 'https://hb.360yield.com/prebid-universal-creative/load-cookie.html';

const VIDEO_PARAMS = {
  DEFAULT_MIMES: ['video/mp4']
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: 253,
  aliases: ['id'],
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  syncStore: { extendMode: false, placementId: null },

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    return !!(bid && bid.params && (bid.params.placementId || (bid.params.placementKey && bid.params.publisherId)));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests(bidRequests, bidderRequest) {
    // Save a placement id to send it to the ad server when fetching the user syncs
    this.syncStore.placementId = this.syncStore.placementId || bidRequests[0].params.placementId;
    return ID_REQUEST.buildServerRequests(bidRequests, bidderRequest);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param bidderRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse(serverResponse, { ortbRequest }) {
    return CONVERTER.fromORTB({request: ortbRequest, response: serverResponse.body}).bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (config.getConfig('coppa') === true || !hasPurpose1Consent(gdprConsent)) {
      return [];
    }

    const syncs = [];
    if ((this.syncStore.extendMode || !syncOptions.pixelEnabled) && syncOptions.iframeEnabled) {
      const { gdprApplies, consentString } = gdprConsent || {};
      const bidders = new Set();
      if (this.syncStore.extendMode && serverResponses) {
        serverResponses.forEach(response => {
          if (!response?.body?.ext?.responsetimemillis) return;
          Object.keys(response.body.ext.responsetimemillis).forEach(b => bidders.add(b))
        })
      }
      syncs.push({
        type: 'iframe',
        url: IFRAME_SYNC_URL +
          `?placement_id=${this.syncStore.placementId}` +
          (this.syncStore.extendMode ? '&pbs=1' : '') +
          (typeof gdprApplies === 'boolean' ? `&gdpr=${Number(gdprApplies)}` : '') +
          (consentString ? `&gdpr_consent=${consentString}` : '') +
          (uspConsent ? `&us_privacy=${encodeURIComponent(uspConsent)}` : '') +
          (bidders.size ? `&bidders=${[...bidders].join(',')}` : '')
      });
    } else if (syncOptions.pixelEnabled) {
      serverResponses.forEach(response => {
        const syncArr = deepAccess(response, `body.ext.${BIDDER_CODE}.sync`, []);
        syncArr.forEach(url => {
          if (!syncs.some(sync => sync.url === url)) {
            syncs.push({ type: 'image', url });
          }
        });
      });
    }

    return syncs;
  }
};

registerBidder(spec);

export const CONVERTER = ortbConverter({
  context: {
    ttl: CREATIVE_TTL,
    nativeRequest: {
      eventtrackers: [
        {event: 1, methods: [1, 2]},
      ]
    }
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.secure = Number(window.location.protocol === 'https:');
    if (!imp.bidfloor && bidRequest.params.bidFloor) {
      imp.bidfloor = bidRequest.params.bidFloor;
      imp.bidfloorcur = getBidIdParameter('bidFloorCur', bidRequest.params).toUpperCase() || 'USD'
    }
    const bidderParamsPath = context.extendMode ? 'ext.prebid.bidder.improvedigital' : 'ext.bidder';
    const placementId = bidRequest.params.placementId;
    if (placementId) {
      deepSetValue(imp, `${bidderParamsPath}.placementId`, placementId);
      if (context.extendMode) {
        deepSetValue(imp, 'ext.prebid.storedrequest.id', '' + placementId);
      }
    } else {
      deepSetValue(imp, `${bidderParamsPath}.publisherId`, getBidIdParameter('publisherId', bidRequest.params));
      deepSetValue(imp, `${bidderParamsPath}.placementKey`, getBidIdParameter('placementKey', bidRequest.params));
    }
    deepSetValue(imp, `${bidderParamsPath}.keyValues`, getBidIdParameter('keyValues', bidRequest.params) || undefined);

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    mergeDeep(request, {
      id: getUniqueIdentifierStr(),
      source: {

      },
      ext: {
        improvedigital: {
          sdk: {
            name: 'pbjs',
            version: '$prebid.version$',
          }
        }
      },
    });
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (!bid.adm || !bid.price || bid.hasOwnProperty('errorCode')) {
      return;
    }
    const {bidRequest} = context;
    context.mediaType = (() => {
      const requestMediaTypes = Object.keys(bidRequest.mediaTypes);
      if (requestMediaTypes.length === 1) return requestMediaTypes[0];
      // Detect media type for multi-format response
      if (bid.adm.search(/^(<\?xml|<vast)/i) !== -1) {
        return VIDEO;
      } else if (bid.adm[0] === '{') {
        return NATIVE;
      } else {
        return BANNER;
      }
    })();
    const bidResponse = buildBidResponse(bid, context);
    const idExt = deepAccess(bid, `ext.${BIDDER_CODE}`, {});
    // Programmatic guaranteed flag
    if (idExt.pg === 1) {
      bidResponse.adserverTargeting = { hb_deal_type_improve: 'pg' };
    }
    Object.assign(bidResponse, {
      dealId: (typeof idExt.buying_type === 'string' && idExt.buying_type !== 'rtb') ? idExt.line_item_id : undefined,
      netRevenue: idExt.is_net || false,
    })
    if (bidResponse.mediaType === VIDEO && ID_REQUEST.isOutstreamVideo(bidRequest)) {
      Object.assign(bidResponse, {
        adResponse: { content: bidResponse.vastXml },
        renderer: ID_OUTSTREAM.createRenderer(bidRequest)
      })
    }
    ID_RAZR.forwardBid({bidRequest, bid: bidResponse});
    return bidResponse;
  },
  overrides: {
    imp: {
      banner(fillImpBanner, imp, bidRequest, context) {
        // override to disregard banner.sizes if usePrebidSizes is not set
        if (!bidRequest.mediaTypes[BANNER]) return;
        if (config.getConfig('improvedigital.usePrebidSizes') !== true) {
          const banner = Object.assign({}, bidRequest.mediaTypes[BANNER], {sizes: null});
          bidRequest = {...bidRequest, mediaTypes: {[BANNER]: banner}}
        }
        fillImpBanner(imp, bidRequest, context);
      },
      video(fillImpVideo, imp, bidRequest, context) {
        // override to use video params from both mediaTypes.video and bidRequest.params.video
        if (!bidRequest.mediaTypes[VIDEO]) return;
        const video = Object.assign(
          {mimes: VIDEO_PARAMS.DEFAULT_MIMES},
          bidRequest.mediaTypes[VIDEO],
          bidRequest.params?.video
        )
        fillImpVideo(
          imp,
          {...bidRequest, mediaTypes: {[VIDEO]: video}},
          context
        );
        deepSetValue(imp, 'ext.is_rewarded_inventory', (video.rewarded === 1 || deepAccess(video, 'ext.rewarded') === 1) || undefined);
      }
    }
  }
})

const ID_REQUEST = {
  buildServerRequests(bidRequests, bidderRequest) {
    const globalExtendMode = config.getConfig('improvedigital.extend') === true;
    const requests = [];
    const singleRequestMode = config.getConfig('improvedigital.singleRequest') === true;

    const extendBids = [];
    const adServerBids = [];

    function adServerUrl(extendMode, publisherId) {
      if (extendMode) {
        return EXTEND_URL;
      }
      const urlSegments = [];
      urlSegments.push(hasPurpose1Consent(bidderRequest?.gdprConsent) ? AD_SERVER_BASE_URL : BASIC_ADS_BASE_URL)
      if (publisherId) {
        urlSegments.push(publisherId)
      }
      urlSegments.push(PB_ENDPOINT)
      return urlSegments.join('/');
    }

    function formatRequest(bidRequests, publisherId, extendMode) {
      const ortbRequest = CONVERTER.toORTB({bidRequests, bidderRequest, context: {extendMode}});
      return {
        method: 'POST',
        url: adServerUrl(extendMode, publisherId),
        data: JSON.stringify(ortbRequest),
        ortbRequest,
        bidderRequest
      }
    }

    let publisherId = null;
    bidRequests.map((bidRequest) => {
      const bidParamsPublisherId = bidRequest.params.publisherId;
      const extendModeEnabled = this.isExtendModeEnabled(globalExtendMode, bidRequest.params);
      if (singleRequestMode) {
        if (!publisherId) {
          publisherId = bidParamsPublisherId;
        } else if (bidParamsPublisherId && publisherId !== bidParamsPublisherId) {
          throw new Error(`All Improve Digital placements in a single call must have the same publisherId. Please check your 'params.publisherId' or turn off the single request mode.`);
        }
        extendModeEnabled ? extendBids.push(bidRequest) : adServerBids.push(bidRequest);
      } else {
        requests.push(formatRequest([bidRequest], bidParamsPublisherId, extendModeEnabled));
      }
    });

    if (!singleRequestMode) {
      return requests;
    }
    // In the single request mode, split imps between those going to the ad server and those going to extend server
    if (extendBids.length) {
      requests.push(formatRequest(extendBids, publisherId, true));
    }
    if (adServerBids.length) {
      requests.push(formatRequest(adServerBids, publisherId, false));
    }

    return requests;
  },

  isExtendModeEnabled(globalExtendMode, bidParams) {
    const extendMode = typeof bidParams.extend === 'boolean' ? bidParams.extend : globalExtendMode;
    if (extendMode && !spec.syncStore.extendMode) {
      spec.syncStore.extendMode = true;
    }
    return extendMode;
  },

  isOutstreamVideo(bidRequest) {
    return deepAccess(bidRequest, 'mediaTypes.video.context') === 'outstream';
  },

};

const ID_OUTSTREAM = {
  RENDERER_URL: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
  createRenderer(bidRequest) {
    const renderer = Renderer.install({
      id: bidRequest.adUnitCode,
      url: this.RENDERER_URL,
      config: deepAccess(bidRequest, 'renderer.options'),
      adUnitCode: bidRequest.adUnitCode
    });
    try {
      renderer.setRender(this.render);
    } catch (err) {
      logWarn('Prebid Error calling setRender on renderer', err);
    }
    return renderer;
  },

  render(bid) {
    bid.renderer.push(() => {
      window.ANOutstreamVideo.renderAd({
        sizes: [bid.width, bid.height],
        targetId: bid.adUnitCode,
        adResponse: bid.adResponse,
        rendererOptions: bid.renderer.getConfig()
      }, ID_OUTSTREAM.handleRendererEvents.bind(null, bid));
    });
  },

  handleRendererEvents(bid, id, eventName) {
    bid.renderer.handleVideoEvent({ id, eventName });
  },
};

const ID_RAZR = {
  RENDERER_URL: 'https://cdn.360yield.com/razr/tag.js',

  forwardBid({bidRequest, bid}) {
    if (bid.mediaType !== BANNER) {
      return;
    }

    const cfg = {
      prebid: {
        bidRequest,
        bid
      }
    };

    const cfgStr = JSON.stringify(cfg).replace(/<\/script>/ig, '\\x3C/script>');
    const s = `<script>window.__razr_config = ${cfgStr};</script>`;
    // prepend RAZR config to ad markup:
    bid.ad = s + bid.ad;

    this.installListener();
  },

  installListener() {
    if (this._listenerInstalled) {
      return;
    }

    window.addEventListener('message', function(e) {
      const data = e.data?.razr?.load;
      if (!data) {
        return;
      }

      if (e.source) {
        data.source = e.source;
        if (data.id) {
          e.source.postMessage({
            razr: {
              id: data.id
            }
          }, '*');
        }
      }

      const ns = window.razr = window.razr || {};
      ns.q = ns.q || [];
      ns.q.push(data);

      if (!ns.loaded) {
        loadExternalScript(ID_RAZR.RENDERER_URL, BIDDER_CODE);
      }
    });

    this._listenerInstalled = true;
  }
};
