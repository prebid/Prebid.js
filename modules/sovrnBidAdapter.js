import * as utils from '../src/utils'
import { registerBidder } from '../src/adapters/bidderFactory'
import { BANNER } from '../src/mediaTypes'

export const spec = {
  code: 'sovrn',
  supportedMediaTypes: [BANNER],

  /**
   * Check if the bid is a valid zone ID in either number or string form
   * @param {object} bid the Sovrn bid to validate
   * @return boolean for whether or not a bid is valid
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.tagid && !isNaN(parseFloat(bid.params.tagid)) && isFinite(bid.params.tagid));
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
      let digitrust;

      utils._each(bidReqs, function (bid) {
        if (!digitrust) {
          const bidRequestDigitrust = utils.deepAccess(bid, 'userId.digitrustid.data');
          if (bidRequestDigitrust && (!bidRequestDigitrust.privacy || !bidRequestDigitrust.privacy.optout)) {
            digitrust = {
              id: bidRequestDigitrust.id,
              keyv: bidRequestDigitrust.keyv
            }
          }
        }
        if (bid.schain) {
          schain = schain || bid.schain;
        }
        iv = iv || utils.getBidIdParameter('iv', bid.params);

        let bidSizes = (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) || bid.sizes;
        bidSizes = ((utils.isArray(bidSizes) && utils.isArray(bidSizes[0])) ? bidSizes : [bidSizes])
        bidSizes = bidSizes.filter(size => utils.isArray(size))
        const processedSizes = bidSizes.map(size => ({w: parseInt(size[0], 10), h: parseInt(size[1], 10)}))
        sovrnImps.push({
          id: bid.bidId,
          banner: {
            format: processedSizes,
            w: 1,
            h: 1,
          },
          tagid: String(utils.getBidIdParameter('tagid', bid.params)),
          bidfloor: utils.getBidIdParameter('bidfloor', bid.params)
        });
      });

      const page = bidderRequest.refererInfo.referer
      // clever trick to get the domain
      const el = document.createElement('a');
      el.href = page;
      const domain = el.hostname;

      const sovrnBidReq = {
        id: utils.getUniqueIdentifierStr(),
        imp: sovrnImps,
        site: {
          page,
          domain
        }
      };

      if (schain) {
        sovrnBidReq.source = {
          ext: {
            schain
          }
        };
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        sovrnBidReq.regs = {
          ext: {
            gdpr: +bidderRequest.gdprConsent.gdprApplies
          }};
        sovrnBidReq.user = {
          ext: {
            consent: bidderRequest.gdprConsent.consentString
          }};
      }

      if (digitrust) {
        utils.deepSetValue(sovrnBidReq, 'user.ext.digitrust', {
          id: digitrust.id,
          keyv: digitrust.keyv
        })
      }

      let url = `https://ap.lijit.com/rtb/bid?` +
        `src=$$REPO_AND_VERSION$$`;
      if (iv) url += `&iv=${iv}`;

      return {
        method: 'POST',
        url: url,
        data: JSON.stringify(sovrnBidReq),
        options: {contentType: 'text/plain'}
      }
    } catch (e) {
      console.log('error in build:')
      console.log(e)
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
            mediaType: BANNER,
            ad: decodeURIComponent(`${sovrnBid.adm}<img src="${sovrnBid.nurl}">`),
            ttl: 60
          });
        });
      }
      return sovrnBidResponses
    } catch (e) {
      console.log('error in interpret:')
      console.log(e)
    }
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    try {
      let tracks = []
      if (serverResponses && serverResponses.length !== 0) {
        if (syncOptions.iframeEnabled) {
          let iidArr = serverResponses.filter(resp => utils.deepAccess(resp, 'body.ext.iid'))
            .map(resp => resp.body.ext.iid);
          let consentString = '';
          if (gdprConsent && gdprConsent.gdprApplies && typeof gdprConsent.consentString === 'string') {
            consentString = gdprConsent.consentString
          }
          if (iidArr[0]) {
            tracks.push({
              type: 'iframe',
              url: '//ap.lijit.com/beacon?informer=' + iidArr[0] + '&gdpr_consent=' + consentString,
            });
          }
        }

        if (syncOptions.pixelEnabled) {
          serverResponses.filter(resp => utils.deepAccess(resp, 'body.ext.sync.pixels'))
            .flatMap(resp => resp.body.ext.sync.pixels)
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
