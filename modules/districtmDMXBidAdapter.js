import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import {config} from '../src/config';

const BIDDER_CODE = 'districtmDMX';

const DMXURI = 'https://dmx.districtm.io/b/v1';

export const spec = {
  code: BIDDER_CODE,
  supportedFormat: ['banner'],
  isBidRequestValid(bid) {
    return !!(bid.params.dmxid && bid.params.memberid);
  },
  interpretResponse(response, bidRequest) {
    response = response.body || {};
    if (response.seatbid) {
      if (utils.isArray(response.seatbid)) {
        const {seatbid} = response;
        let winners = seatbid.reduce((bid, ads) => {
          let ad = ads.bid.reduce(function(oBid, nBid) {
            if (oBid.price < nBid.price) {
              const bid = matchRequest(nBid.impid, bidRequest);
              const {width, height} = defaultSize(bid);
              nBid.cpm = nBid.price;
              nBid.bidId = nBid.impid;
              nBid.requestId = nBid.impid;
              nBid.width = nBid.w || width;
              nBid.height = nBid.h || height;
              nBid.ad = nBid.adm;
              nBid.netRevenue = true;
              nBid.creativeId = nBid.crid;
              nBid.currency = 'USD';
              nBid.ttl = 60;

              return nBid;
            } else {
              oBid.cpm = oBid.price;
              return oBid;
            }
          }, {price: 0});
          if (ad.adm) {
            bid.push(ad)
          }
          return bid;
        }, [])
        let winnersClean = winners.filter(w => {
          if (w.bidId) {
            return true;
          }
          return false;
        });
        return winnersClean;
      } else {
        return [];
      }
    } else {
      return [];
    }
  },
  buildRequests(bidRequest, bidderRequest) {
    let timeout = config.getConfig('bidderTimeout');
    let schain = null;
    let dmxRequest = {
      id: utils.generateUUID(),
      cur: ['USD'],
      tmax: (timeout - 300),
      test: this.test() || 0,
      site: {
        publisher: { id: String(bidRequest[0].params.memberid) || null }
      }
    }
    if (!dmxRequest.test) {
      delete dmxRequest.test;
    }
    if (bidderRequest.gdprConsent) {
      dmxRequest.regs = {};
      dmxRequest.regs.ext = {};
      dmxRequest.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0;
      dmxRequest.user = {};
      dmxRequest.user.ext = {};
      dmxRequest.user.ext.consent = bidderRequest.gdprConsent.consentString;
    }
    try {
      schain = bidRequest[0].schain;
      dmxRequest.source = {};
      dmxRequest.source.ext = {};
      dmxRequest.source.ext.schain = schain || {}
    } catch (e) {}
    let tosendtags = bidRequest.map(dmx => {
      var obj = {};
      obj.id = dmx.bidId;
      obj.tagid = String(dmx.params.dmxid);
      obj.secure = 1;
      obj.banner = {
        topframe: 1,
        w: dmx.sizes[0][0] || 0,
        h: dmx.sizes[0][1] || 0,
        format: dmx.sizes.map(s => {
          return {w: s[0], h: s[1]};
        }).filter(obj => typeof obj.w === 'number' && typeof obj.h === 'number')
      };
      return obj;
    });
    dmxRequest.imp = tosendtags;

    return {
      method: 'POST',
      url: DMXURI,
      data: JSON.stringify(dmxRequest),
      bidderRequest
    }
  },
  test() {
    return window.location.href.indexOf('dmTest=true') !== -1 ? 1 : 0;
  },
  getUserSyncs(optionsType) {
    if (optionsType.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://cdn.districtm.io/ids/index.html'
      }];
    }
  }
}

/**
 * Function matchRequest(id: string, BidRequest: object)
 * @param id
 * @type string
 * @param bidRequest
 * @type Object
 * @returns Object
 *
 */
export function matchRequest(id, bidRequest) {
  const {bids} = bidRequest.bidderRequest;
  const [returnValue] = bids.filter(bid => bid.bidId === id);
  return returnValue;
}
export function checkDeepArray(Arr) {
  if (Array.isArray(Arr)) {
    if (Array.isArray(Arr[0])) {
      return Arr[0];
    } else {
      return Arr;
    }
  } else {
    return Arr;
  }
}
export function defaultSize(thebidObj) {
  const {sizes} = thebidObj;
  const returnObject = {};
  returnObject.width = checkDeepArray(sizes)[0];
  returnObject.height = checkDeepArray(sizes)[1];
  return returnObject;
}
registerBidder(spec);
