import {expect} from 'chai';
import {spec} from 'modules/proxistoreBidAdapter.js';
import {BANNER} from 'src/mediaTypes.js';

const BIDDER_CODE = 'proxistore';
const COOKIE_BASE_URL = 'https://abs.proxistore.com/v3/rtb/openrtb';
const COOKIE_LESS_URL = 'https://abs.cookieless-proxistore.com/v3/rtb/openrtb';

describe('ProxistoreBidAdapter', function () {
  const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';

  const baseBidderRequest = {
    bidderCode: BIDDER_CODE,
    auctionId: '1025ba77-5463-4877-b0eb-14b205cb9304',
    bidderRequestId: '10edf38ec1a719',
    timeout: 1000,
  };

  const gdprConsentWithVendor = {
    apiVersion: 2,
    gdprApplies: true,
    consentString: consentString,
    vendorData: {
      vendor: {
        consents: {
          418: true,
        },
      },
    },
  };

  const gdprConsentWithoutVendor = {
    apiVersion: 2,
    gdprApplies: true,
    consentString: consentString,
    vendorData: {
      vendor: {
        consents: {
          418: false,
        },
      },
    },
  };

  const gdprConsentNoVendorData = {
    apiVersion: 2,
    gdprApplies: true,
    consentString: consentString,
    vendorData: null,
  };

  const baseBid = {
    bidder: BIDDER_CODE,
    params: {
      website: 'example.fr',
      language: 'fr',
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 600], [300, 250]],
      },
    },
    adUnitCode: 'div-gpt-ad-123',
    transactionId: '511916005',
    bidId: '464646969',
    auctionId: '1025ba77-5463-4877-b0eb-14b205cb9304',
  };

  describe('spec properties', function () {
    it('should have correct bidder code', function () {
      expect(spec.code).to.equal(BIDDER_CODE);
    });

    it('should have correct GVLID', function () {
      expect(spec.gvlid).to.equal(418);
    });

    it('should support banner media type', function () {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER]);
    });

    it('should have browsingTopics enabled', function () {
      expect(spec.browsingTopics).to.be.true;
    });

    it('should have getUserSyncs function', function () {
      expect(spec.getUserSyncs).to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when website and language params are present', function () {
      expect(spec.isBidRequestValid(baseBid)).to.equal(true);
    });

    it('should return false when website param is missing', function () {
      const bid = {...baseBid, params: {language: 'fr'}};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when language param is missing', function () {
      const bid = {...baseBid, params: {website: 'example.fr'}};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params object is empty', function () {
      const bid = {...baseBid, params: {}};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    describe('request structure', function () {
      const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
      const request = spec.buildRequests([baseBid], bidderRequest);

      it('should return a valid object', function () {
        expect(request).to.be.an('object');
        expect(request.method).to.exist;
        expect(request.url).to.exist;
        expect(request.data).to.exist;
        expect(request.options).to.exist;
      });

      it('should use POST method', function () {
        expect(request.method).to.equal('POST');
      });

      it('should have correct options', function () {
        expect(request.options.contentType).to.equal('application/json');
        expect(request.options.customHeaders).to.deep.equal({version: '2.0.0'});
      });
    });

    describe('OpenRTB data format', function () {
      const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
      const request = spec.buildRequests([baseBid], bidderRequest);
      const data = request.data;

      it('should have valid OpenRTB structure', function () {
        expect(data).to.be.an('object');
        expect(data.id).to.be.a('string');
        expect(data.imp).to.be.an('array');
      });

      it('should have imp array with correct length', function () {
        expect(data.imp.length).to.equal(1);
      });

      it('should have imp with banner object', function () {
        expect(data.imp[0].banner).to.be.an('object');
        expect(data.imp[0].banner.format).to.be.an('array');
      });

      it('should include banner formats from bid sizes', function () {
        const formats = data.imp[0].banner.format;
        expect(formats).to.deep.include({w: 300, h: 600});
        expect(formats).to.deep.include({w: 300, h: 250});
      });

      it('should set imp.id to bidId', function () {
        expect(data.imp[0].id).to.equal(baseBid.bidId);
      });

      it('should include tmax from bidderRequest timeout', function () {
        expect(data.tmax).to.equal(1000);
      });

      it('should include website and language in ext.proxistore', function () {
        expect(data.ext).to.be.an('object');
        expect(data.ext.proxistore).to.be.an('object');
        expect(data.ext.proxistore.website).to.equal('example.fr');
        expect(data.ext.proxistore.language).to.equal('fr');
      });
    });

    describe('endpoint URL selection', function () {
      it('should use cookie URL when GDPR consent is given for vendor 418', function () {
        const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.url).to.equal(COOKIE_BASE_URL);
      });

      it('should use cookieless URL when GDPR applies but consent not given', function () {
        const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithoutVendor};
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.url).to.equal(COOKIE_LESS_URL);
      });

      it('should use cookieless URL when vendorData is null', function () {
        const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentNoVendorData};
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.url).to.equal(COOKIE_LESS_URL);
      });

      it('should use cookie URL when GDPR does not apply', function () {
        const bidderRequest = {
          ...baseBidderRequest,
          gdprConsent: {
            gdprApplies: false,
            consentString: consentString,
          },
        };
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.url).to.equal(COOKIE_BASE_URL);
      });

      it('should use cookie URL when no gdprConsent object', function () {
        const bidderRequest = {...baseBidderRequest};
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.url).to.equal(COOKIE_BASE_URL);
      });
    });

    describe('withCredentials option', function () {
      it('should set withCredentials to true when consent given', function () {
        const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.options.withCredentials).to.be.true;
      });

      it('should set withCredentials to false when consent not given', function () {
        const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithoutVendor};
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.options.withCredentials).to.be.false;
      });

      it('should set withCredentials to false when no vendorData', function () {
        const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentNoVendorData};
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.options.withCredentials).to.be.false;
      });

      it('should set withCredentials to false when no gdprConsent', function () {
        const bidderRequest = {...baseBidderRequest};
        const request = spec.buildRequests([baseBid], bidderRequest);
        expect(request.options.withCredentials).to.be.false;
      });
    });

    describe('multiple bids', function () {
      it('should create imp for each bid request', function () {
        const secondBid = {
          ...baseBid,
          bidId: '789789789',
          adUnitCode: 'div-gpt-ad-456',
        };
        const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
        const request = spec.buildRequests([baseBid, secondBid], bidderRequest);
        const data = request.data;

        expect(data.imp.length).to.equal(2);
        expect(data.imp[0].id).to.equal(baseBid.bidId);
        expect(data.imp[1].id).to.equal(secondBid.bidId);
      });
    });
  });

  describe('interpretResponse', function () {
    it('should return empty array for empty response', function () {
      const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
      const request = spec.buildRequests([baseBid], bidderRequest);
      const emptyResponse = {body: null};

      const bids = spec.interpretResponse(emptyResponse, request);
      expect(bids).to.be.an('array');
      expect(bids.length).to.equal(0);
    });

    it('should return empty array for response with no seatbid', function () {
      const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
      const request = spec.buildRequests([baseBid], bidderRequest);
      const response = {body: {id: '123', seatbid: []}};

      const bids = spec.interpretResponse(response, request);
      expect(bids).to.be.an('array');
      expect(bids.length).to.equal(0);
    });

    it('should correctly parse OpenRTB bid response', function () {
      const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
      const request = spec.buildRequests([baseBid], bidderRequest);
      const requestData = request.data;

      const serverResponse = {
        body: {
          id: requestData.id,
          seatbid: [{
            seat: 'proxistore',
            bid: [{
              id: 'bid-id-1',
              impid: baseBid.bidId,
              price: 6.25,
              adm: '<div>Ad markup</div>',
              w: 300,
              h: 600,
              crid: '22c3290b-8cd5-4cd6-8e8c-28a2de180ccd',
              dealid: '2021-03_deal123',
              adomain: ['advertiser.com'],
            }],
          }],
          cur: 'EUR',
        },
      };

      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.an('array');
      expect(bids.length).to.equal(1);

      const bid = bids[0];
      expect(bid.requestId).to.equal(baseBid.bidId);
      expect(bid.cpm).to.equal(6.25);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(600);
      expect(bid.ad).to.equal('<div>Ad markup</div>');
      expect(bid.creativeId).to.equal('22c3290b-8cd5-4cd6-8e8c-28a2de180ccd');
      expect(bid.dealId).to.equal('2021-03_deal123');
      expect(bid.currency).to.equal('EUR');
      expect(bid.netRevenue).to.be.true;
      expect(bid.ttl).to.equal(30);
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should handle multiple bids in response', function () {
      const secondBid = {
        ...baseBid,
        bidId: '789789789',
        adUnitCode: 'div-gpt-ad-456',
      };
      const bidderRequest = {...baseBidderRequest, gdprConsent: gdprConsentWithVendor};
      const request = spec.buildRequests([baseBid, secondBid], bidderRequest);
      const requestData = request.data;

      const serverResponse = {
        body: {
          id: requestData.id,
          seatbid: [{
            seat: 'proxistore',
            bid: [
              {
                id: 'bid-id-1',
                impid: baseBid.bidId,
                price: 6.25,
                adm: '<div>Ad 1</div>',
                w: 300,
                h: 600,
                crid: 'creative-1',
              },
              {
                id: 'bid-id-2',
                impid: secondBid.bidId,
                price: 4.50,
                adm: '<div>Ad 2</div>',
                w: 300,
                h: 250,
                crid: 'creative-2',
              },
            ],
          }],
          cur: 'EUR',
        },
      };

      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.an('array');
      expect(bids.length).to.equal(2);
      expect(bids[0].requestId).to.equal(baseBid.bidId);
      expect(bids[0].cpm).to.equal(6.25);
      expect(bids[1].requestId).to.equal(secondBid.bidId);
      expect(bids[1].cpm).to.equal(4.50);
    });
  });

  describe('getUserSyncs', function () {
    const SYNC_BASE_URL = 'https://abs.proxistore.com/v3/rtb/sync';

    it('should return empty array when GDPR applies and consent not given', function () {
      const syncOptions = {pixelEnabled: true, iframeEnabled: true};
      const gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          vendor: {
            consents: {418: false},
          },
        },
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(0);
    });

    it('should return pixel sync when pixelEnabled and consent given', function () {
      const syncOptions = {pixelEnabled: true, iframeEnabled: false};
      const gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          vendor: {
            consents: {418: true},
          },
        },
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.include(`${SYNC_BASE_URL}/image`);
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include(`gdpr_consent=${encodeURIComponent(consentString)}`);
    });

    it('should return iframe sync when iframeEnabled and consent given', function () {
      const syncOptions = {pixelEnabled: false, iframeEnabled: true};
      const gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          vendor: {
            consents: {418: true},
          },
        },
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(`${SYNC_BASE_URL}/iframe`);
    });

    it('should return both syncs when both enabled and consent given', function () {
      const syncOptions = {pixelEnabled: true, iframeEnabled: true};
      const gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          vendor: {
            consents: {418: true},
          },
        },
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(2);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[1].type).to.equal('iframe');
    });

    it('should return syncs when GDPR does not apply', function () {
      const syncOptions = {pixelEnabled: true, iframeEnabled: true};
      const gdprConsent = {
        gdprApplies: false,
        consentString: consentString,
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(2);
      expect(syncs[0].url).to.include('gdpr=0');
    });

    it('should return syncs when no gdprConsent provided', function () {
      const syncOptions = {pixelEnabled: true, iframeEnabled: true};

      const syncs = spec.getUserSyncs(syncOptions, [], undefined);
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(2);
    });

    it('should return empty array when no sync options enabled', function () {
      const syncOptions = {pixelEnabled: false, iframeEnabled: false};
      const gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          vendor: {
            consents: {418: true},
          },
        },
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(0);
    });
  });
});
