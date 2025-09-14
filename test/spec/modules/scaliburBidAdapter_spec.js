import {expect} from 'chai';
import {spec, getFirstPartyData, storage} from 'modules/scaliburBidAdapter.js';

describe('Scalibur Adapter', function () {
  const BID = {
    'bidId': 'ec675add-d1d2-4bdd',
    'adUnitCode': '63540ad1df6f42d168cba59dh5884270560',
    'bidderRequestId': '12a8ae9ada9c13',
    'transactionId': '56e184c6-bde9-497b-b9b9-cf47a61381ee',
    'bidRequestsCount': 4,
    'bidderRequestsCount': 3,
    'bidderWinsCount': 1,
    'params': {
      "placementId": "test-scl-placement",
      "adUnitCode": "123",
      "gpid": "/1234/5678/homepage",
    },
    'mediaTypes': {
      'video': {
        'context': 'instream',
        "playerSize": [[300, 169]],
        "mimes": [
          "video/mp4",
          "application/javascript",
          "video/webm"
        ],
        "protocols": [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 16],
        "api": [1, 2, 7, 8, 9],
        'maxduration': 30,
        'minduration': 15,
        'startdelay': 0,
        'linearity': 1,
        'placement': 1,
        "skip": 1,
        "skipafter": 5,
      },
      'banner': {
        'sizes': [[300, 250], [728, 90]],
      },
    },
    "ortb2Imp": {
      "ext": {
        "gpid": '/1234/5678/homepage',
      },
    },
  };

  const BIDDER_REQUEST = {
    auctionId: 'auction-45678',
    refererInfo: {
      page: 'https://example-publisher.com',
      domain: 'example-publisher.com',
    },
    gdprConsent: {
      gdprApplies: true,
      consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    },
    uspConsent: '1---',
    ortb2: {
      site: {
        pagecat: ['IAB1-1', 'IAB3-2'],
        ref: 'https://example-referrer.com',
      },
      user: {
        data: [{name: 'segments', segment: ['sports', 'entertainment']}],
      },
      regs: {
        ext: {
          gpc: '1',
        },
      },
    },
    timeout: 3000,
  };

  const DEFAULTS_BID = {
    'bidId': 'ec675add-f23d-4bdd',
    'adUnitCode': '63540ad1df6f42d168cba59dh5884270560',
    'bidderRequestId': '12a8ae9ada9c13',
    'transactionId': '56e184c6-bde9-497b-b9b9-cf47a61381ee',
    'bidRequestsCount': 4,
    'bidderRequestsCount': 3,
    'bidderWinsCount': 1,
    'params': {
      "placementId": "test-scl-placement",
      "adUnitCode": "123",
      "gpid": "/1234/5678/homepage",
    },
    'mediaTypes': {
      'video': {
        'context': 'instream',
        'minduration': 15,
        'startdelay': 0,
      },
      'banner': {
        'sizes': [[300, 250], [728, 90]],
      },
    },
    "ortb2Imp": {
      "ext": {
        "gpid": '/1234/5678/homepage',
      },
    },
  };

  const DEFAULTS_BIDDER_REQUEST = {
    auctionId: 'auction-45633',
    refererInfo: {
      page: 'https://example-publisher.com',
      domain: 'example-publisher.com',
    },
    timeout: 3000,
  };

  describe('isBidRequestValid', function () {
    it('should return true for valid bid params', function () {
      expect(spec.isBidRequestValid(BID)).to.equal(true);
    });

    it('should return false for missing placementId', function () {
      const invalidBid = {...BID, params: {}};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should build a valid OpenRTB request', function () {
      const request = spec.buildRequests([BID], BIDDER_REQUEST);
      const payload = request.data;

      expect(payload.id).to.equal('auction-45678');
      expect(payload.imp).to.have.length(1);

      const imp = payload.imp[0];
      expect(imp.id).to.equal('ec675add-d1d2-4bdd');
      expect(imp.ext.placementId).to.equal('test-scl-placement');
      expect(imp.ext.gpid).to.equal('/1234/5678/homepage');
      expect(imp.banner.format).to.deep.equal([
        {w: 300, h: 250},
        {w: 728, h: 90},
      ]);

      const video = imp.video;
      expect(video).to.exist;
      expect(video.mimes).to.include('video/mp4');
      expect(video.w).to.equal(300);
      expect(video.h).to.equal(169);
      expect(video.placement).to.equal(1);
      expect(video.plcmt).to.equal(1);
      expect(video.api).to.include(7);
      expect(payload.regs.ext.gpc).to.equal('1');
    });
  });

  describe('buildRequests', function () {
    it('should build a valid OpenRTB request with default values', function () {
      const request = spec.buildRequests([DEFAULTS_BID], DEFAULTS_BIDDER_REQUEST);
      const payload = request.data;

      expect(payload.id).to.equal('auction-45633');
      expect(payload.imp).to.have.length(1);

      const imp = payload.imp[0];
      expect(imp.id).to.equal('ec675add-f23d-4bdd');
      expect(imp.ext.placementId).to.equal('test-scl-placement');
      expect(imp.ext.gpid).to.equal('/1234/5678/homepage');
      expect(imp.banner.format).to.deep.equal([
        {w: 300, h: 250},
        {w: 728, h: 90},
      ]);

      const video = imp.video;
      expect(video).to.exist;
      expect(video.mimes).to.deep.equal(['video/mp4']);
      expect(video.maxduration).to.equal(180);
      expect(video.w).to.equal(640);
      expect(video.h).to.equal(480);
      expect(video.placement).to.equal(1);
      expect(video.skip).to.equal(0);
      expect(video.skipafter).to.equal(5);
      expect(video.api).to.deep.equal([1, 2]);
      expect(video.linearity).to.equal(1);
      expect(payload.site.ref).to.equal('');
      expect(payload.site.pagecat).to.deep.equal([]);
      expect(payload.user.consent).to.equal('');
      expect(payload.user.data).to.deep.equal([]);
      expect(payload.regs.gdpr).to.equal(0);
      expect(payload.regs.us_privacy).to.equal('');
      expect(payload.regs.ext.gpc).to.equal('');
    });
  });

  describe('interpretResponse', function () {
    it('should interpret server response correctly', function () {
      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: '1',
                  cpm: 2.5,
                  width: 300,
                  height: 250,
                  crid: 'creative-23456',
                  adm: '<div>Sample Ad Markup</div>',
                  cur: 'USD',
                },
              ],
            },
          ],
        },
      };
      const request = spec.buildRequests([BID], BIDDER_REQUEST);
      const bidResponses = spec.interpretResponse(serverResponse, request);

      expect(bidResponses).to.have.length(1);

      const response = bidResponses[0];
      expect(response.requestId).to.equal('1');
      expect(response.cpm).to.equal(2.5);
      expect(response.width).to.equal(300);
      expect(response.height).to.equal(250);
      expect(response.creativeId).to.equal('creative-23456');
      expect(response.currency).to.equal('USD');
      expect(response.netRevenue).to.equal(true);
      expect(response.ttl).to.equal(300);
    });
  });

  describe('getUserSyncs', function () {
    it('should return iframe and pixel sync URLs with correct params', function () {
      const syncOptions = {iframeEnabled: true, pixelEnabled: true};
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
      };
      const uspConsent = '1---';

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent);

      expect(syncs).to.have.length(2);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA');
      expect(syncs[0].url).to.include('us_privacy=1---');
      expect(syncs[1].type).to.equal('image');
    });
  });

  describe('getScaliburFirstPartyData', function () {
    let sandbox;
    let storageStub;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      storageStub = {
        hasLocalStorage: sandbox.stub(),
        getDataFromLocalStorage: sandbox.stub()
      };

      // Replace storage methods
      sandbox.stub(storage, 'hasLocalStorage').callsFake(storageStub.hasLocalStorage);
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(storageStub.getDataFromLocalStorage);
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should return undefined when localStorage is not available', function () {
      storageStub.hasLocalStorage.returns(false);

      const result = getFirstPartyData();

      expect(result).to.be.undefined;
      expect(storageStub.getDataFromLocalStorage.called).to.be.false;
    });

    it('should return existing first party data when available', function () {
      const existingData = {
        pcid: 'existing-uuid-1234-5678-abcd-ef1234567890',
        pcidDate: 1640995200000
      };

      storageStub.hasLocalStorage.returns(true);
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(existingData));

      const result = getFirstPartyData();

      // Should use existing data
      expect(result.pcid).to.equal(existingData.pcid);
      expect(result.pcidDate).to.equal(existingData.pcidDate);
    });
  });

  describe('buildRequests with first party data', function () {
    let sandbox;
    let storageStub;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      storageStub = {
        hasLocalStorage: sandbox.stub(),
        getDataFromLocalStorage: sandbox.stub(),
      };

      sandbox.stub(storage, 'hasLocalStorage').callsFake(storageStub.hasLocalStorage);
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(storageStub.getDataFromLocalStorage);
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should include first party data in buildRequests when available', function () {
      const testData = {
        pcid: 'test-uuid-1234-5678-abcd-ef1234567890',
        pcidDate: 1640995200000
      };

      storageStub.hasLocalStorage.returns(true);
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(testData));

      const request = spec.buildRequests([DEFAULTS_BID], DEFAULTS_BIDDER_REQUEST);

      expect(request.data.ext.pcid).to.equal(testData.pcid);
      expect(request.data.ext.pcidDate).to.equal(testData.pcidDate);
    });

    it('should not include first party data when localStorage is unavailable', function () {
      storageStub.hasLocalStorage.returns(false);

      const request = spec.buildRequests([DEFAULTS_BID], DEFAULTS_BIDDER_REQUEST);

      expect(request.data.ext.pcid).to.be.undefined;
      expect(request.data.ext.pcidDate).to.be.undefined;
    });
  });
});
