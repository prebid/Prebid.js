import { expect } from 'chai';
import { spec } from 'modules/coxBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { deepClone } from 'src/utils';

describe('CoxBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    const CONFIG = {
      'bidder': 'cox',
      'params': {
        'id': '8888',
        'siteId': '1000',
        'size': '300x250'
      }
    };

    it('should return true when required params present', function () {
      expect(spec.isBidRequestValid(CONFIG)).to.equal(true);
    });

    it('should return false when id param is missing', function () {
      let config = deepClone(CONFIG);
      config.params.id = null;

      expect(spec.isBidRequestValid(config)).to.equal(false);
    });

    it('should return false when size param is missing', function () {
      let config = deepClone(CONFIG);
      config.params.size = null;

      expect(spec.isBidRequestValid(config)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const PROD_DOMAIN = 'ad.afy11.net';
    const PPE_DOMAIN = 'ppe-ad.afy11.net';
    const STG_DOMAIN = 'staging-ad.afy11.net';

    const BID_INFO = [{
      'bidder': 'cox',
      'params': {
        'id': '8888',
        'siteId': '1000',
        'size': '300x250'
      },
      'sizes': [[300, 250]],
      'transactionId': 'tId-foo',
      'bidId': 'bId-bar'
    }];

    it('should send bid request to PROD_DOMAIN via GET', function () {
      let request = spec.buildRequests(BID_INFO);
      expect(request.url).to.have.string(PROD_DOMAIN);
      expect(request.method).to.equal('GET');
    });

    it('should send bid request to PPE_DOMAIN when configured', function () {
      let clone = deepClone(BID_INFO);
      clone[0].params.env = 'PPE';

      let request = spec.buildRequests(clone);
      expect(request.url).to.have.string(PPE_DOMAIN);
    });

    it('should send bid request to STG_DOMAIN when configured', function () {
      let clone = deepClone(BID_INFO);
      clone[0].params.env = 'STG';

      let request = spec.buildRequests(clone);
      expect(request.url).to.have.string(STG_DOMAIN);
    });

    it('should return empty when id is invalid', function () {
      let clone = deepClone(BID_INFO);
      clone[0].params.id = null;

      let request = spec.buildRequests(clone);
      expect(request).to.be.an('object').that.is.empty;
    });

    it('should return empty when size is invalid', function () {
      let clone = deepClone(BID_INFO);
      clone[0].params.size = 'FOO';

      let request = spec.buildRequests(clone);
      expect(request).to.be.an('object').that.is.empty;
    });
  })

  describe('interpretResponse', function () {
    const BID_INFO_1 = [{
      'bidder': 'cox',
      'params': {
        'id': '2000005657007',
        'siteId': '2000101880180',
        'size': '728x90'
      },
      'transactionId': 'foo_1',
      'bidId': 'bar_1'
    }];

    const BID_INFO_2 = [{
      'bidder': 'cox',
      'params': {
        'id': '2000005658887',
        'siteId': '2000101880180',
        'size': '300x250'
      },
      'transactionId': 'foo_2',
      'bidId': 'bar_2'
    }];

    const RESPONSE_1 = { body: {
      'zones': {
        'as2000005657007': {
          'price': 1.88,
          'dealid': 'AA128460',
          'ad': '<H1>2000005657007<br/>728x90</H1>',
          'adid': '7007-728-90'
        }}}};

    const RESPONSE_2 = { body: {
      'zones': {
        'as2000005658887': {
          'price': 2.88,
          'ad': '<H1>2000005658887<br/>300x250</H1>',
          'adid': '888-88'
        }}}};

    const PBJS_BID_1 = {
      'requestId': 'bar_1',
      'cpm': 1.88,
      'width': '728',
      'height': '90',
      'creativeId': '7007-728-90',
      'dealId': 'AA128460',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 300,
      'ad': '<H1>2000005657007<br/>728x90</H1>'
    };

    const PBJS_BID_2 = {
      'requestId': 'bar_2',
      'cpm': 2.88,
      'width': '300',
      'height': '250',
      'creativeId': '888-88',
      'dealId': undefined,
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 300,
      'ad': '<H1>2000005658887<br/>300x250</H1>'
    };

    it('should return correct pbjs bid', function () {
      let result = spec.interpretResponse(RESPONSE_2, spec.buildRequests(BID_INFO_2));
      expect(result[0]).to.eql(PBJS_BID_2);
    });

    it('should handle multiple bid instances', function () {
      let request1 = spec.buildRequests(BID_INFO_1);
      let request2 = spec.buildRequests(BID_INFO_2);

      let result2 = spec.interpretResponse(RESPONSE_2, request2);
      expect(result2[0]).to.eql(PBJS_BID_2);

      let result1 = spec.interpretResponse(RESPONSE_1, request1);
      expect(result1[0]).to.eql(PBJS_BID_1);
    });

    it('should return empty when price is zero', function () {
      let clone = deepClone(RESPONSE_1);
      clone.body.zones.as2000005657007.price = 0;

      let result = spec.interpretResponse(clone, spec.buildRequests(BID_INFO_1));
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty when there is no ad', function () {
      let clone = deepClone(RESPONSE_1);
      clone.body.zones.as2000005657007.ad = null;

      let result = spec.interpretResponse(clone, spec.buildRequests(BID_INFO_1));
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty when there is no ad unit info', function () {
      let clone = deepClone(RESPONSE_1);
      delete (clone.body.zones.as2000005657007);

      let result = spec.interpretResponse(clone, spec.buildRequests(BID_INFO_1));
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', function () {
    const RESPONSE = [{ body: {
      'zones': {},
      'tpCookieSync': ['http://pixel.foo.com/', 'http://pixel.bar.com/']
    }}];

    it('should return correct pbjs syncs when pixels are enabled', function () {
      let syncs = spec.getUserSyncs({ pixelEnabled: true }, RESPONSE);

      expect(syncs.map(x => x.type)).to.eql(['image', 'image']);
      expect(syncs.map(x => x.url)).to.have.members(['http://pixel.bar.com/', 'http://pixel.foo.com/']);
    });

    it('should return empty when pixels are not enabled', function () {
      let syncs = spec.getUserSyncs({ pixelEnabled: false }, RESPONSE);

      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should return empty when response has no sync data', function () {
      let clone = deepClone(RESPONSE);
      delete (clone[0].body.tpCookieSync);

      let syncs = spec.getUserSyncs({ pixelEnabled: true }, clone);
      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should return empty when response is empty', function () {
      let syncs = spec.getUserSyncs({ pixelEnabled: true }, [{}]);
      expect(syncs).to.be.an('array').that.is.empty;
    });
  });
});
