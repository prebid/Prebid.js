import {expect} from 'chai';
import {spec, STORAGE, ENDPOINT_URL} from 'modules/bitmediaBidAdapter.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import {BANNER} from '../../../src/mediaTypes';

describe('Bitmedia Bid Adapter', function () {
  const createBidRequest = (sandbox, overrides = {}) => {
    return Object.assign({
      bidder: 'bitmedia',
      params: {
        adUnitID: 'test-ad-unit-id',
        currency: 'USD'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      bidId: 'bid123',
      auctionId: 'auction123',
      transactionId: 'transaction123',
      adUnitCode: 'adunit123',
      sizes: [[300, 250], [300, 600]],
      getFloor: sandbox.stub().returns({
        currency: 'USD',
        floor: 0.4
      })
    }, overrides);
  }

  const createBidderRequest = (overrides = {}) => {
    return Object.assign({
      refererInfo: {
        page: 'https://example.com/page.html',
        domain: 'example.com',
        referer: 'https://google.com'
      },
      timeout: 2000,
      bidderCode: 'bitmedia',
      auctionId: 'auction123',
      ortb2: {
        site: {
          domain: 'publisher.com',
          page: 'https://publisher.com/homepage.html',
          publisher: {
            domain: 'publisher.com'
          }
        },
        device: {
          ua: 'custom-user-agent',
          language: 'fr'
        }
      }
    }, overrides);
  }
  // Helper function to stub storage for user ID
  const stubStorage = (sandbox, userIdInLocalStorage = null, userIdInCookies = null) => {
    sandbox.stub(STORAGE, 'hasLocalStorage').returns(true);
    sandbox.stub(STORAGE, 'getDataFromLocalStorage')
      .withArgs('bitmedia_fid')
      .returns(userIdInLocalStorage);

    sandbox.stub(STORAGE, 'cookiesAreEnabled').returns(true);
    sandbox.stub(STORAGE, 'getCookie')
      .withArgs('bitmedia_fid')
      .returns(userIdInCookies);

    if (userIdInLocalStorage || userIdInCookies) {
      const encodedFid = userIdInLocalStorage || userIdInCookies;
      sandbox.stub(window, 'atob')
        .withArgs(encodedFid)
        .returns(`{"fid":"user123"}`);
    }
  }

  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(function () {
      bid = {
        bidder: 'bitmedia',
        params: {
          adUnitID: 'test-ad-unit-id',
          currency: 'USD'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        }
      };
    });

    it('should return true when required params found and sizes are valid', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false if adUnitID is missing', function () {
      delete bid.params.adUnitID;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if currency is invalid', function () {
      bid.params.currency = 'EUR';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if no valid sizes provided', function () {
      bid.mediaTypes.banner.sizes = [[123, 456], [789, 101]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if mediaTypes.banner is missing', function () {
      delete bid.mediaTypes.banner;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if banner sizes are not an array', function () {
      bid.mediaTypes.banner.sizes = '300x250';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if bid params are missing', function () {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();

      // Stub generateUUID to return a fixed value for testing
      sandbox.stub(utils, 'generateUUID').returns('test-generated-uuid');

      // Stub config.getConfig for bidderTimeout
      sandbox.stub(config, 'getConfig').withArgs('bidderTimeout').returns(30);
    });

    afterEach(function () {
      sandbox.restore();
    });
    describe('when building the request', function () {
      let bidRequests;
      let bidderRequest;
      let requests;
      let request;
      let data;

      beforeEach(function () {
        bidRequests = [createBidRequest(sandbox,)];
        bidderRequest = createBidderRequest();
        stubStorage(sandbox, null, 'encodedFidString'); // User ID in cookies

        requests = spec.buildRequests(bidRequests, bidderRequest);
        request = requests[0];
        data = request.data;
      });

      it('should return an array with one request', function () {
        expect(requests).to.be.an('array').with.lengthOf(1);
      });

      it('should have method POST and the correct URL', function () {
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(`${ENDPOINT_URL}${bidRequests[0].params.adUnitID}`);
      });

      it('should have the correct request options', function () {
        expect(request.options).to.deep.equal({
          withCredentials: false,
          crossOrigin: true
        });
      });

      it('should have the correct request data structure', function () {
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('id', 'imp', 'site', 'device', 'cur', 'tmax', 'ext', 'user');
      });

      it('should include the generated UUID in the request data', function () {
        expect(data.id).to.equal('test-generated-uuid');
      });

      it('should include the correct impressions in the request data', function () {
        expect(data.imp).to.be.an('array').with.lengthOf(2);

        const expectedImp1 = {
          id: 'bid123',
          tagid: 'test-ad-unit-id',
          banner: {
            w: 300,
            h: 250
          },
          bidfloor: 0.4,
          bidfloorcur: 'USD'
        };

        const expectedImp2 = {
          id: 'bid123',
          tagid: 'test-ad-unit-id',
          banner: {
            w: 300,
            h: 600
          },
          bidfloor: 0.4,
          bidfloorcur: 'USD'
        };

        expect(data.imp[0]).to.deep.equal(expectedImp1);
        expect(data.imp[1]).to.deep.equal(expectedImp2);
      });

      it('should include the correct site information', function () {
        expect(data.site).to.deep.equal({
          domain: 'publisher.com',
          page: 'https://publisher.com/homepage.html',
          publisher: {
            domain: 'publisher.com'
          }
        });
      });

      it('should include the correct device information', function () {
        expect(data.device).to.deep.equal({
          ua: 'custom-user-agent',
          language: 'fr'
        });
      });

      it('should include the default currency', function () {
        expect(data.cur).to.deep.equal(['USD']);
      });

      it('should include the correct timeout (tmax)', function () {
        expect(data.tmax).to.equal(2000);
      });

      it('should include the ext field with adapter_version and prebid_version as strings', function () {
        expect(data.ext.adapter_version).to.be.a('string');
        expect(data.ext.prebid_version).to.be.a('string');
      });

      it('should include the user ID when present in cookies', function () {
        expect(data.user).to.deep.equal({
          id: 'user123'
        });
      });
    });

    describe('when some invalid sizes are provided', function () {
      let bidRequests;
      let bidderRequest;
      let requests;
      let request;
      let data;

      beforeEach(function () {
        bidRequests = [createBidRequest(sandbox, {
          mediaTypes: {
            banner: {
              sizes: [[300, 600], [888, 888]],
            },
          },
          sizes: [[300, 600], [888, 888]],
        })];
        bidderRequest = createBidderRequest();
        stubStorage(sandbox, null, null);

        requests = spec.buildRequests(bidRequests, bidderRequest);
        request = requests[0];
        data = request.data;
      });

      it('should not build imp with invalid size', function () {
        expect(data.imp).to.be.an('array').with.lengthOf(1);
      });
    });

    describe('when user ID is absent', function () {
      let bidRequests;
      let bidderRequest;
      let requests;
      let data;

      beforeEach(function () {
        bidRequests = [createBidRequest(sandbox,)];
        bidderRequest = createBidderRequest();
        stubStorage(sandbox, null, null);

        requests = spec.buildRequests(bidRequests, bidderRequest);
        data = requests[0].data;
      });

      it('should not include user ID in the request data', function () {
        expect(data.user).to.be.undefined;
      });
    });

    describe('when getFloor is not available', function () {
      let bidRequests;
      let bidderRequest;
      let requests;
      let imp;

      beforeEach(function () {
        bidRequests = [createBidRequest(sandbox, {
          getFloor: undefined
        })];
        bidderRequest = createBidderRequest();

        requests = spec.buildRequests(bidRequests, bidderRequest);
        imp = requests[0].data.imp;
      });

      it('should not include bidfloor in imp objects', function () {
        imp.forEach(impression => {
          expect(impression).to.not.have.property('bidfloor');
          expect(impression).to.not.have.property('bidfloorcur');
        });
      });
    });

    describe('when different bid floors are provided per size', function () {
      let bidRequests;
      let bidderRequest;
      let requests;
      let imp;

      beforeEach(function () {
        const getFloorStub = sinon.stub();
        getFloorStub.withArgs({currency: 'USD', mediaType: 'banner', size: [300, 250]}).returns({
          currency: 'USD',
          floor: 0.5
        });
        getFloorStub.withArgs({currency: 'USD', mediaType: 'banner', size: [300, 600]}).returns({
          currency: 'USD',
          floor: 0.7
        });

        bidRequests = [createBidRequest(sandbox, {
          getFloor: getFloorStub
        })];
        bidderRequest = createBidderRequest();

        requests = spec.buildRequests(bidRequests, bidderRequest);
        imp = requests[0].data.imp;
      });

      it('should include the correct bidfloor per impression', function () {
        expect(imp[0].bidfloor).to.equal(0.5);
        expect(imp[0].banner).to.deep.equal({w: 300, h: 250});
        expect(imp[1].bidfloor).to.equal(0.7);
        expect(imp[1].banner).to.deep.equal({w: 300, h: 600});
      });
    });

    describe('when bid floor data is invalid', function () {
      let bidRequests;
      let bidderRequest;
      let requests;
      let imp;

      beforeEach(function () {
        const invalidGetFloor = sinon.stub().returns({
          currency: 'USD',
          floor: 'invalid'
        });
        bidRequests = [createBidRequest(sandbox, {
          getFloor: invalidGetFloor
        })];
        bidderRequest = createBidderRequest();

        requests = spec.buildRequests(bidRequests, bidderRequest);
        imp = requests[0].data.imp;
      });

      it('should not include bidfloor when floor value is invalid', function () {
        imp.forEach(impression => {
          expect(impression).to.not.have.property('bidfloor');
          expect(impression).to.not.have.property('bidfloorcur');
        });
      });
    });
  });

  describe('interpretResponse', function () {
    let sandbox;
    let bidRequests;
    let bidderRequest;
    let requests;
    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'generateUUID').returns('test-generated-uuid');
      bidRequests = [createBidRequest(sandbox,)];
      bidderRequest = createBidderRequest();
      stubStorage(sandbox, null, null); // No user ID for simplicity

      requests = spec.buildRequests(bidRequests, bidderRequest);
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should return bids with all required keys when server response has valid bids', function () {
      const request = requests[0];

      const serverResponse = {
        body: {
          id: request.data.id,
          seatbid: [
            {
              bid: [
                {
                  impid: request.data.imp[0].id,
                  price: 1.5,
                  w: request.data.imp[0].banner.w,
                  h: request.data.imp[0].banner.h,
                  adm: '<div>Ad Content</div>',
                  crid: 'creative123',
                  adomain: ['example.com'],
                  nurl: 'https://example.com/win',
                  exp: 360,
                },
              ],
            },
          ],
          cur: 'USD',
        },
      };

      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
      const bid = bids[0];
      expect(bid).to.include.all.keys(
        'requestId',
        'cpm',
        'currency',
        'width',
        'height',
        'ad',
        'ttl',
        'creativeId',
        'netRevenue',
        'meta',
        'nurl',
        'mediaType'
      );
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.ttl).to.equal(360);
      expect(bid.nurl).to.equal('https://example.com/win');
    });

    it('should return an empty array when server response is empty', function () {
      const serverResponse = {body: {}};
      const bidRequest = {};

      const bids = spec.interpretResponse(serverResponse, bidRequest);

      expect(bids).to.be.an('array').that.is.empty;
    });
  });

  describe('onBidWon', function () {
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('exists and is a function', () => {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });

    it('should return nothing and trigger a pixel with nurl', function () {
      const bid = {
        nurl: 'https://example.com/win',
      };

      const triggerPixelSpy = sandbox.spy(utils, 'triggerPixel');

      const response = spec.onBidWon(bid);

      expect(response).to.be.undefined;

      expect(triggerPixelSpy.calledOnce).to.equal(true);

      expect(triggerPixelSpy.calledWith(bid.nurl)).to.equal(true);
    });
  });
});
