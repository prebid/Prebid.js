import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';
import {isFn, isPlainObject} from '../src/utils.js';

export const spec = {
  code: 'vrtcal',
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    if (bid.bidId == '' || bid.auctionId == '') { return false; } else { return true; }// No extras params required
  },
  buildRequests: function (bidRequests) {
    const requests = bidRequests.map(function (bid) {
      let floor = 0;

      if (isFn(bid.getFloor)) {
        const floorInfo = bid.getFloor({ currency: 'USD', mediaType: 'banner', size: bid.sizes.map(([w, h]) => ({w, h})) });

        if (isPlainObject(floorInfo) && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
          floor = Math.max(floor, parseFloat(floorInfo.floor));
        }
      }

      const params = {
        prebidJS: 1,
        prebidAdUnitCode: bid.adUnitCode,
        id: bid.bidId,
        imp: [{
          id: '1',
          banner: {
          },
          bidfloor: floor
        }],
        site: {
          id: 'VRTCAL_FILLED',
          name: 'VRTCAL_FILLED',
          cat: ['VRTCAL_FILLED'],
          domain: decodeURIComponent(window.location.href).replace('https://', '').replace('http://', '').split('/')[0]

        },
        device: {
          ua: 'VRTCAL_FILLED',
          ip: 'VRTCAL_FILLED'
        }
      };

      if (typeof (bid.mediaTypes) !== 'undefined' && typeof (bid.mediaTypes.banner) !== 'undefined' && typeof (bid.mediaTypes.banner.sizes) !== 'undefined') {
        params.imp[0].banner.w = bid.mediaTypes.banner.sizes[0][0];
        params.imp[0].banner.h = bid.mediaTypes.banner.sizes[0][1];
      } else {
        params.imp[0].banner.w = bid.sizes[0][0];
        params.imp[0].banner.h = bid.sizes[0][1];
      }

      return {method: 'POST', url: 'https://rtb.vrtcal.com/bidder_prebid.vap?ssp=1804', data: JSON.stringify(params), options: {withCredentials: false, crossOrigin: true}}
    });

    return requests;
  },
  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    const bidResponses = [];

    var response = serverResponse.body;

    if (response) {
      const bidResponse = {
        requestId: response.id,
        cpm: response.seatbid[0].bid[0].price,
        width: response.seatbid[0].bid[0].w,
        height: response.seatbid[0].bid[0].h,
        creativeId: response.seatbid[0].bid[0].crid,
        currency: 'USD',
        netRevenue: true,
        ttl: 900,
        ad: response.seatbid[0].bid[0].adm,
        nurl: response.seatbid[0].bid[0].nurl
      };

      if (response.seatbid[0].bid[0].adomain && response.seatbid[0].bid[0].adomain.length) {
        bidResponse.meta = {
          advertiserDomains: response.seatbid[0].bid[0].adomain
        };
      }

      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
  onBidWon: function(bid) {
    if (!bid.nurl) { return false; }
    const winUrl = bid.nurl.replace(
      /\$\{AUCTION_PRICE\}/,
      bid.cpm
    );
    ajax(winUrl, null);
    return true;
  }
};

registerBidder(spec);
