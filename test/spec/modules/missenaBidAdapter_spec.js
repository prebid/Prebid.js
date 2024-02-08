import { expect } from 'chai';
import { spec, storage } from 'modules/missenaBidAdapter.js';
import { BANNER } from '../../../src/mediaTypes.js';

const REFERRER = 'https://referer';
const REFERRER2 = 'https://referer2';
const COOKIE_DEPRECATION_LABEL = 'test';

describe('Missena Adapter', function () {
  $$PREBID_GLOBAL$$.bidderSettings = {
    missena: {
      storageAllowed: true,
    },
  };

  const bidId = 'abc';
  const bid = {
    bidder: 'missena',
    bidId: bidId,
    sizes: [[1, 1]],
    mediaTypes: { banner: { sizes: [[1, 1]] } },
    ortb2: {
      device: {
        ext: { cdep: COOKIE_DEPRECATION_LABEL },
      },
    },
    params: {
      apiKey: 'PA-34745704',
      placement: 'sticky',
      formats: ['sticky-banner'],
    },
    getFloor: (inputParams) => {
      if (inputParams.mediaType === BANNER) {
        return {
          currency: 'EUR',
          floor: 3.5,
        };
      } else {
        return {};
      }
    },
  };
  const bidWithoutFloor = {
    bidder: 'missena',
    bidId: bidId,
    sizes: [[1, 1]],
    mediaTypes: { banner: { sizes: [[1, 1]] } },
    params: {
      apiKey: 'PA-34745704',
      placement: 'sticky',
      formats: ['sticky-banner'],
    },
  };
  const consentString = 'AAAAAAAAA==';

  const bidderRequest = {
    gdprConsent: {
      consentString: consentString,
      gdprApplies: true,
    },
    refererInfo: {
      topmostLocation: REFERRER,
      canonicalUrl: 'https://canonical',
    },
  };

  const bids = [bid, bidWithoutFloor];
  describe('codes', function () {
    it('should return a bidder code of missena', function () {
      expect(spec.code).to.equal('missena');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true if the apiKey param is present', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false if the apiKey is missing', function () {
      expect(
        spec.isBidRequestValid(Object.assign(bid, { params: {} })),
      ).to.equal(false);
    });

    it('should return false if the apiKey is an empty string', function () {
      expect(
        spec.isBidRequestValid(Object.assign(bid, { params: { apiKey: '' } })),
      ).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let getDataFromLocalStorageStub = sinon.stub(
      storage,
      'getDataFromLocalStorage',
    );

    const requests = spec.buildRequests(bids, bidderRequest);
    const request = requests[0];
    const payload = JSON.parse(request.data);
    const payloadNoFloor = JSON.parse(requests[1].data);

    it('should return as many server requests as bidder requests', function () {
      expect(requests.length).to.equal(2);
    });

    it('should have a post method', function () {
      expect(request.method).to.equal('POST');
    });

    it('should send the bidder id', function () {
      expect(payload.request_id).to.equal(bidId);
    });

    it('should send placement', function () {
      expect(payload.placement).to.equal('sticky');
    });

    it('should send formats', function () {
      expect(payload.formats).to.eql(['sticky-banner']);
    });

    it('should send referer information to the request', function () {
      expect(payload.referer).to.equal(REFERRER);
      expect(payload.referer_canonical).to.equal('https://canonical');
    });

    it('should send gdpr consent information to the request', function () {
      expect(payload.consent_string).to.equal(consentString);
      expect(payload.consent_required).to.equal(true);
    });
    it('should send floor data', function () {
      expect(payload.floor).to.equal(3.5);
      expect(payload.floor_currency).to.equal('EUR');
    });
    it('should not send floor data if not available', function () {
      expect(payloadNoFloor.floor).to.equal(undefined);
      expect(payloadNoFloor.floor_currency).to.equal(undefined);
    });
    it('should send the idempotency key', function () {
      expect(window.msna_ik).to.not.equal(undefined);
      expect(payload.ik).to.equal(window.msna_ik);
    });

    getDataFromLocalStorageStub.restore();
    getDataFromLocalStorageStub = sinon.stub(
      storage,
      'getDataFromLocalStorage',
    );
    const localStorageData = {
      [`missena.missena.capper.remove-bubble.${bid.params.apiKey}`]:
        JSON.stringify({
          expiry: new Date().getTime() + 600_000, // 10 min into the future
        }),
    };
    getDataFromLocalStorageStub.callsFake((key) => localStorageData[key]);
    const cappedRequests = spec.buildRequests(bids, bidderRequest);

    it('should not participate if capped', function () {
      expect(cappedRequests.length).to.equal(0);
    });

    const localStorageDataSamePage = {
      [`missena.missena.capper.remove-bubble.${bid.params.apiKey}`]:
        JSON.stringify({
          expiry: new Date().getTime() + 600_000, // 10 min into the future
          referer: REFERRER,
        }),
    };

    getDataFromLocalStorageStub.callsFake(
      (key) => localStorageDataSamePage[key],
    );
    const cappedRequestsSamePage = spec.buildRequests(bids, bidderRequest);

    it('should not participate if capped on same page', function () {
      expect(cappedRequestsSamePage.length).to.equal(0);
    });

    const localStorageDataOtherPage = {
      [`missena.missena.capper.remove-bubble.${bid.params.apiKey}`]:
        JSON.stringify({
          expiry: new Date().getTime() + 600_000, // 10 min into the future
          referer: REFERRER2,
        }),
    };

    getDataFromLocalStorageStub.callsFake(
      (key) => localStorageDataOtherPage[key],
    );
    const cappedRequestsOtherPage = spec.buildRequests(bids, bidderRequest);

    it('should participate if capped on a different page', function () {
      expect(cappedRequestsOtherPage.length).to.equal(2);
    });

    it('should send the prebid version', function () {
      expect(payload.version).to.equal('$prebid.version$');
    });

    it('should send cookie deprecation', function () {
      expect(payload.cdep).to.equal(COOKIE_DEPRECATION_LABEL);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      requestId: bidId,
      cpm: 0.5,
      currency: 'USD',
      ad: '<!-- -->',
      meta: {
        advertiserDomains: ['missena.com'],
      },
    };

    const serverTimeoutResponse = {
      requestId: bidId,
      timeout: true,
      ad: '<!-- -->',
    };

    const serverEmptyAdResponse = {
      requestId: bidId,
      cpm: 0.5,
      currency: 'USD',
      ad: '',
    };

    it('should return a proper bid response', function () {
      const result = spec.interpretResponse({ body: serverResponse }, bid);

      expect(result.length).to.equal(1);

      expect(Object.keys(result[0])).to.have.members(
        Object.keys(serverResponse),
      );
    });

    it('should return an empty response when the server answers with a timeout', function () {
      const result = spec.interpretResponse(
        { body: serverTimeoutResponse },
        bid,
      );
      expect(result).to.deep.equal([]);
    });

    it('should return an empty response when the server answers with an empty ad', function () {
      const result = spec.interpretResponse(
        { body: serverEmptyAdResponse },
        bid,
      );
      expect(result).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    const syncFrameUrl = 'https://sync.missena.io/iframe';
    const consentString = 'sampleString';
    const iframeEnabledOptions = {
      iframeEnabled: true,
    };
    const iframeDisabledOptions = {
      iframeEnabled: false,
    };

    it('should return userSync when iframeEnabled', function () {
      const userSync = spec.getUserSyncs(iframeEnabledOptions, []);

      expect(userSync.length).to.be.equal(1);
      expect(userSync[0].type).to.be.equal('iframe');
      expect(userSync[0].url).to.be.equal(syncFrameUrl);
    });

    it('should return empty array when iframeEnabled is false', function () {
      const userSync = spec.getUserSyncs(iframeDisabledOptions, []);
      expect(userSync.length).to.be.equal(0);
    });

    it('sync frame url should contain gdpr data when present', function () {
      const userSync = spec.getUserSyncs(iframeEnabledOptions, [], {
        gdprApplies: true,
        consentString,
      });
      const expectedUrl = `${syncFrameUrl}?gdpr=1&gdpr_consent=${consentString}`;
      expect(userSync.length).to.be.equal(1);
      expect(userSync[0].type).to.be.equal('iframe');
      expect(userSync[0].url).to.be.equal(expectedUrl);
    });
    it('sync frame url should contain gdpr data when present (gdprApplies false)', function () {
      const userSync = spec.getUserSyncs(iframeEnabledOptions, [], {
        gdprApplies: false,
        consentString,
      });
      const expectedUrl = `${syncFrameUrl}?gdpr=0&gdpr_consent=${consentString}`;
      expect(userSync.length).to.be.equal(1);
      expect(userSync[0].type).to.be.equal('iframe');
      expect(userSync[0].url).to.be.equal(expectedUrl);
    });
  });
});
