import {registerBidder} from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';
import {ajax} from '../src/ajax';

export const spec = {
  code: 'vrtcal',
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return true;// No extras params required
  },
  buildRequests: function (bidRequests) {
    const requests = bidRequests.map(function (bid) {
      const params = {

        prebidJS: 1,
        prebidAdUnitCode: bid.adUnitCode,
        id: bid.bidId,
        imp: [{
          id: '1',
          banner: {
            w: bid.sizes[0][0],
            h: bid.sizes[0][1],
          },
          bidfloor: 0.75
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

      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    return [];
  },
  onBidWon: function(bid) {
    if (!bid.nurl) { return; }
    const winUrl = bid.nurl.replace(
      /\$\{AUCTION_PRICE\}/,
      bid.cpm
    );
    ajax(winUrl, null);
  }
};

registerBidder(spec);
