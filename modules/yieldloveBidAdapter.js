import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {BANNER} from '../src/mediaTypes.js';

const ENDPOINT_URL = '//s2s.yieldlove-ad-serving.net/openrtb2/auction';

const DEFAULT_BID_TTL = 300; /* 5 minutes */
const DEFAULT_CURRENCY = 'EUR';

const participatedBidders = []

export const spec = {
  gvlid: 251,
  code: 'yieldlove',
  aliases: ['yl'],
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!(bid.params.pid && bid.params.rid)
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const anyValidBidRequest = validBidRequests[0]

    const impressions = validBidRequests.map(bidRequest => {
      return {
          ext: {
            prebid: {
                storedrequest: {
                    id: bidRequest.params.pid?.toString()
                }
            }
          },
          banner:  {
            format: bidRequest.sizes.map(sizeArr => ({
              w: sizeArr[0],
              h: sizeArr[1],
            }))
          },
          secure: 1,
          id: bidRequest.bidId
        }
    })

    const schains = anyValidBidRequest.schain ? [{bidders: ["*"], schain:anyValidBidRequest.schain}] : []

    const s2sRequest = {
      device: {
        ua: window.navigator.userAgent,
        w: window.innerWidth,
        h: window.innerHeight,
      },
      site: {
        ver: '1.9.0',
        publisher: {
          id: anyValidBidRequest.params.rid
        },
        page: window.location.href,
        domain: anyValidBidRequest.params.rid
      },
      ext: {
        prebid: {
          targeting: {},
          cache: {
            bids: {}
          },
          storedrequest: {
            id: anyValidBidRequest.params.rid
          },
          schains
        }
      },
      user: {
        ext: {
          consent: bidderRequest.gdprConsent?.consentString
        },
      },
      id: bidderRequest.auctionId,
      imp: impressions,
      regs: {
        ext: {
            gdpr: 1
        }
      }
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: s2sRequest,
      options: {
        contentType: 'text/plain',
        withCredentials: true 
      },
    };
  },

  interpretResponse: function (serverResponse) {
    const bidResponses = []
    const seatBids = serverResponse.body?.seatbid || []
    seatBids.reduce((bids, cur)=>{
      if(cur.bid && cur.bid.length > 0) bids = bids.concat(cur.bid)
      return bids
    }, []).forEach(bid => {
      bidResponses.push({
        requestId: bid.impid,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        ad: bid.adm,
        ttl: DEFAULT_BID_TTL,
        creativeId: bid.crid,
        netRevenue: true,
        currency: DEFAULT_CURRENCY
      })
    }) 
    
    const bidders = serverResponse.body?.ext.responsetimemillis || {}
    Object.keys(bidders).forEach(bidder => {
      if (!participatedBidders.includes(bidder)) participatedBidders.push(bidder)
    })
    
    if (bidResponses.length === 0) {
      // prebid's logger already prefix logs with bidder name
      utils.logInfo('interpretResponse :: no bid');
    }

    return bidResponses;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    let gdpr_params = ''
    gdpr_params = `gdpr=${Number(gdprConsent.gdprApplies)}&`
    // add OR if you don't want gdpr_consent=undefined in query string
    // can happen e.g. when gdprApplies=false (like here in NZ).
    gdpr_params += `gdpr_consent=${gdprConsent.consentString || ''}`

    let bidder_params = ''
    if (participatedBidders.length > 0) {
      bidder_params  =`bidders=${participatedBidders.join(',')}`
    }
    
    syncs.push({
      type: 'iframe',
      url: `https://cdn-a.yieldlove.com/load-cookie.html?endpoint=yieldlove&max_sync_count=100&${gdpr_params}&${bidder_params}`
    })

    return syncs
  },

};
registerBidder(spec);
