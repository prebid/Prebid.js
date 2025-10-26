import { getDNT } from '../libraries/navigatorData/dnt.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { handleCookieSync, PID_STORAGE_NAME, prepareSplitImps } from '../libraries/equativUtils/equativUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess, generateUUID, inIframe, isPlainObject, logWarn, mergeDeep } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const VERSION = '4.3.0';
const BIDDER_CODE = 'sharethrough';
const SUPPLY_ID = 'WYu2BXv1';

const EQT_ENDPOINT = 'https://ssb.smartadserver.com/api/bid?callerId=233';
const STR_ENDPOINT = `https://btlr.sharethrough.com/universal/v1?supply_id=${SUPPLY_ID}`;
const IDENTIFIER_PREFIX = 'Sharethrough:';

let impIdMap = {};
let eqtvNetworkId = 0;
let isEqtvTest = null;

const storage = getStorageManager({ bidderCode: BIDDER_CODE });

/**
 * Gets value of the local variable impIdMap
 * @returns {*} Value of impIdMap
 */
export function getImpIdMap() {
  return impIdMap;
}

/**
 * Sets value of the local variable isEqtvTest
 * @param {*} value
 */
export function setIsEqtvTest(value) {
  isEqtvTest = value;
}

// this allows stubbing of utility function that is used internally by the sharethrough adapter
export const sharethroughInternal = {
  getProtocol,
};

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 360
  }
});

export const sharethroughAdapterSpec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER, NATIVE],
  gvlid: 80,
  isBidRequestValid: (bid) => !!bid.params.pkey,

  buildRequests: (bidRequests, bidderRequest) => {
    const timeout = bidderRequest.timeout;
    const firstPartyData = bidderRequest.ortb2 || {};

    const nonHttp = sharethroughInternal.getProtocol().indexOf('http') < 0;
    const secure = nonHttp || sharethroughInternal.getProtocol().indexOf('https') > -1;

    const req = {
      id: generateUUID(),
      at: 1,
      cur: ['USD'],
      tmax: timeout,
      site: {
        domain: deepAccess(bidderRequest, 'refererInfo.domain', window.location.hostname),
        page: deepAccess(bidderRequest, 'refererInfo.page', window.location.href),
        ref: deepAccess(bidderRequest, 'refererInfo.ref'),
        ...firstPartyData.site,
      },
      device: {
        ua: navigator.userAgent,
        language: navigator.language,
        js: 1,
        dnt: getDNT() ? 1 : 0,
        h: window.screen.height,
        w: window.screen.width,
        ext: {},
      },
      regs: {
        coppa: config.getConfig('coppa') === true ? 1 : 0,
        ext: {},
      },
      source: {
        tid: bidderRequest.ortb2?.source?.tid,
        ext: {
          version: '$prebid.version$',
          str: VERSION,
          schain: bidRequests[0]?.ortb2?.source?.ext?.schain,
        },
      },
      bcat: deepAccess(bidderRequest.ortb2, 'bcat') || bidRequests[0].params.bcat || [],
      badv: deepAccess(bidderRequest.ortb2, 'badv') || bidRequests[0].params.badv || [],
      test: 0,
    };

    req.user = firstPartyData.user ?? {}
    if (!req.user.ext) req.user.ext = {};
    req.user.ext.eids = bidRequests[0].userIdAsEids || [];

    if (bidRequests[0].params.equativNetworkId) {
      isEqtvTest = true;
      eqtvNetworkId = bidRequests[0].params.equativNetworkId;
      req.site.publisher = {
        id: bidRequests[0].params.equativNetworkId,
        ...req.site.publisher
      };
      const pid = storage.getDataFromLocalStorage(PID_STORAGE_NAME);
      if (pid) {
        req.user.buyeruid = pid;
      }
    }

    if (bidderRequest.ortb2?.device?.ext?.cdep) {
      req.device.ext['cdep'] = bidderRequest.ortb2.device.ext.cdep;
    }

    // if present, merge device object from ortb2 into `req.device`
    if (bidderRequest?.ortb2?.device) {
      mergeDeep(req.device, bidderRequest.ortb2.device);
    }

    if (bidderRequest.gdprConsent) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies === true;
      req.regs.ext.gdpr = gdprApplies ? 1 : 0;
      if (gdprApplies) {
        req.user.ext.consent = bidderRequest.gdprConsent.consentString;
      }
    }

    if (bidderRequest.uspConsent) {
      req.regs.ext.us_privacy = bidderRequest.uspConsent;
      req.regs.us_privacy = bidderRequest.uspConsent;
    }

    if (bidderRequest?.gppConsent?.gppString) {
      req.regs.gpp = bidderRequest.gppConsent.gppString;
      req.regs.gpp_sid = bidderRequest.gppConsent.applicableSections;
    } else if (bidderRequest?.ortb2?.regs?.gpp) {
      req.regs.ext.gpp = bidderRequest.ortb2.regs.gpp;
      req.regs.ext.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
    }

    if (bidderRequest?.ortb2?.regs?.ext?.dsa) {
      req.regs.ext.dsa = bidderRequest.ortb2.regs.ext.dsa;
    }

    const imps = bidRequests
      .map((bidReq) => {
        const impression = { ext: {} };

        // mergeDeep(impression, bidReq.ortb2Imp); // leaving this out for now as we may want to leave stuff out on purpose
        const tid = deepAccess(bidReq, 'ortb2Imp.ext.tid');
        if (tid) impression.ext.tid = tid;
        const gpid = deepAccess(bidReq, 'ortb2Imp.ext.gpid');
        if (gpid) impression.ext.gpid = gpid;

        const nativeRequest = deepAccess(bidReq, 'mediaTypes.native');
        const videoRequest = deepAccess(bidReq, 'mediaTypes.video');

        if (bidderRequest.paapi?.enabled && bidReq.mediaTypes.banner) {
          mergeDeep(impression, { ext: { ae: 1 } }); // ae = auction environment; if this is 1, ad server knows we have a fledge auction
        }

        if (videoRequest) {
          // default playerSize, only change this if we know width and height are properly defined in the request
          let [w, h] = [640, 360];
          if (
            videoRequest.playerSize &&
            videoRequest.playerSize[0] &&
            videoRequest.playerSize[0][0] &&
            videoRequest.playerSize[0][1]
          ) {
            [w, h] = videoRequest.playerSize[0];
          }

          /**
           * Applies a specified property to an impression object if it is present in the video request
           * @param {string} prop A property to apply to the impression object
           * @param {object} vidReq A video request object from which to extract the property
           * @param {object} imp A video impression object to which to apply the property
           */
          const applyVideoProperty = (prop, vidReq, imp) => {
            const propIsTypeArray = ['api', 'battr', 'mimes', 'playbackmethod', 'protocols'].includes(prop);
            if (propIsTypeArray) {
              const notAssignable = (!Array.isArray(vidReq[prop]) || vidReq[prop].length === 0) && vidReq[prop];
              if (notAssignable) {
                logWarn(`${IDENTIFIER_PREFIX} Invalid video request property: "${prop}" must be an array with at least 1 entry.  Value supplied: "${vidReq[prop]}".  This will not be added to the bid request.`);
                return;
              }
            }
            if (vidReq[prop]) {
              imp.video[prop] = vidReq[prop];
            }
          };

          impression.video = {
            pos: videoRequest.pos ?? 0,
            topframe: inIframe() ? 0 : 1,
            w,
            h,
          };

          const propertiesToConsider = [
            'api', 'battr', 'companiontype', 'delivery', 'linearity', 'maxduration', 'mimes', 'minduration', 'placement', 'playbackmethod', 'plcmt', 'protocols', 'skip', 'skipafter', 'skipmin', 'startdelay'
          ];

          if (!isEqtvTest) {
            propertiesToConsider.push('companionad');
          }

          propertiesToConsider.forEach(propertyToConsider => {
            applyVideoProperty(propertyToConsider, videoRequest, impression);
          });
        } else if (isEqtvTest && nativeRequest) {
          const nativeImp = converter.toORTB({
            bidRequests: [bidReq],
            bidderRequest
          });

          impression.native = {
            ...nativeImp.imp[0].native
          };
        } else {
          impression.banner = {
            pos: deepAccess(bidReq, 'mediaTypes.banner.pos', 0),
            topframe: inIframe() ? 0 : 1,
            format: bidReq.sizes.map((size) => ({ w: +size[0], h: +size[1] })),
          };
          const battr = deepAccess(bidReq, 'mediaTypes.banner.battr', null) || deepAccess(bidReq, 'ortb2Imp.banner.battr');
          if (battr) impression.banner.battr = battr;
        }

        const tagid = isEqtvTest ? bidReq.adUnitCode : String(bidReq.params.pkey);

        return {
          id: bidReq.bidId,
          tagid,
          secure: secure ? 1 : 0,
          bidfloor: getBidRequestFloor(bidReq),
          ...impression,
        };
      })
      .filter((imp) => !!imp);

    let splitImps = []
    if (isEqtvTest) {
      const bid = bidRequests[0];
      const currency = config.getConfig('currency.adServerCurrency') || 'USD';
      splitImps = prepareSplitImps(imps, bid, currency, impIdMap, 'stx');
    }

    return imps.map((impression) => {
      return {
        method: 'POST',
        url: isEqtvTest ? EQT_ENDPOINT : STR_ENDPOINT,
        data: {
          ...req,
          imp: isEqtvTest ? splitImps : [impression],
        },
      };
    });
  },

  interpretResponse: ({ body }, req) => {
    if (
      !body ||
      !body.seatbid ||
      body.seatbid.length === 0 ||
      !body.seatbid[0].bid ||
      body.seatbid[0].bid.length === 0
    ) {
      return [];
    }

    const fledgeAuctionEnabled = body.ext?.auctionConfigs;

    const imp = req.data.imp[0];

    const bidsFromExchange = body.seatbid[0].bid.map((bid) => {
      // Spec: https://docs.prebid.org/dev-docs/bidder-adaptor.html#interpreting-the-response
      const response = {
        requestId: isEqtvTest ? impIdMap[bid.impid] : bid.impid,
        width: +bid.w,
        height: +bid.h,
        cpm: +bid.price,
        creativeId: bid.crid,
        dealId: bid.dealid || null,
        mediaType: imp.video ? VIDEO : imp.native ? NATIVE : BANNER,
        currency: body.cur || 'USD',
        netRevenue: true,
        ttl: typeof bid.exp === 'number' && bid.exp > 0 ? bid.exp : 360,
        ad: bid.adm,
        nurl: bid.nurl,
        meta: {
          advertiserDomains: bid.adomain || [],
          networkId: bid.ext?.networkId || null,
          networkName: bid.ext?.networkName || null,
          agencyId: bid.ext?.agencyId || null,
          agencyName: bid.ext?.agencyName || null,
          advertiserId: bid.ext?.advertiserId || null,
          advertiserName: bid.ext?.advertiserName || null,
          brandId: bid.ext?.brandId || null,
          brandName: bid.ext?.brandName || null,
          demandSource: bid.ext?.demandSource || null,
          dchain: bid.ext?.dchain || null,
          primaryCatId: bid.ext?.primaryCatId || null,
          secondaryCatIds: bid.ext?.secondaryCatIds || null,
          mediaType: bid.ext?.mediaType || null,
        },
      };

      if (response.mediaType === VIDEO) {
        response.ttl = 3600;
        response.vastXml = bid.adm;
      } else if (response.mediaType === NATIVE) {
        response.native = {
          ortb: JSON.parse(bid.adm)
        };
      }

      return response;
    });

    if (fledgeAuctionEnabled && !isEqtvTest) {
      return {
        bids: bidsFromExchange,
        paapi: body.ext?.auctionConfigs || {},
      };
    } else {
      return bidsFromExchange;
    }
  },

  getUserSyncs: (syncOptions, serverResponses, gdprConsent) => {
    if (isEqtvTest) {
      return handleCookieSync(syncOptions, serverResponses, gdprConsent, eqtvNetworkId, storage)
    } else {
      const shouldCookieSync =
        syncOptions.pixelEnabled && deepAccess(serverResponses, '0.body.cookieSyncUrls') !== undefined;

      return shouldCookieSync ? serverResponses[0].body.cookieSyncUrls.map((url) => ({ type: 'image', url: url })) : [];
    }
  },

  // Empty implementation for prebid core to be able to find it
  onTimeout: (data) => { },

  // Empty implementation for prebid core to be able to find it
  onBidWon: (bid) => { },

  // Empty implementation for prebid core to be able to find it
  onSetTargeting: (bid) => { },
};

function getBidRequestFloor(bid) {
  let floor = null;
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: bid.mediaTypes && bid.mediaTypes.video ? 'video' : 'banner',
      size: bid.sizes.map((size) => ({ w: size[0], h: size[1] })),
    });
    if (isPlainObject(floorInfo) && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return floor !== null ? floor : 0;
}

function getProtocol() {
  return window.location.protocol;
}

registerBidder(sharethroughAdapterSpec);
