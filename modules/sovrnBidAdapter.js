import { _each, getBidIdParameter, isArray, deepClone, parseUrl, getUniqueIdentifierStr, deepSetValue, logError, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER, VIDEO } from '../src/mediaTypes.js'
import { createEidsArray } from './userId/eids.js';
import {config} from '../src/config.js';

export const DEFAULT_MIMES = ['video/3gpp', 'video/mov', 'video/mp4', 'video/mpv', 'application/javascript']
export const DEFAULT_PROTOCOLS = [1, 2, 3, 4, 5, 6]

export const spec = {
  code: 'sovrn',
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: 13,

  /**
   * Check if the bid is a valid zone ID in either number or string form
   * @param {object} bid the Sovrn bid to validate
   * @return boolean for whether or not a bid is valid
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.tagid && !isNaN(parseFloat(bid.params.tagid)) && isFinite(bid.params.tagid))
  },

  /**
   * Format the bid request object for our endpoint
   * @param {BidRequest[]} bidRequests Array of Sovrn bidders
   * @return object of parameters for Prebid AJAX request
   */
  buildRequests: function(bidReqs, bidderRequest) {
    try {
      let sovrnImps = [];
      let iv;
      let schain;
      let eids;
      let tpid = []
      let criteoId;

      _each(bidReqs, function (bid) {
        if (!eids && bid.userId) {
          eids = createEidsArray(bid.userId)
          eids.forEach(function (id) {
            if (id.uids && id.uids[0]) {
              if (id.source === 'criteo.com') {
                criteoId = id.uids[0].id
              }
              tpid.push({source: id.source, uid: id.uids[0].id})
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
          tagid: String(utils.getBidIdParameter('tagid', bid.params)),
          bidfloor: floorInfo.floor
        }

        if (bid.mediaTypes && bid.mediaTypes.banner) {
          let bidSizes = (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) || bid.sizes
          bidSizes = ((utils.isArray(bidSizes) && utils.isArray(bidSizes[0])) ? bidSizes : [bidSizes])
          bidSizes = bidSizes.filter(size => utils.isArray(size))
          const processedSizes = bidSizes.map(size => ({w: parseInt(size[0], 10), h: parseInt(size[1], 10)}))

          imp.banner = {
            format: processedSizes,
            w: 1,
            h: 1,
          };
        }
        if (bid.mediaTypes && bid.mediaTypes.video) {
          let bidSizes = bid.mediaTypes.video.playerSize
          bidSizes = (utils.isArray(bidSizes) && utils.isArray(bidSizes[0])) ? bidSizes : [bidSizes]
          bidSizes = bidSizes.filter(size => utils.isArray(size))

          const video = utils.deepAccess(bid, 'mediaTypes.video') || {}

          imp.video = {
            w: bidSizes[0][0],
            h: bidSizes[0][1],
            mimes: video.mimes || DEFAULT_MIMES,
            protocols: video.protocols || DEFAULT_PROTOCOLS,
            minduration: video.minduration,
            maxduration: video.maxduration,
            startdelay: video.startdelay
          }
        }

        imp.ext = getBidIdParameter('ext', bid.ortb2Imp) || undefined

        const segmentsString = getBidIdParameter('segments', bid.params)
        if (segmentsString) {
          imp.ext = imp.ext || {}
          imp.ext.deals = segmentsString.split(',').map(deal => deal.trim())
        }
        sovrnImps.push(imp)
      })

      const fpd = deepClone(config.getConfig('ortb2'))

      const site = fpd.site || {}
      site.page = bidderRequest.refererInfo.referer
      // clever trick to get the domain
      site.domain = parseUrl(site.page).hostname

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
        deepSetValue(sovrnBidReq, 'user.ext.tpid', tpid)
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
    try {
      let sovrnBidResponses = [];
      if (id &&
        seatbid &&
        seatbid.length > 0 &&
        seatbid[0].bid &&
        seatbid[0].bid.length > 0) {
        seatbid[0].bid.map(sovrnBid => {
          sovrnBidResponses.push({
            requestId: sovrnBid.impid,
            cpm: parseFloat(sovrnBid.price),
            width: parseInt(sovrnBid.w),
            height: parseInt(sovrnBid.h),
            creativeId: sovrnBid.crid || sovrnBid.id,
            dealId: sovrnBid.dealid || null,
            currency: 'USD',
            netRevenue: true,
            mediaType: sovrnBid.mediaType || BANNER,
            ad: decodeURIComponent(`${sovrnBid.adm}<img src="${sovrnBid.nurl}">`),
            ttl: sovrnBid.ext ? (sovrnBid.ext.ttl || 90) : 90,
            meta: { advertiserDomains: sovrnBid && sovrnBid.adomain ? sovrnBid.adomain : [] }
          });
        });
      }
      return sovrnBidResponses
    } catch (e) {
      logError('Could not intrepret bidresponse, error deatils:', e);
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

registerBidder(spec);
