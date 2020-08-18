import { expect } from 'chai';
import { spec } from 'modules/timBidAdapter.js';

describe('timAdapterTests', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with publisherid and placementCode params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'tim',
        params: {
          publisherid: 'testid',
          placementCode: 'testplacement'
        }
      })).to.equal(true);
    });

    it('bidRequest with only publisherid', function () {
      expect(spec.isBidRequestValid({
        bidder: 'tim',
        params: {
          publisherid: 'testid'
        }
      })).to.equal(false);
    });

    it('bidRequest with only placementCode', function () {
      expect(spec.isBidRequestValid({
        bidder: 'tim',
        params: {
          placementCode: 'testplacement'
        }
      })).to.equal(false);
    });

    it('bidRequest without params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'tim',
      })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const validBidRequests = [{
      'bidder': 'tim',
      'params': {'placementCode': 'placementCode', 'publisherid': 'testpublisherid'},
      'mediaTypes': {'banner': {'sizes': [[300, 250]]}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'sizes': [[300, 250]],
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    it('bidRequest method', function () {
      const requests = spec.buildRequests(validBidRequests);
      expect(requests[0].method).to.equal('GET');
    });

    it('bidRequest url', function () {
      const requests = spec.buildRequests(validBidRequests);
      expect(requests[0].url).to.exist;
    });

    it('bidRequest data', function () {
      const requests = spec.buildRequests(validBidRequests);
      expect(requests[0].data).to.exist;
    });

    it('bidRequest options', function () {
      const requests = spec.buildRequests(validBidRequests);
      expect(requests[0].options).to.exist;
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = {
      'method': 'GET',
      'url': 'https://bidder.url/api/prebid/testpublisherid/header-bid-tag-0?br=%7B%22id%22%3A%223a3ac0d7fc2548%22%2C%22imp%22%3A%5B%7B%22id%22%3A%22251b8a6d3aac3e%22%2C%22banner%22%3A%7B%22w%22%3A300%2C%22h%22%3A250%7D%2C%22tagid%22%3A%22header-bid-tag-0%22%7D%5D%2C%22site%22%3A%7B%22domain%22%3A%22www.chinatimes.com%22%2C%22page%22%3A%22https%3A%2F%2Fwww.chinatimes.com%2Fa%22%2C%22publisher%22%3A%7B%22id%22%3A%22testpublisherid%22%7D%7D%2C%22device%22%3A%7B%22language%22%3A%22en%22%2C%22w%22%3A300%2C%22h%22%3A250%2C%22js%22%3A1%2C%22ua%22%3A%22Mozilla%2F5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F71.0.3578.98%20Safari%2F537.36%22%7D%2C%22bidId%22%3A%22251b8a6d3aac3e%22%7D',
      'data': '',
      'options': {'withCredentials': false}
    };

    const serverResponse = {
      'body': {
        'id': 'id',
        'seatbid': []
      },
      'headers': {}
    };

    it('check empty array response', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    const validBidRequest = {
      'method': 'GET',
      'url': 'https://bidder.url/api/v2/services/prebid/testpublisherid/placementCodeTest?br=%7B%22id%22%3A%2248640869bd9db94%22%2C%22imp%22%3A%5B%7B%22id%22%3A%224746fcaa11197f3%22%2C%22banner%22%3A%7B%22w%22%3A300%2C%22h%22%3A250%7D%2C%22tagid%22%3A%22placementCodeTest%22%7D%5D%2C%22site%22%3A%7B%22domain%22%3A%22mediamart.tv%22%2C%22page%22%3A%22https%3A%2F%2Fmediamart.tv%2Fsas%2Ftests%2FDesktop%2Fcaesar%2Fdfptest.html%22%2C%22publisher%22%3A%7B%22id%22%3A%22testpublisherid%22%7D%7D%2C%22device%22%3A%7B%22language%22%3A%22en%22%2C%22w%22%3A300%2C%22h%22%3A250%2C%22js%22%3A1%2C%22ua%22%3A%22Mozilla%2F5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F71.0.3578.98%20Safari%2F537.36%22%7D%2C%22bidId%22%3A%224746fcaa11197f3%22%7D',
      'data': '',
      'options': {'withCredentials': false}
    };
    const validServerResponse = {
      'body': {'id': 'id',
        'seatbid': [
          {'bid': [{'id': 'id',
            'impid': 'impid',
            'price': 3,
            'nurl': 'https://bidder.url/api/v1/?price=${AUCTION_PRICE}&bidcur=USD&bidid=bidid=true',
            'adm': '<script type=\"text/javascript\" src=\"https://domain.com/Player.php"></script>',
            'adomain': [''],
            'cid': '1',
            'crid': '700',
            'w': 300,
            'h': 250
          }]}],
        'bidid': 'bidid',
        'cur': 'USD'
      },
      'headers': {}
    };
    it('required keys', function () {
      const result = spec.interpretResponse(validServerResponse, validBidRequest);

      let requiredKeys = [
        'requestId',
        'creativeId',
        'adId',
        'cpm',
        'width',
        'height',
        'currency',
        'netRevenue',
        'ttl',
        'ad'
      ];

      let resultKeys = Object.keys(result[0]);
      requiredKeys.forEach(function(key) {
        expect(resultKeys.indexOf(key) !== -1).to.equal(true);
      });
    })
  });

  describe('getUserSyncs', function () {
    it('check empty response getUserSyncs', function () {
      const result = spec.getUserSyncs('', '');
      expect(result).to.deep.equal([]);
    });
  });
});
