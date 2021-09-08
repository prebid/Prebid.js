import { expect } from 'chai';
import { spec } from 'modules/adWMGBidAdapter.js';
import { config } from 'src/config.js';

describe('adWMGBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(function() {
      bid = {
        bidder: 'adWMG',
        params: {
          publisherId: '5cebea3c9eea646c7b623d5e'
        },
        mediaTypes: {
          banner: {
            size: [[300, 250]]
          }
        }
      };
    });

    it('should return true when valid bid request is set', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when bidder is not set to "adWMG"', function() {
      bid.bidder = 'bidder';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when \'publisherId\' param are not set', function() {
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('parseUserAgent', function() {
    let ua_desktop, ua_mobile, ua_tv, ua_tablet;
    beforeEach(function() {
      ua_desktop = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36';
      ua_tv = 'Mozilla/5.0 (Linux; NetCast; U) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.31 SmartTV/7.0';
      ua_mobile = 'Mozilla/5.0 (Linux; Android 7.0; SAMSUNG SM-G610M Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/7.2 Chrome/59.0.3071.125 Mobile Safari/537.36';
      ua_tablet = 'Mozilla/5.0 (iPad; CPU OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53';
    });

    it('should return correct device type: desktop', function() {
      let userDeviceInfo = spec.parseUserAgent(ua_desktop);
      expect(userDeviceInfo.devicetype).to.equal(2);
    });

    it('should return correct device type: TV', function() {
      let userDeviceInfo = spec.parseUserAgent(ua_tv);
      expect(userDeviceInfo.devicetype).to.equal(3);
    });

    it('should return correct device type: mobile', function() {
      let userDeviceInfo = spec.parseUserAgent(ua_mobile);
      expect(userDeviceInfo.devicetype).to.equal(4);
    });

    it('should return correct device type: tablet', function() {
      let userDeviceInfo = spec.parseUserAgent(ua_tablet);
      expect(userDeviceInfo.devicetype).to.equal(5);
    });

    it('should return correct OS name', function() {
      let userDeviceInfo = spec.parseUserAgent(ua_desktop);
      expect(userDeviceInfo.os).to.equal('Windows');
    });

    it('should return correct OS version', function() {
      let userDeviceInfo = spec.parseUserAgent(ua_desktop);
      expect(userDeviceInfo.osv).to.equal('10.0');
    });
  });

  describe('buildRequests', function () {
    let bidRequests;
    beforeEach(function() {
      bidRequests = [
        {
          bidder: 'adWMG',
          adUnitCode: 'adwmg-test-ad',
          auctionId: 'test-auction-id',
          bidId: 'test-bid-id',
          bidRequestsCount: 1,
          bidderRequestId: 'bidderrequestid123',
          transactionId: 'transaction-id-123',
          sizes: [[300, 250]],
          requestId: 'requestid123',
          params: {
            floorPrice: 100,
            currency: 'USD'
          },
          mediaTypes: {
            banner: {
              size: [[300, 250]]
            }
          },
          userId: {
            pubcid: 'pubc-id-123'
          }
        }, {
          bidder: 'adWMG',
          adUnitCode: 'adwmg-test-ad-2',
          auctionId: 'test-auction-id-2',
          bidId: 'test-bid-id-2',
          bidRequestsCount: 1,
          bidderRequestId: 'bidderrequestid456',
          transactionId: 'transaction-id-456',
          sizes: [[320, 50]],
          requestId: 'requestid456',
          params: {
            floorPrice: 100,
            currency: 'USD'
          },
          mediaTypes: {
            banner: {
              size: [[320, 50]]
            }
          },
          userId: {
            pubcid: 'pubc-id-456'
          }
        }
      ];
    });

    let bidderRequest = {
      refererInfo: {
        referer: 'https://test.com'
      },
      gdprConsent: {
        consentString: 'CO9rhBTO9rhBTAcABBENBCCsAP_AAH_AACiQHItf_X_fb3_j-_59_9t0eY1f9_7_v20zjgeds-8Nyd_X_L8X42M7vB36pq4KuR4Eu3LBIQdlHOHcTUmw6IkVqTPsbk2Mr7NKJ7PEinMbe2dYGH9_n9XTuZKY79_s___z__-__v__7_f_r-3_3_vp9V---3YHIgEmGpfARZiWOBJNGlUKIEIVxIdACACihGFomsICVwU7K4CP0EDABAagIwIgQYgoxZBAAAAAElEQEgB4IBEARAIAAQAqQEIACNAEFgBIGAQACgGhYARQBCBIQZHBUcpgQESLRQTyVgCUXexhhCGUUANAg4AA.YAAAAAAAAAAA',
        vendorData: {},
        gdprApplies: true,
        apiVersion: 2
      }
    };

    it('should not contain a sizes when sizes is not set', function() {
      delete bidRequests[0].sizes;
      delete bidRequests[1].sizes;
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(requests[0].data).sizes).to.be.an('undefined');
      expect(JSON.parse(requests[1].data).sizes).to.be.an('undefined');
    });

    it('should not contain a userId when userId is not set', function() {
      delete bidRequests[0].userId;
      delete bidRequests[1].userId;
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(requests[0].data).userId).to.be.an('undefined');
      expect(JSON.parse(requests[1].data).userId).to.be.an('undefined');
    });

    it('should have a post method', function() {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].method).to.equal('POST');
      expect(requests[1].method).to.equal('POST');
    });

    it('should contain a request id equals to the bid id', function() {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(requests[0].data).requestId).to.equal(bidRequests[0].bidId);
      expect(JSON.parse(requests[1].data).requestId).to.equal(bidRequests[1].bidId);
    });

    it('should have an url that match the default endpoint', function() {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal('https://hb.adwmg.com/hb');
      expect(requests[1].url).to.equal('https://hb.adwmg.com/hb');
    });

    it('should contain GDPR consent data if GDPR set', function() {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(requests[0].data).gdpr.applies).to.be.true;
      expect(JSON.parse(requests[0].data).gdpr.consentString).to.equal(bidderRequest.gdprConsent.consentString);
      expect(JSON.parse(requests[1].data).gdpr.applies).to.be.true;
      expect(JSON.parse(requests[1].data).gdpr.consentString).to.equal(bidderRequest.gdprConsent.consentString);
    })

    it('should not contain GDPR consent data if GDPR not set', function() {
      delete bidderRequest.gdprConsent;
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(requests[0].data).gdpr).to.be.an('undefined');
      expect(JSON.parse(requests[1].data).gdpr).to.be.an('undefined');
    })

    it('should set debug mode in requests if enabled', function() {
      sinon.stub(config, 'getConfig').withArgs('debug').returns(true);
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(requests[0].data).debug).to.be.true;
      expect(JSON.parse(requests[1].data).debug).to.be.true;
      config.getConfig.restore();
    })
  });

  describe('interpretResponse', function () {
    let serverResponse;
    beforeEach(function() {
      serverResponse = {
        body: {
          'requestId': 'request-id',
          'cpm': 100,
          'width': 300,
          'height': 250,
          'ad': '<div>ad</div>',
          'ttl': 300,
          'creativeId': 'creative-id',
          'netRevenue': true,
          'currency': 'USD',
          'adomain': ['testdomain.com']
        }
      };
    });

    it('should return a valid response', () => {
      var responses = spec.interpretResponse(serverResponse);
      expect(responses).to.be.an('array').that.is.not.empty;

      let response = responses[0];
      expect(response).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'meta', 'ad', 'ttl', 'creativeId',
        'netRevenue', 'currency');
      expect(response.requestId).to.equal('request-id');
      expect(response.cpm).to.equal(100);
      expect(response.width).to.equal(300);
      expect(response.height).to.equal(250);
      expect(response.ad).to.equal('<div>ad</div>');
      expect(response.ttl).to.equal(300);
      expect(response.creativeId).to.equal('creative-id');
      expect(response.netRevenue).to.be.true;
      expect(response.currency).to.equal('USD');
      expect(response.meta.advertiserDomains[0]).to.equal('testdomain.com');
      expect(response.meta.mediaType).to.equal('banner');
    });

    it('should return an empty array when serverResponse is empty', () => {
      serverResponse = {};
      var responses = spec.interpretResponse(serverResponse);
      expect(responses).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('should return nothing when sync is disabled', function () {
      const syncOptions = {
        'iframeEnabled': false,
        'pixelEnabled': false
      };

      let syncs = spec.getUserSyncs(syncOptions);
      expect(syncs).to.deep.equal([]);
    });

    it('should register iframe sync when only iframe is enabled', function () {
      const syncOptions = {
        'iframeEnabled': true,
        'pixelEnabled': false
      };

      let syncs = spec.getUserSyncs(syncOptions);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).includes('https://hb.adwmg.com/cphb.html?');
    });

    it('should register iframe sync when iframe and image are enabled', function () {
      const syncOptions = {
        'iframeEnabled': true,
        'pixelEnabled': true
      };

      let syncs = spec.getUserSyncs(syncOptions);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).includes('https://hb.adwmg.com/cphb.html?');
    });

    it('should send GDPR consent if enabled', function() {
      const syncOptions = {
        'iframeEnabled': true,
        'pixelEnabled': true
      };
      const gdprConsent = {
        consentString: 'CO9rhBTO9rhBTAcABBENBCCsAP_AAH_AACiQHItf_X_fb3_j-_59_9t0eY1f9_7_v20zjgeds-8Nyd_X_L8X42M7vB36pq4KuR4Eu3LBIQdlHOHcTUmw6IkVqTPsbk2Mr7NKJ7PEinMbe2dYGH9_n9XTuZKY79_s___z__-__v__7_f_r-3_3_vp9V---3YHIgEmGpfARZiWOBJNGlUKIEIVxIdACACihGFomsICVwU7K4CP0EDABAagIwIgQYgoxZBAAAAAElEQEgB4IBEARAIAAQAqQEIACNAEFgBIGAQACgGhYARQBCBIQZHBUcpgQESLRQTyVgCUXexhhCGUUANAg4AA.YAAAAAAAAAAA',
        vendorData: {},
        gdprApplies: true,
        apiVersion: 2
      };
      const serverResponse = {};
      let syncs = spec.getUserSyncs(syncOptions, serverResponse, gdprConsent);
      expect(syncs[0].url).includes('gdpr=1');
      expect(syncs[0].url).includes(`gdpr_consent=${gdprConsent.consentString}`);
    });

    it('should not add GDPR consent params twice', function() {
      const syncOptions = {
        'iframeEnabled': true,
        'pixelEnabled': true
      };
      const gdprConsent = {
        consentString: 'CO9rhBTO9rhBTAcABBENBCCsAP_AAH_AACiQHItf_X_fb3_j-_59_9t0eY1f9_7_v20zjgeds-8Nyd_X_L8X42M7vB36pq4KuR4Eu3LBIQdlHOHcTUmw6IkVqTPsbk2Mr7NKJ7PEinMbe2dYGH9_n9XTuZKY79_s___z__-__v__7_f_r-3_3_vp9V---3YHIgEmGpfARZiWOBJNGlUKIEIVxIdACACihGFomsICVwU7K4CP0EDABAagIwIgQYgoxZBAAAAAElEQEgB4IBEARAIAAQAqQEIACNAEFgBIGAQACgGhYARQBCBIQZHBUcpgQESLRQTyVgCUXexhhCGUUANAg4AA.YAAAAAAAAAAA',
        vendorData: {},
        gdprApplies: true,
        apiVersion: 2
      };
      const gdprConsent2 = {
        consentString: 'CO9rhBTO9rhBTAcABBENBCCsAP_AAH_AACiQHItf_7_fb3_j-_59_9t0eY1f9_7_v20zjgeds-8Nyd_X_L8X42M7vB36pq4KuR4Eu3LBIQdlHOHcTUmw6IkVqTPsbk2Mr7NKJ7PEinMbe2dYGH9_n9XTuZKY79_s___z__-__v__7_f_r-3_3_vp9V---3YHIgEmGpfARZiWOBJNGlUKIEIVxIdACACihGFomsICVwU7K4CP0EDABAagIwIgQYgoxZBAAAAAElEQEgB4IBEARAIAAQAqQEIACNAEFgBIGAQACgGhYARQBCBIQZHBUcpgQESLRQTyVgCUXexhhCGUUANAg4AA.YAAAAAAAAAAA',
        vendorData: {},
        gdprApplies: true,
        apiVersion: 2
      };
      const serverResponse = {};
      let syncs = spec.getUserSyncs(syncOptions, serverResponse, gdprConsent);
      syncs = spec.getUserSyncs(syncOptions, serverResponse, gdprConsent2);
      expect(syncs[0].url.match(/gdpr/g).length).to.equal(2); // gdpr + gdpr_consent
      expect(syncs[0].url.match(/gdpr_consent/g).length).to.equal(1);
    });

    it('should delete \'&\' symbol at the end of usersync URL', function() {
      const syncOptions = {
        'iframeEnabled': true,
        'pixelEnabled': true
      };
      const gdprConsent = {
        consentString: 'CO9rhBTO9rhBTAcABBENBCCsAP_AAH_AACiQHItf_X_fb3_j-_59_9t0eY1f9_7_v20zjgeds-8Nyd_X_L8X42M7vB36pq4KuR4Eu3LBIQdlHOHcTUmw6IkVqTPsbk2Mr7NKJ7PEinMbe2dYGH9_n9XTuZKY79_s___z__-__v__7_f_r-3_3_vp9V---3YHIgEmGpfARZiWOBJNGlUKIEIVxIdACACihGFomsICVwU7K4CP0EDABAagIwIgQYgoxZBAAAAAElEQEgB4IBEARAIAAQAqQEIACNAEFgBIGAQACgGhYARQBCBIQZHBUcpgQESLRQTyVgCUXexhhCGUUANAg4AA.YAAAAAAAAAAA',
        vendorData: {},
        gdprApplies: true,
        apiVersion: 2
      };
      const serverResponse = {};
      let syncs = spec.getUserSyncs(syncOptions, serverResponse, gdprConsent);
      expect(syncs[0].url.slice(-1)).to.not.equal('&');
    });
  });
});
