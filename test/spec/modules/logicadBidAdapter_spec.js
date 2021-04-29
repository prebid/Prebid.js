import {expect} from 'chai';
import {spec} from '../../../modules/logicadBidAdapter.js';
import * as utils from 'src/utils.js';

describe('LogicadAdapter', function () {
  const bidRequests = [{
    bidder: 'logicad',
    bidId: '51ef8751f9aead',
    params: {
      tid: 'PJ2P',
      page: 'https://www.logicad.com/'
    },
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
    sizes: [[300, 250], [300, 600]],
    bidderRequestId: '418b37f85e772c',
    auctionId: '18fd8b8b0bd757',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    userId: {
      sharedid: {
        id: 'fakesharedid',
        third: 'fakesharedid'
      }
    },
    userIdAsEids: [{
      source: 'sharedid.org',
      uids: [{
        id: 'fakesharedid',
        atype: 1,
        ext: {
          third: 'fakesharedid'
        }
      }]
    }]
  }];
  const nativeBidRequests = [{
    bidder: 'logicad',
    bidId: '51ef8751f9aead',
    params: {
      tid: 'bgjD1',
      page: 'https://www.logicad.com/'
    },
    adUnitCode: 'div-gpt-ad-1460505748561-1',
    transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
    sizes: [[1, 1]],
    bidderRequestId: '418b37f85e772c',
    auctionId: '18fd8b8b0bd757',
    mediaTypes: {
      native: {
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
    },
    userId: {
      sharedid: {
        id: 'fakesharedid',
        third: 'fakesharedid'
      }
    },
    userIdAsEids: [{
      source: 'sharedid.org',
      uids: [{
        id: 'fakesharedid',
        atype: 1,
        ext: {
          third: 'fakesharedid'
        }
      }]
    }]
  }];
  const bidderRequest = {
    refererInfo: {
      referer: 'fakeReferer',
      reachedTop: true,
      numIframes: 1,
      stack: []
    },
    auctionStart: 1563337198010
  };
  const serverResponse = {
    body: {
      seatbid:
        [{
          bid: {
            requestId: '51ef8751f9aead',
            cpm: 101.0234,
            width: 300,
            height: 250,
            creativeId: '2019',
            currency: 'JPY',
            netRevenue: true,
            ttl: 60,
            ad: '<div>TEST</div>'
          }
        }],
      userSync: {
        type: 'image',
        url: 'https://cr-p31.ladsp.jp/cookiesender/31'
      }
    }
  };
  const nativeServerResponse = {
    body: {
      seatbid:
        [{
          bid: {
            requestId: '51ef8751f9aead',
            cpm: 101.0234,
            width: 1,
            height: 1,
            creativeId: '2019',
            currency: 'JPY',
            netRevenue: true,
            ttl: 60,
            native: {
              clickUrl: 'https://www.logicad.com',
              image: {
                url: 'https://cd.ladsp.com/img.png',
                width: '1200',
                height: '628'
              },
              impressionTrackers: [
                'https://example.com'
              ],
              sponsoredBy: 'Logicad',
              title: 'Native Creative',
            }
          }
        }],
      userSync: {
        type: 'image',
        url: 'https://cr-p31.ladsp.jp/cookiesender/31'
      }
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true if the tid parameter is present', function () {
      expect(spec.isBidRequestValid(bidRequests[0])).to.be.true;
    });

    it('should return false if the tid parameter is not present', function () {
      let bidRequest = utils.deepClone(bidRequests[0]);
      delete bidRequest.params.tid;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });

    it('should return false if the params object is not present', function () {
      let bidRequest = utils.deepClone(bidRequests);
      delete bidRequest[0].params;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });

    it('should return true if the tid parameter is present for native request', function () {
      expect(spec.isBidRequestValid(nativeBidRequests[0])).to.be.true;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid single POST request for multiple bid requests', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://pb.ladsp.com/adrequest/prebid');
      expect(request.data).to.exist;

      const data = JSON.parse(request.data);
      expect(data.auctionId).to.equal('18fd8b8b0bd757');
      expect(data.eids[0].source).to.equal('sharedid.org');
      expect(data.eids[0].uids[0].id).to.equal('fakesharedid');
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if an invalid response is passed', function () {
      const interpretedResponse = spec.interpretResponse({}, {});
      expect(interpretedResponse).to.be.an('array').that.is.empty;
    });

    it('should return valid response when passed valid server response', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const interpretedResponse = spec.interpretResponse(serverResponse, request);

      expect(interpretedResponse).to.have.lengthOf(1);

      expect(interpretedResponse[0].requestId).to.equal(serverResponse.body.seatbid[0].bid.requestId);
      expect(interpretedResponse[0].cpm).to.equal(serverResponse.body.seatbid[0].bid.cpm);
      expect(interpretedResponse[0].width).to.equal(serverResponse.body.seatbid[0].bid.width);
      expect(interpretedResponse[0].height).to.equal(serverResponse.body.seatbid[0].bid.height);
      expect(interpretedResponse[0].creativeId).to.equal(serverResponse.body.seatbid[0].bid.creativeId);
      expect(interpretedResponse[0].currency).to.equal(serverResponse.body.seatbid[0].bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(serverResponse.body.seatbid[0].bid.netRevenue);
      expect(interpretedResponse[0].ad).to.equal(serverResponse.body.seatbid[0].bid.ad);
      expect(interpretedResponse[0].ttl).to.equal(serverResponse.body.seatbid[0].bid.ttl);

      // native
      const nativeRequest = spec.buildRequests(nativeBidRequests, bidderRequest)[0];
      const interpretedResponseForNative = spec.interpretResponse(nativeServerResponse, nativeRequest);

      expect(interpretedResponseForNative).to.have.lengthOf(1);

      expect(interpretedResponseForNative[0].requestId).to.equal(nativeServerResponse.body.seatbid[0].bid.requestId);
      expect(interpretedResponseForNative[0].cpm).to.equal(nativeServerResponse.body.seatbid[0].bid.cpm);
      expect(interpretedResponseForNative[0].width).to.equal(nativeServerResponse.body.seatbid[0].bid.width);
      expect(interpretedResponseForNative[0].height).to.equal(nativeServerResponse.body.seatbid[0].bid.height);
      expect(interpretedResponseForNative[0].creativeId).to.equal(nativeServerResponse.body.seatbid[0].bid.creativeId);
      expect(interpretedResponseForNative[0].currency).to.equal(nativeServerResponse.body.seatbid[0].bid.currency);
      expect(interpretedResponseForNative[0].netRevenue).to.equal(nativeServerResponse.body.seatbid[0].bid.netRevenue);
      expect(interpretedResponseForNative[0].ttl).to.equal(nativeServerResponse.body.seatbid[0].bid.ttl);
      expect(interpretedResponseForNative[0].native.clickUrl).to.equal(nativeServerResponse.body.seatbid[0].bid.native.clickUrl);
      expect(interpretedResponseForNative[0].native.image.url).to.equal(nativeServerResponse.body.seatbid[0].bid.native.image.url);
      expect(interpretedResponseForNative[0].native.image.width).to.equal(nativeServerResponse.body.seatbid[0].bid.native.image.width);
      expect(interpretedResponseForNative[0].native.impressionTrackers).to.equal(nativeServerResponse.body.seatbid[0].bid.native.impressionTrackers);
      expect(interpretedResponseForNative[0].native.sponsoredBy).to.equal(nativeServerResponse.body.seatbid[0].bid.native.sponsoredBy);
      expect(interpretedResponseForNative[0].native.title).to.equal(nativeServerResponse.body.seatbid[0].bid.native.title);
    });
  });

  describe('getUserSyncs', function () {
    it('should perform usersync', function () {
      let syncs = spec.getUserSyncs({pixelEnabled: false}, [serverResponse]);
      expect(syncs).to.have.length(0);

      syncs = spec.getUserSyncs({pixelEnabled: true}, [serverResponse]);
      expect(syncs).to.have.length(1);

      expect(syncs[0]).to.have.property('type', 'image');
      expect(syncs[0]).to.have.property('url', 'https://cr-p31.ladsp.jp/cookiesender/31');
    });
  });
});
