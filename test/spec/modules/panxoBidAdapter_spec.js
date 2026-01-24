import { expect } from 'chai';
import { spec, storage } from 'modules/panxoBidAdapter.js';
import { BANNER } from 'src/mediaTypes.js';

describe('PanxoBidAdapter', function () {
  const PROPERTY_KEY = 'abc123def456';
  const USER_ID = 'test-user-id-12345';

  // Mock storage.getDataFromLocalStorage
  let getDataStub;

  beforeEach(function () {
    getDataStub = sinon.stub(storage, 'getDataFromLocalStorage');
    getDataStub.withArgs('panxo_uid').returns(USER_ID);
  });

  afterEach(function () {
    getDataStub.restore();
  });

  describe('isBidRequestValid', function () {
    it('should return true when propertyKey is present', function () {
      const bid = {
        bidder: 'panxo',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when propertyKey is missing', function () {
      const bid = {
        bidder: 'panxo',
        params: {},
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when banner mediaType is missing', function () {
      const bid = {
        bidder: 'panxo',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: { video: {} }
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      bidderRequestId: 'test-request-id',
      auctionId: 'test-auction-id',
      timeout: 1500,
      refererInfo: {
        page: 'https://example.com/page',
        domain: 'example.com',
        ref: 'https://google.com'
      }
    };

    const validBidRequests = [{
      bidder: 'panxo',
      bidId: 'bid-id-1',
      adUnitCode: 'ad-unit-1',
      params: { propertyKey: PROPERTY_KEY },
      mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } }
    }];

    it('should build a valid OpenRTB request', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.include('panxo-sys.com/openrtb/2.5/bid');
      expect(requests[0].url).to.include(`key=${PROPERTY_KEY}`);
      expect(requests[0].data).to.be.an('object');
    });

    it('should include user.buyeruid from localStorage', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests[0].data.user).to.be.an('object');
      expect(requests[0].data.user.buyeruid).to.equal(USER_ID);
    });

    it('should build correct impressions', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests[0].data.imp).to.be.an('array');
      expect(requests[0].data.imp[0].id).to.equal('bid-id-1');
      expect(requests[0].data.imp[0].banner.format).to.have.lengthOf(2);
      expect(requests[0].data.imp[0].tagid).to.equal('ad-unit-1');
    });

    it('should return empty array when panxo_uid is not found', function () {
      getDataStub.withArgs('panxo_uid').returns(null);
      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests).to.be.an('array').that.is.empty;
    });

    it('should include GDPR consent when gdprApplies is true', function () {
      const gdprBidderRequest = {
        ...bidderRequest,
        gdprConsent: {
          gdprApplies: true,
          consentString: 'CO-test-consent-string'
        }
      };
      const requests = spec.buildRequests(validBidRequests, gdprBidderRequest);

      expect(requests[0].data.regs.ext.gdpr).to.equal(1);
      expect(requests[0].data.user.ext.consent).to.equal('CO-test-consent-string');
    });

    it('should not include gdpr flag when gdprApplies is undefined', function () {
      const gdprBidderRequest = {
        ...bidderRequest,
        gdprConsent: {
          gdprApplies: undefined,
          consentString: 'CO-test-consent-string'
        }
      };
      const requests = spec.buildRequests(validBidRequests, gdprBidderRequest);

      expect(requests[0].data.regs.ext.gdpr).to.be.undefined;
      expect(requests[0].data.user.ext.consent).to.equal('CO-test-consent-string');
    });

    it('should include USP consent when available', function () {
      const uspBidderRequest = {
        ...bidderRequest,
        uspConsent: '1YNN'
      };
      const requests = spec.buildRequests(validBidRequests, uspBidderRequest);

      expect(requests[0].data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('should include schain when available', function () {
      const schainBidderRequest = {
        ...bidderRequest,
        ortb2: {
          source: {
            ext: {
              schain: {
                ver: '1.0',
                complete: 1,
                nodes: [{ asi: 'example.com', sid: '12345', hp: 1 }]
              }
            }
          }
        }
      };
      const requests = spec.buildRequests(validBidRequests, schainBidderRequest);

      expect(requests[0].data.source.ext.schain).to.deep.equal(schainBidderRequest.ortb2.source.ext.schain);
    });

    it('should use floor from getFloor function', function () {
      const bidWithFloor = [{
        ...validBidRequests[0],
        getFloor: () => ({ currency: 'USD', floor: 1.50 })
      }];
      const requests = spec.buildRequests(bidWithFloor, bidderRequest);

      expect(requests[0].data.imp[0].bidfloor).to.equal(1.50);
    });

    it('should include full ortb2Imp object in impression', function () {
      const bidWithOrtb2Imp = [{
        ...validBidRequests[0],
        ortb2Imp: {
          instl: 1,
          ext: { data: { customField: 'value' } }
        }
      }];
      const requests = spec.buildRequests(bidWithOrtb2Imp, bidderRequest);

      expect(requests[0].data.imp[0].instl).to.equal(1);
      expect(requests[0].data.imp[0].ext.data.customField).to.equal('value');
    });

    it('should split requests by different propertyKeys', function () {
      const multiPropertyBids = [
        {
          bidder: 'panxo',
          bidId: 'bid-id-1',
          adUnitCode: 'ad-unit-1',
          params: { propertyKey: 'property-a' },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        },
        {
          bidder: 'panxo',
          bidId: 'bid-id-2',
          adUnitCode: 'ad-unit-2',
          params: { propertyKey: 'property-b' },
          mediaTypes: { banner: { sizes: [[728, 90]] } }
        }
      ];
      const requests = spec.buildRequests(multiPropertyBids, bidderRequest);

      expect(requests).to.have.lengthOf(2);
      expect(requests[0].url).to.include('key=property-a');
      expect(requests[1].url).to.include('key=property-b');
    });
  });

  describe('interpretResponse', function () {
    const request = {
      bidderRequest: {
        bids: [{ bidId: 'bid-id-1', adUnitCode: 'ad-unit-1' }]
      }
    };

    const serverResponse = {
      body: {
        id: 'response-id',
        seatbid: [{
          seat: 'panxo',
          bid: [{
            impid: 'bid-id-1',
            price: 2.50,
            w: 300,
            h: 250,
            adm: '<div>Ad creative</div>',
            crid: 'creative-123',
            adomain: ['advertiser.com'],
            nurl: 'https://panxo-sys.com/win?price=${AUCTION_PRICE}'
          }]
        }],
        cur: 'USD'
      }
    };

    it('should parse valid bid response', function () {
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('bid-id-1');
      expect(bids[0].cpm).to.equal(2.50);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].netRevenue).to.be.true;
      expect(bids[0].ad).to.equal('<div>Ad creative</div>');
      expect(bids[0].meta.advertiserDomains).to.include('advertiser.com');
    });

    it('should return empty array for empty response', function () {
      const emptyResponse = { body: {} };
      const bids = spec.interpretResponse(emptyResponse, request);

      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should return empty array for no seatbid', function () {
      const noSeatbidResponse = { body: { id: 'test', seatbid: [] } };
      const bids = spec.interpretResponse(noSeatbidResponse, request);

      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should include nurl in bid response', function () {
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids[0].nurl).to.include('panxo-sys.com/win');
    });
  });

  describe('getUserSyncs', function () {
    it('should return pixel sync when enabled', function () {
      const syncOptions = { pixelEnabled: true };
      const syncs = spec.getUserSyncs(syncOptions);

      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.include('panxo-sys.com/usersync');
    });

    it('should return empty array when pixel sync disabled', function () {
      const syncOptions = { pixelEnabled: false };
      const syncs = spec.getUserSyncs(syncOptions);

      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should include GDPR params when gdprApplies is true', function () {
      const syncOptions = { pixelEnabled: true };
      const gdprConsent = { gdprApplies: true, consentString: 'test-consent' };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);

      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=test-consent');
    });

    it('should not include gdpr flag when gdprApplies is undefined', function () {
      const syncOptions = { pixelEnabled: true };
      const gdprConsent = { gdprApplies: undefined, consentString: 'test-consent' };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);

      expect(syncs[0].url).to.not.include('gdpr=');
      expect(syncs[0].url).to.include('gdpr_consent=test-consent');
    });

    it('should include USP params when available', function () {
      const syncOptions = { pixelEnabled: true };
      const uspConsent = '1YNN';
      const syncs = spec.getUserSyncs(syncOptions, [], null, uspConsent);

      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });
  });

  describe('onBidWon', function () {
    it('should fire win notification pixel', function () {
      const bid = {
        nurl: 'https://panxo-sys.com/win?price=${AUCTION_PRICE}',
        cpm: 2.50
      };

      // Mock document.createElement
      const imgStub = { src: '', style: {} };
      const createElementStub = sinon.stub(document, 'createElement').returns(imgStub);
      const appendChildStub = sinon.stub(document.body, 'appendChild');

      spec.onBidWon(bid);

      expect(imgStub.src).to.include('price=2.5');

      createElementStub.restore();
      appendChildStub.restore();
    });
  });

  describe('spec properties', function () {
    it('should have correct bidder code', function () {
      expect(spec.code).to.equal('panxo');
    });

    it('should support banner media type', function () {
      expect(spec.supportedMediaTypes).to.include(BANNER);
    });
  });
});
