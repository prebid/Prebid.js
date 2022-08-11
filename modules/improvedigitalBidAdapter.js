import {deepAccess, deepSetValue, getBidIdParameter, getUniqueIdentifierStr, logWarn, mergeDeep} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {hasPurpose1Consent} from '../src/utils/gpdr.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'improvedigital';
const CREATIVE_TTL = 300;

const AD_SERVER_URL = 'https://ad.360yield.com/pb';
const EXTEND_URL = 'https://pbs.360yield.com/openrtb2/auction';
const IFRAME_SYNC_URL = 'https://hb.360yield.com/prebid-universal-creative/load-cookie.html';

const VIDEO_PARAMS = {
  DEFAULT_MIMES: ['video/mp4'],
  PLACEMENT_TYPE: {
    INSTREAM: 1,
    OUTSTREAM: 3,
  }
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
      syncs.push({
        type: 'iframe',
        url: IFRAME_SYNC_URL +
          `?placement_id=${this.syncStore.placementId}` +
          (this.syncStore.extendMode ? '&pbs=1' : '') +
          (typeof gdprApplies === 'boolean' ? `&gdpr=${Number(gdprApplies)}` : '') +
          (consentString ? `&gdpr_consent=${consentString}` : '') +
          (uspConsent ? `&us_privacy=${encodeURIComponent(uspConsent)}` : '')
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

    // Adding GPID
    // TODO: this logic is in modules/gptPreAuction; should it be in core?
    deepSetValue(imp, 'ext.gpid',
      imp.ext?.gpid ||
      deepAccess(bidRequest, 'ortb2Imp.ext.data.pbadslot') ||
      deepAccess(bidRequest, 'ortb2Imp.ext.data.adserver.adslot')
    );

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    mergeDeep(request, {
      id: getUniqueIdentifierStr(),
      source: {
        // TODO: it may be better to not set this if there's more than one bidRequest - see https://github.com/prebid/Prebid.js/issues/8543
        tid: context.bidRequests[0].transactionId,
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
    // always set cur, even if currency module is not enabled
    // TODO: is this necessary?
    request.cur = request.cur || [config.getConfig('currency.adServerCurrency') || 'USD']
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
    Object.assign(bidResponse, {
      dealId: (typeof idExt.buying_type === 'string' && idExt.buying_type !== 'rtb') ? idExt.line_item_id : undefined,
      netRevenue: idExt.is_net || false,
      ttl: CREATIVE_TTL // override bid.exp
    })
    if (bidResponse.mediaType === VIDEO && ID_REQUEST.isOutstreamVideo(bidRequest)) {
      Object.assign(bidResponse, {
        adResponse: { content: bidResponse.vastXml },
        renderer: ID_OUTSTREAM.createRenderer(bidRequest)
      })
    }
    ID_RAZR.addBidData({bidRequest, bid: bidResponse});
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
        // skip must be 0 or 1
        if (video.skip !== 1) {
          delete video.skipmin;
          delete video.skipafter;
          if (video.skip !== 0) {
            logWarn(`video.skip: invalid value '${video.skip}'. Expected 0 or 1`);
            delete video.skip;
          }
        }
        fillImpVideo(
          imp,
          {...bidRequest, mediaTypes: {[VIDEO]: video}},
          context
        );
        deepSetValue(imp, 'ext.is_rewarded_inventory', (video.rewarded === 1 || deepAccess(video, 'ext.rewarded') === 1) || undefined);
        if (!imp.video.placement && ID_REQUEST.isOutstreamVideo(bidRequest)) {
          // fillImpVideo will have already set placement = 1 for instream
          imp.video.placement = VIDEO_PARAMS.PLACEMENT_TYPE.OUTSTREAM;
        }
      }
    },
    request: {
      gdprAddtlConsent(setAddtlConsent, ortbRequest, bidderRequest) {
        // override attlConsent processor to do some additional parsing, and use a different destination
        const additionalConsent = deepAccess(bidderRequest, 'gdprConsent.addtlConsent');
        if (additionalConsent && additionalConsent.indexOf('~') !== -1) {
          // Google Ad Tech Provider IDs
          const atpIds = additionalConsent.substring(additionalConsent.indexOf('~') + 1);
          if (atpIds) {
            deepSetValue(
              ortbRequest,
              'user.ext.consented_providers_settings.consented_providers',
              atpIds.split('.').map(id => parseInt(id, 10))
            );
          }
        }
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

    function formatRequest(bidRequests, extendMode) {
      const ortbRequest = CONVERTER.toORTB({bidRequests, bidderRequest, context: {extendMode}});
      return {
        method: 'POST',
        url: extendMode ? EXTEND_URL : AD_SERVER_URL,
        data: JSON.stringify(ortbRequest),
        ortbRequest,
      }
    }

    bidRequests.map((bidRequest) => {
      const extendModeEnabled = this.isExtendModeEnabled(globalExtendMode, bidRequest.params);
      if (singleRequestMode) {
        extendModeEnabled ? extendBids.push(bidRequest) : adServerBids.push(bidRequest);
      } else {
        requests.push(formatRequest([bidRequest], extendModeEnabled));
      }
    });

    if (!singleRequestMode) {
      return requests;
    }
    // In the single request mode, split imps between those going to the ad server and those going to extend server
    if (extendBids.length) {
      requests.push(formatRequest(extendBids, true));
    }
    if (adServerBids.length) {
      requests.push(formatRequest(adServerBids, false));
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
  RENDERER_URL: 'https://razr.improvedigital.com/renderer.js',
  addBidData({bid, bidRequest}) {
    if (this.isValidBid(bid)) {
      bid.renderer = Renderer.install({
        url: this.RENDERER_URL,
        config: {bidRequest}
      });
      bid.renderer.setRender(this.render);
    }
  },

  isValidBid(bid) {
    return bid && /razr:\/\//.test(bid.ad);
  },

  render(bid) {
    const {bidRequest} = bid.renderer.getConfig();

    const payload = {
      type: 'prebid',
      bidRequest,
      bid,
      config: mergeDeep(
        {},
        config.getConfig('improvedigital.rendererConfig'),
        deepAccess(bidRequest, 'params.rendererConfig')
      )
    };

    const razr = window.razr = window.razr || {};
    razr.queue = razr.queue || [];
    razr.queue.push(payload);
  }
};
