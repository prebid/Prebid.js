import {expect} from 'chai';
import {spec} from 'modules/fluctBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';

describe('fluctAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'fluct',
      params: {
        dfpUnitCode: '/1000/dfp_unit_code',
        tagId: '10000:100000001',
        groupId: '1000000002',
      }
    };
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when dfpUnitCode is not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        tagId: '10000:100000001',
        groupId: '1000000002',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when groupId is not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        dfpUnitCode: '/1000/dfp_unit_code',
        tagId: '10000:100000001',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      bidder: 'fluct',
      params: {
        dfpUnitCode: '/100000/unit_code',
        tagId: '10000:100000001',
        groupId: '1000000002',
      },
      adUnitCode: '/10000/unit_code',
      sizes: [[300, 250], [336, 280]],
      bidId: '237f4d1a293f99',
      bidderRequestId: '1a857fa34c1c96',
      auctionId: 'a297d1aa-7900-4ce4-a0aa-caa8d46c4af7',
      transactionId: '00b2896c-2731-4f01-83e4-7a3ad5da13b6',
    }];
    const bidderRequest = {
      refererInfo: {
        referer: 'http://example.com'
      }
    };

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', function() {
    const callBeaconSnippet = '<script type="application/javascript">' +
      '(function() { var img = new Image(); img.src = ' +
      '"https://i.adingo.jp/?test=1&et=hb&bidid=237f4d1a293f99"' +
      '})()</script>';

    it('should get correct bid response', function() {
      const bidRequest = {
        bidder: 'fluct',
        params: {
          dfpUnitCode: '/10000/unit_code',
          tagid: '10000:100000001',
          groupId: '1000000002',
        },
        adUnitCode: '/10000/unit_code',
        sizes: [[300, 250], [336, 280]],
        bidId: '237f4d1a293f99',
        bidderRequestId: '1a857fa34c1c96',
        auctionId: 'a297d1aa-7900-4ce4-a0aa-caa8d46c4af7',
        transactionId: '00b2896c-2731-4f01-83e4-7a3ad5da13b6',
      };

      const serverResponse = {
        body: {
          id: '237f4d1a293f99',
          cur: 'JPY',
          seatbid: [{
            bid: [{
              price: 100,
              w: 300,
              h: 250,
              adm: '<!-- test creative -->',
              burl: 'https://i.adingo.jp/?test=1&et=hb&bidid=237f4d1a293f99',
              crid: 'test_creative',
            }]
          }]
        }
      };

      const expectedResponse = [
        {
          bidderCode: 'fluct',
          requestId: '237f4d1a293f99',
          currency: 'JPY',
          cpm: 100,
          netRevenue: true,
          width: 300,
          height: 250,
          creativeId: 'test_creative',
          ttl: 300,
          ad: '<!-- test creative -->' + callBeaconSnippet,
        }
      ];

      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.have.lengthOf(1);
      expect(result).to.deep.have.same.members(expectedResponse);
    });

    it('should get correct bid response with dealId', function() {
      const bidRequest = {
        bidder: 'fluct',
        params: {
          dfpUnitCode: '/10000/unit_code',
          tagid: '10000:100000001',
          groupId: '1000000002'
        },
        adUnitCode: '/10000/unit_code',
        sizes: [[300, 250], [336, 280]],
        bidId: '237f4d1a293f99',
        bidderRequestId: '1a857fa34c1c96',
        auctionId: 'a297d1aa-7900-4ce4-a0aa-caa8d46c4af7',
        transactionId: '00b2896c-2731-4f01-83e4-7a3ad5da13b6',
      };

      const serverResponse = {
        body: {
          id: '237f4d1a293f99',
          cur: 'JPY',
          seatbid: [{
            bid: [{
              price: 100,
              w: 300,
              h: 250,
              adm: '<!-- test creative -->',
              burl: 'https://i.adingo.jp/?test=1&et=hb&bidid=237f4d1a293f99',
              crid: 'test_creative',
              dealid: 'test_deal',
            }]
          }]
        }
      };

      const expectedResponse = [
        {
          bidderCode: 'fluct',
          requestId: '237f4d1a293f99',
          currency: 'JPY',
          cpm: 100,
          netRevenue: true,
          width: 300,
          height: 250,
          creativeId: 'test_creative',
          ttl: 300,
          ad: '<!-- test creative -->' + callBeaconSnippet,
          dealId: 'test_deal',
        }
      ];

      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.have.lengthOf(1);
      expect(result).to.deep.have.same.members(expectedResponse);
    });

    it('should get empty response when bid server returns 204', function() {
      expect(spec.interpretResponse({})).to.be.empty;
    });
  });
});
