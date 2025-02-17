import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';

const RTB_URL = '/rtb/getbid.php?rtbprovider=prebid';
const SCRIPT_URL = '/adasync.min.js';

export const spec = {

  code: 'adspirit',
  aliases: ['twiago'],
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid: function (bid) {
    let host = spec.getBidderHost(bid);
    if (!host || !bid.params.placementId) {
      return false;
    }
    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    let requests = [];
    let prebidVersion = $$PREBID_GLOBAL$$.version;

    for (let i = 0; i < validBidRequests.length; i++) {
      let bidRequest = validBidRequests[i];
      bidRequest.adspiritConId = spec.genAdConId(bidRequest);
      let reqUrl = spec.getBidderHost(bidRequest);
      let placementId = utils.getBidIdParameter('placementId', bidRequest.params);

      reqUrl = '//' + reqUrl + RTB_URL +
            '&pid=' + placementId +
            '&ref=' + encodeURIComponent(bidderRequest.refererInfo.topmostLocation) +
            '&scx=' + screen.width +
            '&scy=' + screen.height +
            '&wcx=' + (window.innerWidth || document.documentElement.clientWidth) +
            '&wcy=' + (window.innerHeight || document.documentElement.clientHeight) +
            '&async=' + bidRequest.adspiritConId +
            '&t=' + Math.round(Math.random() * 100000);

      let gdprApplies = bidderRequest.gdprConsent ? (bidderRequest.gdprConsent.gdprApplies ? 1 : 0) : 0;
      let gdprConsentString = bidderRequest.gdprConsent ? encodeURIComponent(bidderRequest.gdprConsent.consentString) : '';

      if (bidderRequest.gdprConsent) {
        reqUrl += '&gdpr=' + gdprApplies + '&gdpr_consent=' + gdprConsentString;
      }

      let openRTBRequest = {
        id: bidRequest.bidId,
        imp: [{
          id: bidRequest.bidId,
          banner: bidRequest.mediaTypes.banner ? {
            format: bidRequest.mediaTypes.banner.sizes.map(size => ({
              w: size[0],
              h: size[1]
            }))
          } : undefined,
          native: {
            request: JSON.stringify({
                ver: "1.2",
                assets: [
                    { id: 1, required: 1, title: {  } },  
                    { id: 2, required: 1, img: { type: 3 } }, 
                    { id: 4, required: 1, data: { type: 2} }, 
                    { id: 3, required: 1, data: { type: 12 } }, 
                    { id: 6, required: 1, data: { type: 1 } }, 
                    { id: 5, required: 1, img: { type: 3} } 
                ],
                link: { required: 1 } 
            })
        },
          bidfloor: bidRequest.params.bidfloor !== undefined ? parseFloat(bidRequest.params.bidfloor) : 0,
          ext: {
            placementId: bidRequest.params.placementId
          }
        }],
        site: {
          page: bidderRequest.refererInfo.topmostLocation
        },
        device: {
          ua: navigator.userAgent,
          ip: bidderRequest?.geo?.ip || '',
          language: (navigator.language || '').split('-')[0],
          w: window.innerWidth || document.documentElement.clientWidth,
          h: window.innerHeight || document.documentElement.clientHeight
        },
        regs: {
          ext: {
            gdpr: gdprApplies,
            gdpr_consent: gdprConsentString
          }
        },
        ext: {
          prebidVersion: prebidVersion,
          adUnitCode: {
            prebidVersion: prebidVersion,
            code: bidRequest.adUnitCode,
            mediaTypes: bidRequest.mediaTypes
          }
        }
      };

      if (bidRequest.schain) {
        openRTBRequest.source = {
          ext: {
            schain: bidRequest.schain
          }
        };
      }

      requests.push({
        method: 'POST',
        url: reqUrl,
        data: JSON.stringify(openRTBRequest),
        headers: { 'Content-Type': 'application/json' },
        bidRequest: bidRequest
      });
    }

    return requests;
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    let bidObj = bidRequest.bidRequest;

    if (!serverResponse || !serverResponse.body || !bidObj) {
      utils.logWarn(`No valid bids from ${spec.code} bidder!`);
      return [];
    }

    let adData = serverResponse.body;
    let isOpenRTB = adData.seatbid && Array.isArray(adData.seatbid) && adData.seatbid.length > 0;

    if (isOpenRTB) {
      adData.seatbid.forEach(seat => {
        seat.bid.forEach(bid => {
          let bidResponse = {
            requestId: bid.impid,
            cpm: bid.price,
            width: bid.w,
            height: bid.h,
            creativeId: bid.crid || bidObj.params.placementId,
            currency: adData.cur || 'EUR',
            netRevenue: true,
            ttl: 300,
            meta: {
              advertiserDomains: bid.adomain || []
            }
          };

          if (bid.ext && bid.ext.native) {
            bidResponse.native = {
              title: bid.ext.native.title,
              body: bid.ext.native.body,
              cta: bid.ext.native.cta,
              image: { url: bid.ext.native.image },
              clickUrl: bid.ext.native.click,
              impressionTrackers: bid.ext.native.impressionTrackers || []
            };
            bidResponse.mediaType = NATIVE;
          } else {
            bidResponse.ad = bid.adm;
            bidResponse.mediaType = BANNER;
          }

          bidResponses.push(bidResponse);
        });
      });
    }
    return bidResponses;
  },
  getBidderHost: function (bid) {
    if (bid.bidder === 'adspirit') {
      return utils.getBidIdParameter('host', bid.params);
    }
    if (bid.bidder === 'twiago') {
      return 'a.twiago.com';
    }
    return null;
  },

  genAdConId: function (bid) {
    return bid.bidder + Math.round(Math.random() * 100000);
  }
};

registerBidder(spec);
