import { isStr, _each, parseUrl, getWindowTop, getBidIdParameter } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'nextMillennium';
const ENDPOINT = 'https://pbs.nextmillmedia.com/openrtb2/auction';
const TEST_ENDPOINT = 'https://test.pbs.nextmillmedia.com/openrtb2/auction';
const SYNC_ENDPOINT = 'https://statics.nextmillmedia.com/load-cookie.html?v=4';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(
      (bid.params.placement_id && isStr(bid.params.placement_id)) || (bid.params.group_id && isStr(bid.params.group_id))
    );
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];
    window.nmmRefreshCounts = window.nmmRefreshCounts || {};

    _each(validBidRequests, function(bid) {
      window.nmmRefreshCounts[bid.adUnitCode] = window.nmmRefreshCounts[bid.adUnitCode] || 0;
      const postBody = {
        'id': bid.auctionId,
        'ext': {
          'prebid': {
            'storedrequest': {
              'id': getPlacementId(bid)
            }
          },

          'nextMillennium': {
            'refresh_count': window.nmmRefreshCounts[bid.adUnitCode]++,
          }
        }
      }

      const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
      const uspConsent = bidderRequest && bidderRequest.uspConsent

      if (gdprConsent || uspConsent) {
        postBody.regs = { ext: {} }

        if (uspConsent) {
          postBody.regs.ext.us_privacy = uspConsent;
        }

        if (gdprConsent) {
          if (typeof gdprConsent.gdprApplies !== 'undefined') {
            postBody.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0;
          }

          if (typeof gdprConsent.consentString !== 'undefined') {
            postBody.user = {
              ext: { consent: gdprConsent.consentString }
            }
          }
        }
      }

      const urlParameters = parseUrl(getWindowTop().location.href).search;
      const isTest = urlParameters['pbs'] && urlParameters['pbs'] === 'test';

      requests.push({
        method: 'POST',
        url: isTest ? TEST_ENDPOINT : ENDPOINT,
        data: JSON.stringify(postBody),
        options: {
          contentType: 'application/json',
          withCredentials: true
        },
        bidId: bid.bidId
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;
    const bidResponses = [];

    _each(response.seatbid, (resp) => {
      _each(resp.bid, (bid) => {
        bidResponses.push({
          requestId: bidRequest.bidId,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          creativeId: bid.adid,
          currency: response.cur,
          netRevenue: false,
          ttl: TIME_TO_LIVE,
          meta: {
            advertiserDomains: bid.adomain || []
          },

          ad: bid.adm
        });
      });
    });

    return bidResponses;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (!syncOptions.iframeEnabled) {
      return
    }

    let syncurl = gdprConsent && gdprConsent.gdprApplies ? `${SYNC_ENDPOINT}&gdpr=1&gdpr_consent=${gdprConsent.consentString}` : SYNC_ENDPOINT

    let bidders = []
    if (responses) {
      _each(responses, (response) => {
        if (!(response && response.body && response.body.ext && response.body.ext.responsetimemillis)) return
        _each(Object.keys(response.body.ext.responsetimemillis), b => bidders.push(b))
      })
    }

    if (bidders.length) {
      syncurl += `&bidders=${bidders.join(',')}`
    }

    return [{
      type: 'iframe',
      url: syncurl
    }];
  },
};

function getPlacementId(bid) {
  const groupId = getBidIdParameter('group_id', bid.params)
  const placementId = getBidIdParameter('placement_id', bid.params)
  if (!groupId) return placementId

  let windowTop = getTopWindow(window)
  let size = []
  if (bid.mediaTypes) {
    if (bid.mediaTypes.banner) size = bid.mediaTypes.banner.sizes && bid.mediaTypes.banner.sizes[0]
    if (bid.mediaTypes.video) size = bid.mediaTypes.video.playerSize
  }

  const host = (windowTop && windowTop.location && windowTop.location.host) || ''
  return `g${groupId};${size.join('x')};${host}`
}

function getTopWindow(curWindow, nesting = 0) {
  if (nesting > 10) {
    return curWindow
  }

  try {
    if (curWindow.parent.document) {
      return getTopWindow(curWindow.parent.window, ++nesting)
    }
  } catch (err) {
    return curWindow
  }
}

registerBidder(spec);
