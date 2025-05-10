import {checkParamDataType, spec} from '../../../modules/zmaticooBidAdapter.js'
import utils, {deepClone} from '../../../src/utils';
import {expect} from 'chai';

describe('zMaticoo Bidder Adapter', function () {
  const bannerRequest = [{
    auctionId: '223',
    mediaTypes: {
      banner: {
        sizes: [[320, 50]],
      }
    },
    refererInfo: {
      page: 'testprebid.com'
    },
    params: {
      user: {
        uid: '12345',
        buyeruid: '12345'
      },
      pubId: 'prebid-test',
      test: 1,
      bidfloor: 1,
      tagid: 'test'
    }
  }];
  const bannerRequest1 = [{
    auctionId: '223',
    mediaTypes: {
      banner: {
        sizes: [[320, 50]],
      }
    },
    refererInfo: {
      page: 'testprebid.com'
    },
    params: {
      user: {
        uid: '12345',
        buyeruid: '12345'
      },
      pubId: 'prebid-test',
      test: 1,
      tagid: 'test'
    },
    gdprConsent: {
      gdprApplies: 1,
      consentString: 'consentString'
    },
    getFloor: function () {
      return {
        currency: 'USD',
        floor: 0.5,
      }
    },
  }];
  const videoRequest = [{
    auctionId: '223',
    mediaTypes: {
      video: {
        playerSize: [480, 320],
        mimes: ['video/mp4'],
        context: 'instream',
        placement: 1,
        maxduration: 30,
        minduration: 15,
        pos: 1,
        startdelay: 10,
        protocols: [2, 3],
        api: [2, 3],
        playbackmethod: [2, 6],
        skip: 10,
      }
    },
    refererInfo: {
      page: 'testprebid.com'
    },
    params: {
      user: {
        uid: '12345',
        buyeruid: '12345'
      },
      pubId: 'prebid-test',
      test: 1,
      tagid: 'test',
      bidfloor: 1
    }
  }];

  const videoRequest1 = [{
    auctionId: '223',
    mediaTypes: {
      video: {
        playerSize: [[480, 320]],
        mimes: ['video/mp4'],
        context: 'instream',
        placement: 1,
        maxduration: 30,
        minduration: 15,
        pos: 1,
        startdelay: 10,
        protocols: [2, 3],
        api: [2, 3],
        playbackmethod: [2, 6],
        skip: 10,
      }
    },
    params: {
      user: {
        uid: '12345',
        buyeruid: '12345'
      },
      pubId: 'prebid-test',
      test: 1,
      tagid: 'test',
      bidfloor: 1
    }
  }];

  describe('isBidRequestValid', function () {
    it('this is valid bidrequest', function () {
      const validBid = spec.isBidRequestValid(videoRequest[0]);
      expect(validBid).to.be.true;
    });
    it('missing required bid data {bid}', function () {
      const invalidBid = spec.isBidRequestValid(null);
      expect(invalidBid).to.be.false;
    });
    it('missing required params.pubId', function () {
      const request = deepClone(videoRequest[0])
      delete request.params.pubId
      const invalidBid = spec.isBidRequestValid(request);
      expect(invalidBid).to.be.false;
    });
  })
  describe('buildRequests', function () {
    it('Test the banner request processing function', function () {
      const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
      expect(request).to.not.be.empty;
      const payload = request.data;
      expect(payload).to.not.be.empty;
    });
    it('Test the video request processing function', function () {
      const request = spec.buildRequests(videoRequest, videoRequest[0]);
      expect(request).to.not.be.empty;
      const payload = request.data;
      expect(payload).to.not.be.empty;
    });
    it('Test the param', function () {
      const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].tagid).to.eql(videoRequest[0].params.tagid);
      expect(payload.imp[0].bidfloor).to.eql(videoRequest[0].params.bidfloor);
    });
    it('Test video object', function () {
      const request = spec.buildRequests(videoRequest, videoRequest[0]);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].video).to.exist;
      expect(payload.imp[0].video.minduration).to.eql(videoRequest[0].mediaTypes.video.minduration);
      expect(payload.imp[0].video.maxduration).to.eql(videoRequest[0].mediaTypes.video.maxduration);
      expect(payload.imp[0].video.protocols).to.eql(videoRequest[0].mediaTypes.video.protocols);
      expect(payload.imp[0].video.mimes).to.eql(videoRequest[0].mediaTypes.video.mimes);
      expect(payload.imp[0].video.w).to.eql(480);
      expect(payload.imp[0].video.h).to.eql(320);
      expect(payload.imp[0].banner).to.be.undefined;
    });

    it('Test video isArray size', function () {
      const request = spec.buildRequests(videoRequest1, videoRequest1[0]);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].video.w).to.eql(480);
      expect(payload.imp[0].video.h).to.eql(320);
    });
    it('Test banner object', function () {
      const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].video).to.be.undefined;
      expect(payload.imp[0].banner).to.exist;
    });

    it('Test provide gdpr and ccpa values in payload', function () {
      const request = spec.buildRequests(bannerRequest1, bannerRequest1[0]);
      const payload = JSON.parse(request.data);
      expect(payload.user.ext.consent).to.eql('consentString');
      expect(payload.regs.ext.gdpr).to.eql(1);
    });

    it('Test bidfloor is function', function () {
      const request = spec.buildRequests(bannerRequest1, bannerRequest1[0]);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].bidfloor).to.eql(0.5);
    });
  });
  describe('checkParamDataType tests', function () {
    it('return the expected datatypes', function () {
      assert.isString(checkParamDataType('Right string', 'test', 'string'));
      assert.isBoolean(checkParamDataType('Right bool', true, 'boolean'));
      assert.isNumber(checkParamDataType('Right number', 10, 'number'));
      assert.isArray(checkParamDataType('Right array', [10, 11], 'array'));
    });

    it('return undefined var for wrong datatypes', function () {
      expect(checkParamDataType('Wrong string', 10, 'string')).to.be.undefined;
      expect(checkParamDataType('Wrong bool', 10, 'boolean')).to.be.undefined;
      expect(checkParamDataType('Wrong number', 'one', 'number')).to.be.undefined;
      expect(checkParamDataType('Wrong array', false, 'array')).to.be.undefined;
    });
  })
  describe('interpretResponse', function () {
    const responseBody = {
      id: '12345',
      seatbid: [
        {
          bid: [
            {
              id: 'auctionId',
              impid: 'impId',
              price: 0.0,
              adm: 'adMarkup',
              crid: 'creativeId',
              adomain: ['test.com'],
              h: 50,
              w: 320,
              nurl: 'https://gwbudgetali.iymedia.me/budget.php',
              ext: {
                vast_url: '<vasturl>',
                prebid: {
                  type: 'banner'
                }
              }
            }
          ]
        }
      ],
      cur: 'USD'
    };
    it('Test the response parsing function', function () {
      const receivedBid = responseBody.seatbid[0].bid[0];
      const response = {};
      response.body = responseBody;
      const bidResponse = spec.interpretResponse(response, null);
      expect(bidResponse).to.not.be.empty;
      const bid = bidResponse[0];
      expect(bid).to.not.be.empty;
      expect(bid.ad).to.equal(receivedBid.adm);
      expect(bid.cpm).to.equal(receivedBid.price);
      expect(bid.height).to.equal(receivedBid.h);
      expect(bid.width).to.equal(receivedBid.w);
      expect(bid.requestId).to.equal(receivedBid.impid);
      expect(bid.vastXml).to.equal(receivedBid.ext.vast_url);
      expect(bid.meta.advertiserDomains).to.equal(receivedBid.adomain);
      expect(bid.mediaType).to.equal(receivedBid.ext.prebid.type);
      expect(bid.nurl).to.equal(receivedBid.nurl);
    });
  });
  describe('onBidWon', function () {
    it('should make an ajax call with the original cpm', function () {
      const bid = {
        nurl: 'http://test.com/win?auctionPrice=${AUCTION_PRICE}',
        cpm: 2.1,
      }
      const bidWonResult = spec.onBidWon(bid)
      expect(bidWonResult).to.equal(true)
    });
  })
});
