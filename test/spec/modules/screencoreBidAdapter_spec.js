import { expect } from 'chai';
import { createDomain, spec as adapter } from 'modules/screencoreBidAdapter.js';
import { config } from 'src/config.js';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';
import sinon from 'sinon';

const BID = {
  bidId: '2d52001cabd527',
  bidder: 'screencore',
  adUnitCode: 'div-gpt-ad-12345-0',
  transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
  params: {
    placementId: 'testPlacement',
    endpointId: 'testEndpoint'
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]]
    }
  },
  ortb2Imp: {
    ext: {
      gpid: '0123456789',
      tid: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf'
    }
  }
};

const VIDEO_BID = {
  bidId: '2d52001cabd528',
  bidder: 'screencore',
  adUnitCode: 'video-ad-unit',
  transactionId: '56e184c6-bde9-497b-b9b9-cf47a61381ee',
  params: {
    placementId: 'testVideoPlacement',
    endpointId: 'testVideoEndpoint'
  },
  mediaTypes: {
    video: {
      playerSize: [[545, 307]],
      context: 'instream',
      mimes: ['video/mp4', 'application/javascript'],
      protocols: [2, 3, 5, 6],
      maxduration: 60,
      minduration: 0,
      startdelay: 0,
      linearity: 1,
      api: [2],
      placement: 1
    }
  },
  ortb2Imp: {
    ext: {
      tid: '56e184c6-bde9-497b-b9b9-cf47a61381ee'
    }
  }
};

const NATIVE_BID = {
  bidId: '2d52001cabd529',
  bidder: 'screencore',
  adUnitCode: 'native-ad-unit',
  transactionId: '77e184c6-bde9-497b-b9b9-cf47a61381ee',
  params: {
    placementId: 'testNativePlacement'
  },
  mediaTypes: {
    native: {
      title: { required: true },
      image: { required: true },
      sponsoredBy: { required: false }
    }
  }
};

const BIDDER_REQUEST = {
  refererInfo: {
    page: 'https://www.example.com',
    ref: 'https://www.referrer.com'
  },
  ortb2: {
    device: {
      w: 1920,
      h: 1080,
      language: 'en'
    }
  }
};

const SERVER_RESPONSE = {
  body: [{
    requestId: '2d52001cabd527',
    cpm: 0.8,
    creativeId: '12610997325162499419',
    ttl: 30,
    currency: 'USD',
    width: 300,
    height: 250,
    mediaType: 'banner',
    ad: '<iframe>console.log("hello world")</iframe>',
    adomain: ['securepubads.g.doubleclick.net']
  }]
};

const VIDEO_SERVER_RESPONSE = {
  body: [{
    requestId: '2d52001cabd528',
    cpm: 2,
    creativeId: '12610997325162499419',
    ttl: 60,
    currency: 'USD',
    width: 545,
    height: 307,
    mediaType: 'video',
    vastXml: '<VAST version="3.0"></VAST>',
    adomain: ['screencore.io']
  }]
};

const REQUEST = {
  data: {
    placements: [{
      bidId: '2d52001cabd527',
      adFormat: 'banner',
      sizes: [[300, 250], [300, 600]]
    }]
  }
};

describe('screencore bid adapter', function () {
  before(() => config.resetConfig());
  after(() => config.resetConfig());

  describe('validate spec', function () {
    it('should have isBidRequestValid as a function', function () {
      expect(adapter.isBidRequestValid).to.exist.and.to.be.a('function');
    });

    it('should have buildRequests as a function', function () {
      expect(adapter.buildRequests).to.exist.and.to.be.a('function');
    });

    it('should have interpretResponse as a function', function () {
      expect(adapter.interpretResponse).to.exist.and.to.be.a('function');
    });

    it('should have getUserSyncs as a function', function () {
      expect(adapter.getUserSyncs).to.exist.and.to.be.a('function');
    });

    it('should have code as a string', function () {
      expect(adapter.code).to.exist.and.to.be.a('string');
      expect(adapter.code).to.equal('screencore');
    });

    it('should have supportedMediaTypes with BANNER, VIDEO, NATIVE', function () {
      expect(adapter.supportedMediaTypes).to.exist.and.to.be.an('array').with.length(3);
      expect(adapter.supportedMediaTypes).to.contain.members([BANNER, VIDEO, NATIVE]);
    });

    it('should have gvlid', function () {
      expect(adapter.gvlid).to.exist.and.to.equal(1473);
    });

    it('should have version', function () {
      expect(adapter.version).to.exist.and.to.equal('1.0.0');
    });
  });

  describe('validate bid requests', function () {
    it('should return false when placementId and endpointId are missing', function () {
      const isValid = adapter.isBidRequestValid({
        bidId: '123',
        params: {},
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      });
      expect(isValid).to.be.false;
    });

    it('should return false when mediaTypes is missing', function () {
      const isValid = adapter.isBidRequestValid({
        bidId: '123',
        params: { placementId: 'test' }
      });
      expect(isValid).to.be.false;
    });

    it('should return true when placementId is present with banner mediaType', function () {
      const isValid = adapter.isBidRequestValid({
        bidId: '123',
        params: { placementId: 'test' },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      });
      expect(isValid).to.be.true;
    });

    it('should return true when endpointId is present with banner mediaType', function () {
      const isValid = adapter.isBidRequestValid({
        bidId: '123',
        params: { endpointId: 'test' },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      });
      expect(isValid).to.be.true;
    });

    it('should return true when placementId is present with video mediaType', function () {
      const isValid = adapter.isBidRequestValid({
        bidId: '123',
        params: { placementId: 'test' },
        mediaTypes: { video: { playerSize: [[640, 480]] } }
      });
      expect(isValid).to.be.true;
    });

    it('should return true when placementId is present with native mediaType', function () {
      const isValid = adapter.isBidRequestValid({
        bidId: '123',
        params: { placementId: 'test' },
        mediaTypes: { native: { title: { required: true } } }
      });
      expect(isValid).to.be.true;
    });
  });

  describe('build requests', function () {
    it('should build banner request', function () {
      const requests = adapter.buildRequests([BID], BIDDER_REQUEST);
      expect(requests).to.exist;
      expect(requests.method).to.equal('POST');
      expect(requests.url).to.include('screencore.io/prebid');
      expect(requests.data).to.exist;
      expect(requests.data.placements).to.be.an('array');
      expect(requests.data.placements[0].bidId).to.equal(BID.bidId);
      expect(requests.data.placements[0].adFormat).to.equal(BANNER);
    });

    it('should build video request', function () {
      const requests = adapter.buildRequests([VIDEO_BID], BIDDER_REQUEST);
      expect(requests).to.exist;
      expect(requests.method).to.equal('POST');
      expect(requests.data.placements).to.be.an('array');
      expect(requests.data.placements[0].bidId).to.equal(VIDEO_BID.bidId);
      expect(requests.data.placements[0].adFormat).to.equal(VIDEO);
    });

    it('should build native request', function () {
      const requests = adapter.buildRequests([NATIVE_BID], BIDDER_REQUEST);
      expect(requests).to.exist;
      expect(requests.data.placements).to.be.an('array');
      expect(requests.data.placements[0].bidId).to.equal(NATIVE_BID.bidId);
      expect(requests.data.placements[0].adFormat).to.equal(NATIVE);
    });

    it('should include gpid when available', function () {
      const requests = adapter.buildRequests([BID], BIDDER_REQUEST);
      expect(requests.data.placements[0].gpid).to.equal('0123456789');
    });

    it('should include placementId in placement when present', function () {
      const requests = adapter.buildRequests([BID], BIDDER_REQUEST);
      expect(requests.data.placements[0].placementId).to.equal('testPlacement');
      expect(requests.data.placements[0].type).to.equal('publisher');
    });

    it('should include endpointId in placement when placementId is not present', function () {
      const bidWithEndpoint = {
        bidId: '2d52001cabd530',
        bidder: 'screencore',
        adUnitCode: 'div-gpt-ad-endpoint',
        transactionId: 'd881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        params: {
          endpointId: 'testEndpointOnly'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
      const requests = adapter.buildRequests([bidWithEndpoint], BIDDER_REQUEST);
      expect(requests.data.placements[0].endpointId).to.equal('testEndpointOnly');
      expect(requests.data.placements[0].type).to.equal('network');
    });
  });

  describe('getUserSyncs', function () {
    it('should return iframe sync when iframeEnabled', function () {
      config.setConfig({ coppa: 0 });
      const result = adapter.getUserSyncs({ iframeEnabled: true }, [SERVER_RESPONSE]);
      expect(result).to.be.an('array').with.length(1);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.include('https://cs.screencore.io/iframe?pbjs=1');
    });

    it('should return image sync when pixelEnabled', function () {
      config.setConfig({ coppa: 0 });
      const result = adapter.getUserSyncs({ pixelEnabled: true }, [SERVER_RESPONSE]);
      expect(result).to.be.an('array').with.length(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.include('https://cs.screencore.io/image?pbjs=1');
    });

    it('should include coppa parameter', function () {
      config.setConfig({ coppa: 1 });
      const result = adapter.getUserSyncs({ iframeEnabled: true }, [SERVER_RESPONSE]);
      expect(result[0].url).to.include('coppa=1');
    });

    it('should include gdpr consent when provided', function () {
      config.setConfig({ coppa: 0 });
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'consent_string'
      };
      const result = adapter.getUserSyncs({ iframeEnabled: true }, [SERVER_RESPONSE], gdprConsent);
      expect(result[0].url).to.include('gdpr=1');
      expect(result[0].url).to.include('gdpr_consent=consent_string');
    });

    it('should include gpp consent when provided', function () {
      config.setConfig({ coppa: 0 });
      const gppConsent = {
        gppString: 'gpp_string',
        applicableSections: [7]
      };
      const result = adapter.getUserSyncs({ pixelEnabled: true }, [SERVER_RESPONSE], null, null, gppConsent);
      expect(result[0].url).to.include('gpp=gpp_string');
      expect(result[0].url).to.include('gpp_sid=7');
    });
  });

  describe('interpret response', function () {
    it('should return empty array when body is empty array', function () {
      const responses = adapter.interpretResponse({ body: [] });
      expect(responses).to.be.empty;
    });

    it('should return an array of interpreted banner responses', function () {
      const responses = adapter.interpretResponse(SERVER_RESPONSE, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0].requestId).to.equal('2d52001cabd527');
      expect(responses[0].cpm).to.equal(0.8);
      expect(responses[0].width).to.equal(300);
      expect(responses[0].height).to.equal(250);
      expect(responses[0].creativeId).to.equal('12610997325162499419');
      expect(responses[0].currency).to.equal('USD');
      expect(responses[0].ttl).to.equal(30);
      expect(responses[0].ad).to.equal('<iframe>console.log("hello world")</iframe>');
      expect(responses[0].meta.advertiserDomains).to.deep.equal(['securepubads.g.doubleclick.net']);
    });

    it('should return an array of interpreted video responses', function () {
      const responses = adapter.interpretResponse(VIDEO_SERVER_RESPONSE, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0].requestId).to.equal('2d52001cabd528');
      expect(responses[0].cpm).to.equal(2);
      expect(responses[0].width).to.equal(545);
      expect(responses[0].height).to.equal(307);
      expect(responses[0].mediaType).to.equal('video');
      expect(responses[0].vastXml).to.equal('<VAST version="3.0"></VAST>');
    });
  });

  describe('createDomain test', function () {
    it('should return correct domain for US timezone', function () {
      const stub = sinon.stub(Intl, 'DateTimeFormat').returns({
        resolvedOptions: () => ({ timeZone: 'America/New_York' })
      });

      const domain = createDomain();
      expect(domain).to.equal('https://taqus.screencore.io');

      stub.restore();
    });

    it('should return correct domain for EU timezone', function () {
      const stub = sinon.stub(Intl, 'DateTimeFormat').returns({
        resolvedOptions: () => ({ timeZone: 'Europe/London' })
      });

      const domain = createDomain();
      expect(domain).to.equal('https://taqeu.screencore.io');

      stub.restore();
    });

    it('should return correct domain for APAC timezone', function () {
      const stub = sinon.stub(Intl, 'DateTimeFormat').returns({
        resolvedOptions: () => ({ timeZone: 'Asia/Tokyo' })
      });

      const domain = createDomain();
      expect(domain).to.equal('https://taqapac.screencore.io');

      stub.restore();
    });
  });
});
