import {
  _each,
  isArray,
  getUniqueIdentifierStr,
  deepSetValue,
  logError,
  deepAccess,
  isInteger,
  logWarn,
  getBidIdParameter,
  isEmptyStr,
  mergeDeep
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js'
import {
  BANNER,
  VIDEO
} from '../src/mediaTypes.js'
import { COMMON_ORTB_VIDEO_PARAMS } from '../libraries/deepintentUtils/index.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const ORTB_VIDEO_PARAMS = {
  ...COMMON_ORTB_VIDEO_PARAMS,
  'placement': (value) => isInteger(value) && value >= 1 && value <= 5,
  'plcmt': (value) => isInteger(value) && value >= 1 && value <= 4,
  'delivery': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 3),
  'pos': (value) => isInteger(value) && value >= 1 && value <= 7,
}

const REQUIRED_VIDEO_PARAMS = {
  mimes: ORTB_VIDEO_PARAMS.mimes,
  maxduration: ORTB_VIDEO_PARAMS.maxduration,
  protocols: ORTB_VIDEO_PARAMS.protocols
}

export const spec = {
  code: 'sovrn',
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: 13,

  /**
   * Check if the bid is a valid zone ID in either number or string form
   * @param {object} bid the Sovrn bid to validate
   * @return boolean for whether or not a bid is valid
   */
  isBidRequestValid: function (bid) {
    const video = bid?.mediaTypes?.video
    return !!(
      bid.params.tagid &&
      !isNaN(parseFloat(bid.params.tagid)) &&
      isFinite(bid.params.tagid) && (
        !video || (
          Object.keys(REQUIRED_VIDEO_PARAMS)
            .every(key => REQUIRED_VIDEO_PARAMS[key](video[key]))
        )
      )
    )
  },

  /**
   * Format the bid request object for our endpoint
   * @return object of parameters for Prebid AJAX request
   * @param bidReqs
   * @param bidderRequest
   */
  buildRequests: function(bidReqs, bidderRequest) {
    try {
      const sovrnImps = [];
      let iv;
      let schain;
      let eids;
      let criteoId;

      _each(bidReqs, function (bid) {
        if (!eids && bid.userIdAsEids) {
          eids = bid.userIdAsEids;
          eids.forEach(function (id) {
            if (id.uids && id.uids[0]) {
              if (id.source === 'criteo.com') {
                criteoId = id.uids[0].id
              }
            }
          })
        }

        const bidSchain = bid?.ortb2?.source?.ext?.schain;
        if (bidSchain) {
          schain = schain || bidSchain
        }
        iv = iv || getBidIdParameter('iv', bid.params)

        const imp = {
          adunitcode: bid.adUnitCode,
          id: bid.bidId,
          tagid: String(getBidIdParameter('tagid', bid.params)),
          bidfloor: _getBidFloors(bid)
        }

        if (deepAccess(bid, 'mediaTypes.banner')) {
          let bidSizes = deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes
          bidSizes = (isArray(bidSizes) && isArray(bidSizes[0])) ? bidSizes : [bidSizes]
          bidSizes = bidSizes.filter(size => isArray(size))
          const processedSizes = bidSizes.map(size => ({w: parseInt(size[0], 10), h: parseInt(size[1], 10)}))

          imp.banner = {
            format: processedSizes,
            w: 1,
            h: 1,
          };
        }
        if (deepAccess(bid, 'mediaTypes.video')) {
          imp.video = _buildVideoRequestObj(bid);
        }

        imp.ext = getBidIdParameter('ext', bid.ortb2Imp) || undefined

        const segmentsString = getBidIdParameter('segments', bid.params)
        if (segmentsString) {
          imp.ext = imp.ext || {}
          imp.ext.deals = segmentsString.split(',').map(deal => deal.trim())
        }

        const auctionEnvironment = bid?.ortb2Imp?.ext?.ae
        if (bidderRequest.paapi?.enabled && isInteger(auctionEnvironment)) {
          imp.ext = imp.ext || {}
          imp.ext.ae = auctionEnvironment
        } else {
          if (imp.ext?.ae) {
            delete imp.ext.ae
          }
        }

        sovrnImps.push(imp)
      })

      const fpd = bidderRequest.ortb2 || {};

      const site = fpd.site || {}
      site.page = bidderRequest.refererInfo.page
      site.domain = bidderRequest.refererInfo.domain

      const tmax = deepAccess(bidderRequest, 'timeout');

      const sovrnBidReq = {
        id: getUniqueIdentifierStr(),
        imp: sovrnImps,
        site: site,
        user: fpd.user || {},
        tmax: tmax
      }

      if (schain) {
        sovrnBidReq.source = {
          ext: {
            schain
          }
        };
      }

      const tid = deepAccess(bidderRequest, 'ortb2.source.tid')
      if (tid) {
        deepSetValue(sovrnBidReq, 'source.tid', tid)
      }

      const coppa = deepAccess(bidderRequest, 'ortb2.regs.coppa');
      if (coppa) {
        deepSetValue(sovrnBidReq, 'regs.coppa', 1);
      }

      const bcat = deepAccess(bidderRequest, 'ortb2.bcat');
      if (bcat) {
        deepSetValue(sovrnBidReq, 'bcat', bcat);
      }

      if (bidderRequest.gdprConsent) {
        deepSetValue(sovrnBidReq, 'regs.ext.gdpr', +bidderRequest.gdprConsent.gdprApplies);
        deepSetValue(sovrnBidReq, 'user.ext.consent', bidderRequest.gdprConsent.consentString)
      }
      if (bidderRequest.uspConsent) {
        deepSetValue(sovrnBidReq, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      }
      if (bidderRequest.gppConsent) {
        deepSetValue(sovrnBidReq, 'regs.gpp', bidderRequest.gppConsent.gppString);
        deepSetValue(sovrnBidReq, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections);
      }

      // if present, merge device object from ortb2 into `sovrnBidReq.device`
      if (bidderRequest?.ortb2?.device) {
        sovrnBidReq.device = sovrnBidReq.device || {};
        mergeDeep(sovrnBidReq.device, bidderRequest.ortb2.device);
      }

      if (eids) {
        deepSetValue(sovrnBidReq, 'user.ext.eids', eids)
        if (criteoId) {
          deepSetValue(sovrnBidReq, 'user.ext.prebid_criteoid', criteoId)
        }
      }

      let url = `https://ap.lijit.com/rtb/bid?src=$$REPO_AND_VERSION$$`;
      if (iv) url += `&iv=${iv}`;

      return {
        method: 'POST',
        url: url,
        data: JSON.stringify(sovrnBidReq),
        options: {contentType: 'text/plain'}
      }
    } catch (e) {
      logError('Could not build bidrequest, error deatils:', e);
    }
  },

  /**
   * Format Sovrn responses as Prebid bid responses
   * @param {*} param0 A successful response from Sovrn.
   * @return {Array} An array of formatted bids (+ fledgeAuctionConfigs if available)
   */
  interpretResponse: function({ body: {id, seatbid, ext} }) {
    if (!id || !seatbid || !Array.isArray(seatbid)) return []

    try {
      const bids = seatbid
        .filter(seat => seat)
        .map(seat => seat.bid.map(sovrnBid => {
          const bid = {
            requestId: sovrnBid.impid,
            cpm: parseFloat(sovrnBid.price),
            width: parseInt(sovrnBid.w),
            height: parseInt(sovrnBid.h),
            creativeId: sovrnBid.crid || sovrnBid.id,
            dealId: sovrnBid.dealid || null,
            currency: 'USD',
            netRevenue: true,
            mediaType: sovrnBid.mtype == 2 ? VIDEO : BANNER,
            ttl: sovrnBid.ext?.ttl || 90,
            meta: { advertiserDomains: sovrnBid && sovrnBid.adomain ? sovrnBid.adomain : [] }
          }

          if (sovrnBid.mtype == 2) {
            bid.vastXml = decodeURIComponent(sovrnBid.adm)
          } else {
            bid.ad = sovrnBid.nurl ? decodeURIComponent(`${sovrnBid.adm}<img src="${sovrnBid.nurl}">`) : decodeURIComponent(sovrnBid.adm)
          }

          return bid
        }))
        .flat()

      let fledgeAuctionConfigs = null;
      if (isArray(ext?.igbid)) {
        const seller = ext.seller
        const decisionLogicUrl = ext.decisionLogicUrl
        const sellerTimeout = ext.sellerTimeout
        ext.igbid.filter(item => isValidIgBid(item)).forEach((igbid) => {
          const perBuyerSignals = {}
          igbid.igbuyer.filter(item => isValidIgBuyer(item)).forEach(buyerItem => {
            perBuyerSignals[buyerItem.igdomain] = buyerItem.buyerdata
          })
          const interestGroupBuyers = [...Object.keys(perBuyerSignals)]
          if (interestGroupBuyers.length) {
            fledgeAuctionConfigs = fledgeAuctionConfigs || {}
            fledgeAuctionConfigs[igbid.impid] = {
              seller,
              decisionLogicUrl,
              sellerTimeout,
              interestGroupBuyers: interestGroupBuyers,
              perBuyerSignals,
            }
          }
        })
      }
      if (fledgeAuctionConfigs) {
        fledgeAuctionConfigs = Object.entries(fledgeAuctionConfigs).map(([bidId, cfg]) => {
          return {
            bidId,
            config: Object.assign({
              auctionSignals: {}
            }, cfg)
          }
        })
        return {
          bids,
          paapi: fledgeAuctionConfigs,
        }
      }
      return bids
    } catch (e) {
      logError('Could not interpret bidresponse, error details:', e)
      return e
    }
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    try {
      const tracks = []
      if (serverResponses && serverResponses.length !== 0) {
        if (syncOptions.iframeEnabled) {
          const iidArr = serverResponses.filter(resp => deepAccess(resp, 'body.ext.iid'))
            .map(resp => resp.body.ext.iid);
          const params = [];
          if (gdprConsent && gdprConsent.gdprApplies && typeof gdprConsent.consentString === 'string') {
            params.push(['gdpr_consent', gdprConsent.consentString]);
          }
          if (uspConsent) {
            params.push(['us_privacy', uspConsent]);
          }
          if (gppConsent) {
            params.push(['gpp', gppConsent.gppString]);
            params.push(['gpp_sid', gppConsent.applicableSections])
          }

          if (iidArr[0]) {
            params.push(['informer', iidArr[0]]);
            tracks.push({
              type: 'iframe',
              url: 'https://ce.lijit.com/beacon?' + params.map(p => p.join('=')).join('&')
            });
          }
        }

        if (syncOptions.pixelEnabled) {
          serverResponses.filter(resp => deepAccess(resp, 'body.ext.sync.pixels'))
            .reduce((acc, resp) => acc.concat(resp.body.ext.sync.pixels), [])
            .map(pixel => pixel.url)
            .forEach(url => tracks.push({ type: 'image', url }))
        }
      }
      return tracks
    } catch (e) {
      return []
    }
  },
}

function _buildVideoRequestObj(bid) {
  const videoObj = {}
  const bidSizes = deepAccess(bid, 'sizes')
  const videoAdUnitParams = deepAccess(bid, 'mediaTypes.video', {})
  const videoBidderParams = deepAccess(bid, 'params.video', {})
  const computedParams = {}

  if (bidSizes) {
    const sizes = (Array.isArray(bidSizes[0])) ? bidSizes[0] : bidSizes
    computedParams.w = sizes[0]
    computedParams.h = sizes[1]
  } else if (Array.isArray(videoAdUnitParams.playerSize)) {
    const sizes = (Array.isArray(videoAdUnitParams.playerSize[0])) ? videoAdUnitParams.playerSize[0] : videoAdUnitParams.playerSize
    computedParams.w = sizes[0]
    computedParams.h = sizes[1]
  }

  const videoParams = {
    ...computedParams,
    ...videoAdUnitParams,
    ...videoBidderParams
  };

  Object.keys(ORTB_VIDEO_PARAMS).forEach(paramName => {
    if (videoParams.hasOwnProperty(paramName)) {
      if (ORTB_VIDEO_PARAMS[paramName](videoParams[paramName])) {
        videoObj[paramName] = videoParams[paramName]
      } else {
        logWarn(`The OpenRTB video param ${paramName} has been skipped due to misformating. Please refer to OpenRTB 2.5 spec.`);
      }
    }
  })
  return videoObj
}

function _getBidFloors(bid) {
  const floorInfo = (bid.getFloor && typeof bid.getFloor === 'function') ? bid.getFloor({
    currency: 'USD',
    mediaType: bid.mediaTypes && bid.mediaTypes.banner ? 'banner' : 'video',
    size: '*'
  }) : {}
  const floorModuleValue = parseFloat(floorInfo?.floor)
  if (!isNaN(floorModuleValue)) {
    return floorModuleValue
  }
  const paramValue = parseFloat(getBidIdParameter('bidfloor', bid.params))
  return !isNaN(paramValue) ? paramValue : undefined
}

function isValidIgBid(igBid) {
  return !isEmptyStr(igBid.impid) && isArray(igBid.igbuyer) && igBid.igbuyer.length
}

function isValidIgBuyer(igBuyer) {
  return !isEmptyStr(igBuyer.igdomain)
}

registerBidder(spec)
