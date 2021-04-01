import { expect } from 'chai';
import { spec } from 'modules/adriverBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';
import { auctionManager } from 'src/auctionManager.js';
const ENDPOINT = 'https://pb.adriver.ru/cgi-bin/bid.cgi';

describe('adriverAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'adriver',
      'params': {
        'placementId': '55:test_placement',
        'siteid': 'testSiteID'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600], [300, 250]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let getAdUnitsStub;
    let bidRequests = [
      {
        'bidder': 'adriver',
        'params': {
          'placementId': '55:test_placement',
          'siteid': 'testSiteID',
          'bidfloor': 3,
          'dealid': 'dealidTest'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600], [300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];

    beforeEach(function() {
      getAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits').callsFake(function() {
        return [];
      });
    });

    afterEach(function() {
      getAdUnitsStub.restore();
    });

    it('should exist currency', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.cur).to.exist;
    });

    it('should exist at', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.at).to.exist;
      expect(payload.at).to.deep.equal(1);
    });

    it('should parse imp', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0]).to.exist;
      expect(payload.imp[0].id).to.deep.equal('55:test_placement');

      expect(payload.imp[0].ext).to.exist;
      expect(payload.imp[0].ext.query).to.deep.equal('bn=15&custom=111=' + '30b31c1838de1e');

      expect(payload.imp[0].banner).to.exist;
      expect(payload.imp[0].banner.w).to.deep.equal(300);
      expect(payload.imp[0].banner.h).to.deep.equal(250);
    });

    it('should parse pmp', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].pmp).to.exist;

      expect(payload.imp[0].pmp.deals).to.exist;

      expect(payload.imp[0].pmp.deals[0].bidfloor).to.exist;
      expect(payload.imp[0].pmp.deals[0].bidfloor).to.deep.equal(3);

      expect(payload.imp[0].pmp.deals[0].bidfloorcur).to.exist;
      expect(payload.imp[0].pmp.deals[0].bidfloorcur).to.deep.equal('RUB');
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', function () {
    let bfStub;
    before(function() {
      bfStub = sinon.stub(bidderFactory, 'getIabSubCategory');
    });

    after(function() {
      bfStub.restore();
    });

    let response = {
      'id': '221594457-1615288400-1-46-',
      'bidid': 'D8JW8XU8-L5m7qFMNQGs7i1gcuPvYMEDOKsktw6e9uLy5Eebo9HftVXb0VpKj4R2dXa93i6QmRhjextJVM4y1SqodMAh5vFOb_eVkHA',
      'seatbid': [{
        'bid': [{
          'id': '1',
          'impid': '/19968336/header-bid-tag-0',
          'price': 4.29,
          'h': 250,
          'w': 300,
          'adid': '7121351',
          'adomain': ['http://ikea.com'],
          'nurl': 'https://ad.adriver.ru/cgi-bin/erle.cgi?expid=D8JW8XU8-L5m7qFMNQGs7i1gcuPvYMEDOKsktw6e9uLy5Eebo9HftVXb0VpKj4R2dXa93i6QmRhjextJVM4y1SqodMAh5vFOb_eVkHA&bid=7121351&wprc=4.29&tuid=-1&custom=207=/19968336/header-bid-tag-0',
          'cid': '717570',
          'ext': '2c262a7058758d'
        }]
      }, {
        'bid': [{
          'id': '1',
          'impid': '/19968336/header-bid-tag-0',
          'price': 17.67,
          'h': 600,
          'w': 300,
          'adid': '7121369',
          'adomain': ['http://ikea.com'],
          'nurl': 'https://ad.adriver.ru/cgi-bin/erle.cgi?expid=DdtToXX5cpTaMMxrJSEsOsUIXt3WmC3jOvuNI5DguDrY8edFG60Jg1M-iMkVNKQ4OiAdHSLPJLQQXMUXZfI9VbjMoGCb-zzOTPiMpshI&bid=7121369&wprc=17.67&tuid=-1&custom=207=/19968336/header-bid-tag-0',
          'cid': '717570',
          'ext': '2c262a7058758d'
        }]
      }],
      'cur': 'RUB'
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          requestId: '2c262a7058758d',
          cpm: 4.29,
          width: 300,
          height: 250,
          creativeId: '/19968336/header-bid-tag-0',
          currency: 'RUB',
          netRevenue: true,
          ttl: 3000,
          ad: '<IFRAME SRC="https://ad.adriver.ru/cgi-bin/erle.cgi?expid=D8JW8XU8-L5m7qFMNQGs7i1gcuPvYMEDOKsktw6e9uLy5Eebo9HftVXb0VpKj4R2dXa93i6QmRhjextJVM4y1SqodMAh5vFOb_eVkHA&bid=7121351&wprc=4.29&tuid=-1&custom=207=/19968336/header-bid-tag-0" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" STYLE ="WIDTH:300px; HEIGHT:250px"></IFRAME>'
        }
      ];
      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code'
        }]
      };
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      let response = {
        'version': '0.0.1',
        'tags': [{
          'uuid': '84ab500420319d',
          'tag_id': 5976557,
          'auction_id': '297492697822162468',
          'nobid': true
        }]
      };
      let bidderRequest;

      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });
});
