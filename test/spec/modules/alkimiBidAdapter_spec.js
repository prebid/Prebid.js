import { expect } from 'chai'
import sinon from 'sinon'
import { config } from 'src/config.js'
import { ENDPOINT, spec, storage } from 'modules/alkimiBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'

const REQUEST = {
  'bidId': '456',
  'bidder': 'alkimi',
  'sizes': [[300, 250]],
  'adUnitCode': 'bannerAdUnitCode',
  'ortb2Imp': {
    'ext': {
      'gpid': '/111/banner#300x250',
      'tid': 'e64782a4-8e68-4c38-965b-80ccf115d46a'
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]]
    }
  },
  'params': {
    bidFloor: 0.1,
    token: 'e64782a4-8e68-4c38-965b-80ccf115d46f'
  },
  'userIdAsEids': [{
    'source': 'criteo.com',
    'uids': [{
      'id': 'test',
      'atype': 1
    }]
  }, {
    'source': 'pubcid.org',
    'uids': [{
      'id': 'test',
      'atype': 1
    }]
  }],
  'ortb2': {
    'source': {
      'ext': {
        'schain': {
          ver: '1.0',
          complete: 1,
          nodes: [{
            asi: 'alkimi-onboarding.com',
            sid: '00001',
            hp: 1
          }]
        }
      }
    }
  }
}

const BIDDER_BANNER_RESPONSE = {
  'prebidResponse': [{
    'ad': '<div>test</div>',
    'requestId': 'e64782a4-8e68-4c38-965b-80ccf115d46d',
    'cpm': 900.5,
    'currency': 'USD',
    'width': 640,
    'height': 480,
    'ttl': 300,
    'creativeId': 1,
    'netRevenue': true,
    'winUrl': 'http://test.com',
    'mediaType': 'banner',
    'adomain': ['test.com']
  }]
}

const BIDDER_VIDEO_RESPONSE = {
  'prebidResponse': [{
    'ad': '<xml>vast</xml>',
    'requestId': 'e64782a4-8e68-4c38-965b-80ccf115d46z',
    'cpm': 800.4,
    'currency': 'USD',
    'width': 1024,
    'height': 768,
    'ttl': 200,
    'creativeId': 2,
    'netRevenue': true,
    'winUrl': 'http://test.com?price=${AUCTION_PRICE}',
    'mediaType': 'video',
    'adomain': ['test.com']
  }]
}

const BIDDER_NO_BID_RESPONSE = ''

describe('alkimiBidAdapter', function () {
  const adapter = newBidder(spec)

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(REQUEST)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      let bid = JSON.parse(JSON.stringify(REQUEST))
      delete bid.params.token
      expect(spec.isBidRequestValid(bid)).to.equal(false)

      bid = JSON.parse(JSON.stringify(REQUEST))
      delete bid.params
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    let sandbox;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
    });

    afterEach(function() {
      sandbox.restore();
    });

    const bidRequests = [REQUEST]
    const requestData = {
      refererInfo: {
        page: 'http://test.com/path.html'
      },
      gdprConsent: {
        consentString: 'test-consent',
        vendorData: {},
        gdprApplies: true
      },
      uspConsent: 'uspConsent',
      ortb2: {
        site: {
          keywords: 'test1, test2',
          cat: ['IAB2'],
          pagecat: ['IAB3'],
          sectioncat: ['IAB4']
        },
        at: 2,
        bcat: ['BSW1', 'BSW2'],
        wseat: ['16', '165']
      }
    }

    it('should return a properly formatted request with eids defined', function () {
      const bidderRequest = spec.buildRequests(bidRequests, requestData)
      expect(bidderRequest.data.eids).to.deep.equal(REQUEST.userIdAsEids)
    })

    it('should return a properly formatted request with gdpr defined', function () {
      const bidderRequest = spec.buildRequests(bidRequests, requestData)
      expect(bidderRequest.data.gdprConsent.consentRequired).to.equal(true)
      expect(bidderRequest.data.gdprConsent.consentString).to.equal('test-consent')
    })

    it('should return a properly formatted request with uspConsent defined', function () {
      const bidderRequest = spec.buildRequests(bidRequests, requestData)
      expect(bidderRequest.data.uspConsent).to.equal('uspConsent')
    })

    it('sends bid request to ENDPOINT via POST', function () {
      const bidderRequest = spec.buildRequests(bidRequests, requestData)
      expect(bidderRequest.method).to.equal('POST')
      expect(bidderRequest.data.requestId).to.not.equal(undefined)
      expect(bidderRequest.data.referer).to.equal('http://test.com/path.html')
      expect(bidderRequest.data.schain).to.deep.equal({ ver: '1.0', complete: 1, nodes: [{ asi: 'alkimi-onboarding.com', sid: '00001', hp: 1 }] })
      expect(bidderRequest.data.signRequest.bids[0]).to.include({
        token: 'e64782a4-8e68-4c38-965b-80ccf115d46f',
        bidFloor: 0.1,
        currency: 'USD'
      })
      expect(bidderRequest.data.signRequest.randomUUID).to.equal(undefined)
      expect(bidderRequest.data.bidIds).to.deep.contains('456')
      expect(bidderRequest.data.signature).to.equal(undefined)
      expect(bidderRequest.data.ortb2).to.deep.contains({ at: 2, wseat: ['16', '165'], bcat: ['BSW1', 'BSW2'], site: { keywords: 'test1, test2', cat: ['IAB2'], pagecat: ['IAB3'], sectioncat: ['IAB4'] } })
      expect(bidderRequest.options.customHeaders).to.deep.equal({ 'Rtb-Direct': true })
      expect(bidderRequest.options.contentType).to.equal('application/json')
      expect(bidderRequest.url).to.equal(ENDPOINT)
    })

    // Wallet Profiling Test Cases
    describe('Wallet Profiling', function () {
      it('should include all wallet parameters when alkimi config is complete', function () {
        const alkimiConfigStub = {
          userWalletAddress: '0x1234567890abcdef',
          userParams: { segment: 'premium', interests: ['crypto', 'defi'] },
          userWalletConnected: 'true',
          userWalletProtocol: 'ERC-20',
          userTokenType: 'Alkimi',
          signature: 'test-signature',
          randomUUID: 'test-uuid-123'
        };

        sandbox.stub(config, 'getConfig').withArgs('alkimi').returns(alkimiConfigStub);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const bidderRequest = spec.buildRequests(bidRequests, requestData);

        expect(bidderRequest.data.ortb2.user).to.exist;
        expect(bidderRequest.data.ortb2.user.ext.userWalletAddress).to.equal('0x1234567890abcdef');
        expect(bidderRequest.data.ortb2.user.ext.userParams).to.deep.equal({ segment: 'premium', interests: ['crypto', 'defi'] });
        expect(bidderRequest.data.ortb2.user.ext.userWalletConnected).to.equal('true');
        expect(bidderRequest.data.ortb2.user.ext.userWalletProtocol).to.deep.equal(['ERC-20']);
        expect(bidderRequest.data.ortb2.user.ext.userTokenType).to.deep.equal(['Alkimi']);
        expect(bidderRequest.data.signature).to.equal('test-signature');
        expect(bidderRequest.data.signRequest.randomUUID).to.equal('test-uuid-123');
      });

      it('should handle comma-separated string values for wallet protocol and token type', function () {
        const alkimiConfigStub = {
          userWalletAddress: '0xtest',
          userWalletProtocol: 'ERC-20, TRC-20, BSC',
          userTokenType: 'Alkimi, USDT, ETH'
        };

        sandbox.stub(config, 'getConfig').withArgs('alkimi').returns(alkimiConfigStub);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const bidderRequest = spec.buildRequests(bidRequests, requestData);

        expect(bidderRequest.data.ortb2.user.ext.userWalletProtocol).to.deep.equal(['ERC-20', 'TRC-20', 'BSC']);
        expect(bidderRequest.data.ortb2.user.ext.userTokenType).to.deep.equal(['Alkimi', 'USDT', 'ETH']);
      });

      it('should handle array values for wallet protocol and token type', function () {
        const alkimiConfigStub = {
          userWalletAddress: '0xtest',
          userWalletProtocol: ['ERC-20', 'TRC-20'],
          userTokenType: ['Alkimi', 'USDT']
        };

        sandbox.stub(config, 'getConfig').withArgs('alkimi').returns(alkimiConfigStub);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const bidderRequest = spec.buildRequests(bidRequests, requestData);

        expect(bidderRequest.data.ortb2.user.ext.userWalletProtocol).to.deep.equal(['ERC-20', 'TRC-20']);
        expect(bidderRequest.data.ortb2.user.ext.userTokenType).to.deep.equal(['Alkimi', 'USDT']);
      });

      it('should handle single string value (non-comma) for wallet protocol and token type', function () {
        const alkimiConfigStub = {
          userWalletAddress: '0xtest',
          userWalletProtocol: 'ERC20',
          userTokenType: 'Alkimi'
        };

        sandbox.stub(config, 'getConfig').withArgs('alkimi').returns(alkimiConfigStub);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const bidderRequest = spec.buildRequests(bidRequests, requestData);

        expect(bidderRequest.data.ortb2.user.ext.userWalletProtocol).to.deep.equal(['ERC20']);
        expect(bidderRequest.data.ortb2.user.ext.userTokenType).to.deep.equal(['Alkimi']);
      });

      it('should handle partial wallet config with only some parameters', function () {
        const alkimiConfigStub = {
          userWalletAddress: '0xpartial',
          userWalletConnected: 'false'
        };

        sandbox.stub(config, 'getConfig').withArgs('alkimi').returns(alkimiConfigStub);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const bidderRequest = spec.buildRequests(bidRequests, requestData);

        expect(bidderRequest.data.ortb2.user).to.exist;
        expect(bidderRequest.data.ortb2.user.ext.userWalletAddress).to.equal('0xpartial');
        expect(bidderRequest.data.ortb2.user.ext.userWalletConnected).to.equal('false');
        expect(bidderRequest.data.ortb2.user.ext.userParams).to.be.undefined;
        expect(bidderRequest.data.ortb2.user.ext.userWalletProtocol).to.be.undefined;
        expect(bidderRequest.data.ortb2.user.ext.userTokenType).to.be.undefined;
      });

      it('should include user object with only userId when no wallet config exists', function () {
        sandbox.stub(config, 'getConfig').withArgs('alkimi').returns(undefined);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('alkimiUserID').returns('stored-user-id');

        const bidderRequest = spec.buildRequests(bidRequests, requestData);

        expect(bidderRequest.data.ortb2.user).to.exist;
        expect(bidderRequest.data.ortb2.user.id).to.equal('stored-user-id');
        expect(bidderRequest.data.ortb2.user.ext.userWalletAddress).to.be.undefined;
        expect(bidderRequest.data.ortb2.user.ext.userParams).to.be.undefined;
        expect(bidderRequest.data.ortb2.user.ext.userWalletConnected).to.be.undefined;
        expect(bidderRequest.data.ortb2.user.ext.userWalletProtocol).to.be.undefined;
        expect(bidderRequest.data.ortb2.user.ext.userTokenType).to.be.undefined;
      });

      it('should not include user object when no wallet config and no userId exists', function () {
        sandbox.stub(config, 'getConfig').withArgs('alkimi').returns(undefined);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const bidderRequest = spec.buildRequests(bidRequests, requestData);

        expect(bidderRequest.data.ortb2.user).to.be.undefined;
      });

      it('should filter out empty strings from comma-separated values', function () {
        const alkimiConfigStub = {
          userWalletAddress: '0xtest',
          userWalletProtocol: 'ERC-20, , TRC-20, ',
          userTokenType: 'Alkimi, , , ETH'
        };

        sandbox.stub(config, 'getConfig').withArgs('alkimi').returns(alkimiConfigStub);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const bidderRequest = spec.buildRequests(bidRequests, requestData);

        expect(bidderRequest.data.ortb2.user.ext.userWalletProtocol).to.deep.equal(['ERC-20', 'TRC-20']);
        expect(bidderRequest.data.ortb2.user.ext.userTokenType).to.deep.equal(['Alkimi', 'ETH']);
      });
    });

    // Currency Test Cases
    describe('Multi-Currency Support', function () {
      it('should handle floor with default USD currency', function () {
        const requestWithFloor = Object.assign({}, REQUEST);
        requestWithFloor.getFloor = function (arg) {
          if (arg.currency === 'USD' && arg.mediaType === 'banner' && JSON.stringify(arg.size) === JSON.stringify([300, 250])) {
            return { currency: 'USD', floor: 0.3 };
          }
        };

        const bidderRequestFloor = spec.buildRequests([requestWithFloor], requestData);
        expect(bidderRequestFloor.data.signRequest.bids[0].bidFloor).to.equal(0.3);
        expect(bidderRequestFloor.data.signRequest.bids[0].currency).to.equal('USD');
      });

      it('should handle floor with EUR currency config', function () {
        const requestWithFloor = Object.assign({}, REQUEST);
        requestWithFloor.getFloor = function (arg) {
          if (arg.currency === 'EUR' && arg.mediaType === 'banner') {
            return { currency: 'EUR', floor: 2.0 };
          }
        };

        sandbox.stub(config, 'getConfig').withArgs('currency').returns({ adServerCurrency: 'EUR' });

        const bidderRequest = spec.buildRequests([requestWithFloor], requestData);

        expect(bidderRequest.data.signRequest.bids[0].bidFloor).to.equal(2.0);
        expect(bidderRequest.data.signRequest.bids[0].currency).to.equal('EUR');
      });

      it('should use params.bidFloor with default currency when getFloor is not available', function () {
        const requestWithoutGetFloor = Object.assign({}, REQUEST);
        delete requestWithoutGetFloor.getFloor;
        requestWithoutGetFloor.params.bidFloor = 0.5;

        const bidderRequest = spec.buildRequests([requestWithoutGetFloor], requestData);

        expect(bidderRequest.data.signRequest.bids[0].bidFloor).to.equal(0.5);
        expect(bidderRequest.data.signRequest.bids[0].currency).to.equal('USD');
      });

      it('should select minimum floor when multiple media types are present', function () {
        const multiFormatRequest = Object.assign({}, REQUEST, {
          mediaTypes: {
            banner: { sizes: [[300, 250]] },
            video: { playerSize: [[640, 480]] }
          }
        });

        multiFormatRequest.getFloor = function (arg) {
          if (arg.mediaType === 'banner') {
            return { currency: 'USD', floor: 2.5 };
          }
          if (arg.mediaType === 'video') {
            return { currency: 'USD', floor: 1.8 };
          }
        };

        const bidderRequest = spec.buildRequests([multiFormatRequest], requestData);

        expect(bidderRequest.data.signRequest.bids[0].bidFloor).to.equal(1.8);
        expect(bidderRequest.data.signRequest.bids[0].currency).to.equal('USD');
      });
    });
  });

  describe('interpretResponse', function () {
    it('handles banner request : should get correct bid response', function () {
      const result = spec.interpretResponse({ body: BIDDER_BANNER_RESPONSE }, {})

      expect(result[0]).to.have.property('ad').equal('<div>test</div>')
      expect(result[0]).to.have.property('requestId').equal('e64782a4-8e68-4c38-965b-80ccf115d46d')
      expect(result[0]).to.have.property('cpm').equal(900.5)
      expect(result[0]).to.have.property('currency').equal('USD')
      expect(result[0]).to.have.property('width').equal(640)
      expect(result[0]).to.have.property('height').equal(480)
      expect(result[0]).to.have.property('ttl').equal(300)
      expect(result[0]).to.have.property('creativeId').equal(1)
      expect(result[0]).to.have.property('netRevenue').equal(true)
      expect(result[0]).to.have.property('winUrl').equal('http://test.com')
      expect(result[0]).to.have.property('mediaType').equal('banner')
      expect(result[0].meta).to.exist.property('advertiserDomains')
      expect(result[0].meta).to.have.property('advertiserDomains').lengthOf(1)
    })

    it('handles video request : should get correct bid response', function () {
      const result = spec.interpretResponse({ body: BIDDER_VIDEO_RESPONSE }, {})

      expect(result[0]).to.have.property('ad').equal('<xml>vast</xml>')
      expect(result[0]).to.have.property('requestId').equal('e64782a4-8e68-4c38-965b-80ccf115d46z')
      expect(result[0]).to.have.property('cpm').equal(800.4)
      expect(result[0]).to.have.property('currency').equal('USD')
      expect(result[0]).to.have.property('width').equal(1024)
      expect(result[0]).to.have.property('height').equal(768)
      expect(result[0]).to.have.property('ttl').equal(200)
      expect(result[0]).to.have.property('creativeId').equal(2)
      expect(result[0]).to.have.property('netRevenue').equal(true)
      expect(result[0]).to.have.property('winUrl').equal('http://test.com?price=${AUCTION_PRICE}')
      expect(result[0]).to.have.property('mediaType').equal('video')
      expect(result[0]).to.have.property('vastUrl').equal('http://test.com?price=800.4')
      expect(result[0].meta).to.exist.property('advertiserDomains')
      expect(result[0].meta).to.have.property('advertiserDomains').lengthOf(1)
    })

    it('handles no bid response : should get empty array', function () {
      let result = spec.interpretResponse({ body: undefined }, {})
      expect(result).to.deep.equal([])

      result = spec.interpretResponse({ body: BIDDER_NO_BID_RESPONSE }, {})
      expect(result).to.deep.equal([])
    })

    it('should handle response with explicit currency', function () {
      const responseWithCurrency = {
        prebidResponse: [{
          ad: '<div>test</div>',
          requestId: 'test-req-1',
          cpm: 1.5,
          currency: 'EUR',
          width: 300,
          height: 250,
          ttl: 300,
          creativeId: 1,
          netRevenue: true,
          mediaType: 'banner'
        }]
      };

      const result = spec.interpretResponse({ body: responseWithCurrency }, {});

      expect(result[0].currency).to.equal('EUR');
      expect(result[0].cpm).to.equal(1.5);
    });

    it('should default to USD when currency is not in response', function () {
      const responseWithoutCurrency = {
        prebidResponse: [{
          ad: '<div>test</div>',
          requestId: 'test-req-2',
          cpm: 2.0,
          width: 300,
          height: 250,
          ttl: 300,
          creativeId: 2,
          netRevenue: true,
          mediaType: 'banner'
        }]
      };

      const result = spec.interpretResponse({ body: responseWithoutCurrency }, {});

      expect(result[0].currency).to.equal('USD');
      expect(result[0].cpm).to.equal(2.0);
    });
  })

  describe('onBidWon', function () {
    it('handles banner win: should get true', function () {
      const win = BIDDER_BANNER_RESPONSE.prebidResponse[0]
      const bidWonResult = spec.onBidWon(win)

      expect(bidWonResult).to.equal(true)
    })
  })
})
