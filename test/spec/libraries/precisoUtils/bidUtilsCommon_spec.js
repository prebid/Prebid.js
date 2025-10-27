import {expect} from 'chai';

import { BANNER } from '../../../../src/mediaTypes.js';
import * as utils from '../../../../src/utils.js';
import { interpretResponse, isBidRequestValid, buildUserSyncs, buildBidRequests, bidWinReport } from '../../../../libraries/precisoUtils/bidUtilsCommon.js';

const BIDDER_CODE = 'bidder';
const TESTDOMAIN = 'test.org'
const AD_URL = `https://${TESTDOMAIN}/pbjs`;
const SYNC_URL = `https://${TESTDOMAIN}/sync`;

describe('bidUtilsCommon', function () {
  const bid = {
    bidId: '23dc19818e5293',
    bidder: BIDDER_CODE,
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 250]]
      }
    },
    params: {
      placementId: 23611,
    }
  };

  const bidderRequest = {
    refererInfo: {
      referer: 'test.com'
    }
  };

  const spec = {
    isBidRequestValid: isBidRequestValid,
    buildRequests: buildBidRequests(AD_URL),
    interpretResponse,
    getUserSyncs: buildUserSyncs,
    onBidWon: bidWinReport
  };

  describe('isBidRequestValid', function () {
    it('Should return true if there are bidId, params and key parameters present', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false if at least one of parameters is not present', function () {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests([bid], bidderRequest);
    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'language', 'host', 'page', 'placements');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      expect(data.gdpr).to.not.exist;
      expect(data.ccpa).to.not.exist;
      let placement = data['placements'][0];
      expect(placement).to.have.keys('placementId', 'bidId', 'adFormat', 'sizes', 'schain', 'bidfloor');
      expect(placement.placementId).to.equal(23611);
      expect(placement.bidId).to.equal('23dc19818e5293');
      expect(placement.adFormat).to.equal(BANNER);
      expect(placement.schain).to.be.an('object');
      expect(placement.sizes).to.be.an('array');
      expect(placement.bidfloor).to.exist.and.to.equal(0);
    });

    it('Returns data with gdprConsent and without uspConsent', function () {
      bidderRequest.gdprConsent = 'test';
      serverRequest = spec.buildRequests([bid], bidderRequest);
      let data = serverRequest.data;
      expect(data.gdpr).to.exist;
      expect(data.gdpr).to.be.a('string');
      expect(data.gdpr).to.equal(bidderRequest.gdprConsent);
      expect(data.ccpa).to.not.exist;
      delete bidderRequest.gdprConsent;
    });

    it('Returns data with uspConsent and without gdprConsent', function () {
      bidderRequest.uspConsent = 'test';
      serverRequest = spec.buildRequests([bid], bidderRequest);
      let data = serverRequest.data;
      expect(data.ccpa).to.exist;
      expect(data.ccpa).to.be.a('string');
      expect(data.ccpa).to.equal(bidderRequest.uspConsent);
      expect(data.gdpr).to.not.exist;
    });

    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let data = serverRequest.data;
      expect(data.placements).to.be.an('array').that.is.empty;
    });
  });
  describe('interpretResponse', function () {
    it('Should interpret banner response', function () {
      const banner = {
        body: [{
          mediaType: 'banner',
          width: 300,
          height: 250,
          cpm: 0.4,
          ad: 'Test',
          requestId: '23dc19818e5293',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1',
          meta: {}
        }]
      };
      let bannerResponses = spec.interpretResponse(banner);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType', 'meta');
      expect(dataItem.requestId).to.equal('23dc19818e5293');
      expect(dataItem.cpm).to.equal(0.4);
      expect(dataItem.width).to.equal(300);
      expect(dataItem.height).to.equal(250);
      expect(dataItem.ad).to.equal('Test');
      expect(dataItem.ttl).to.equal(120);
      expect(dataItem.creativeId).to.equal('2');
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal('USD');
      expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
    });
    it('Should return an empty array if invalid banner response is passed', function () {
      const invBanner = {
        body: [{
          width: 300,
          cpm: 0.4,
          ad: 'Test',
          requestId: '23dc19818e5293',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      };

      let serverResponses = spec.interpretResponse(invBanner);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
    it('Should return an empty array if invalid response is passed', function () {
      const invalid = {
        body: [{
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      };
      let serverResponses = spec.interpretResponse(invalid);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', function () {
    it('should do nothing on getUserSyncs', function () {
      const syncData = spec.getUserSyncs({}, {}, {
        consentString: 'ALL',
        gdprApplies: true
      }, {}, SYNC_URL);
      expect(syncData).to.be.an('array').which.is.not.empty;
      expect(syncData[0]).to.be.an('object')
      expect(syncData[0].type).to.be.a('string')
      expect(syncData[0].type).to.equal('image')
      expect(syncData[0].url).to.be.a('string')
      expect(syncData[0].url).to.equal(`https://${TESTDOMAIN}/sync/image?pbjs=1&gdpr=1&gdpr_consent=ALL&coppa=0`)
    });
  });

  describe('on bidWon', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('should replace nurl for banner', function () {
      const nurl = 'nurl/?ap=${' + 'AUCTION_PRICE}';
      const bid = {
        'bidderCode': 'redtram',
        'width': 300,
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '5691dd18ba6ab6',
        'requestId': '23dc19818e5293',
        'transactionId': '948c716b-bf64-4303-bcf4-395c2f6a9770',
        'auctionId': 'a6b7c61f-15a9-481b-8f64-e859787e9c07',
        'mediaType': 'banner',
        'source': 'client',
        'ad': "<div class=\"r23611\"></div>\n<script type=\"text/javascript\">\n(function() {\nvar tag = (function() {\nvar informers = document.getElementsByClassName('r23611'),\nlen = informers.length;\nreturn len ? informers[len - 1] : null;\n})(),\nidn = (function() {\nvar i, num, idn = '', chars = \"abcdefghiklmnopqrstuvwxyz\",\nlen = Math.floor((Math.random() * 2) + 4);\nfor (i = 0; i < len; i++) {\nnum = Math.floor(Math.random() * chars.length);\nidn += chars.substring(num, num + 1);\n}\nreturn idn;\n})();\nvar container = document.createElement('div');\ncontainer.id = idn;\ntag.appendChild(container);\nvar script = document.createElement('script');\nscript.className = 's23611';\nscript.src = 'https://goods.redtram.com/j/23611/?v=1';\nscript.charset = 'utf-8';\nscript.dataset.idn = idn;\ntag.parentNode.insertBefore(script, tag);\n})();\n</script>",
        'cpm': 0.68,
        'nurl': nurl,
        'creativeId': 'test',
        'currency': 'USD',
        'dealId': '',
        'meta': {
          'advertiserDomains': [],
          'dchain': {
            'ver': '1.0',
            'complete': 0,
            'nodes': [
              {
                'name': 'redtram'
              }
            ]
          }
        },
        'netRevenue': true,
        'ttl': 120,
        'metrics': {},
        'adapterCode': 'redtram',
        'originalCpm': 0.68,
        'originalCurrency': 'USD',
        'responseTimestamp': 1668162732297,
        'requestTimestamp': 1668162732292,
        'bidder': 'redtram',
        'adUnitCode': 'div-prebid',
        'timeToRespond': 5,
        'pbLg': '0.50',
        'pbMg': '0.60',
        'pbHg': '0.68',
        'pbAg': '0.65',
        'pbDg': '0.68',
        'pbCg': '',
        'size': '300x250',
        'adserverTargeting': {
          'hb_bidder': 'redtram',
          'hb_adid': '5691dd18ba6ab6',
          'hb_pb': '0.68',
          'hb_size': '300x250',
          'hb_source': 'client',
          'hb_format': 'banner',
          'hb_adomain': ''
        },
        'status': 'rendered',
        'params': [
          {
            'placementId': 23611
          }
        ]
      };
      spec.onBidWon(bid);
      expect(bid.nurl).to.deep.equal('nurl/?ap=0.68');
    });
  });
});
