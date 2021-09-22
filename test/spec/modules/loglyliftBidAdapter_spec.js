import { expect } from 'chai';
import { spec } from '../../../modules/loglyliftBidAdapter';
import * as utils from 'src/utils.js';

describe('loglyliftBidAdapter', function () {
  const nativeBidRequests = [{
    bidder: 'loglylift',
    bidId: '254304ac29e265',
    params: {
      adspotId: '16'
    },
    adUnitCode: '/19968336/prebid_native_example_1',
    transactionId: '10aee457-617c-4572-ab5b-99df1d73ccb4',
    sizes: [
      []
    ],
    bidderRequestId: '15da3afd9632d7',
    auctionId: 'f890b7d9-e787-4237-ac21-6d8554abac9f',
    mediaTypes: {
      native: {
        body: {
          required: true
        },
        icon: {
          required: false
        },
        title: {
          required: true
        },
        image: {
          required: true
        },
        sponsoredBy: {
          required: true
        }
      }
    }
  }];
  const bidderRequest = {
    refererInfo: {
      referer: 'fakeReferer',
      reachedTop: true,
      numIframes: 1,
      stack: []
    },
    auctionStart: 1632194172781,
    bidderCode: 'loglylift',
    bidderRequestId: '15da3afd9632d7',
    auctionId: 'f890b7d9-e787-4237-ac21-6d8554abac9f',
    timeout: 3000
  };

  const nativeServerResponse = {
    body: {
      bids: [{
        bid: {
          requestId: '254304ac29e265',
          cpm: 10.123,
          width: 360,
          height: 360,
          creativeId: '123456789',
          currency: 'JPY',
          netRevenue: true,
          ttl: 30,
          native: {
            clickUrl: 'https://dsp.logly.co.jp/click?ad=EXAMPECLICKURL',
            image: {
              url: 'https://cdn.logly.co.jp/images/000/194/300/normal.jpg',
              width: '360',
              height: '360'
            },
            impressionTrackers: [
              'https://b.logly.co.jp/sorry.html'
            ],
            sponsoredBy: 'logly',
            title: 'Native Title',
          }
        }
      }],
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true if the adspotId parameter is present', function () {
      expect(spec.isBidRequestValid(nativeBidRequests[0])).to.be.true;
    });

    it('should return false if the adspotId parameter is not present', function () {
      let bidRequest = utils.deepClone(nativeBidRequests[0]);
      delete bidRequest.params.adspotId;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid single POST request for multiple bid requests', function () {
      const request = spec.buildRequests(nativeBidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://bid.logly.co.jp/prebid/client/v1?adspot_id=16');
      expect(request.data).to.exist;

      const data = JSON.parse(request.data);
      expect(data.auctionId).to.equal(nativeBidRequests[0].auctionId);
      expect(data.bidderRequestId).to.equal(nativeBidRequests[0].bidderRequestId);
      expect(data.transactionId).to.equal(nativeBidRequests[0].transactionId);
      expect(data.adUnitCode).to.equal(nativeBidRequests[0].adUnitCode);
      expect(data.bidId).to.equal(nativeBidRequests[0].bidId);
      expect(data.mediaTypes).to.deep.equal(nativeBidRequests[0].mediaTypes);
      expect(data.params).to.deep.equal(nativeBidRequests[0].params);
      expect(data.prebidJsVersion).to.equal('5.14.0-pre');
      expect(data.url).to.exist;
      expect(data.domain).to.exist;
      expect(data.referer).to.equal(bidderRequest.refererInfo.referer);
      expect(data.auctionStartTime).to.equal(bidderRequest.auctionStart);
      expect(data.currency).to.exist;
      expect(data.timeout).to.equal(bidderRequest.timeout);
    });
  });

  // describe('interpretResponse', function () {
  //   it('should return an empty array if an invalid response is passed', function () {
  //     const interpretedResponse = spec.interpretResponse({}, {});
  //     expect(interpretedResponse).to.be.an('array').that.is.empty;
  //   });

  //   it('should return valid response when passed valid server response', function () {
  //     const request = spec.buildRequests(bidRequests, bidderRequest)[0];
  //     const interpretedResponse = spec.interpretResponse(serverResponse, request);

  //     expect(interpretedResponse).to.have.lengthOf(1);

  //     expect(interpretedResponse[0].requestId).to.equal(serverResponse.body.seatbid[0].bid.requestId);
  //     expect(interpretedResponse[0].cpm).to.equal(serverResponse.body.seatbid[0].bid.cpm);
  //     expect(interpretedResponse[0].width).to.equal(serverResponse.body.seatbid[0].bid.width);
  //     expect(interpretedResponse[0].height).to.equal(serverResponse.body.seatbid[0].bid.height);
  //     expect(interpretedResponse[0].creativeId).to.equal(serverResponse.body.seatbid[0].bid.creativeId);
  //     expect(interpretedResponse[0].currency).to.equal(serverResponse.body.seatbid[0].bid.currency);
  //     expect(interpretedResponse[0].netRevenue).to.equal(serverResponse.body.seatbid[0].bid.netRevenue);
  //     expect(interpretedResponse[0].ad).to.equal(serverResponse.body.seatbid[0].bid.ad);
  //     expect(interpretedResponse[0].ttl).to.equal(serverResponse.body.seatbid[0].bid.ttl);
  //     expect(interpretedResponse[0].meta.advertiserDomains).to.equal(serverResponse.body.seatbid[0].bid.meta.advertiserDomains);

  //     // native
  //     const nativeRequest = spec.buildRequests(nativeBidRequests, bidderRequest)[0];
  //     const interpretedResponseForNative = spec.interpretResponse(nativeServerResponse, nativeRequest);

  //     expect(interpretedResponseForNative).to.have.lengthOf(1);

  //     expect(interpretedResponseForNative[0].requestId).to.equal(nativeServerResponse.body.seatbid[0].bid.requestId);
  //     expect(interpretedResponseForNative[0].cpm).to.equal(nativeServerResponse.body.seatbid[0].bid.cpm);
  //     expect(interpretedResponseForNative[0].width).to.equal(nativeServerResponse.body.seatbid[0].bid.width);
  //     expect(interpretedResponseForNative[0].height).to.equal(nativeServerResponse.body.seatbid[0].bid.height);
  //     expect(interpretedResponseForNative[0].creativeId).to.equal(nativeServerResponse.body.seatbid[0].bid.creativeId);
  //     expect(interpretedResponseForNative[0].currency).to.equal(nativeServerResponse.body.seatbid[0].bid.currency);
  //     expect(interpretedResponseForNative[0].netRevenue).to.equal(nativeServerResponse.body.seatbid[0].bid.netRevenue);
  //     expect(interpretedResponseForNative[0].ttl).to.equal(nativeServerResponse.body.seatbid[0].bid.ttl);
  //     expect(interpretedResponseForNative[0].native.clickUrl).to.equal(nativeServerResponse.body.seatbid[0].bid.native.clickUrl);
  //     expect(interpretedResponseForNative[0].native.image.url).to.equal(nativeServerResponse.body.seatbid[0].bid.native.image.url);
  //     expect(interpretedResponseForNative[0].native.image.width).to.equal(nativeServerResponse.body.seatbid[0].bid.native.image.width);
  //     expect(interpretedResponseForNative[0].native.impressionTrackers).to.equal(nativeServerResponse.body.seatbid[0].bid.native.impressionTrackers);
  //     expect(interpretedResponseForNative[0].native.sponsoredBy).to.equal(nativeServerResponse.body.seatbid[0].bid.native.sponsoredBy);
  //     expect(interpretedResponseForNative[0].native.title).to.equal(nativeServerResponse.body.seatbid[0].bid.native.title);
  //     expect(interpretedResponseForNative[0].meta.advertiserDomains[0]).to.equal(serverResponse.body.seatbid[0].bid.meta.advertiserDomains[0]);
  //   });
  // });
});
