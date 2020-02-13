import { expect } from 'chai';
import { spec, tryGetPubtag, hasCCPAConsent } from 'modules/nextrollBidAdapter';
import * as utils from 'src/utils';

const PUBTAG_LOCAL_STORAGE_KEY = 'nextroll_fast_bid';
const PUBTAG_DATE_SUFFIX = '_set_date'

describe('nextrollBidAdapter', function() {
  let utilsMock;
  beforeEach(function () {
    // Remove to avoid side effects
    localStorage.removeItem(PUBTAG_LOCAL_STORAGE_KEY);
    localStorage.removeItem(PUBTAG_LOCAL_STORAGE_KEY + PUBTAG_DATE_SUFFIX);
    utilsMock = sinon.mock(utils);
  });

  afterEach(function() {
    global.NextRoll = undefined;
    utilsMock.restore();
  });

  let validBid = {
    bidder: 'nextroll',
    adUnitCode: 'adunit-code',
    bidId: 'bid_id',
    sizes: [[300, 200]],
    params: {
      bidfloor: 1,
      zoneId: 'zone1',
      publisherId: 'publisher_id'
    }
  };
  let bidWithoutValidId = { id: '' };
  let bidWithoutId = { params: { zoneId: 'zone1' } };

  describe('isBidRequestValid', function() {
    it('validates the bids correctly when the bid has an id', function() {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('validates the bids correcly when the bid does not have an id', function() {
      expect(spec.isBidRequestValid(bidWithoutValidId)).to.be.false;
      expect(spec.isBidRequestValid(bidWithoutId)).to.be.false;
    });
  });

  describe('buildRequests', function() {
    it('builds the same amount of requests as valid requests it takes', function() {
      expect(spec.buildRequests([validBid, validBid], {})).to.be.lengthOf(2);
    });

    it('doest not build a request when there is no valid requests', function () {
      expect(spec.buildRequests([], {})).to.be.lengthOf(0);
    });

    it('builds a request with POST method', function () {
      expect(spec.buildRequests([validBid], {})[0].method).to.equal('POST');
    });

    it('builds a request with cookies method', function () {
      expect(spec.buildRequests([validBid], {})[0].options.withCredentials).to.be.true;
    });

    it('builds a request with id, url and imp object', function () {
      const request = spec.buildRequests([validBid], {})[0];
      expect(request.data.id).to.be.an('string').that.is.not.empty;
      expect(request.url).to.equal('https://d.adroll.com/bid/prebid/');
      expect(request.data.imp).to.exist.and.to.be.a('object');
    });

    it('builds a request with site and device information', function () {
      const request = spec.buildRequests([validBid], {})[0];

      expect(request.data.site).to.exist.and.to.be.a('object');
      expect(request.data.device).to.exist.and.to.be.a('object');
    });

    it('builds a request with a complete imp object', function () {
      const request = spec.buildRequests([validBid], {})[0];

      expect(request.data.imp.id).to.equal('bid_id');
      expect(request.data.imp.bidfloor).to.be.equal(1);
      expect(request.data.imp.banner).to.exist.and.to.be.a('object');
      expect(request.data.imp.ext.zone.id).to.be.equal('zone1');
    });

    it('includes the sizes into the request correctly', function () {
      const bannerObject = spec.buildRequests([validBid], {})[0].data.imp.banner;

      expect(bannerObject.format).to.exist;
      expect(bannerObject.format).to.be.lengthOf(1);
      expect(bannerObject.format[0].w).to.be.equal(300);
      expect(bannerObject.format[0].h).to.be.equal(200);
    });
  });

  describe('interpretResponse', function () {
    let responseBody = {
      id: 'bidresponse_id',
      dealId: 'deal_id',
      seatbid: [
        {
          bid: [
            {
              price: 1.2,
              w: 300,
              h: 200,
              crid: 'crid1',
              adm: 'adm1'
            }
          ]
        },
        {
          bid: [
            {
              price: 2.1,
              w: 250,
              h: 300,
              crid: 'crid2',
              adm: 'adm2'
            }
          ]
        }
      ]
    };

    it('returns an empty list when there is no response body', function () {
      expect(spec.interpretResponse({}, {})).to.be.eql([]);
    });

    it('builds the same amount of responses as server responses it receives', function () {
      expect(spec.interpretResponse({body: responseBody}, {})).to.be.lengthOf(2);
    });

    it('builds a response with the expected fields', function () {
      const response = spec.interpretResponse({body: responseBody}, {})[0];

      expect(response.requestId).to.be.equal('bidresponse_id');
      expect(response.cpm).to.be.equal(1.2);
      expect(response.width).to.be.equal(300);
      expect(response.height).to.be.equal(200);
      expect(response.creativeId).to.be.equal('crid1');
      expect(response.dealId).to.be.equal('deal_id');
      expect(response.currency).to.be.equal('USD');
      expect(response.netRevenue).to.be.equal(true);
      expect(response.ttl).to.be.equal(300);
      expect(response.ad).to.be.equal('adm1');
    });
  });

  describe('getUserSyncs', function () {
    it('returns an empty list', function () {
      expect(spec.getUserSyncs({}, {})).to.be.eql([]);
    })
  });

  describe('tryGetNextrollPubtag', function () {
    const VALID_HASH = 'BPsAzXFFR0bBpo7mqjangJss12ENYlAKM9kUI5mZwJIRtcL2x6vLfwpz1pjdoyTE9FbGNrVl3iMiMmObgkuqagrzkIyoJoyG+/WGd0Pd0sqtPY43pxpgvTnI1JXFLgdUMgLwICrDCqmA6J63oWJgwTb0906AiraSm9cy89PCZ1U=';
    const INVALID_HASH = 'invalid';
    const VALID_PUBLISHER_TAG = 'var NextRoll="test value"';
    const INVALID_PUBLISHER_TAG = 'test invalid';

    it('should verify valid hash with valid publisher tag', function () {
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY, '// Hash: ' + VALID_HASH + '\n' + VALID_PUBLISHER_TAG);
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY + PUBTAG_DATE_SUFFIX, new Date().getTime())

      utilsMock.expects('logInfo').withExactArgs('Using NextRoll Pubtag').once();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Pubtag').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid NextRoll Pubtag found').never();
      utilsMock.expects('insertElement').once();

      tryGetPubtag();

      expect(localStorage.getItem(PUBTAG_LOCAL_STORAGE_KEY)).to.equals('// Hash: ' + VALID_HASH + '\n' + VALID_PUBLISHER_TAG);
      utilsMock.verify();
    });

    it('should verify valid hash with invalid pubtag', function () {
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY, '// Hash: ' + VALID_HASH + '\n' + INVALID_PUBLISHER_TAG);
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY + PUBTAG_DATE_SUFFIX, new Date().getTime())

      utilsMock.expects('logInfo').withExactArgs('Using NextRoll Pubtag').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Pubtag').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid NextRoll Pubtag found').once();

      tryGetPubtag();

      expect(localStorage.getItem(PUBTAG_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify invalid hash with valid pubtag', function () {
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY, '// Hash: ' + INVALID_HASH + '\n' + VALID_PUBLISHER_TAG);
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY + PUBTAG_DATE_SUFFIX, new Date().getTime())

      utilsMock.expects('logInfo').withExactArgs('Using NextRoll Pubtag').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Pubtag').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid NextRoll Pubtag found').once();

      tryGetPubtag();

      expect(localStorage.getItem(PUBTAG_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify missing hash', function () {
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY, VALID_PUBLISHER_TAG);
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY + PUBTAG_DATE_SUFFIX, new Date().getTime())

      utilsMock.expects('logInfo').withExactArgs('Using NextRoll Pubtag').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Pubtag').once();
      utilsMock.expects('logWarn').withExactArgs('Invalid NextRoll Pubtag found').never();

      tryGetPubtag();

      expect(localStorage.getItem(PUBTAG_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify pubtag age', function () {
      let scriptAge = new Date().getTime() - 345600000; // 4 days old
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY, VALID_PUBLISHER_TAG);
      localStorage.setItem(PUBTAG_LOCAL_STORAGE_KEY + PUBTAG_DATE_SUFFIX, scriptAge);

      utilsMock.expects('logInfo').withExactArgs('Using NextRoll Pubtag').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Pubtag').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid NextRoll Pubtag found').never();

      tryGetPubtag();

      expect(localStorage.getItem(PUBTAG_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });
  });

  describe('hasCCPAConsent', function() {
    function ccpaRequest(consentString) {
      return {
        bidderCode: 'bidderX',
        auctionId: 'e3a336ad-2222-4a1c-bbbb-ecc7c5554a34',
        uspConsent: consentString
      };
    }

    const noNoticeCases = ['1NYY', '1NNN', '1N--'];
    noNoticeCases.forEach((ccpaString, index) => {
      it(`No notice should indicate no consent (case ${index})`, function () {
        const req = ccpaRequest(ccpaString);
        expect(hasCCPAConsent(req)).to.be.false;
      });
    });

    const noConsentCases = ['1YYY', '1YYN', '1YY-'];
    noConsentCases.forEach((ccpaString, index) => {
      it(`Opt-Out should indicate no consent (case ${index})`, function () {
        const req = ccpaRequest(ccpaString);
        expect(hasCCPAConsent(req)).to.be.false;
      });
    });

    const consentCases = [undefined, '1YNY', '1YN-', '1Y--', '1---'];
    consentCases.forEach((ccpaString, index) => {
      it(`should indicate consent (case ${index})`, function() {
        const req = ccpaRequest(ccpaString);
        expect(hasCCPAConsent(req)).to.be.true;
      })
    });

    it('builds a request with no credentials', function () {
      const noConsent = ccpaRequest('1YYY');
      expect(spec.buildRequests([validBid], noConsent)[0].options.withCredentials).to.be.false;
    });
  });
});
