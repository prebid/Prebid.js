import { expect } from 'chai';
import { spec } from 'modules/bizzclickBidAdapter';
import 'modules/priceFloors.js';
import { newBidder } from 'src/adapters/bidderFactory';
import { config } from '../../../src/config.js';
import { syncAddFPDToBidderRequest } from '../../helpers/fpd.js';

const BANNER_BID_REQUEST = {
  bidder: 'bizzclick',
  params: {
    accountId: 'testAccountId',
    sourceId: 'testSourceId',
    host: 'USE',
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600],
      ],
    },
  },
  adUnitCode: '/adunit-code/test-path',
  bidId: 'test-bid-id-1',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-1',
  code: 'banner_example',
  timeout: 1000,
  gdprConsent: {
    consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    gdprApplies: 1,
  },
  uspConsent: 'uspConsent'
}

const VIDEO_BID_REQUEST = {
  placementCode: '/DfpAccount1/slotVideo',
  bidId: 'test-bid-id-2',
  mediaTypes: {
    video: {
      playerSize: [400, 300],
      w: 400,
      h: 300,
      minduration: 5,
      maxduration: 10,
      startdelay: 0,
      skip: 1,
      minbitrate: 200,
      protocols: [1, 2, 4]
    }
  },
  bidder: 'bizzclick',
  params: {
    accountId: '123',
    sourceId: '123',
    host: 'USE',
  },
  adUnitCode: '/adunit-code/test-path',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-1',
  timeout: 1000,
  gdprConsent: {
    consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    gdprApplies: 1,
  },
  uspConsent: 'uspConsent'
}

const NATIVE_BID_REQUEST = {
  code: 'native_example',
  mediaTypes: {
    native: {
      title: {
        required: true,
        len: 800
      },
      image: {
        required: true,
        len: 80
      },
      sponsoredBy: {
        required: true
      },
      clickUrl: {
        required: true
      },
      privacyLink: {
        required: false
      },
      body: {
        required: true
      },
      icon: {
        required: true,
        sizes: [50, 50]
      }
    }
  },
  bidder: 'bizzclick',
  params: {
    accountId: 'testAccountId',
    sourceId: 'testSourceId',
    host: 'USE',
  },
  adUnitCode: '/adunit-code/test-path',
  bidId: 'test-bid-id-1',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-1',
  timeout: 1000,
  gdprConsent: {
    consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    gdprApplies: 1,
  },
  uspConsent: 'uspConsent'
};

const bidderRequest = {
  refererInfo: {
    page: 'https://publisher.com/home',
    ref: 'https://referrer'
  }
};

describe('bizzclickAdapter', function () {
  const adapter = newBidder(spec);
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('with COPPA', function () {
    beforeEach(function () {
      sinon.stub(config, 'getConfig')
        .withArgs('coppa')
        .returns(true);
    });
    afterEach(function () {
      config.getConfig.restore();
    });

    it('should send the Coppa "required" flag set to "1" in the request', function () {
      let serverRequest = spec.buildRequests([BANNER_BID_REQUEST], bidderRequest);
      expect(serverRequest.data.regs.coppa).to.equal(1);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(BANNER_BID_REQUEST)).to.equal(true);
    });

    it('should return false when accountID/sourceId is missing', function () {
      let localbid = Object.assign({}, BANNER_BID_REQUEST);
      delete localbid.params.accountId;
      delete localbid.params.sourceId;
      expect(spec.isBidRequestValid(BANNER_BID_REQUEST)).to.equal(false);
    });
  });

  describe('build request', function () {
    it('should return an empty array when no bid requests', function () {
      const bidRequest = spec.buildRequests([], bidderRequest);
      expect(bidRequest).to.be.an('array');
      expect(bidRequest.length).to.equal(0);
    });

    it('should return a valid bid request object', function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], syncAddFPDToBidderRequest(bidderRequest));
      expect(request).to.not.equal('array');
      expect(request.data).to.be.an('object');
      expect(request.method).to.equal('POST');
      expect(request.url).to.not.equal('');
      expect(request.url).to.not.equal(undefined);
      expect(request.url).to.not.equal(null);

      expect(request.data.site).to.have.property('domain');
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA');
      expect(request.data.regs.ext.us_privacy).to.equal('uspConsent');
    });

    it('should return a valid bid BANNER request object', function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], syncAddFPDToBidderRequest(bidderRequest));
      expect(request.data.imp[0].banner).to.exist;
      expect(request.data.imp[0].banner.format[0].w).to.be.an('number');
      expect(request.data.imp[0].banner.format[0].h).to.be.an('number');
    });

    if (FEATURES.VIDEO) {
      it('should return a valid bid VIDEO request object', function () {
        const request = spec.buildRequests([VIDEO_BID_REQUEST], syncAddFPDToBidderRequest(bidderRequest));
        expect(request.data.imp[0].video).to.exist;
        expect(request.data.imp[0].video.w).to.be.an('number');
        expect(request.data.imp[0].video.h).to.be.an('number');
      });
    }

    it('should return a valid bid NATIVE request object', function () {
      const request = spec.buildRequests([NATIVE_BID_REQUEST], syncAddFPDToBidderRequest(bidderRequest));
      expect(request.data.imp[0]).to.be.an('object');
    });
  })

  describe('interpretResponse', function () {
    let bidRequests, bidderRequest;
    beforeEach(function () {
      bidRequests = [{
        'bidId': '28ffdk2B952532',
        'bidder': 'bizzclick',
        'userId': {
          'freepassId': {
            'userIp': '172.21.0.1',
            'userId': '123',
            'commonId': 'commonIdValue'
          }
        },
        'adUnitCode': 'adunit-code',
        'params': {
          'publisherId': 'publisherIdValue'
        }
      }];
      bidderRequest = {};
    });

    it('Empty response must return empty array', function () {
      const emptyResponse = null;
      let response = spec.interpretResponse(emptyResponse, BANNER_BID_REQUEST);

      expect(response).to.be.an('array').that.is.empty;
    })

    it('Should interpret banner response', function () {
      const serverResponse = {
        body: {
          'cur': 'USD',
          'seatbid': [{
            'bid': [{
              'impid': '28ffdk2B952532',
              'price': 97,
              'adm': '<iframe src=\'http://127.0.0.1:8081/banner.html?w=300&h=250&cr=0\' width=\'300\' height=\'250\' style=\'border:none;\'></iframe>',
              'w': 300,
              'h': 250,
              'crid': 'creative0'
            }]
          }]
        }
      };
      it('should interpret server response', function () {
        const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, bidRequest);
        expect(bids).to.be.an('array');
        const bid = bids[0];
        expect(bid).to.be.an('object');
        expect(bid.currency).to.equal('USD');
        expect(bid.cpm).to.equal(97);
        expect(bid.ad).to.equal(ad)
        expect(bid.width).to.equal(300);
        expect(bid.height).to.equal(250);
        expect(bid.creativeId).to.equal('creative0');
      });
    })
  });
});
