import { deepAccess, isFn, logWarn, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { getRefererInfo } from '../src/refererDetection.js';

const BIDDER_CODE = 'richaudience';

export const spec = {
  code: BIDDER_CODE,
  gvlid: 108,
  aliases: [{ code: 'ra', gvlid: 108 }],
  supportedMediaTypes: [BANNER, VIDEO],

  /***
   * Determines whether or not the given bid request is valid
   *
   * @param {bidRequest} bid The bid params to validate.
   * @returns {boolean} True if this is a valid bid, and false otherwise
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.pid);
  },
  /***
   * Build a server request from the list of valid BidRequests
   * @param {validBidRequests} is an array of the valid bids
   * @param {bidderRequest} bidder request object
   * @returns {ServerRequest} Info describing the request to the server
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const referer = raiGetReferer(bidderRequest.refererInfo);

    return validBidRequests.map(bid => {
      const floor = raiGetFloor(bid, bidderRequest);
      var payload = {
        bidfloor: floor?.value,
        ifa: bid.params.ifa,
        pid: bid.params.pid,
        currencyCode: floor?.currency,
        auctionId: bid.auctionId,
        tagId: bid.adUnitCode,
        sizes: raiGetSizes(bid),
        referer: referer,
        transactionId: bid.ortb2Imp?.ext?.tid,
        timeout: bidderRequest.timeout || 600,
        eids: deepAccess(bid, 'userIdAsEids') ? bid.userIdAsEids : [],
        videoData: raiGetVideoInfo(bid),
        scr_rsl: raiGetResolution(),
        device: { ext: { visibility: { hidden: raiIsPageHidden() } } },
        kws: bid.params.keywords,
        schain: bid?.ortb2?.source?.ext?.schain,
        gpid: raiSetPbAdSlot(bid),
        dsa: setDSA(bid),
        userData: deepAccess(bid, 'ortb2.user.data'),
        ext: { prebid: { channel: { name: 'pbjs', version: '$prebid.version$' } } }
      };

      payload.gdpr_consent = '';
      payload.gdpr = false;

      if (bidderRequest && bidderRequest.gdprConsent) {
        if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
          payload.gdpr = bidderRequest.gdprConsent.gdprApplies;
        }
        if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
          payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        }
      }

      if (bidderRequest?.gppConsent) {
        payload.privacy = {
          gpp: bidderRequest.gppConsent.gppString,
          gpp_sid: bidderRequest.gppConsent.applicableSections
        };
      } else if (bidderRequest?.ortb2?.regs?.gpp) {
        payload.privacy = {
          gpp: bidderRequest.ortb2.regs.gpp,
          gpp_sid: bidderRequest.ortb2.regs.gpp_sid
        };
      }

      var payloadString = JSON.stringify(payload);

      var endpoint = 'https://shb.richaudience.com/hb/';

      return {
        method: 'POST',
        url: endpoint,
        data: payloadString,
        bidId: bid.bidId,
        videoData: payload.videoData,
        adUnitCode: bid.adUnitCode,
      };
    });
  },
  /***
   * Read the response from the server and build a list of bids
   * @param {serverResponse} Response from the server.
   * @param {bidRequest} Bid request object
   * @returns {bidResponses} Array of bids which were nested inside the server
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (!response) {
      return bidResponses;
    }

    const isVideo = response.media_type === 'video';
    const creative = isVideo ? response.vastXML : response.adm;
    if (!(response.cpm > 0) || !creative) {
      return bidResponses;
    }

    const bidResponse = {
      requestId: bidRequest.bidId,
      cpm: response.cpm,
      width: response.width,
      height: response.height,
      creativeId: response.creative_id,
      mediaType: response.media_type,
      netRevenue: response.netRevenue,
      currency: response.currency,
      ttl: response.ttl,
      meta: {
        advertiserDomains: response.adomain?.length ? [response.adomain[0]] : []
      },
      dealId: response.dealId
    };

    if (isVideo) {
      bidResponse.vastXml = response.vastXML;
      if (bidRequest.videoData?.format === 'outstream' || bidRequest.videoData?.format === 'banner') {
        bidResponse.renderer = Renderer.install({
          id: bidRequest.bidId,
          adUnitCode: bidRequest.adUnitCode,
          loaded: false,
          config: response.media_type,
          url: 'https://cdn3.richaudience.com/prebidVideo/player.js'
        });
        bidResponse.renderer.setRender(renderer);
      }
    } else {
      bidResponse.ad = response.adm;
    }

    bidResponses.push(bidResponse);
    return bidResponses;
  },
  /***
   * User Syncs
   *
   * @param {syncOptions} Publisher prebid configuration
   * @param {serverResponses} Response from the server
   * @param {gdprConsent} GDPR consent object
   * @returns {Array}
   */
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];

    var rand = Math.floor(Math.random() * 9999999999);
    var consent = '';
    var consentGPP = '';

    const raiSync = raiGetSyncInclude(config);

    if (gdprConsent && typeof gdprConsent.consentString === 'string' && typeof gdprConsent.consentString !== 'undefined') {
      consent = `consentString=${gdprConsent.consentString}`;
    }

    // GPP Consent
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      consentGPP = 'gpp=' + encodeURIComponent(gppConsent.gppString);
      consentGPP += '&gpp_sid=' + encodeURIComponent(gppConsent?.applicableSections?.join(','));
    }

    if (syncOptions.iframeEnabled && raiSync.raiIframe !== 'exclude') {
      let syncUrl = 'https://sync.richaudience.com/dcf3528a0b8aa83634892d50e91c306e/?ord=' + rand;
      if (consent !== '') {
        syncUrl += `&${consent}`;
      }
      if (consentGPP !== '') {
        syncUrl += `&${consentGPP}`;
      }
      syncs.push({
        type: 'iframe',
        url: syncUrl
      });
    }

    const referer = raiGetReferer(getRefererInfo());

    if (syncOptions.pixelEnabled && referer != null && syncs.length === 0 && raiSync.raiImage !== 'exclude') {
      let syncUrl = `https://sync.richaudience.com/bf7c142f4339da0278e83698a02b0854/?referrer=${referer}`;
      if (consent !== '') {
        syncUrl += `&${consent}`;
      }
      if (consentGPP !== '') {
        syncUrl += `&${consentGPP}`;
      }
      syncs.push({
        type: 'image',
        url: syncUrl
      });
    }
    return syncs;
  },

  onTimeout: function (data) {
    const url = raiGetTimeoutURL(data);
    if (url) {
      triggerPixel(url);
    }
  }
};

registerBidder(spec);

function raiGetReferer(refererInfo) {
  return refererInfo?.page != null ? encodeURIComponent(refererInfo.page) : null;
}

function raiGetSizes(bid) {
  let raiNewSizes;
  if (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) {
    raiNewSizes = bid.mediaTypes.banner.sizes;
  }
  if (raiNewSizes != null) {
    return raiNewSizes.map(size => ({
      w: size[0],
      h: size[1]
    }));
  }
}

function raiGetVideoInfo(bid) {
  let videoData;
  if (bid.mediaTypes?.video) {
    const video = bid.mediaTypes.video;

    videoData = {
      format: video.context,
      playerSize: video.playerSize,
      mimes: video.mimes,
      plcmt: video.plcmt,
      playbackmethod: video.playbackmethod
    };
  } else {
    videoData = {
      format: 'banner'
    };
  }
  return videoData;
}

function renderer(bid) {
  bid.renderer.push(() => {
    renderAd(bid);
  });
}

function renderAd(bid) {
  const raOutstreamHBPassback = `${bid.vastXml}`;
  const raPlayerHB = {
    adUnit: bid.adUnitCode
  };

  window.raParams(raPlayerHB, raOutstreamHBPassback, true);
}

function raiGetResolution() {
  let resolution = '';
  if (typeof window.screen !== 'undefined') {
    resolution = window.screen.width + 'x' + window.screen.height;
  }
  return resolution;
}

function raiIsPageHidden() {
  return typeof document !== 'undefined' && document.hidden === true;
}

function raiSetPbAdSlot(bid) {
  let pbAdSlot = '';
  if (deepAccess(bid, 'ortb2Imp.ext.gpid') != null) {
    pbAdSlot = deepAccess(bid, 'ortb2Imp.ext.gpid');
  } else if (deepAccess(bid, 'ortb2Imp.ext.data.pbadslot') != null) {
    pbAdSlot = deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
  }
  return pbAdSlot;
}

function raiGetSyncInclude(config) {
  try {
    let raConfig = null;
    const raiSync = {};
    if (config.getConfig('userSync').filterSettings != null && typeof config.getConfig('userSync').filterSettings !== 'undefined') {
      raConfig = config.getConfig('userSync').filterSettings;
      if (raConfig.iframe != null && typeof raConfig.iframe !== 'undefined') {
        raiSync.raiIframe = raConfig.iframe.bidders === 'richaudience' || raConfig.iframe.bidders === '*' ? raConfig.iframe.filter : 'exclude';
      }
      if (raConfig.image != null && typeof raConfig.image !== 'undefined') {
        raiSync.raiImage = raConfig.image.bidders === 'richaudience' || raConfig.image.bidders === '*' ? raConfig.image.filter : 'exclude';
      }
    }
    return raiSync;
  } catch (e) {
    return null;
  }
}

function raiGetFloor(bid, bidderRequest) {
  const currency = getCurrencyFromBidderRequest(bidderRequest) || 'USD';
  const paramFloor = parseFloat(bid.params.bidfloor);

  if (isFn(bid.getFloor)) {
    let floorInfo;
    try {
      floorInfo = bid.getFloor({ currency, mediaType: '*', size: '*' });
    } catch (e) {
      logWarn(`${BIDDER_CODE}: cannot compute floor for bid`, bid, e);
    }
    const moduleFloor = parseFloat(floorInfo?.floor);
    if (moduleFloor && !isNaN(moduleFloor)) {
      if (floorInfo.currency !== currency) {
        logWarn(`${BIDDER_CODE}: announcing a ${floorInfo.currency} floor, ${currency} could not be delivered`);
        return { value: moduleFloor, currency: floorInfo.currency };
      }
      return { value: isNaN(paramFloor) ? moduleFloor : Math.max(paramFloor, moduleFloor), currency };
    }
  }

  return isNaN(paramFloor) ? undefined : { value: paramFloor, currency };
}

function raiGetTimeoutURL(data) {
  const { params, timeout } = data[0];
  let url = 'https://s.richaudience.com/err/?ec=6&ev=[timeout_publisher]&pla=[placement_hash]&int=PREBID&pltfm=&node=&dm=[domain]';

  url = url.replace('[timeout_publisher]', timeout);
  url = url.replace('[placement_hash]', params[0].pid);
  if (document.location.host != null) {
    url = url.replace('[domain]', document.location.host);
  }
  return url;
}

function setDSA(bid) {
  const dsa = bid?.ortb2?.regs?.ext?.dsa ? bid?.ortb2?.regs?.ext?.dsa : null;
  return dsa;
}
