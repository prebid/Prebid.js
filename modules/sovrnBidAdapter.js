import {
  _each,
  getBidIdParameter,
  isArray,
  getUniqueIdentifierStr,
  deepSetValue,
  logError,
  deepAccess,
  isInteger,
  logWarn
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js'
import {
  ADPOD,
  BANNER,
  VIDEO
} from '../src/mediaTypes.js'
import {createEidsArray} from './userId/eids.js';

const ORTB_VIDEO_PARAMS = {
  'mimes': (value) => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string'),
  'minduration': (value) => isInteger(value),
  'maxduration': (value) => isInteger(value),
  'protocols': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 10),
  'w': (value) => isInteger(value),
  'h': (value) => isInteger(value),
  'startdelay': (value) => isInteger(value),
  'placement': (value) => isInteger(value) && value >= 1 && value <= 5,
  'linearity': (value) => [1, 2].indexOf(value) !== -1,
  'skip': (value) => [0, 1].indexOf(value) !== -1,
  'skipmin': (value) => isInteger(value),
  'skipafter': (value) => isInteger(value),
  'sequence': (value) => isInteger(value),
  'battr': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 17),
  'maxextended': (value) => isInteger(value),
  'minbitrate': (value) => isInteger(value),
  'maxbitrate': (value) => isInteger(value),
  'boxingallowed': (value) => [0, 1].indexOf(value) !== -1,
  'playbackmethod': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 6),
  'playbackend': (value) => [1, 2, 3].indexOf(value) !== -1,
  'delivery': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 3),
  'pos': (value) => isInteger(value) && value >= 1 && value <= 7,
  'api': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 6)
}

const REQUIRED_VIDEO_PARAMS = {
  context: (value) => value !== ADPOD,
  mimes: ORTB_VIDEO_PARAMS.mimes,
  minduration: ORTB_VIDEO_PARAMS.minduration,
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
      let sovrnImps = [];
      let iv;
      let schain;
      let eids;
      let criteoId;

      _each(bidReqs, function (bid) {
        if (!eids && bid.userId) {
          eids = createEidsArray(bid.userId)
          eids.forEach(function (id) {
            if (id.uids && id.uids[0]) {
              if (id.source === 'criteo.com') {
                criteoId = id.uids[0].id
              }
            }
          })
        }

        if (bid.schain) {
          schain = schain || bid.schain
        }
        iv = iv || getBidIdParameter('iv', bid.params)

        const floorInfo = (bid.getFloor && typeof bid.getFloor === 'function') ? bid.getFloor({
          currency: 'USD',
          mediaType: bid.mediaTypes && bid.mediaTypes.banner ? 'banner' : 'video',
          size: '*'
        }) : {}
        floorInfo.floor = floorInfo.floor || getBidIdParameter('bidfloor', bid.params)

        const imp = {
          adunitcode: bid.adUnitCode,
          id: bid.bidId,
          tagid: String(getBidIdParameter('tagid', bid.params)),
          bidfloor: floorInfo.floor
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
        sovrnImps.push(imp)
      })

      const fpd = bidderRequest.ortb2 || {};

      const site = fpd.site || {}
      site.page = bidderRequest.refererInfo.page
      site.domain = bidderRequest.refererInfo.domain

      const sovrnBidReq = {
        id: getUniqueIdentifierStr(),
        imp: sovrnImps,
        site: site,
        user: fpd.user || {}
      }

      if (schain) {
        sovrnBidReq.source = {
          ext: {
            schain
          }
        };
      }

      if (bidderRequest.gdprConsent) {
        deepSetValue(sovrnBidReq, 'regs.ext.gdpr', +bidderRequest.gdprConsent.gdprApplies);
        deepSetValue(sovrnBidReq, 'user.ext.consent', bidderRequest.gdprConsent.consentString)
      }
      if (bidderRequest.uspConsent) {
        deepSetValue(sovrnBidReq, 'regs.ext.us_privacy', bidderRequest.uspConsent);
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
   * @param {id, seatbid} sovrnResponse A successful response from Sovrn.
   * @return {Bid[]} An array of formatted bids.
  */
  interpretResponse: function({ body: {id, seatbid} }) {
    if (!id || !seatbid || !Array.isArray(seatbid)) return []

    try {
      return seatbid
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
            mediaType: sovrnBid.nurl ? BANNER : VIDEO,
            ttl: sovrnBid.ext?.ttl || 90,
            meta: { advertiserDomains: sovrnBid && sovrnBid.adomain ? sovrnBid.adomain : [] }
          }

          if (sovrnBid.nurl) {
            bid.ad = decodeURIComponent(`${sovrnBid.adm}<img src="${sovrnBid.nurl}">`)
          } else {
            bid.vastXml = decodeURIComponent(sovrnBid.adm)
          }

          return bid
        }))
        .flat()
    } catch (e) {
      logError('Could not interpret bidresponse, error details:', e)
      return e
    }
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
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

          if (iidArr[0]) {
            params.push(['informer', iidArr[0]]);
            tracks.push({
              type: 'iframe',
              url: 'https://ap.lijit.com/beacon?' + params.map(p => p.join('=')).join('&')
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

registerBidder(spec)
