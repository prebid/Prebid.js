import {expect} from 'chai';
import * as utils from 'src/utils.js';
import {spec} from 'modules/aolBidAdapter.js';
import {createEidsArray} from '../../../modules/userId/eids.js';

const DEFAULT_AD_CONTENT = '<script>logInfo(\'ad\');</script>';

let getDefaultBidResponse = () => {
  return {
    id: '245730051428950632',
    cur: 'USD',
    seatbid: [{
      bid: [{
        id: 1,
        impid: '245730051428950632',
        price: 0.09,
        adm: DEFAULT_AD_CONTENT,
        crid: 'creative-id',
        h: 90,
        w: 728,
        dealid: 'deal-id',
        ext: {sizeid: 225}
      }]
    }]
  };
};

let getMarketplaceBidParams = () => {
  return {
    placement: 1234567,
    network: '9599.1'
  };
};

let getNexageGetBidParams = () => {
  return {
    dcn: '2c9d2b50015c5ce9db6aeeed8b9500d6',
    pos: 'header'
  };
};

let getNexagePostBidParams = () => {
  return {
    id: 'id-1',
    imp: [{
      id: 'id-2',
      banner: {
        w: '100',
        h: '100'
      },
      tagid: 'header1'
    }]
  };
};

let getDefaultBidRequest = () => {
  return {
    bidderCode: 'aol',
    auctionId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0db2',
    start: new Date().getTime(),
    bids: [{
      bidder: 'aol',
      bidId: '84ab500420319d',
      bidderRequestId: '7101db09af0db2',
      auctionId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
      placementCode: 'foo',
      params: getMarketplaceBidParams()
    }]
  };
};

let getPixels = () => {
  return '<script>document.write(\'<img src="img.org"></iframe>' +
    '<iframe src="pixels1.org"></iframe>\');</script>';
};

describe('AolAdapter', function () {
  const MARKETPLACE_URL = 'https://adserver-us.adtech.advertising.com/pubapi/3.0/';
  const NEXAGE_URL = 'https://c2shb.ssp.yahoo.com/bidRequest?';
  const ONE_DISPLAY_TTL = 60;
  const ONE_MOBILE_TTL = 3600;
  const SUPPORTED_USER_ID_SOURCES = {
    'admixer.net': '100',
    'adserver.org': '200',
    'adtelligent.com': '300',
    'amxrtb.com': '500',
    'audigent.com': '600',
    'britepool.com': '700',
    'criteo.com': '800',
    'crwdcntrl.net': '900',
    'deepintent.com': '1000',
    'epsilon.com': '1100',
    'hcn.health': '1200',
    'id5-sync.com': '1300',
    'idx.lat': '1400',
    'intentiq.com': '1500',
    'intimatemerger.com': '1600',
    'liveintent.com': '1700',
    'liveramp.com': '1800',
    'mediawallahscript.com': '1900',
    'netid.de': '2100',
    'neustar.biz': '2200',
    'pubcid.org': '2600',
    'quantcast.com': '2700',
    'tapad.com': '2800',
    'zeotap.com': '3200'
  };

  const USER_ID_DATA = {
    admixerId: SUPPORTED_USER_ID_SOURCES['admixer.net'],
    adtelligentId: SUPPORTED_USER_ID_SOURCES['adtelligent.com'],
    amxId: SUPPORTED_USER_ID_SOURCES['amxrtb.com'],
    britepoolid: SUPPORTED_USER_ID_SOURCES['britepool.com'],
    criteoId: SUPPORTED_USER_ID_SOURCES['criteo.com'],
    connectid: SUPPORTED_USER_ID_SOURCES['verizonmedia.com'],
    dmdId: SUPPORTED_USER_ID_SOURCES['hcn.health'],
    hadronId: SUPPORTED_USER_ID_SOURCES['audigent.com'],
    lotamePanoramaId: SUPPORTED_USER_ID_SOURCES['crwdcntrl.net'],
    deepintentId: SUPPORTED_USER_ID_SOURCES['deepintent.com'],
    fabrickId: SUPPORTED_USER_ID_SOURCES['neustar.biz'],
    idl_env: SUPPORTED_USER_ID_SOURCES['liveramp.com'],
    IDP: SUPPORTED_USER_ID_SOURCES['zeotap.com'],
    lipb: {
      lipbid: SUPPORTED_USER_ID_SOURCES['liveintent.com'],
      segments: ['100', '200']
    },
    tdid: SUPPORTED_USER_ID_SOURCES['adserver.org'],
    id5id: {
      uid: SUPPORTED_USER_ID_SOURCES['id5-sync.com'],
      ext: {foo: 'bar'}
    },
    idx: SUPPORTED_USER_ID_SOURCES['idx.lat'],
    imuid: SUPPORTED_USER_ID_SOURCES['intimatemerger.com'],
    intentIqId: SUPPORTED_USER_ID_SOURCES['intentiq.com'],
    mwOpenLinkId: SUPPORTED_USER_ID_SOURCES['mediawallahscript.com'],
    netId: SUPPORTED_USER_ID_SOURCES['netid.de'],
    quantcastId: SUPPORTED_USER_ID_SOURCES['quantcast.com'],
    publinkId: SUPPORTED_USER_ID_SOURCES['epsilon.com'],
    pubcid: SUPPORTED_USER_ID_SOURCES['pubcid.org'],
    tapadId: SUPPORTED_USER_ID_SOURCES['tapad.com']
  };

  function createCustomBidRequest({bids, params} = {}) {
    var bidderRequest = getDefaultBidRequest();
    if (bids && Array.isArray(bids)) {
      bidderRequest.bids = bids;
    }
    if (params) {
      bidderRequest.bids.forEach(bid => bid.params = params);
    }
    return bidderRequest;
  }

  describe('interpretResponse()', function () {
    let bidderSettingsBackup;
    let bidResponse;
    let bidRequest;
    let logWarnSpy;
    let isOneMobileBidderStub;

    beforeEach(function () {
      bidderSettingsBackup = $$PREBID_GLOBAL$$.bidderSettings;
      bidRequest = {
        bidderCode: 'test-bidder-code',
        bidId: 'bid-id',
        ttl: 1234
      };
      bidResponse = {
        body: getDefaultBidResponse()
      };
      logWarnSpy = sinon.spy(utils, 'logWarn');
      isOneMobileBidderStub = sinon.stub(spec, 'isOneMobileBidder');
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.bidderSettings = bidderSettingsBackup;
      logWarnSpy.restore();
      isOneMobileBidderStub.restore();
    });

    it('should return formatted bid response with required properties', function () {
      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);
      expect(formattedBidResponse).to.deep.equal({
        bidderCode: bidRequest.bidderCode,
        requestId: 'bid-id',
        ad: DEFAULT_AD_CONTENT,
        cpm: 0.09,
        width: 728,
        height: 90,
        creativeId: 'creative-id',
        pubapiId: '245730051428950632',
        currency: 'USD',
        dealId: 'deal-id',
        netRevenue: true,
        meta: {
          advertiserDomains: []
        },
        ttl: bidRequest.ttl
      });
    });
  });

  describe('buildRequests()', function () {
    it('method exists and is a function', function () {
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
    });

    describe('Marketplace', function () {
      it('should not return request when no bids are present', function () {
        let [request] = spec.buildRequests([]);
        expect(request).to.be.undefined;
      });

      it('should return request for Marketplace endpoint', function () {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf(MARKETPLACE_URL)).to.equal(0);
      });

      it('should return request for Marketplace via onedisplay bidder code', function () {
        let bidRequest = createCustomBidRequest({
          bids: [{
            bidder: 'onedisplay'
          }],
          params: getMarketplaceBidParams()
        });

        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf(MARKETPLACE_URL)).to.equal(0);
      });

      it('should return Marketplace request via onedisplay bidder code when' +
        'Marketplace and One Mobile GET params are present', () => {
        let bidParams = Object.assign(getMarketplaceBidParams(), getNexageGetBidParams());
        let bidRequest = createCustomBidRequest({
          bids: [{
            bidder: 'onedisplay'
          }],
          params: bidParams
        });

        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf(MARKETPLACE_URL)).to.equal(0);
      });

      it('should return Marketplace request via onedisplay bidder code when' +
        'Marketplace and One Mobile GET + POST params are present', () => {
        let bidParams = Object.assign(getMarketplaceBidParams(), getNexageGetBidParams(), getNexagePostBidParams());
        let bidRequest = createCustomBidRequest({
          bids: [{
            bidder: 'onedisplay'
          }],
          params: bidParams
        });

        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf(MARKETPLACE_URL)).to.equal(0);
      });

      it('should not resolve endpoint for onedisplay bidder code ' +
        'when only One Mobile params are present', () => {
        let bidParams = Object.assign(getNexageGetBidParams(), getNexagePostBidParams());
        let bidRequest = createCustomBidRequest({
          bids: [{
            bidder: 'onedisplay'
          }],
          params: bidParams
        });

        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request).to.be.undefined;
      });

      it('should return Marketplace URL for eu region', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1',
            region: 'eu'
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf('https://adserver-eu.adtech.advertising.com/pubapi/3.0/'))
          .to.equal(0);
      });

      it('should return insecure MP URL if insecure server option is present', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1',
            server: 'https://adserver-eu.adtech.advertising.com'
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf('https://adserver-eu.adtech.advertising.com/pubapi/3.0/'))
          .to.equal(0);
      });

      it('should return a secure MP URL if relative proto server option is present', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1',
            server: 'https://adserver-eu.adtech.advertising.com'
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf('https://adserver-eu.adtech.advertising.com/pubapi/3.0/'))
          .to.equal(0);
      });

      it('should return a secure MP URL when server option without protocol is present', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1',
            server: 'adserver-eu.adtech.advertising.com'
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf('https://adserver-eu.adtech.advertising.com/pubapi/3.0/'))
          .to.equal(0);
      });

      it('should return default Marketplace URL in case of unknown region config option', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1',
            region: 'an'
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url.indexOf(MARKETPLACE_URL)).to.equal(0);
      });

      it('should return url with pubapi bid option', function () {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('cmd=bid;');
      });

      it('should return url with version 2 of pubapi', function () {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('v=2;');
      });

      it('should return url with cache busting option', function () {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.match(/misc=\d+/);
      });

      it('should return url with default pageId and sizeId', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1'
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('/pubapi/3.0/9599.1/1234567/0/0/ADTECH;');
      });

      it('should return url with custom pageId and sizeId when options are present', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1',
            pageId: 1111,
            sizeId: 2222
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('/pubapi/3.0/9599.1/1234567/1111/2222/ADTECH;');
      });

      it('should return url with default alias if alias param is missing', function () {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.match(/alias=\w+?;/);
      });

      it('should return url with custom alias if it is present', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1',
            alias: 'desktop_articlepage_something_box_300_250'
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('alias=desktop_articlepage_something_box_300_250');
      });

      it('should return url without bidfloor option if is is missing', function () {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).not.to.contain('bidfloor=');
      });

      it('should return url with key values if keyValues param is present', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            placement: 1234567,
            network: '9599.1',
            keyValues: {
              age: 25,
              height: 3.42,
              test: 'key'
            }
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('kvage=25;kvheight=3.42;kvtest=key');
      });

      it('should return request object for One Display when configuration is present', function () {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.method).to.equal('GET');
        expect(request.ttl).to.equal(ONE_DISPLAY_TTL);
      });
    });

    describe('One Mobile', function () {
      it('should return One Mobile url when One Mobile get params are present', function () {
        let bidRequest = createCustomBidRequest({
          params: getNexageGetBidParams()
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain(NEXAGE_URL);
      });

      it('should return One Mobile url with different host when host option is present', function () {
        let bidParams = Object.assign({
          host: 'https://qa-hb.nexage.com'
        }, getNexageGetBidParams());
        let bidRequest = createCustomBidRequest({
          params: bidParams
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('https://qa-hb.nexage.com/bidRequest?');
      });

      it('should return One Mobile url when One Mobile and Marketplace params are present', function () {
        let bidParams = Object.assign(getNexageGetBidParams(), getMarketplaceBidParams());
        let bidRequest = createCustomBidRequest({
          params: bidParams
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain(NEXAGE_URL);
      });

      it('should return One Mobile url for onemobile bidder code ' +
        'when One Mobile GET and Marketplace params are present', () => {
        let bidParams = Object.assign(getNexageGetBidParams(), getMarketplaceBidParams());
        let bidRequest = createCustomBidRequest({
          bids: [{
            bidder: 'onemobile'
          }],
          params: bidParams
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain(NEXAGE_URL);
      });

      it('should not return any url for onemobile bidder code' +
        'when only Marketplace params are present', () => {
        let bidRequest = createCustomBidRequest({
          bids: [{
            bidder: 'onemobile'
          }],
          params: getMarketplaceBidParams()
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request).to.be.undefined;
      });

      it('should return One Mobile url with required params - dcn & pos', function () {
        let bidRequest = createCustomBidRequest({
          params: getNexageGetBidParams()
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain(NEXAGE_URL + 'dcn=2c9d2b50015c5ce9db6aeeed8b9500d6&pos=header');
      });

      it('should return One Mobile url with cmd=bid option', function () {
        let bidRequest = createCustomBidRequest({
          params: getNexageGetBidParams()
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('cmd=bid');
      });

      it('should return One Mobile url with generic params if ext option is present', function () {
        let bidRequest = createCustomBidRequest({
          params: {
            dcn: '54321123',
            pos: 'footer-2324',
            ext: {
              param1: 'val1',
              param2: 'val2',
              param3: 'val3',
              param4: 'val4'
            }
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.equal('https://c2shb.ssp.yahoo.com/bidRequest?dcn=54321123&pos=footer-2324&cmd=bid' +
          '&param1=val1&param2=val2&param3=val3&param4=val4');
      });

      Object.keys(SUPPORTED_USER_ID_SOURCES).forEach(source => {
        it(`should set the user ID query param for ${source}`, function () {
          let bidRequest = createCustomBidRequest({
            params: getNexageGetBidParams()
          });
          bidRequest.bids[0].userId = {};
          bidRequest.bids[0].userIdAsEids = createEidsArray(USER_ID_DATA);
          let [request] = spec.buildRequests(bidRequest.bids);
          expect(request.url).to.contain(`&eid${source}=${encodeURIComponent(SUPPORTED_USER_ID_SOURCES[source])}`);
        });
      });

      it('should return request object for One Mobile POST endpoint when POST configuration is present', function () {
        let bidConfig = getNexagePostBidParams();
        let bidRequest = createCustomBidRequest({
          params: bidConfig
        });

        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain(NEXAGE_URL);
        expect(request.method).to.equal('POST');
        expect(request.ttl).to.equal(ONE_MOBILE_TTL);
        expect(request.data).to.deep.equal(bidConfig);
        expect(request.options).to.deep.equal({
          contentType: 'application/json',
          customHeaders: {
            'x-openrtb-version': '2.2'
          }
        });
      });

      it('should not return request object for One Mobile POST endpoint' +
        'if required parameters are missed', () => {
        let bidRequest = createCustomBidRequest({
          params: {
            imp: []
          }
        });
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request).to.be.undefined;
      });
    });
  });

  describe('buildOpenRtbRequestData', () => {
    const bid = {
      params: {
        id: 'bid-id',
        imp: []
      }
    };
    let euConsentRequiredStub;

    beforeEach(function () {
      euConsentRequiredStub = sinon.stub(spec, 'isEUConsentRequired');
    });

    afterEach(function () {
      euConsentRequiredStub.restore();
    });

    it('returns the basic bid info when regulation data is omitted', () => {
      expect(spec.buildOpenRtbRequestData(bid)).to.deep.equal({
        id: 'bid-id',
        imp: []
      });
    });

    it('returns the basic bid info with gdpr data when gdpr consent data is included', () => {
      let consentData = {
        gdpr: {
          consentString: 'someEUConsent'
        }
      };
      euConsentRequiredStub.returns(true);
      expect(spec.buildOpenRtbRequestData(bid, consentData)).to.deep.equal({
        id: 'bid-id',
        imp: [],
        regs: {
          ext: {
            gdpr: 1
          }
        },
        user: {
          ext: {
            consent: 'someEUConsent'
          }
        }
      });
    });

    it('returns the basic bid info with CCPA data when CCPA consent data is included', () => {
      let consentData = {
        uspConsent: 'someUSPConsent'
      };
      expect(spec.buildOpenRtbRequestData(bid, consentData)).to.deep.equal({
        id: 'bid-id',
        imp: [],
        regs: {
          ext: {
            us_privacy: 'someUSPConsent'
          }
        }
      });
    });

    it('returns the basic bid info with GDPR and CCPA data when GDPR and CCPA consent data is included', () => {
      let consentData = {
        gdpr: {
          consentString: 'someEUConsent'
        },
        uspConsent: 'someUSPConsent'
      };
      euConsentRequiredStub.returns(true);
      expect(spec.buildOpenRtbRequestData(bid, consentData)).to.deep.equal({
        id: 'bid-id',
        imp: [],
        regs: {
          ext: {
            gdpr: 1,
            us_privacy: 'someUSPConsent'
          }
        },
        user: {
          ext: {
            consent: 'someEUConsent'
          }
        }
      });
    });

    it('returns the bid object with eid array populated with PB set eids', () => {
      let userIdBid = Object.assign({
        userId: {}
      }, bid);
      userIdBid.userIdAsEids = createEidsArray(USER_ID_DATA);
      expect(spec.buildOpenRtbRequestData(userIdBid)).to.deep.equal({
        id: 'bid-id',
        imp: [],
        user: {
          ext: {
            eids: userIdBid.userIdAsEids
          }
        }
      });
    });
  });

  describe('getUserSyncs()', function () {
    let serverResponses;
    let bidResponse;

    beforeEach(function () {
      bidResponse = getDefaultBidResponse();
      bidResponse.ext = {
        pixels: getPixels()
      };

      serverResponses = [
        {body: bidResponse}
      ];
    });

    it('should return user syncs if pixels are present in the response', function () {
      let userSyncs = spec.getUserSyncs({}, serverResponses);

      expect(userSyncs).to.deep.equal([
        {type: 'image', url: 'img.org'},
        {type: 'iframe', url: 'pixels1.org'}
      ]);
    });

    it('should not return user syncs if pixels are not present', function () {
      bidResponse.ext.pixels = null;
      let userSyncs = spec.getUserSyncs({}, serverResponses);

      expect(userSyncs).to.deep.equal([]);
    });
  });

  describe('isOneMobileBidder()', function () {
    it('should return false when when bidderCode is not present', () => {
      expect(spec.isOneMobileBidder(null)).to.be.false;
    });

    it('should return false for unknown bidder code', function () {
      expect(spec.isOneMobileBidder('unknownBidder')).to.be.false;
    });

    it('should return true for aol bidder code', function () {
      expect(spec.isOneMobileBidder('aol')).to.be.true;
    });

    it('should return true for one mobile bidder code', function () {
      expect(spec.isOneMobileBidder('onemobile')).to.be.true;
    });
  });

  describe('isEUConsentRequired()', function () {
    it('should return false when consentData object is not present', function () {
      expect(spec.isEUConsentRequired(null)).to.be.false;
    });

    it('should return true when gdprApplies equals true and consentString is not present', function () {
      let consentData = {
        gdpr: {
          consentString: null,
          gdprApplies: true
        }
      };

      expect(spec.isEUConsentRequired(consentData)).to.be.true;
    });

    it('should return false when consentString is present and gdprApplies equals false', function () {
      let consentData = {
        gdpr: {
          consentString: 'consent-string',
          gdprApplies: false
        }
      };

      expect(spec.isEUConsentRequired(consentData)).to.be.false;
    });

    it('should return true when consentString is present and gdprApplies equals true', function () {
      let consentData = {
        gdpr: {
          consentString: 'consent-string',
          gdprApplies: true
        }
      };

      expect(spec.isEUConsentRequired(consentData)).to.be.true;
    });
  });

  describe('formatMarketplaceDynamicParams()', function () {
    let formatConsentDataStub;
    let formatKeyValuesStub;

    beforeEach(function () {
      formatConsentDataStub = sinon.stub(spec, 'formatConsentData');
      formatKeyValuesStub = sinon.stub(spec, 'formatKeyValues');
    });

    afterEach(function () {
      formatConsentDataStub.restore();
      formatKeyValuesStub.restore();
    });

    it('should return empty string when params are not present', function () {
      expect(spec.formatMarketplaceDynamicParams()).to.be.equal('');
    });

    it('should return formatted EU consent params when formatConsentData returns GDPR data', function () {
      formatConsentDataStub.returns({
        euconsent: 'test-consent',
        gdpr: 1
      });
      expect(spec.formatMarketplaceDynamicParams()).to.be.equal('euconsent=test-consent;gdpr=1;');
    });

    it('should return formatted US privacy params when formatConsentData returns USP data', function () {
      formatConsentDataStub.returns({
        us_privacy: 'test-usp-consent'
      });
      expect(spec.formatMarketplaceDynamicParams()).to.be.equal('us_privacy=test-usp-consent;');
    });

    it('should return formatted EU and USP consent params when formatConsentData returns all data', function () {
      formatConsentDataStub.returns({
        euconsent: 'test-consent',
        gdpr: 1,
        us_privacy: 'test-usp-consent'
      });
      expect(spec.formatMarketplaceDynamicParams()).to.be.equal(
        'euconsent=test-consent;gdpr=1;us_privacy=test-usp-consent;');
    });

    it('should return formatted params when formatKeyValues returns data', function () {
      formatKeyValuesStub.returns({
        param1: 'val1',
        param2: 'val2',
        param3: 'val3'
      });
      expect(spec.formatMarketplaceDynamicParams()).to.be.equal('param1=val1;param2=val2;param3=val3;');
    });
  });

  describe('formatOneMobileDynamicParams()', function () {
    let euConsentRequiredStub;
    let secureProtocolStub;

    beforeEach(function () {
      euConsentRequiredStub = sinon.stub(spec, 'isEUConsentRequired');
      secureProtocolStub = sinon.stub(spec, 'isSecureProtocol');
    });

    afterEach(function () {
      euConsentRequiredStub.restore();
      secureProtocolStub.restore();
    });

    it('should return empty string when params are not present', function () {
      expect(spec.formatOneMobileDynamicParams()).to.be.equal('');
    });

    it('should return formatted params when params are present', function () {
      let params = {
        param1: 'val1',
        param2: 'val2',
        param3: 'val3'
      };
      expect(spec.formatOneMobileDynamicParams(params)).to.contain('&param1=val1&param2=val2&param3=val3');
    });

    it('should return formatted gdpr params when isEUConsentRequired returns true', function () {
      let consentData = {
        gdpr: {
          consentString: 'test-consent'
        }
      };
      euConsentRequiredStub.returns(true);
      expect(spec.formatOneMobileDynamicParams({}, consentData)).to.be.equal('&gdpr=1&euconsent=test-consent');
    });

    it('should return formatted US privacy params when consentData contains USP data', function () {
      let consentData = {
        uspConsent: 'test-usp-consent'
      };
      expect(spec.formatMarketplaceDynamicParams({}, consentData)).to.be.equal('us_privacy=test-usp-consent;');
    });

    it('should return formatted EU and USP consent params when consentData contains gdpr and usp values', function () {
      euConsentRequiredStub.returns(true);
      let consentData = {
        gdpr: {
          consentString: 'test-consent'
        },
        uspConsent: 'test-usp-consent'
      };
      expect(spec.formatMarketplaceDynamicParams({}, consentData)).to.be.equal(
        'gdpr=1;euconsent=test-consent;us_privacy=test-usp-consent;');
    });

    it('should return formatted secure param when isSecureProtocol returns true', function () {
      secureProtocolStub.returns(true);
      expect(spec.formatOneMobileDynamicParams()).to.be.equal('&secure=1');
    });
  });
});
