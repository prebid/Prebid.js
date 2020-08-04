import * as utils from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER } from '../src/mediaTypes.js'

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
      let unifiedID;

      utils._each(bidReqs, function (bid) {
        if (!unifiedID) {
          unifiedID = utils.deepAccess(bid, 'userId.tdid');
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
          adunitcode: bid.adUnitCode,
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
      const domain = utils.parseUrl(page).hostname

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

      if (bidderRequest.gdprConsent) {
        utils.deepSetValue(sovrnBidReq, 'regs.ext.gdpr', +bidderRequest.gdprConsent.gdprApplies);
        utils.deepSetValue(sovrnBidReq, 'user.ext.consent', bidderRequest.gdprConsent.consentString)
      }
      if (bidderRequest.uspConsent) {
        utils.deepSetValue(sovrnBidReq, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      }

      if (unifiedID) {
        const idArray = [{
          source: 'adserver.org',
          uids: [
            {
              id: unifiedID,
              ext: {
                rtiPartner: 'TDID'
              }
            }
          ]
        }]
        utils.deepSetValue(sovrnBidReq, 'user.ext.eids', idArray)
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
      utils.logError('Could not build bidrequest, error deatils:', e);
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
      utils.logError('Could not intrepret bidresponse, error deatils:', e);
    }
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    try {
      const tracks = []
      if (serverResponses && serverResponses.length !== 0) {
        if (syncOptions.iframeEnabled) {
          const iidArr = serverResponses.filter(resp => utils.deepAccess(resp, 'body.ext.iid'))
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
          serverResponses.filter(resp => utils.deepAccess(resp, 'body.ext.sync.pixels'))
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
