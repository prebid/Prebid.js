import { spec } from 'modules/a1MediaBidAdapter.js';
import { config } from 'src/config.js';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';
import 'modules/currency.js';
import 'modules/priceFloors.js';
import { replaceAuctionPrice } from '../../../src/utils';

const ortbBlockParams = {
  battr: [ 13 ],
  bcat: ['IAB1-1']
};
const getBidderRequest = (isMulti = false) => {
  return {
    bidderCode: 'a1media',
    auctionId: 'ba87bfdf-493e-4a88-8e26-17b4cbc9adbd',
    bidderRequestId: '104e8d2392bd6f',
    bids: [
      {
        bidder: 'a1media',
        params: {},
        auctionId: 'ba87bfdf-493e-4a88-8e26-17b4cbc9adbd',
        mediaTypes: {
          banner: {
            sizes: [
              [ 320, 100 ],
            ]
          },
          ...(isMulti && {
            video: {
              mimes: ['video/mp4']
            },
            native: {
              title: {
                required: true,
              }}
          })
        },
        ...(isMulti && {
          nativeOrtbRequest: {
            ver: '1.2',
            assets: [
              {
                id: 0,
                required: 1,
                title: {
                  len: 140
                }
              }
            ]
          }
        }),
        adUnitCode: 'test-div',
        transactionId: 'cab00498-028b-4061-8f9d-a8d66c8cb91d',
        bidId: '2e9f38ea93bb9e',
        bidderRequestId: '104e8d2392bd6f',
      }
    ],
  }
};
const getConvertedBidReq = () => {
  return {
    cur: [
      'JPY'
    ],
    imp: [
      {
        banner: {
          format: [
            {
              h: 100,
              w: 320
            },
          ],
          topframe: 0
        },
        bidfloor: 0,
        bidfloorcur: 'JPY',
        id: '2e9f38ea93bb9e',
        secure: 1
      }
    ],
    test: 0,
  }
};

const getBidderResponse = () => {
  return {
    body: {
      id: 'bid-response',
      cur: 'JPY',
      seatbid: [
        {
          bid: [{
            impid: '2e9f38ea93bb9e',
            crid: 'creative-id',
            cur: 'JPY',
            price: 9,
          }]
        }
      ]
    }
  }
}
const bannerAdm = '<div><img src="test_src" /></div>';
const videoAdm = '<VAST version="3.0">testvast1</VAST>';
const nativeAdm = '{"ver":"1.2","link":{"url":"test_url"},"assets":[{"id":1,"required":1,"title":{"text":"native_title"}}]}';
const macroAdm = '<div><img src="http://d11.contentsfeed.com/pixel/${AUCTION_PRICE}" /></div>';
const macroNurl = 'https://d11.contentsfeed.com/dsp/win/example.com/SITE/a1/${AUCTION_PRICE}';
const interpretedNurl = `<div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="${macroNurl}"></div>`;

describe('a1MediaBidAdapter', function() {
  describe('isValidRequest', function() {
    const bid = {
      bidder: 'a1media',
    };

    it('should return true always', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function() {
    let bidderRequest, convertedRequest;
    beforeEach(function() {
      bidderRequest = getBidderRequest();
      convertedRequest = getConvertedBidReq();
    });

    it('should return expected request object', function() {
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      convertedRequest.id = bidRequest.data.id;

      expect(bidRequest.method).equal('POST');
      expect(bidRequest.url).equal('https://d11.contentsfeed.com/dsp/breq/a1');
      expect(bidRequest.data).deep.equal(convertedRequest);
    });
    it('should set ortb blocking using params', function() {
      bidderRequest.bids[0].params = ortbBlockParams;

      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      convertedRequest.id = bidRequest.data.id;
      convertedRequest.bcat = ortbBlockParams.bcat;
      convertedRequest.imp[0].banner.battr = ortbBlockParams.battr;

      expect(bidRequest.data).deep.equal(convertedRequest);
    });

    it('should set bidfloor when getFloor is available', function() {
      bidderRequest.bids[0].getFloor = () => ({ currency: 'USD', floor: 999 });
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);

      expect(bidRequest.data.imp[0].bidfloor).equal(999);
      expect(bidRequest.data.imp[0].bidfloorcur).equal('USD');
    });

    it('should set cur when currency config is configured', function() {
      config.setConfig({
        currency: {
          adServerCurrency: 'USD',
        }
      });
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);

      expect(bidRequest.data.cur[0]).equal('USD');
    });

    it('should set bidfloor and currency using params when modules not available', function() {
      bidderRequest.bids[0].params.currency = 'USD';
      bidderRequest.bids[0].params.bidfloor = 0.99;

      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      convertedRequest.id = bidRequest.data.id;
      convertedRequest.imp[0].bidfloor = 0.99;
      convertedRequest.imp[0].bidfloorcur = 'USD';
      convertedRequest.cur[0] = 'USD';

      expect(bidRequest.data).deep.equal(convertedRequest);
    });
  });

  describe('interpretResponse', function() {
    describe('when request mediaType is single', function() {
      let bidRequest, bidderResponse;
      beforeEach(function() {
        const bidderRequest = getBidderRequest();
        bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
        bidderResponse = getBidderResponse();
      });
      it('should set cpm using price attribute', function() {
        const bidResPrice = 9;
        bidderResponse.body.seatbid[0].bid[0].price = bidResPrice;
        const interpretedRes = spec.interpretResponse(bidderResponse, bidRequest);
        expect(interpretedRes[0].cpm).equal(bidResPrice);
      });
      it('should set mediaType using request mediaTypes', function() {
        const interpretedRes = spec.interpretResponse(bidderResponse, bidRequest);
        expect(interpretedRes[0].mediaType).equal(BANNER);
      });
    });

    describe('when request mediaType is multi', function() {
      let bidRequest, bidderResponse;
      beforeEach(function() {
        const bidderRequest = getBidderRequest(true);
        bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
        bidderResponse = getBidderResponse();
      });
      it('should set mediaType to video', function() {
        bidderResponse.body.seatbid[0].bid[0].adm = videoAdm;
        const interpretedRes = spec.interpretResponse(bidderResponse, bidRequest);
        expect(interpretedRes[0].mediaType).equal(VIDEO);
      });
      it('should set mediaType to native', function() {
        bidderResponse.body.seatbid[0].bid[0].adm = nativeAdm;
        const interpretedRes = spec.interpretResponse(bidderResponse, bidRequest);
        expect(interpretedRes[0].mediaType).equal(NATIVE);
      });
      it('should set mediaType to banner when adm is neither native or video', function() {
        bidderResponse.body.seatbid[0].bid[0].adm = bannerAdm;
        const interpretedRes = spec.interpretResponse(bidderResponse, bidRequest);
        expect(interpretedRes[0].mediaType).equal(BANNER);
      });
    });

    describe('resolve the AUCTION_PRICE macro', function() {
      let bidRequest;
      beforeEach(function() {
        const bidderRequest = getBidderRequest(true);
        bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      });
      it('should return empty array when bid response has not contents', function() {
        const emptyResponse = { body: '' };
        const interpretedRes = spec.interpretResponse(emptyResponse, bidRequest);
        expect(interpretedRes.length).equal(0);
      });
      it('should replace macro keyword if is exist', function() {
        const bidderResponse = getBidderResponse();
        bidderResponse.body.seatbid[0].bid[0].adm = macroAdm;
        bidderResponse.body.seatbid[0].bid[0].nurl = macroNurl;
        const interpretedRes = spec.interpretResponse(bidderResponse, bidRequest);

        const expectedResPrice = 9;
        const expectedAd = replaceAuctionPrice(macroAdm, expectedResPrice) + replaceAuctionPrice(interpretedNurl, expectedResPrice);

        expect(interpretedRes[0].ad).equal(expectedAd);
      });
    });
  });
})
