import { expect } from 'chai';
import { spec } from 'modules/rasBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const CSR_ENDPOINT = 'https://csr.onet.pl/4178463/csr-006/csr.json?nid=4178463&';

describe('rasBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const bid = {
        sizes: [[300, 250], [300, 600]],
        bidder: 'ras',
        params: {
          slot: 'slot',
          area: 'areatest',
          site: 'test',
          network: '4178463'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params not found', function () {
      const failBid = {
        sizes: [[300, 250], [300, 300]],
        bidder: 'ras',
        params: {
          site: 'test',
          network: '4178463'
        }
      };
      expect(spec.isBidRequestValid(failBid)).to.equal(false);
    });

    it('should return nothing when bid request is malformed', function () {
      const failBid = {
        sizes: [[300, 250], [300, 300]],
        bidder: 'ras',
      };
      expect(spec.isBidRequestValid(failBid)).to.equal(undefined);
    });
  });

  describe('buildRequests', function () {
    const bid = {
      sizes: [[300, 250], [300, 600]],
      bidder: 'ras',
      bidId: 1,
      params: {
        slot: 'test',
        area: 'areatest',
        site: 'test',
        slotSequence: '0',
        network: '4178463',
        customParams: {
          test: 'name=value'
        }
      }
    };
    const bid2 = {
      sizes: [[750, 300]],
      bidder: 'ras',
      bidId: 2,
      params: {
        slot: 'test2',
        area: 'areatest',
        site: 'test',
        network: '4178463'
      }
    };

    it('should parse bids to request', function () {
      const requests = spec.buildRequests([bid], {
        'gdprConsent': {
          'gdprApplies': true,
          'consentString': 'some-consent-string'
        },
        'refererInfo': {
          'ref': 'https://example.org/',
          'page': 'https://example.com/'
        }
      });
      expect(requests[0].url).to.have.string(CSR_ENDPOINT);
      expect(requests[0].url).to.have.string('slot0=test');
      expect(requests[0].url).to.have.string('id0=1');
      expect(requests[0].url).to.have.string('site=test');
      expect(requests[0].url).to.have.string('area=areatest');
      expect(requests[0].url).to.have.string('cre_format=html');
      expect(requests[0].url).to.have.string('systems=das');
      expect(requests[0].url).to.have.string('ems_url=1');
      expect(requests[0].url).to.have.string('bid_rate=1');
      expect(requests[0].url).to.have.string('gdpr_applies=true');
      expect(requests[0].url).to.have.string('euconsent=some-consent-string');
      expect(requests[0].url).to.have.string('du=https%3A%2F%2Fexample.com%2F');
      expect(requests[0].url).to.have.string('dr=https%3A%2F%2Fexample.org%2F');
      expect(requests[0].url).to.have.string('test=name%3Dvalue');
    });

    it('should return empty consent string when undefined', function () {
      const requests = spec.buildRequests([bid]);
      const gdpr = requests[0].url.search('gdpr_applies');
      const euconsent = requests[0].url.search('euconsent=');
      expect(gdpr).to.equal(-1);
      expect(euconsent).to.equal(-1);
    });

    it('should parse bids to request from pageContext', function () {
      const bidCopy = { ...bid };
      bidCopy.params = {
        ...bid.params,
        pageContext: {
          dv: 'test/areatest',
          du: 'https://example.com/',
          dr: 'https://example.org/',
          keyWords: ['val1', 'val2'],
          keyValues: {
            adunit: 'test/areatest'
          }
        }
      };
      const requests = spec.buildRequests([bidCopy, bid2]);
      expect(requests[0].url).to.have.string(CSR_ENDPOINT);
      expect(requests[0].url).to.have.string('slot0=test');
      expect(requests[0].url).to.have.string('id0=1');
      expect(requests[0].url).to.have.string('iusizes0=300x250%2C300x600');
      expect(requests[0].url).to.have.string('slot1=test2');
      expect(requests[0].url).to.have.string('id1=2');
      expect(requests[0].url).to.have.string('iusizes1=750x300');
      expect(requests[0].url).to.have.string('site=test');
      expect(requests[0].url).to.have.string('area=areatest');
      expect(requests[0].url).to.have.string('cre_format=html');
      expect(requests[0].url).to.have.string('systems=das');
      expect(requests[0].url).to.have.string('ems_url=1');
      expect(requests[0].url).to.have.string('bid_rate=1');
      expect(requests[0].url).to.have.string('du=https%3A%2F%2Fexample.com%2F');
      expect(requests[0].url).to.have.string('dr=https%3A%2F%2Fexample.org%2F');
      expect(requests[0].url).to.have.string('DV=test%2Fareatest');
      expect(requests[0].url).to.have.string('kwrd=val1%2Bval2');
      expect(requests[0].url).to.have.string('kvadunit=test%2Fareatest');
      expect(requests[0].url).to.have.string('pos0=0');
    });
  });

  describe('interpretResponse', function () {
    const response = {
      'adsCheck': 'ok',
      'geoloc': {},
      'ir': '92effd60-0c84-4dac-817e-763ea7b8ac65',
      'ads': [
        {
          'id': 'flat-belkagorna',
          'slot': 'flat-belkagorna',
          'prio': 10,
          'type': 'html',
          'bid_rate': 0.321123,
          'adid': 'das,50463,152276',
          'id_3': '12734',
          'html': '<script type=\"text/javascript\">test</script>'
        }
      ],
      'iv': '202003191334467636346500'
    };

    it('should get correct bid response', function () {
      const resp = spec.interpretResponse({ body: response }, { bidIds: [{ slot: 'flat-belkagorna', bidId: 1 }] });
      expect(resp[0]).to.have.all.keys('cpm', 'currency', 'netRevenue', 'requestId', 'ttl', 'width', 'height', 'creativeId', 'dealId', 'ad', 'meta');
      expect(resp.length).to.equal(1);
    });

    it('should handle empty ad', function () {
      let res = {
        'ads': [{
          type: 'empty'
        }]
      };
      const resp = spec.interpretResponse({ body: res }, {});
      expect(resp).to.deep.equal([]);
    });

    it('should handle empty server response', function () {
      let res = {
        'ads': []
      };
      const resp = spec.interpretResponse({ body: res }, {});
      expect(resp).to.deep.equal([]);
    });
  });
});
