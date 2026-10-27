import { expect } from 'chai';
import { spec } from 'modules/panxoBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import adapterManager from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { setConfig as setCurrencyConfig } from 'modules/currency.js';

describe('PanxoBidAdapter', function () {
  const PROPERTY_KEY = 'abc123def456';
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
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

    it('should return false when propertyKey is not a non-empty string', function () {
      const bid = {
        bidder: 'panxo',
        params: { propertyKey: '   ' },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(spec.isBidRequestValid({ ...bid, params: { propertyKey: 123 } })).to.be.false;
    });

    it('should return false when no valid mediaType is present', function () {
      const bid = {
        bidder: 'panxo',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: { video: {} }
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should accept a complete instream video request', function () {
      const bid = {
        bidder: 'panxo',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [[640, 360]],
            mimes: ['video/mp4'],
            protocols: [2, 3],
            minduration: 5,
            maxduration: 30,
            plcmt: 1
          }
        }
      };

      expect(spec.isBidRequestValid(bid)).to.be.true;
      expect(spec.isBidRequestValid({
        ...bid,
        mediaTypes: { video: { ...bid.mediaTypes.video, mimes: [] } }
      })).to.be.false;
      expect(spec.isBidRequestValid({
        ...bid,
        mediaTypes: { video: { ...bid.mediaTypes.video, protocols: [] } }
      })).to.be.false;
      expect(spec.isBidRequestValid({
        ...bid,
        mediaTypes: { video: { ...bid.mediaTypes.video, playerSize: [] } }
      })).to.be.false;
    });

    it('should accept normalized OpenRTB native requests with assets', function () {
      const bid = {
        bidder: 'panxo',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: { native: {} },
        nativeOrtbRequest: {
          ver: '1.2',
          assets: [{ id: 1, required: 1, title: { len: 80 } }]
        }
      };

      expect(spec.isBidRequestValid(bid)).to.equal(FEATURES.NATIVE);
      if (FEATURES.NATIVE) {
        expect(spec.isBidRequestValid({
          ...bid,
          nativeOrtbRequest: { ver: '1.2', assets: [] }
        })).to.be.false;
      }
    });

    it('should require at least one positive integer banner size', function () {
      const bid = {
        bidder: 'panxo',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: { banner: { sizes: [[0, 250], [300.5, 250], ['300', 250]] } }
      };

      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should support the legacy bid.sizes representation', function () {
      const bid = {
        bidder: 'panxo',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: { banner: {} },
        sizes: [[728, 90]]
      };

      expect(spec.isBidRequestValid(bid)).to.be.true;
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

    describe('isolated external reviewer routing', function () {
      const endpoint = 'https://panxo-prebid-reviewer-external.okpbidgx.workers.dev/openrtb/2.6/bid';
      const keys = [
        'LAB02_BANNER', 'LAB02_INSTREAM_VIDEO', 'LAB02_NATIVE',
        'LAB02_CTV_VIDEO', 'LAB02_INAPP_BANNER', 'LAB02_INAPP_NATIVE'
      ];
      function bidFor(propertyKey, bidId = 'review-bid') {
        return { ...validBidRequests[0], bidId, params: { propertyKey } };
      }

      keys.forEach(propertyKey => {
        it(`routes the reserved ${propertyKey} only with numeric OpenRTB test: 1`, () => {
          const input = { ...bidderRequest, ortb2: { test: 1 } };
          const before = JSON.stringify(input);
          const [result] = spec.buildRequests([bidFor(propertyKey)], input);
          expect(result.url).to.equal(`${endpoint}?key=${propertyKey}&source=prebid`);
          expect(result.data.test).to.equal(1);
          expect(result.options).to.deep.equal({ contentType: 'text/plain', withCredentials: false });
          expect(JSON.stringify(input)).to.equal(before);
        });
      });

      [undefined, 0, false, true, '1', null, 2, {}].forEach(test => {
        it(`does not send reserved inventory to either endpoint for test=${JSON.stringify(test)}`, () => {
          const input = { ...bidderRequest, ortb2: { test } };
          expect(spec.buildRequests(keys.map((key, i) => bidFor(key, `review-${i}`)), input)).to.deep.equal([]);
        });
      });

      [undefined, 1, '1'].forEach(test => {
        it(`preserves the commercial endpoint for ordinary keys with test=${JSON.stringify(test)}`, () => {
          const [result] = spec.buildRequests([bidFor(PROPERTY_KEY)], { ...bidderRequest, ortb2: { test } });
          expect(result.url).to.equal(`https://panxo-sys.com/openrtb/2.6/bid?key=${PROPERTY_KEY}&source=prebid`);
          expect(result.data.test).to.equal(test);
        });
      });

      it('keeps ordinary and reviewer impressions in distinct requests in a mixed auction', () => {
        const result = spec.buildRequests([
          bidFor('LAB02_BANNER', 'review-one'), bidFor(PROPERTY_KEY, 'ordinary'),
          bidFor('LAB02_BANNER', 'review-two')
        ], { ...bidderRequest, ortb2: { test: 1 } });
        expect(result.map(item => item.url)).to.deep.equal([
          `${endpoint}?key=LAB02_BANNER&source=prebid`,
          `https://panxo-sys.com/openrtb/2.6/bid?key=${PROPERTY_KEY}&source=prebid`
        ]);
        expect(result.map(item => item.data.imp.map(imp => imp.id))).to.deep.equal([
          ['review-one', 'review-two'], ['ordinary']
        ]);
      });

      it('retains ordinary siblings when reserved inventory lacks test mode', () => {
        const result = spec.buildRequests([
          bidFor('LAB02_BANNER', 'reserved'), bidFor(PROPERTY_KEY, 'ordinary')
        ], bidderRequest);
        expect(result).to.have.lengthOf(1);
        expect(result[0].url).to.equal(`https://panxo-sys.com/openrtb/2.6/bid?key=${PROPERTY_KEY}&source=prebid`);
        expect(result[0].data.imp.map(imp => imp.id)).to.deep.equal(['ordinary']);
      });

      it('does not turn bidder params, debug flags or arbitrary endpoints into reviewer routing', () => {
        const input = bidFor(PROPERTY_KEY);
        input.params.test = true;
        input.params.endpoint = 'https://untrusted.example.invalid/bid';
        const [result] = spec.buildRequests([input], { ...bidderRequest, debug: true });
        expect(result.url).to.equal(`https://panxo-sys.com/openrtb/2.6/bid?key=${PROPERTY_KEY}&source=prebid`);
        expect(result.data).not.to.have.property('test');
      });
    });

    it('should not restore rejected media through ortb2Imp extensions', function () {
      const requests = spec.buildRequests([{
        ...validBidRequests[0],
        ortb2Imp: { video: { w: -1 }, native: { request: 'invalid-json' } }
      }], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp[0]).to.not.have.property('video');
      expect(requests[0].data.imp[0]).to.not.have.property('native');
    });

    it('should not restore Native from ortb2Imp when the build disables Native', function () {
      if (FEATURES.NATIVE) this.skip();
      const requests = spec.buildRequests([{
        ...validBidRequests[0],
        ortb2Imp: { native: { request: JSON.stringify({ assets: [{ id: 1, title: { len: 80 } }] }) } }
      }], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp[0]).to.not.have.property('native');
    });

    it('should not restore invalid Native independently of Video', function () {
      const requests = spec.buildRequests([{
        ...validBidRequests[0],
        ortb2Imp: { native: { request: 'invalid-json' } }
      }], bidderRequest);
      expect(requests[0].data.imp[0]).to.not.have.property('native');
    });

    it('should preserve Video normalization when merging impression context', function () {
      const requests = spec.buildRequests([{
        ...validBidRequests[0],
        mediaTypes: { video: { mimes: ['video/mp4'], protocols: [2], playerSize: [640, 360] } },
        ortb2Imp: { video: { protocol: -1 } }
      }], bidderRequest);
      expect(requests[0].data.imp[0].video).to.not.have.property('protocol');
      expect(requests[0].data.imp[0].video.protocols).to.deep.equal([2]);
    });

    it('should not add an invalid Banner to a valid Video impression', function () {
      const requests = spec.buildRequests([{
        ...validBidRequests[0],
        mediaTypes: { video: { mimes: ['video/mp4'], protocols: [2], playerSize: [640, 360] } },
        ortb2Imp: { banner: { w: -1, h: -1 } }
      }], bidderRequest);
      expect(requests[0].data.imp[0]).to.not.have.property('banner');
    });

    it('should preserve normalized device fields supplied by Prebid', function () {
      const device = { ua: 'PublisherCTV/1.0', language: 'ca', w: 1920, h: 1080, devicetype: 3 };
      const requests = spec.buildRequests(validBidRequests, { ...bidderRequest, ortb2: { device } });
      expect(requests[0].data.device).to.include(device);
    });

    it('should build a valid OpenRTB request', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.include('panxo-sys.com/openrtb/2.6/bid');
      expect(requests[0].url).to.include(`key=${PROPERTY_KEY}`);
      expect(requests[0].data).to.be.an('object');
      expect(requests[0].data.tmax).to.equal(1500);
    });

    it('should build a contextual request without reading a stored user ID', function () {
      const getItem = sandbox.stub(window.Storage.prototype, 'getItem').returns('synthetic-stored-user-id');
      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(getItem.notCalled).to.be.true;
      expect(requests[0].data.user).to.deep.equal({ ext: {} });
    });

    it('should trim propertyKey before sending it', function () {
      const requests = spec.buildRequests([{
        ...validBidRequests[0],
        params: { propertyKey: `  ${PROPERTY_KEY}  ` }
      }], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].url).to.include(`key=${PROPERTY_KEY}&`);
      expect(requests[0].url).to.not.include('%20');
      expect(requests[0].data.user).to.deep.equal({ ext: {} });
    });

    it('should build correct impressions', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests[0].data.imp).to.be.an('array');
      expect(requests[0].data.imp[0].id).to.equal('bid-id-1');
      expect(requests[0].data.imp[0].banner.format).to.have.lengthOf(2);
      expect(requests[0].data.imp[0].tagid).to.equal('ad-unit-1');
      expect(requests[0].data.imp[0].bidfloorcur).to.equal('USD');
      expect(requests[0].data.cur).to.deep.equal(['USD']);
    });

    it('should keep contextual bidding available when storage access would throw', function () {
      const getItem = sandbox.stub(window.Storage.prototype, 'getItem').throws(new Error('storage unavailable'));
      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(getItem.notCalled).to.be.true;
      expect(requests[0].data.user).to.deep.equal({ ext: {} });
    });

    it('should discard a normalized buyer ID while preserving consent', function () {
      const requests = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        ortb2: {
          ...bidderRequest.ortb2,
          user: { buyeruid: 'another-buyer-id', ext: { consent: 'legacy' } }
        }
      });

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.user).to.deep.equal({ ext: { consent: 'legacy' } });
    });

    it('should discard legacy RTD device identity without changing publisher context', function () {
      const panxoDevice = { v1: 'session-token', uid: 'rtd-user-id' };
      const device = { ext: { panxo: panxoDevice, vpw: 1024 } };
      const before = JSON.stringify(device);
      const requests = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        ortb2: { ...bidderRequest.ortb2, device }
      });

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.user).to.not.have.property('buyeruid');
      expect(requests[0].data.device).to.not.have.property('ext');
      expect(JSON.stringify(device)).to.equal(before);
    });

    it('should fail closed when the bidder request ID is missing', function () {
      const requests = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        bidderRequestId: '   '
      });

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

      expect(requests[0].data.regs.gdpr).to.equal(1);
      expect(requests[0].data.regs.ext.gdpr).to.equal(1);
      expect(requests[0].data.user.consent).to.equal('CO-test-consent-string');
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

      expect(requests[0].data.regs.us_privacy).to.equal('1YNN');
      expect(requests[0].data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('should preserve COPPA from normalized ortb2 regulations', function () {
      const requests = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        ortb2: { regs: { coppa: 1 } }
      });

      expect(requests[0].data.regs.coppa).to.equal(1);
    });

    it('should include GPP in the OpenRTB 2.6 root regulation fields', function () {
      const gppBidderRequest = {
        ...bidderRequest,
        gppConsent: {
          gppString: 'DBABMA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
          applicableSections: [7, 8]
        }
      };
      const requests = spec.buildRequests(validBidRequests, gppBidderRequest);

      expect(requests[0].data.regs.gpp).to.equal(gppBidderRequest.gppConsent.gppString);
      expect(requests[0].data.regs.gpp_sid).to.deep.equal([7, 8]);
      expect(requests[0].data.regs.ext.gpp).to.equal(gppBidderRequest.gppConsent.gppString);
      expect(requests[0].data.regs.ext.gpp_sid).to.deep.equal([7, 8]);
    });

    it('should preserve Prebid\'s -1 GPP sentinel when no section applies', function () {
      const gppBidderRequest = {
        ...bidderRequest,
        gppConsent: {
          gppString: 'DBABMA~valid',
          applicableSections: [-1]
        }
      };
      const requests = spec.buildRequests(validBidRequests, gppBidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.regs.gpp_sid).to.deep.equal([-1]);
    });

    it('should omit malformed privacy fragments without suppressing valid bids', function () {
      const malformedGppRequest = {
        ...bidderRequest,
        gppConsent: {
          gppString: 'DBABMA~valid',
          applicableSections: '7,8'
        }
      };
      const malformedUspRequest = {
        ...bidderRequest,
        uspConsent: { value: '1YNN' }
      };

      const malformedGpp = spec.buildRequests(validBidRequests, malformedGppRequest);
      const malformedUsp = spec.buildRequests(validBidRequests, malformedUspRequest);
      const mixedSentinel = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        gppConsent: { gppString: 'DBABMA~valid', applicableSections: [-1, 7] }
      });

      expect(malformedGpp).to.have.lengthOf(1);
      expect(malformedGpp[0].data.regs.gpp).to.equal('DBABMA~valid');
      expect(malformedGpp[0].data.regs.gpp_sid).to.be.undefined;
      expect(malformedUsp).to.have.lengthOf(1);
      expect(malformedUsp[0].data.regs.us_privacy).to.be.undefined;
      expect(mixedSentinel).to.have.lengthOf(1);
      expect(mixedSentinel[0].data.regs.gpp_sid).to.be.undefined;
    });

    it('should tolerate Prebid GPP consent with an empty string', function () {
      const requests = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        gppConsent: { gppString: '', applicableSections: [7] }
      });

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.regs.gpp).to.be.undefined;
      expect(requests[0].data.regs.gpp_sid).to.be.undefined;
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

    it('should request and transmit USD floors independently of the ad-server currency', function () {
      let floorRequest;
      const bidWithFloor = [{
        ...validBidRequests[0],
        getFloor: (request) => {
          floorRequest = request;
          return { currency: 'USD', floor: 1.25 };
        }
      }];
      const eurBidderRequest = {
        ...bidderRequest,
        ortb2: {
          ext: {
            prebid: { adServerCurrency: 'eur' }
          }
        }
      };
      const requests = spec.buildRequests(bidWithFloor, eurBidderRequest);

      expect(floorRequest).to.deep.include({ currency: 'USD', mediaType: BANNER });
      expect(requests[0].data.cur).to.deep.equal(['USD']);
      expect(requests[0].data.imp[0].bidfloor).to.equal(1.25);
      expect(requests[0].data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should fail closed for a malformed explicit ad-server currency', function () {
      const invalidCurrencyRequest = {
        ...bidderRequest,
        ortb2: { ext: { prebid: { adServerCurrency: 'EU1' } } }
      };
      const requests = spec.buildRequests(validBidRequests, invalidCurrencyRequest);

      expect(requests).to.be.an('array').that.is.empty;
    });

    it('should filter malformed and duplicate sizes and use legacy sizes for floors', function () {
      let floorRequest;
      const legacyBid = [{
        ...validBidRequests[0],
        mediaTypes: { banner: {} },
        sizes: [[728, 90], [0, 90], [728, 90], ['300', 250]],
        getFloor: (request) => {
          floorRequest = request;
          return { currency: 'USD', floor: 0.75 };
        }
      }];

      const requests = spec.buildRequests(legacyBid, bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp[0].banner.format).to.deep.equal([{ w: 728, h: 90 }]);
      expect(floorRequest.size).to.deep.equal([728, 90]);
    });

    it('should skip malformed bids defensively even after Prebid validation', function () {
      const requests = spec.buildRequests([
        null,
        { ...validBidRequests[0], bidId: '   ' },
        { ...validBidRequests[0], mediaTypes: { banner: { sizes: [[0, 0]] } } }
      ], bidderRequest);

      expect(requests).to.be.an('array').that.is.empty;
    });

    it('should preserve impression fields and deals while omitting extensions', function () {
      const bidWithOrtb2Imp = [{
        ...validBidRequests[0],
        ortb2Imp: {
          instl: 1,
          banner: { pos: 3 },
          pmp: {
            private_auction: 1,
            deals: [{ id: 'deal-1', bidfloor: 2.25, bidfloorcur: 'USD' }]
          },
          ext: { data: { customField: 'value' } }
        }
      }];
      const requests = spec.buildRequests(bidWithOrtb2Imp, bidderRequest);

      expect(requests[0].data.imp[0].instl).to.equal(1);
      expect(requests[0].data.imp[0].banner.pos).to.equal(3);
      expect(requests[0].data.imp[0].banner.format).to.have.lengthOf(2);
      expect(requests[0].data.imp[0].pmp.deals[0].id).to.equal('deal-1');
      expect(requests[0].data.imp[0]).to.not.have.property('ext');
    });

    it('should ignore a non-object ortb2Imp.ext instead of corrupting the impression', function () {
      const requests = spec.buildRequests([{
        ...validBidRequests[0],
        ortb2Imp: { ext: 'invalid', instl: 1 }
      }], bidderRequest);

      expect(requests[0].data.imp[0].instl).to.equal(1);
      expect(requests[0].data.imp[0].ext).to.be.undefined;
    });

    it('should omit full page and ref URLs without restoring refererInfo URLs', function () {
      [
        'https://publisher.example/account/123?mode=reader#profile',
        'https://publisher.example/article',
        ''
      ].forEach(url => {
        const ortb2 = {
          site: {
            page: url,
            ref: url,
            domain: 'publisher.example',
            publisher: { id: 'publisher-1' },
            content: { language: 'ca' }
          }
        };
        const before = JSON.stringify(ortb2);
        const [request] = spec.buildRequests(validBidRequests, { ...bidderRequest, ortb2 });

        expect(request.data.site).to.not.have.property('page');
        expect(request.data.site).to.not.have.property('ref');
        expect(request.data.site.domain).to.equal('publisher.example');
        expect(request.data.site.publisher).to.deep.equal({ id: 'publisher-1' });
        expect(request.data.site.content).to.deep.equal({ language: 'ca' });
        expect(JSON.stringify(ortb2)).to.equal(before);
      });
      const [fallbackRequest] = spec.buildRequests(validBidRequests, bidderRequest);
      expect(fallbackRequest.data.site).to.deep.equal({ domain: 'example.com' });
    });

    it('should omit extension containers after reading currency and standard floors', function () {
      [0, 1.75].forEach(floor => {
        const getFloor = sandbox.stub().returns({ floor, currency: 'USD' });
        const bid = {
          ...validBidRequests[0],
          params: { propertyKey: PROPERTY_KEY, floor: 9 },
          getFloor,
          ortb2Imp: {
            bidfloor: 4,
            bidfloorcur: 'USD',
            instl: 1,
            pmp: { private_auction: 1, deals: [{ id: 'deal-1', bidfloor: 2.25, bidfloorcur: 'USD' }] },
            ext: { data: { audience: ['reader'] }, prebid: { custom: true } }
          }
        };
        const ortb2 = {
          ext: { prebid: { adServerCurrency: 'EUR' }, data: { account: 'reader' } },
          device: { devicetype: 3, ext: { vpw: 1920, nested: { account: 'reader' } } }
        };
        const before = JSON.stringify({ bid, ortb2 });
        const [request] = spec.buildRequests([bid], { ...bidderRequest, ortb2 });
        const imp = request.data.imp[0];

        expect(request.data).to.not.have.property('ext');
        expect(request.data.device).to.deep.equal({ devicetype: 3, js: 1 });
        expect(imp).to.not.have.property('ext');
        expect(request.data.cur).to.deep.equal(['USD']);
        expect(imp.bidfloor).to.equal(floor);
        expect(imp.bidfloorcur).to.equal('USD');
        expect(getFloor.calledOnce).to.be.true;
        expect(getFloor.firstCall.args[0]).to.deep.equal({ currency: 'USD', mediaType: 'banner', size: [300, 250] });
        expect(imp.id).to.equal(bid.bidId);
        expect(imp.instl).to.equal(1);
        expect(imp.banner.format).to.have.lengthOf(2);
        expect(imp.pmp).to.deep.equal(bid.ortb2Imp.pmp);
        expect(imp.pmp).to.not.equal(bid.ortb2Imp.pmp);
        expect(JSON.stringify({ bid, ortb2 })).to.equal(before);
      });
    });

    it('should not read removed URLs or extension payloads during cloning', function () {
      const removedRead = sandbox.stub().throws(new Error('removed transport field must not be read'));
      const site = { domain: 'publisher.example' };
      ['page', 'ref'].forEach(key => Object.defineProperty(site, key, { enumerable: true, get: removedRead }));
      const refererInfo = { domain: 'publisher.example' };
      ['page', 'ref'].forEach(key => Object.defineProperty(refererInfo, key, { enumerable: true, get: removedRead }));
      const device = { language: 'ca' };
      Object.defineProperty(device, 'ext', { enumerable: true, get: removedRead });
      const ext = { prebid: { adServerCurrency: 'EUR' } };
      Object.defineProperty(ext, 'data', { enumerable: true, get: removedRead });
      const ortb2Imp = { instl: 1 };
      Object.defineProperty(ortb2Imp, 'ext', { enumerable: true, get: removedRead });
      const [request] = spec.buildRequests([{ ...validBidRequests[0], ortb2Imp }], {
        ...bidderRequest,
        refererInfo,
        ortb2: { site, device, ext }
      });

      expect(removedRead.notCalled).to.be.true;
      expect(request.data.cur).to.deep.equal(['USD']);
      expect(request.data.site).to.deep.equal({ domain: 'publisher.example' });
      expect(request.data.device).to.deep.equal({ language: 'ca', js: 1 });
      expect(request.data).to.not.have.property('ext');
      expect(request.data.imp[0]).to.not.have.property('ext');
      expect(request.data.imp[0].instl).to.equal(1);
    });

    it('should preserve inventory context while dropping user identity, audiences and EIDs', function () {
      const eids = [{ source: 'id5-sync.com', uids: [{ id: 'id5-value', atype: 1 }] }];
      const audienceData = [{
        name: 'panxo.ai',
        ext: { segtax: 1001 },
        segment: [{ id: '42', name: 'high-intent' }]
      }];
      const contextualBidderRequest = {
        ...bidderRequest,
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [{ asi: 'direct.example', sid: 'seller-1', hp: 1 }]
        },
        ortb2: {
          test: 1,
          wlang: ['es', 'en'],
          bcat: ['IAB7-28'],
          ext: {
            prebid: { adServerCurrency: 'USD' },
            futureSignal: { version: 1 }
          },
          site: {
            page: 'https://publisher.example/article',
            domain: 'publisher.example',
            publisher: { id: 'pub-1', domain: 'publisher.example' },
            content: { language: 'es', context: 5 },
            ext: {
              data: {
                documentLang: 'es-ES',
                panxo: { mode: 'coarse', topics: ['software'] }
              }
            }
          },
          user: {
            id: 'publisher-user',
            buyeruid: 'publisher-buyer',
            eids,
            data: audienceData,
            consent: 'root-consent',
            ext: { consent: 'legacy-consent', customUserSignal: 'discarded', eids }
          },
          device: {
            dnt: 1,
            sua: { source: 1, mobile: 0, platform: { brand: 'macOS' } },
            ext: {
              vpw: 1466,
              vph: 862,
              panxo: { v1: 'session-token', uid: 'panxo-psid' }
            }
          },
          regs: {
            ext: { customRegulation: 1 }
          },
          source: {
            tid: 'transaction-id',
            ext: { tidSource: 'pbjs' }
          }
        }
      };
      const requests = spec.buildRequests([
        { ...validBidRequests[0], userIdAsEids: eids }
      ], contextualBidderRequest);
      const data = requests[0].data;

      expect(data.site.publisher).to.deep.equal(contextualBidderRequest.ortb2.site.publisher);
      expect(data.site.content).to.deep.equal(contextualBidderRequest.ortb2.site.content);
      expect(data.site.ext).to.deep.equal({ data: { documentLang: 'es-ES' } });
      expect(data.test).to.equal(1);
      expect(data.wlang).to.deep.equal(['es', 'en']);
      expect(data.bcat).to.deep.equal(['IAB7-28']);
      expect(data).to.not.have.property('ext');
      expect(data.site).to.not.have.property('page');
      expect(data.site).to.not.have.property('ref');
      expect(data.user).to.deep.equal({ consent: 'root-consent', ext: { consent: 'legacy-consent' } });
      expect(data.device.dnt).to.equal(1);
      expect(data.device.sua).to.deep.equal(contextualBidderRequest.ortb2.device.sua);
      expect(data.device).to.not.have.property('ext');
      expect(data.regs.ext.customRegulation).to.equal(1);
      expect(data.source.tid).to.equal('transaction-id');
      expect(data.source.ext.tidSource).to.equal('pbjs');
      expect(data.source.ext.schain).to.deep.equal(contextualBidderRequest.schain);
    });

    it('should not mutate normalized OpenRTB context while applying adapter overrides', function () {
      const contextualBidderRequest = {
        ...bidderRequest,
        ortb2: {
          user: {
            buyeruid: 'publisher-value',
            data: [{ name: 'panxo.ai', segment: [{ id: '7' }] }]
          },
          device: { ext: { panxo: { uid: 'psid-value' } } },
          source: { ext: { tidSource: 'pbjs' } }
        }
      };
      const before = JSON.stringify(contextualBidderRequest.ortb2);

      const requests = spec.buildRequests(validBidRequests, contextualBidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(JSON.stringify(contextualBidderRequest.ortb2)).to.equal(before);
      expect(requests[0].data.user).to.not.equal(contextualBidderRequest.ortb2.user);
      expect(requests[0].data.user).to.deep.equal({ ext: {} });
      expect(requests[0].data.device).to.not.have.property('ext');
    });

    it('should omit malformed non-array OpenRTB user.data', function () {
      const requests = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        ortb2: {
          user: {
            data: { id: 'malformed' },
            ext: { customUserSignal: 'discarded' }
          }
        }
      });

      expect(requests[0].data.user).to.deep.equal({ ext: {} });
    });

    it('should not fall back to User ID module identifiers or EIDs on any bid', function () {
      const eids = [{ source: 'synthetic.invalid', uids: [{ id: 'synthetic-eid', atype: 1 }] }];
      const bids = validBidRequests.concat({ ...validBidRequests[0], bidId: 'bid-id-2' }).map(bid => ({
        ...bid,
        userId: { pubcid: 'synthetic-publisher-id', panxo: 'synthetic-panxo-id' },
        userIdAsEids: eids
      }));
      const before = JSON.stringify(bids);
      const requests = spec.buildRequests(bids, bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp).to.have.lengthOf(2);
      expect(requests[0].data.user).to.deep.equal({ ext: {} });
      expect(JSON.stringify(bids)).to.equal(before);
    });

    it('should not read removed identity fields while copying the request', function () {
      const identityRead = sandbox.stub().throws(new Error('removed identity must not be read'));
      const user = { consent: 'synthetic-consent', ext: { consent: 'synthetic-consent' } };
      ['id', 'buyeruid', 'data', 'eids'].forEach(key => {
        Object.defineProperty(user, key, { enumerable: true, get: identityRead });
      });
      Object.defineProperty(user.ext, 'eids', { enumerable: true, get: identityRead });
      const device = { language: 'ca', ext: { vpw: 1024 } };
      ['ifa', 'didsha1', 'didmd5', 'dpidsha1', 'dpidmd5', 'macsha1', 'macmd5', 'ip', 'ipv6'].forEach(key => {
        Object.defineProperty(device, key, { enumerable: true, get: identityRead });
      });
      Object.defineProperty(device.ext, 'panxo', { enumerable: true, get: identityRead });
      const bid = { ...validBidRequests[0] };
      ['userId', 'userIdAsEids'].forEach(key => {
        Object.defineProperty(bid, key, { enumerable: true, get: identityRead });
      });

      const [request] = spec.buildRequests([bid], { ...bidderRequest, ortb2: { user, device } });

      expect(identityRead.notCalled).to.be.true;
      expect(request.data.user).to.deep.equal({ consent: 'synthetic-consent', ext: { consent: 'synthetic-consent' } });
      expect(request.data.device).to.deep.equal({ language: 'ca', js: 1 });
      expect(request.data.imp).to.have.lengthOf(1);
    });

    it('should remove named device identifiers while keeping normalized device capabilities', function () {
      const identityFields = ['ifa', 'didsha1', 'didmd5', 'dpidsha1', 'dpidmd5', 'macsha1', 'macmd5', 'ip', 'ipv6'];
      const device = {
        ua: 'SyntheticCTV/1.0',
        devicetype: 3,
        dnt: 1,
        lmt: 1,
        language: 'ca',
        w: 1920,
        h: 1080,
        ...Object.fromEntries(identityFields.map(key => [key, `synthetic-${key}`])),
        ext: { panxo: { uid: 'synthetic-uid', v1: 'synthetic-token' }, vpw: 1920, vph: 1080 }
      };
      const sharedContext = { device, user: { id: 'synthetic-user', data: [{ segment: [{ id: 'synthetic-member' }] }] } };
      const otherBidderRequest = { bidderCode: 'another-bidder', ortb2: sharedContext };
      const before = JSON.stringify(otherBidderRequest);
      const [request] = spec.buildRequests(validBidRequests, { ...bidderRequest, ortb2: sharedContext });

      expect(request.data.device).to.deep.equal({
        ua: 'SyntheticCTV/1.0',
        devicetype: 3,
        dnt: 1,
        lmt: 1,
        language: 'ca',
        w: 1920,
        h: 1080,
        js: 1
      });
      expect(request.data.user).to.deep.equal({ ext: {} });
      expect(JSON.stringify(otherBidderRequest)).to.equal(before);
      expect(otherBidderRequest.ortb2).to.equal(sharedContext);
    });

    it('should let CMP consent replace normalized consent without forwarding other user fields', function () {
      const context = {
        user: {
          id: 'synthetic-id',
          buyeruid: 'synthetic-buyer',
          yob: 1980,
          gender: 'O',
          keywords: 'synthetic-history',
          consent: 'old-root',
          geo: { lat: 41.1, lon: 2.1 },
          ext: { consent: 'old-legacy', data: { history: ['synthetic-history'] } }
        }
      };
      const before = JSON.stringify(context);
      const [request] = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        ortb2: context,
        gdprConsent: { gdprApplies: true, consentString: '  synthetic-cmp-consent  ' }
      });

      expect(request.data.user).to.deep.equal({
        consent: 'synthetic-cmp-consent', ext: { consent: 'synthetic-cmp-consent' }
      });
      expect(request.data.regs.gdpr).to.equal(1);
      expect(JSON.stringify(context)).to.equal(before);
    });

    [null, 123, [], {}, '   '].forEach(consent => {
      it(`should omit malformed consent ${JSON.stringify(consent)} without restoring user identity`, function () {
        const [request] = spec.buildRequests(validBidRequests, {
          ...bidderRequest,
          ortb2: { user: { id: 'synthetic-id', consent, ext: { consent } } },
          gdprConsent: { consentString: consent }
        });
        expect(request.data.user).to.deep.equal({ ext: {} });
      });
    });

    describe('Panxo inventory namespace', function () {
      ['site', 'app'].forEach(channel => {
        [true, false].forEach(ai => {
          it(`should retain only boolean ai in ${channel} without mutating shared context (${ai})`, function () {
            const inventory = {
              domain: 'publisher.example',
              bundle: 'app.publisher.example',
              ext: {
                inventory: { placement: 'synthetic' },
                data: {
                  documentLang: 'ca',
                  panxo: {
                    ai,
                    uid: 'IDENTITY-uid',
                    history: [{ url: 'IDENTITY-history' }],
                    memberships: ['IDENTITY-membership'],
                    links: { account: 'IDENTITY-account' },
                    source: 'unbounded-source'
                  }
                }
              }
            };
            const context = { [channel]: inventory };
            const before = JSON.stringify(context);
            const [request] = spec.buildRequests(validBidRequests, { ...bidderRequest, ortb2: context });
            const outgoing = request.data[channel];

            expect(outgoing.ext).to.deep.equal({
              inventory: { placement: 'synthetic' },
              data: { documentLang: 'ca', panxo: { ai } }
            });
            expect(JSON.stringify(request.data)).to.not.include('IDENTITY-');
            expect(JSON.stringify(context)).to.equal(before);
            outgoing.ext.inventory.placement = 'changed';
            outgoing.ext.data.panxo.ai = !ai;
            expect(JSON.stringify(context)).to.equal(before);
          });
        });

        [null, 'IDENTITY-string', 7, true, [], { uid: 'IDENTITY-only' },
          { ai: 'true', uid: 'IDENTITY-string-ai' }, { ai: 1 }, { ai: null },
          { ai: { uid: 'IDENTITY-object-ai' } }, { ai: [true] }].forEach(panxo => {
          it(`should omit malformed or absent ai from ${channel} Panxo context ${JSON.stringify(panxo)}`, function () {
            const context = { [channel]: { ext: { data: { panxo, documentLang: 'ca' } } } };
            const before = JSON.stringify(context);
            const [request] = spec.buildRequests(validBidRequests, { ...bidderRequest, ortb2: context });

            expect(request.data[channel].ext.data).to.deep.equal({ documentLang: 'ca' });
            expect(JSON.stringify(context)).to.equal(before);
          });
        });

        [null, 'IDENTITY-data', [{ panxo: { ai: true, uid: 'IDENTITY-array' } }]].forEach(data => {
          it(`should omit malformed ${channel} data containers ${JSON.stringify(data)}`, function () {
            const context = { [channel]: { ext: { data, inventory: 'ordinary' } } };
            const before = JSON.stringify(context);
            const [request] = spec.buildRequests(validBidRequests, { ...bidderRequest, ortb2: context });

            expect(request.data[channel].ext).to.deep.equal({ inventory: 'ordinary' });
            expect(JSON.stringify(context)).to.equal(before);
          });
        });

        it(`should not read removed ${channel} Panxo fields`, function () {
          const removedRead = sandbox.stub().throws(new Error('removed Panxo field must not be read'));
          const panxo = { ai: true };
          ['uid', 'history', 'memberships', 'links'].forEach(key => {
            Object.defineProperty(panxo, key, { enumerable: true, get: removedRead });
          });
          const [request] = spec.buildRequests(validBidRequests, {
            ...bidderRequest, ortb2: { [channel]: { ext: { data: { panxo } } } }
          });

          expect(request.data[channel].ext.data.panxo).to.deep.equal({ ai: true });
          expect(removedRead.notCalled).to.be.true;
        });
      });

      [true, false].forEach(ai => {
        it(`should filter RTD site enrichment before moving it into app (${ai})`, function () {
          const context = {
            app: { bundle: 'app.publisher.example', ext: { data: { documentLang: 'ca', panxo: { ai: !ai } } } },
            site: { ext: { data: { panxo: { ai, uid: 'IDENTITY-rtd', history: ['IDENTITY-history'] } } } }
          };
          const before = JSON.stringify(context);
          const [request] = spec.buildRequests(validBidRequests, { ...bidderRequest, ortb2: context });

          expect(request.data).to.not.have.property('site');
          expect(request.data.app.ext.data).to.deep.equal({ documentLang: 'ca', panxo: { ai } });
          expect(JSON.stringify(request.data)).to.not.include('IDENTITY-');
          expect(JSON.stringify(context)).to.equal(before);
        });
      });

      it('should ignore malformed site enrichment without replacing a valid app signal', function () {
        const context = {
          app: { bundle: 'app.publisher.example', ext: { data: { panxo: { ai: false, uid: 'IDENTITY-app' } } } },
          site: { ext: { data: { panxo: { ai: 'true', uid: 'IDENTITY-rtd' } } } }
        };
        const [request] = spec.buildRequests(validBidRequests, { ...bidderRequest, ortb2: context });

        expect(request.data.app.ext.data.panxo).to.deep.equal({ ai: false });
        expect(JSON.stringify(request.data)).to.not.include('IDENTITY-');
      });
    });

    it('should preserve an explicit app-only OpenRTB context without synthesizing site', function () {
      const requests = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        ortb2: {
          app: {
            id: 'app-1',
            bundle: 'ai.panxo.publisher',
            publisher: { id: 'publisher-1' },
            content: { language: 'es' },
            ext: { inventory: { channel: 'app' } }
          }
        }
      });

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.app.bundle).to.equal('ai.panxo.publisher');
      expect(requests[0].data.app.ext.inventory.channel).to.equal('app');
      expect(requests[0].data.site).to.be.undefined;
    });

    it('should preserve app inventory when RTD adds a global site context fragment', function () {
      const panxoContext = { ai: true };
      const requests = spec.buildRequests(validBidRequests, {
        ...bidderRequest,
        ortb2: {
          app: {
            id: 'app-rtd-1',
            bundle: 'ai.panxo.publisher',
            publisher: { id: 'publisher-1' },
          },
          site: { ext: { data: { panxo: panxoContext } } },
          device: { devicetype: 4 },
        },
      });

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.site).to.be.undefined;
      expect(requests[0].data.app.id).to.equal('app-rtd-1');
      expect(requests[0].data.app.ext.data.panxo).to.deep.equal(panxoContext);
      expect(requests[0].data.device.devicetype).to.equal(4);
    });

    it('should transport app and CTV context with a complete video impression', function () {
      const videoBid = [{
        bidder: 'panxo',
        bidId: 'video-bid-id',
        adUnitCode: 'video-ad-unit',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [[1920, 1080]],
            mimes: ['video/mp4', 'video/webm'],
            protocols: [2, 3, 5, 6],
            minduration: 6,
            maxduration: 30,
            plcmt: 1,
            api: [2, 7]
          }
        }
      }];
      const requests = spec.buildRequests(videoBid, {
        ...bidderRequest,
        ortb2: {
          app: {
            id: 'ctv-app-1',
            bundle: 'ai.panxo.ctv',
            publisher: { id: 'publisher-1' }
          },
          device: {
            devicetype: 3,
            make: 'Example TV',
            model: 'CTV-1',
            ifa: 'ifa-value'
          }
        }
      });

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.site).to.be.undefined;
      expect(requests[0].data.app.bundle).to.equal('ai.panxo.ctv');
      expect(requests[0].data.device.devicetype).to.equal(3);
      expect(requests[0].data.device).to.not.have.property('ifa');
      expect(requests[0].data.imp[0].banner).to.be.undefined;
      expect(requests[0].data.imp[0].video).to.deep.include({
        w: 1920,
        h: 1080,
        mimes: ['video/mp4', 'video/webm'],
        protocols: [2, 3, 5, 6],
        minduration: 6,
        maxduration: 30,
        plcmt: 1,
        api: [2, 7]
      });
      expect(requests[0].data.imp[0].video.ext.prebid.context).to.equal('instream');
    });

    it('should serialize native requests without losing OpenRTB assets', function () {
      const nativeRequest = {
        ver: '1.2',
        context: 1,
        plcmttype: 1,
        assets: [
          { id: 1, required: 1, title: { len: 80 } },
          { id: 2, img: { type: 3, wmin: 1200, hmin: 627 } }
        ],
        eventtrackers: [{ event: 1, methods: [1, 2] }]
      };
      const requests = spec.buildRequests([{
        bidder: 'panxo',
        bidId: 'native-bid-id',
        adUnitCode: 'native-ad-unit',
        params: { propertyKey: PROPERTY_KEY },
        mediaTypes: { native: {} },
        nativeOrtbRequest: nativeRequest
      }], bidderRequest);

      expect(requests).to.have.lengthOf(FEATURES.NATIVE ? 1 : 0);
      if (FEATURES.NATIVE) {
        expect(requests[0].data.imp[0].banner).to.be.undefined;
        expect(JSON.parse(requests[0].data.imp[0].native.request)).to.deep.equal(nativeRequest);
        expect(requests[0].data.imp[0].native.ver).to.equal('1.2');
      }
    });

    it('should keep banner, video and native in one multi-format impression', function () {
      const floorRequests = [];
      const requests = spec.buildRequests([{
        ...validBidRequests[0],
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: {
            context: 'outstream',
            playerSize: [640, 360],
            mimes: ['video/mp4'],
            protocols: [2]
          },
          native: {}
        },
        nativeOrtbRequest: {
          ver: '1.2',
          assets: [{ id: 1, title: { len: 60 } }]
        },
        getFloor: request => {
          floorRequests.push(request);
          return { currency: 'USD', floor: request.mediaType === VIDEO ? 2 : 1 };
        }
      }], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp).to.have.lengthOf(1);
      const expectedKeys = ['id', 'bidfloorcur', 'secure', 'tagid', BANNER, VIDEO, 'bidfloor'];
      if (FEATURES.NATIVE) expectedKeys.push(NATIVE);
      expect(requests[0].data.imp[0]).to.have.all.keys(...expectedKeys);
      expect(requests[0].data.imp[0].bidfloor).to.equal(2);
      expect(floorRequests.map(request => request.mediaType)).to.deep.equal(
        FEATURES.NATIVE ? [BANNER, VIDEO, NATIVE] : [BANNER, VIDEO]
      );
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
      data: {
        id: 'test-request-id',
        cur: ['USD'],
        imp: [{
          id: 'bid-id-1',
          banner: { format: [{ w: 300, h: 250 }], w: 300, h: 250 }
        }]
      },
      bidderRequest: {
        bids: [{
          bidId: 'bid-id-1',
          adUnitCode: 'ad-unit-1',
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        }]
      }
    };

    const serverResponse = {
      body: {
        id: 'test-request-id',
        seatbid: [{
          seat: 'panxo',
          bid: [{
            id: 'response-bid-id-1',
            impid: 'bid-id-1',
            price: 2.50,
            w: 300,
            h: 250,
            adm: '<div>Ad creative</div>',
            crid: 'creative-123',
            adomain: ['advertiser.com'],
            nurl: 'https://panxo-sys.com/win?price=${AUCTION_PRICE}',
            burl: 'https://panxo-sys.com/imp?price=${AUCTION_PRICE}'
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
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].ad).to.equal('<div>Ad creative</div>');
      expect(bids[0].meta.advertiserDomains).to.include('advertiser.com');
    });

    it('should return empty array for empty response', function () {
      const emptyResponse = { body: {} };
      const bids = spec.interpretResponse(emptyResponse, request);

      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should tolerate a missing server response object', function () {
      expect(() => spec.interpretResponse(null, request)).to.not.throw();
      expect(spec.interpretResponse(null, request)).to.be.empty;
    });

    it('should return empty array for no seatbid', function () {
      const noSeatbidResponse = { body: { id: 'test', seatbid: [] } };
      const bids = spec.interpretResponse(noSeatbidResponse, request);

      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should include win and billing notices in bid response', function () {
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids[0].nurl).to.include('panxo-sys.com/win');
      expect(bids[0].burl).to.include('panxo-sys.com/imp');
    });

    it('should expose only non-empty string advertiser domains', function () {
      const malformedAdomainResponse = {
        body: {
          ...serverResponse.body,
          seatbid: [{
            bid: [{
              ...serverResponse.body.seatbid[0].bid[0],
              adomain: [' advertiser.com ', '', null, 42]
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(malformedAdomainResponse, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should default malformed advertiser-domain metadata to an empty array', function () {
      const malformedAdomainResponse = {
        body: {
          ...serverResponse.body,
          seatbid: [{
            bid: [{
              ...serverResponse.body.seatbid[0].bid[0],
              adomain: 'advertiser.com'
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(malformedAdomainResponse, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].meta.advertiserDomains).to.deep.equal([]);
    });

    it('should expose extensible OpenRTB metadata without weakening standard-field authority', function () {
      const providedMeta = JSON.parse(`{
        "advertiserDomains": ["fallback.example"],
        "networkId": 85,
        "networkName": "Index Exchange",
        "futureField": {"enabled": true},
        "mediaType": "video",
        "__proto__": {"polluted": true},
        "constructor": {"polluted": true}
      }`);
      const metadataResponse = {
        body: {
          ...serverResponse.body,
          seatbid: [{
            bid: [{
              ...serverResponse.body.seatbid[0].bid[0],
              adomain: [' advertiser.com ', 'advertiser.com'],
              cat: ['IAB1', 'IAB2', 'IAB2', ''],
              attr: [1, 2, 2, '3'],
              cattax: 2,
              ext: {
                prebid: { meta: providedMeta },
                dsa: { behalf: 'buyer', paid: 'buyer', adrender: 1 },
                dchain: {
                  ver: '1.0',
                  complete: 1,
                  nodes: [{ asi: 'buyer.example', bsid: 'seat-1' }]
                },
                eventtrackers: [
                  { event: 500, method: 1, url: 'https://track.example/win' },
                  null,
                  'invalid'
                ]
              }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(metadataResponse, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].meta).to.include({
        networkId: 85,
        networkName: 'Index Exchange',
        mediaType: BANNER,
        primaryCatId: 'IAB1',
        cattax: 2
      });
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
      expect(bids[0].meta.secondaryCatIds).to.deep.equal(['IAB2']);
      expect(bids[0].meta.attr).to.deep.equal([1, 2]);
      expect(bids[0].meta.futureField).to.deep.equal({ enabled: true });
      expect(bids[0].meta.dsa).to.deep.equal({ behalf: 'buyer', paid: 'buyer', adrender: 1 });
      expect(bids[0].meta.dchain.nodes[0].asi).to.equal('buyer.example');
      expect(bids[0].eventtrackers).to.deep.equal([
        { event: 500, method: 1, url: 'https://track.example/win' }
      ]);
      expect(Object.prototype.polluted).to.be.undefined;
      expect(Object.prototype.hasOwnProperty.call(bids[0].meta, '__proto__')).to.be.false;
      expect(Object.prototype.hasOwnProperty.call(bids[0].meta, 'constructor')).to.be.false;
    });

    it('should use sanitized ext.prebid.meta advertiser domains as an OpenRTB fallback', function () {
      const metadataFallbackResponse = {
        body: {
          ...serverResponse.body,
          seatbid: [{
            bid: [{
              ...serverResponse.body.seatbid[0].bid[0],
              adomain: undefined,
              ext: {
                prebid: {
                  meta: {
                    advertiserDomains: [' fallback.example ', '', 42, 'fallback.example']
                  }
                }
              }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(metadataFallbackResponse, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['fallback.example']);
    });

    it('should preserve an EUR request/response currency lane', function () {
      const eurResponse = {
        body: { ...serverResponse.body, cur: 'EUR' }
      };
      const eurRequest = {
        ...request,
        data: { ...request.data, cur: ['EUR'] }
      };
      const bids = spec.interpretResponse(eurResponse, eurRequest);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].currency).to.equal('EUR');
    });

    it('should reject a response outside the requested currency lane', function () {
      const eurRequest = {
        ...request,
        data: { ...request.data, cur: ['EUR'] }
      };
      const bids = spec.interpretResponse(serverResponse, eurRequest);

      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should reject a malformed requested currency lane', function () {
      const malformedRequest = {
        ...request,
        data: { ...request.data, cur: ['US1'] }
      };

      expect(spec.interpretResponse(serverResponse, malformedRequest)).to.be.empty;
    });

    it('should treat an omitted response currency as USD and reject it for an EUR request', function () {
      const eurRequest = {
        ...request,
        data: { ...request.data, cur: ['EUR'] }
      };
      const responseWithoutCurrency = {
        body: { ...serverResponse.body }
      };
      delete responseWithoutCurrency.body.cur;

      const bids = spec.interpretResponse(responseWithoutCurrency, eurRequest);

      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should treat an omitted response currency as USD for a USD request', function () {
      const responseWithoutCurrency = {
        body: { ...serverResponse.body }
      };
      delete responseWithoutCurrency.body.cur;

      const bids = spec.interpretResponse(responseWithoutCurrency, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].currency).to.equal('USD');
    });

    it('should reject a response for a different OpenRTB request ID', function () {
      const mismatchedResponse = {
        body: { ...serverResponse.body, id: 'different-request-id' }
      };

      expect(spec.interpretResponse(mismatchedResponse, request)).to.be.an('array').that.is.empty;
    });

    it('should only accept impressions contained in the grouped HTTP request', function () {
      const groupedRequest = {
        ...request,
        bidderRequest: {
          bids: [
            ...request.bidderRequest.bids,
            {
              bidId: 'bid-id-other-property',
              adUnitCode: 'ad-unit-2',
              mediaTypes: { banner: { sizes: [[300, 250]] } }
            }
          ]
        }
      };
      const crossPropertyResponse = {
        body: {
          ...serverResponse.body,
          seatbid: [{
            bid: [{
              ...serverResponse.body.seatbid[0].bid[0],
              impid: 'bid-id-other-property'
            }]
          }]
        }
      };

      expect(spec.interpretResponse(crossPropertyResponse, groupedRequest)).to.be.an('array').that.is.empty;
    });

    it('should reject malformed, incomplete, non-banner, non-positive, and unrequested-size bids', function () {
      const validBid = serverResponse.body.seatbid[0].bid[0];
      const invalidResponse = {
        body: {
          ...serverResponse.body,
          seatbid: [{
            bid: [
              { ...validBid, mtype: 2 },
              { ...validBid, price: 0 },
              { ...validBid, price: Number.NaN },
              { ...validBid, adm: '' },
              { ...validBid, adm: '   ' },
              { ...validBid, id: '' },
              null,
              { ...validBid, w: 728, h: 90 }
            ]
          }]
        }
      };

      expect(spec.interpretResponse(invalidResponse, request)).to.be.an('array').that.is.empty;
    });

    it('should ignore malformed seatbid entries instead of throwing', function () {
      const malformedResponse = {
        body: { ...serverResponse.body, seatbid: [{ bid: {} }, null] }
      };

      expect(() => spec.interpretResponse(malformedResponse, request)).to.not.throw();
      expect(spec.interpretResponse(malformedResponse, request)).to.be.an('array').that.is.empty;
    });

    it('should sanitize optional response fields and apply a safe TTL default', function () {
      const malformedOptionalsResponse = {
        body: {
          ...serverResponse.body,
          seatbid: [{
            bid: [{
              ...serverResponse.body.seatbid[0].bid[0],
              crid: '   ',
              dealid: 123,
              exp: -5,
              nurl: { url: 'https://invalid.example' },
              burl: { url: 'https://invalid.example' }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(malformedOptionalsResponse, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].creativeId).to.equal('response-bid-id-1');
      expect(bids[0].dealId).to.be.null;
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].nurl).to.be.undefined;
      expect(bids[0].burl).to.be.undefined;
    });

    it('should map an OpenRTB video bid to a Prebid VAST response', function () {
      const videoRequest = {
        data: {
          id: 'video-request-id',
          cur: ['USD'],
          imp: [{
            id: 'video-bid-id',
            video: { w: 1920, h: 1080, mimes: ['video/mp4'], protocols: [2] }
          }]
        },
        bidderRequest: {
          bids: [{
            bidId: 'video-bid-id',
            adUnitCode: 'video-ad-unit',
            mediaTypes: {
              video: {
                context: 'instream',
                playerSize: [[1920, 1080]],
                mimes: ['video/mp4'],
                protocols: [2]
              }
            }
          }]
        }
      };
      const videoResponse = {
        body: {
          id: 'video-request-id',
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'video-response-id',
              impid: 'video-bid-id',
              price: 8.5,
              mtype: 2,
              adm: '<VAST version="3.0"></VAST>',
              dur: 15,
              adomain: ['advertiser.example']
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(videoResponse, videoRequest);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(VIDEO);
      expect(bids[0].vastXml).to.equal('<VAST version="3.0"></VAST>');
      expect(bids[0].width).to.equal(1920);
      expect(bids[0].height).to.equal(1080);
      expect(bids[0].playerWidth).to.equal(1920);
      expect(bids[0].playerHeight).to.equal(1080);
      expect(bids[0].duration).to.equal(15);
    });

    it('should reject a Video response whose dimensions do not match the requested player', function () {
      const videoRequest = {
        data: {
          id: 'video-request-id',
          cur: ['USD'],
          imp: [{
            id: 'video-bid-id',
            video: { w: 1920, h: 1080, mimes: ['video/mp4'], protocols: [2] }
          }]
        },
        bidderRequest: {
          bids: [{
            bidId: 'video-bid-id',
            mediaTypes: {
              video: {
                context: 'instream',
                playerSize: [[1920, 1080]],
                mimes: ['video/mp4'],
                protocols: [2]
              }
            }
          }]
        }
      };
      const mismatchedResponse = {
        body: {
          id: 'video-request-id',
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'video-response-id',
              impid: 'video-bid-id',
              price: 8.5,
              mtype: 2,
              adm: '<VAST version="3.0"></VAST>',
              w: 640,
              h: 360
            }]
          }]
        }
      };

      expect(spec.interpretResponse(mismatchedResponse, videoRequest)).to.be.empty;
    });

    it('should map an OpenRTB native bid to Prebid native.ortb', function () {
      const nativeRequest = {
        data: {
          id: 'native-request-id',
          cur: ['USD'],
          imp: [{
            id: 'native-bid-id',
            native: {
              request: JSON.stringify({
                ver: '1.2',
                assets: [{ id: 1, title: { len: 80 } }]
              })
            }
          }]
        },
        bidderRequest: {
          bids: [{
            bidId: 'native-bid-id',
            adUnitCode: 'native-ad-unit',
            mediaTypes: { native: {} },
            nativeOrtbRequest: {
              ver: '1.2',
              assets: [{ id: 1, title: { len: 80 } }]
            }
          }]
        }
      };
      const nativeAdm = {
        ver: '1.2',
        assets: [{ id: 1, title: { text: 'Panxo native title' } }],
        link: { url: 'https://advertiser.example/' },
        eventtrackers: [{ event: 1, method: 1, url: 'https://track.example/imp' }]
      };
      const nativeResponse = {
        body: {
          id: 'native-request-id',
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'native-response-id',
              impid: 'native-bid-id',
              price: 3.25,
              mtype: 4,
              adm: JSON.stringify(nativeAdm)
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(nativeResponse, nativeRequest);

      expect(bids).to.have.lengthOf(FEATURES.NATIVE ? 1 : 0);
      if (FEATURES.NATIVE) {
        expect(bids[0].mediaType).to.equal(NATIVE);
        expect(bids[0].native.ortb).to.deep.equal(nativeAdm);
      }
    });

    it('should reject mismatched, ambiguous and malformed multi-format responses', function () {
      const bannerBid = serverResponse.body.seatbid[0].bid[0];
      const ambiguousRequest = {
        ...request,
        data: {
          ...request.data,
          imp: [{
            id: 'bid-id-1',
            banner: { w: 300, h: 250 },
            video: { w: 640, h: 360, mimes: ['video/mp4'], protocols: [2] }
          }]
        }
      };
      const nativeOnlyRequest = {
        ...request,
        data: {
          ...request.data,
          imp: [{ id: 'bid-id-1', native: { request: '{"assets":[{}]}' } }]
        },
        bidderRequest: {
          bids: [{
            bidId: 'bid-id-1',
            mediaTypes: { native: {} },
            nativeOrtbRequest: { assets: [{}] }
          }]
        }
      };

      expect(spec.interpretResponse({
        body: {
          ...serverResponse.body,
          seatbid: [{ bid: [{ ...bannerBid, mtype: 2, adm: '<VAST />' }] }]
        }
      }, request)).to.be.empty;
      expect(spec.interpretResponse(serverResponse, ambiguousRequest)).to.be.empty;
      expect(spec.interpretResponse({
        body: {
          ...serverResponse.body,
          seatbid: [{ bid: [{ ...bannerBid, mtype: 4, adm: '{not-json' }] }]
        }
      }, nativeOnlyRequest)).to.be.empty;
    });
  });

  describe('getUserSyncs', function () {
    const cases = [
      { name: 'missing sync options', options: undefined },
      { name: 'disabled sync options', options: { pixelEnabled: false, iframeEnabled: false } },
      { name: 'permissive pixel and iframe options', options: { pixelEnabled: true, iframeEnabled: true } },
      { name: 'GDPR consent', gdpr: { gdprApplies: true, consentString: 'synthetic-consent' } },
      { name: 'GDPR not applicable', gdpr: { gdprApplies: false, consentString: 'synthetic-consent' } },
      { name: 'unknown GDPR applicability', gdpr: { gdprApplies: undefined, consentString: 'synthetic-consent' } },
      { name: 'US Privacy consent', usp: '1YNN' },
      { name: 'GPP consent', gpp: { gppString: 'DBABMA~synthetic', applicableSections: [7, 8] } },
      { name: 'GPP sentinel', gpp: { gppString: 'DBABMA~synthetic', applicableSections: [-1] } },
      { name: 'malformed GPP sections', gpp: { gppString: 'DBABMA~synthetic', applicableSections: { 0: 7 } } },
      { name: 'empty GPP consent', gpp: { gppString: '', applicableSections: [7] } }
    ];

    cases.forEach(testCase => {
      it(`should return no user syncs with ${testCase.name}`, function () {
        const options = Object.prototype.hasOwnProperty.call(testCase, 'options')
          ? testCase.options : { pixelEnabled: true, iframeEnabled: true };
        const responses = [{ body: { ext: { usersync: [{ type: 'image', url: 'https://synthetic.invalid/sync' }] } } }];
        const before = JSON.stringify({ options, responses, testCase });

        const syncs = spec.getUserSyncs(options, responses, testCase.gdpr, testCase.usp, testCase.gpp);

        expect(syncs).to.be.an('array').that.is.empty;
        expect(JSON.stringify({ options, responses, testCase })).to.equal(before);
      });
    });
  });

  describe('onBidWon', function () {
    it('should fire win notification pixel', function () {
      const bid = {
        nurl: 'https://panxo-sys.com/win?price=${AUCTION_PRICE}',
        cpm: 2.50,
        originalCpm: 3.25
      };

      const imgStub = { src: '' };
      const imageStub = sinon.stub(window, 'Image').returns(imgStub);

      spec.onBidWon(bid);

      expect(imgStub.src).to.include('price=3.25');

      imageStub.restore();
    });

    it('should ignore malformed win notifications without throwing', function () {
      const imageStub = sinon.stub(window, 'Image').returns({ src: '' });

      expect(() => spec.onBidWon(null)).to.not.throw();
      expect(() => spec.onBidWon({ nurl: {}, cpm: 2.5 })).to.not.throw();
      expect(() => spec.onBidWon({ nurl: 'https://example.com', cpm: Number.NaN })).to.not.throw();
      expect(imageStub.callCount).to.equal(0);

      imageStub.restore();
    });
  });

  describe('onBidBillable', function () {
    it('should let core send an existing impression tracker for the billing URL exactly once', function () {
      const sandbox = sinon.createSandbox();
      try {
        const corePixel = sandbox.stub(utils, 'politeTriggerPixel');
        const adapterPixel = sandbox.stub(utils, 'triggerPixel');
        const url = 'https://review.example.test/bill?price=1.25';
        const bid = {
          bidder: 'panxo',
          cpm: 2,
          originalCpm: 1.25,
          burl: 'https://review.example.test/bill?price=${AUCTION_PRICE}',
          eventtrackers: [{ event: 1, method: 1, url }]
        };
        adapterManager.triggerBilling(bid);
        adapterManager.triggerBilling(bid);
        expect(corePixel.calledOnceWithExactly(url)).to.be.true;
        expect(adapterPixel.notCalled).to.be.true;
      } finally {
        sandbox.restore();
      }
    });

    it('should still send billing when the matching URL belongs to a different event or method', function () {
      const sandbox = sinon.createSandbox();
      try {
        const pixel = sandbox.stub(utils, 'triggerPixel');
        const url = 'https://review.example.test/bill';
        spec.onBidBillable({
          cpm: 1,
          burl: url,
          eventtrackers: [null, { event: 500, method: 1, url }, { event: 1, method: 2, url }]
        });
        expect(pixel.calledOnceWithExactly(url)).to.be.true;
      } finally {
        sandbox.restore();
      }
    });

    it('should fire the billing notice once Prebid marks the bid billable', function () {
      const bid = {
        burl: 'https://panxo-sys.com/imp?price=${AUCTION_PRICE}',
        cpm: 2.50,
        originalCpm: 3.25
      };
      const imgStub = { src: '' };
      const imageStub = sinon.stub(window, 'Image').returns(imgStub);

      spec.onBidBillable(bid);

      expect(imgStub.src).to.include('price=3.25');
      imageStub.restore();
    });

    it('should ignore malformed billing notices without throwing', function () {
      const imageStub = sinon.stub(window, 'Image').returns({ src: '' });

      expect(() => spec.onBidBillable(null)).to.not.throw();
      expect(() => spec.onBidBillable({ burl: {}, cpm: 2.5 })).to.not.throw();
      expect(() => spec.onBidBillable({ burl: 'https://example.com', cpm: Number.NaN })).to.not.throw();
      expect(imageStub.callCount).to.equal(0);

      imageStub.restore();
    });
  });

  describe('onTimeout', function () {
    it('should accept timeout diagnostics without throwing', function () {
      expect(() => spec.onTimeout([{ bidId: 'bid-id-1' }])).not.to.throw();
    });
  });

  describe('spec properties', function () {
    it('should have correct bidder code', function () {
      expect(spec.code).to.equal('panxo');
    });

    it('should advertise banner, video and native media types', function () {
      expect(spec.supportedMediaTypes).to.include.members([BANNER, VIDEO, NATIVE]);
    });
  });
});

describe('PanxoBidAdapter LAB-02 independent QA', function () {
  let sandbox;
  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });
  afterEach(function () {
    sandbox.restore();
  });

  function videoRequest() {
    const [bidderRequest] = adapterManager.makeBidRequests([{
      code: 'lab02-video-only',
      mediaTypes: {
        video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2, 3] }
      },
      bids: [{ bidder: 'panxo', params: { propertyKey: 'lab02-synthetic' } }]
    }], Date.now(), 'lab02-video-auction', 1000);
    return { bidderRequest, requests: spec.buildRequests(bidderRequest.bids, bidderRequest) };
  }

  function bannerResponse(trackers = [], exp) {
    const original = {
      bidder: 'panxo',
      bidId: 'lab02-banner-bid',
      adUnitCode: 'lab02-banner',
      params: { propertyKey: 'lab02-synthetic' },
      mediaTypes: { banner: { sizes: [[300, 250]] } }
    };
    const bidderRequest = { bidderRequestId: 'lab02-request', auctionId: 'lab02-auction', bids: [original] };
    const [request] = spec.buildRequests([original], bidderRequest);
    return spec.interpretResponse({
      body: {
        id: 'lab02-request',
        cur: 'USD',
        seatbid: [{
          bid: [{
            id: 'lab02-response',
            impid: original.bidId,
            mtype: 1,
            price: 1,
            w: 300,
            h: 250,
            adm: '<div>synthetic</div>',
            burl: 'https://review.example.test/bill',
            exp,
            ext: { eventtrackers: trackers }
          }]
        }]
      }
    }, request);
  }

  it('should keep core-produced video-only bid.sizes from becoming Banner inventory', function () {
    const { bidderRequest, requests } = videoRequest();
    expect(bidderRequest.bids[0].sizes).to.deep.equal([[640, 360]]);
    expect(bidderRequest.bids[0].mediaTypes).to.not.have.property('banner');
    expect(requests[0].data.imp[0]).to.have.property('video');
    expect(requests[0].data.imp[0]).to.not.have.property('banner');
  });

  it('should accept an unambiguous video-only response without mtype after actual core request construction', function () {
    const { requests } = videoRequest();
    const [request] = requests;
    const bids = spec.interpretResponse({
      body: {
        id: request.data.id,
        cur: 'USD',
        seatbid: [{
          bid: [{
            id: 'lab02-video-response',
            impid: request.data.imp[0].id,
            price: 1,
            adm: '<VAST version="3.0"></VAST>'
          }]
        }]
      }
    }, request);
    expect(bids).to.have.lengthOf(1);
    expect(bids[0].mediaType).to.equal(VIDEO);
  });

  it('should preserve the legacy Banner sizes fallback when no mediaTypes are supplied', function () {
    const bid = {
      bidder: 'panxo',
      bidId: 'legacy-banner',
      adUnitCode: 'lab02-legacy',
      params: { propertyKey: 'lab02-synthetic' },
      sizes: [[300, 250]]
    };
    const [request] = spec.buildRequests([bid], { bidderRequestId: 'legacy-request', bids: [bid] });
    expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
  });

  it('should drop an invalid protocols array when a valid legacy protocol keeps Video usable', function () {
    const bid = {
      bidder: 'panxo',
      bidId: 'lab02-protocol',
      adUnitCode: 'lab02-video',
      params: { propertyKey: 'lab02-synthetic' },
      mediaTypes: { video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocol: 2, protocols: [-1, 'x'] } }
    };
    const [request] = spec.buildRequests([bid], { bidderRequestId: 'protocol-request', bids: [bid] });
    expect(request.data.imp[0].video.protocol).to.equal(2);
    expect(request.data.imp[0].video).to.not.have.property('protocols');
  });

  it('should reject non-numeric event and method values before they reach core event parsing', function () {
    const good = { event: 1, method: 1, url: 'https://review.example.test/bill' };
    const [bid] = bannerResponse([
      { event: 1, method: '__proto__', url: 'https://review.example.test/bad' },
      { event: '__proto__', method: 'lab02Tracker', url: 'https://review.example.test/bad' },
      { event: 1, method: 1, url: {} },
      { event: 0, method: 1, url: 'https://review.example.test/bad' },
      good
    ]);
    expect(bid.eventtrackers).to.deep.equal([good]);
  });

  it('should preserve billing through core when a response includes a malformed tracker', function () {
    const corePixel = sandbox.stub(utils, 'politeTriggerPixel');
    const adapterPixel = sandbox.stub(utils, 'triggerPixel');
    const [bid] = bannerResponse([
      { event: 1, method: '__proto__', url: 'https://review.example.test/bad' },
      { event: 1, method: 1, url: 'https://review.example.test/bill' }
    ]);
    bid.bidder = 'panxo';
    expect(() => adapterManager.triggerBilling(bid)).to.not.throw();
    expect(corePixel.calledOnceWithExactly('https://review.example.test/bill')).to.be.true;
    expect(adapterPixel.notCalled).to.be.true;
  });

  it('should preserve independent impression, viewable and win trackers', function () {
    const trackers = [
      { event: 1, method: 1, url: 'https://review.example.test/impression' },
      { event: 2, method: 2, url: 'https://review.example.test/viewable' },
      { event: 500, method: 1, url: 'https://review.example.test/win' }
    ];
    const [bid] = bannerResponse(trackers);
    expect(bid.eventtrackers).to.deep.equal(trackers);
    expect(bid.eventtrackers).to.not.equal(trackers);
  });

  describe('current floor transport precedence', function () {
    // Keep legacy fallback compatibility while migrating to standard floors.
    // Convert amounts separately; changing the response currency must not alter priority.
    const cases = [
      { name: 'absent parameter defaults to zero USD', expected: 0 },
      { name: 'explicit zero is retained', floor: 0, expected: 0 },
      { name: 'positive numeric parameter is retained', floor: 1.25, expected: 1.25 },
      { name: 'negative parameter falls back to zero', floor: -1, expected: 0 },
      { name: 'numeric string parameter falls back to zero', floor: '1.25', expected: 0 },
      { name: 'null parameter falls back to zero', floor: null, expected: 0 },
      { name: 'nonfinite parameter falls back to zero', floor: Infinity, expected: 0 },
      { name: 'NaN parameter falls back to zero', floor: NaN, expected: 0 },
      { name: 'standard USD floor is preserved', ortb2Imp: { bidfloor: 3, bidfloorcur: 'USD' }, expected: 3 },
      { name: 'standard floor wins over an explicit zero parameter', floor: 0, ortb2Imp: { bidfloor: 3, bidfloorcur: 'USD' }, expected: 3 },
      { name: 'standard floor wins over a positive parameter', floor: 1.25, ortb2Imp: { bidfloor: 3, bidfloorcur: 'USD' }, expected: 3 },
      { name: 'valid getFloor wins over the parameter', floor: 2, result: { floor: 1.5, currency: 'USD' }, expected: 1.5 },
      { name: 'zero getFloor wins over a positive parameter', floor: 2, result: { floor: 0, currency: 'USD' }, expected: 0 },
      { name: 'negative getFloor falls back to the parameter', floor: 2, result: { floor: -1, currency: 'USD' }, expected: 2 },
      { name: 'string getFloor falls back to the parameter', floor: 2, result: { floor: '1.5', currency: 'USD' }, expected: 2 },
      { name: 'unconvertible getFloor is not replaced by the legacy minimum', floor: 2, result: { floor: 1.5, currency: 'EUR' }, rejected: true },
      { name: 'getFloor error falls back to the parameter', floor: 2, throws: true, expected: 2 },
      { name: 'getFloor without currency uses the requested currency', floor: 2, result: { floor: 1.5 }, expected: 1.5 },
      { name: 'getFloor currency is normalized', floor: 2, result: { floor: 1.5, currency: ' usd ' }, expected: 1.5 },
      { name: 'legacy parameter stays in published USD despite a different ad-server currency', floor: 1.25, currency: 'eur', expected: 1.25, expectedCurrency: 'USD' },
      { name: 'getFloor receives USD despite an EUR ad-server currency', floor: 2, currency: 'eur', result: { floor: 1.5, currency: 'USD' }, expected: 1.5 },
      { name: 'standard floor currency is independent of the auction currency', floor: 1.25, currency: 'EUR', ortb2Imp: { bidfloor: 3, bidfloorcur: 'USD' }, expected: 3, expectedCurrency: 'USD' }
    ];

    cases.forEach(testCase => {
      it(testCase.name, function () {
        const params = { propertyKey: 'lab02-floor-synthetic' };
        if ('floor' in testCase) params.floor = testCase.floor;
        const bid = {
          bidder: 'panxo',
          bidId: 'lab02-floor-bid',
          adUnitCode: 'lab02-floor',
          params,
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          ortb2Imp: testCase.ortb2Imp
        };
        const floorCalls = [];
        if ('result' in testCase || testCase.throws) {
          bid.getFloor = request => {
            floorCalls.push(request);
            if (testCase.throws) throw new Error('synthetic floor error');
            return testCase.result;
          };
        }
        const bidderRequest = {
          bidderRequestId: 'lab02-floor-request',
          bids: [bid],
          ortb2: { ext: { prebid: { adServerCurrency: testCase.currency } } }
        };
        const before = JSON.stringify({ params, ortb2Imp: bid.ortb2Imp, ortb2: bidderRequest.ortb2 });
        const [request] = spec.buildRequests([bid], bidderRequest);
        const currency = testCase.expectedCurrency || 'USD';
        if (testCase.rejected) {
          expect(request).to.be.undefined;
        } else {
          expect(request.data.imp[0].bidfloor).to.equal(testCase.expected);
          expect(request.data.imp[0].bidfloorcur).to.equal(currency);
          expect(request.data.cur).to.deep.equal(['USD']);
        }
        expect(JSON.stringify({ params, ortb2Imp: bid.ortb2Imp, ortb2: bidderRequest.ortb2 })).to.equal(before);
        if (bid.getFloor) {
          expect(floorCalls).to.deep.equal([{ currency: 'USD', mediaType: BANNER, size: [300, 250] }]);
        }
      });
    });
  });
});

describe('Panxo USD transport with Prebid currency conversion', function () {
  let sandbox;
  beforeEach(function () {
    sandbox = sinon.createSandbox();
    setCurrencyConfig({});
  });
  afterEach(function () {
    sandbox.restore();
    setCurrencyConfig({});
  });

  function bid(id = 'currency-imp', changes = {}) {
    return {
      bidder: 'panxo',
      bidId: id,
      adUnitCode: id,
      params: { propertyKey: 'currency-test', floor: 2 },
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      ...changes
    };
  }

  function build(bids, currency = 'EUR') {
    const bidderRequest = {
      bidderRequestId: 'currency-request',
      bids,
      ortb2: { ext: { prebid: { adServerCurrency: currency } } }
    };
    const before = JSON.stringify({ bids, bidderRequest });
    const requests = spec.buildRequests(bids, bidderRequest);
    expect(JSON.stringify({ bids, bidderRequest })).to.equal(before);
    return requests;
  }

  it('accepts an ordinary USD response for a publisher configured to use EUR', function () {
    const getFloor = sandbox.stub().returns({ floor: 1, currency: 'USD' });
    const [request] = build([bid(undefined, { getFloor })]);
    expect(request.data.cur).to.deep.equal(['USD']);
    expect(request.data.imp[0]).to.include({ bidfloor: 1, bidfloorcur: 'USD' });
    expect(getFloor.calledOnceWithExactly({ currency: 'USD', mediaType: BANNER, size: [300, 250] })).to.be.true;
    const bids = spec.interpretResponse({
      body: {
        id: request.data.id,
        cur: 'USD',
        seatbid: [{ bid: [{ id: 'currency-response', impid: 'currency-imp', price: 2, adm: '<div>Ad</div>', w: 300, h: 250 }] }]
      }
    }, request);
    expect(bids).to.have.lengthOf(1);
    expect(bids[0]).to.include({ cpm: 2, currency: 'USD' });
    expect(spec.interpretResponse({
      body: {
        id: request.data.id,
        cur: 'EUR',
        seatbid: [{ bid: [{ id: 'wrong-currency', impid: 'currency-imp', price: 2, adm: '<div>Ad</div>', w: 300, h: 250 }] }]
      }
    }, request)).to.deep.equal([]);
  });

  ['static', 'getFloor'].forEach(source => {
    function floorBid(floor) {
      return bid(undefined, source === 'static'
        ? { ortb2Imp: { bidfloor: floor, bidfloorcur: 'EUR' } }
        : { getFloor: () => ({ floor, currency: 'EUR' }) });
    }

    it(`converts a ${source} EUR floor using the real Currency module`, function () {
      setCurrencyConfig({ adServerCurrency: 'EUR', rates: { EUR: { USD: 2 } } });
      const [request] = build([floorBid(1.5)]);
      expect(request.data.cur).to.deep.equal(['USD']);
      expect(request.data.imp[0]).to.include({ bidfloor: 3, bidfloorcur: 'USD' });
    });

    it(`rejects only the impression with an unconvertible positive ${source} floor`, function () {
      const warnings = sandbox.stub(utils, 'logWarn');
      const [request] = build([floorBid(1.5), bid('valid-usd', { ortb2Imp: { bidfloor: 0.5, bidfloorcur: 'USD' } })]);
      expect(request.data.imp.map(imp => imp.id)).to.deep.equal(['valid-usd']);
      expect(request.data.imp[0]).to.include({ bidfloor: 0.5, bidfloorcur: 'USD' });
      expect(warnings.called).to.be.true;
    });

    it(`normalizes a zero ${source} floor without requiring a currency rate`, function () {
      const [request] = build([floorBid(0)]);
      expect(request.data.imp[0]).to.include({ bidfloor: 0, bidfloorcur: 'USD' });
    });
  });

  it('rejects a missing rate even when the Currency module is installed', function () {
    setCurrencyConfig({ adServerCurrency: 'EUR', rates: { EUR: { GBP: 2 } } });
    expect(build([bid(undefined, { ortb2Imp: { bidfloor: 1.5, bidfloorcur: 'EUR' } })])).to.deep.equal([]);
  });

  [0, -1, '3', NaN, Infinity].forEach(converted => {
    it(`rejects invalid converted amount ${String(converted)} without restoring a legacy floor`, function () {
      setCurrencyConfig({ adServerCurrency: 'EUR', rates: { EUR: { USD: 2 } } });
      sandbox.stub(getGlobal(), 'convertCurrency').returns(converted);
      expect(build([bid(undefined, { getFloor: () => ({ floor: 1.5, currency: 'EUR' }) })])).to.deep.equal([]);
    });
  });

  it('converts multiformat floors before choosing the largest minimum', function () {
    setCurrencyConfig({ adServerCurrency: 'EUR', rates: { EUR: { USD: 2 } } });
    const [request] = build([bid(undefined, {
      mediaTypes: {
        banner: { sizes: [[300, 250]] },
        video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [3] }
      },
      getFloor: ({ mediaType }) => mediaType === BANNER
        ? { floor: 2, currency: 'USD' }
        : { floor: 1.5, currency: 'EUR' }
    })]);
    expect(request.data.imp[0]).to.include({ bidfloor: 3, bidfloorcur: 'USD' });
  });

  it('converts deal floors without mutating the original deals or private auction', function () {
    setCurrencyConfig({ adServerCurrency: 'EUR', rates: { EUR: { USD: 2 } } });
    const pmp = {
      private_auction: 1,
      deals: [
        { id: 'eur-deal', bidfloor: 1.5, bidfloorcur: 'EUR', at: 1 },
        { id: 'zero-deal', bidfloor: 0, bidfloorcur: 'GBP' },
        { id: 'usd-deal', bidfloor: 0.75 },
        { id: 'no-floor' }
      ]
    };
    const [request] = build([bid(undefined, { ortb2Imp: { pmp } })]);
    expect(request.data.imp[0].pmp).to.deep.equal({
      private_auction: 1,
      deals: [
        { id: 'eur-deal', bidfloor: 3, bidfloorcur: 'USD', at: 1 },
        { id: 'zero-deal', bidfloor: 0, bidfloorcur: 'USD' },
        { id: 'usd-deal', bidfloor: 0.75, bidfloorcur: 'USD' },
        { id: 'no-floor' }
      ]
    });
    expect(request.data.imp[0].pmp).to.not.equal(pmp);
    expect(request.data.imp[0].pmp.deals[0]).to.not.equal(pmp.deals[0]);
  });

  [
    { bidfloor: 1.5, bidfloorcur: 'EUR' },
    { bidfloor: -1, bidfloorcur: 'USD' },
    { bidfloor: Infinity, bidfloorcur: 'USD' },
    { bidfloor: NaN, bidfloorcur: 'USD' },
    { bidfloor: '1.5', bidfloorcur: 'USD' },
    { bidfloor: 1.5, bidfloorcur: 'US1' }
  ].forEach((floor, index) => {
    it(`rejects the impression instead of removing an unsafe deal floor (${index})`, function () {
      const pmp = { private_auction: 1, deals: [{ id: 'unsafe-deal', ...floor }] };
      const [request] = build([bid(undefined, { ortb2Imp: { pmp } }), bid('valid-usd')]);
      expect(request.data.imp.map(imp => imp.id)).to.deep.equal(['valid-usd']);
      expect(request.data.imp[0]).to.include({ bidfloor: 2, bidfloorcur: 'USD' });
    });
  });
});
