import { expect} from 'chai';
import { spec } from 'modules/widespaceBidAdapter';

describe('+widespaceAdatperTest', () => {
  const bidRequest = [{
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'auctionId': 'bf1e57ee-fff2-4304-8143-91aaf423a948',
    'bidId': '4045696e2278cd',
    'bidder': 'widespace',
    'params': {
      sid: '7b6589bf-95c8-4656-90b9-af9737bb9ad3',
      currency: 'EUR'
    },
    'bidderRequestId': '37a5f053efef34',
    'sizes': [[320, 320], [300, 250], [300, 300]],
    'transactionId': '4f68b713-04ba-4d7f-8df9-643bcdab5efb'
  }];

  const bidResponse = {
    body: [{
      'adId': '12345',
      'code': '<div></div>',
      'width': 300,
      'height': 300,
      'cpm': 6.6,
      'currency': 'EUR',
      'status': 'ad',
      'reqId': '4234324234'
    }],
    headers: {}
  };

  const bidResponseNoAd = {
    body: [{
      'status': 'noad',
    }],
    headers: {}
  };

  describe('+bidRequestValidity', () => {
    it('bidRequest with sid and currency params', () => {
      expect(spec.isBidRequestValid({
        bidder: 'widespace',
        params: {
          sid: '7b6589bf-95c8-4656-90b9-af9737bb9ad3',
          currency: 'EUR'
        }
      })).to.equal(true);
    });

    it('-bidRequest with missing sid', () => {
      expect(spec.isBidRequestValid({
        bidder: 'widespace',
        params: {
          currency: 'EUR'
        }
      })).to.equal(false);
    });

    it('-bidRequest with missing currency', () => {
      expect(spec.isBidRequestValid({
        bidder: 'widespace',
        params: {
          sid: '7b6589bf-95c8-4656-90b9-af9737bb9ad3'
        }
      })).to.equal(true);
    });
  });

  describe('+bidRequest', () => {
    const request = spec.buildRequests(bidRequest);
    const UrlRegExp = /^((ftp|http|https):)?\/\/[^ "]+$/;

    it('-bidRequest method is POST', () => {
      expect(request[0].method).to.equal('POST');
    });

    it('-bidRequest url is valid', () => {
      expect(UrlRegExp.test(request[0].url)).to.equal(true);
    });

    it('-bidRequest data exist', () => {
      expect(request[0].data).to.exists;
    });

    it('-bidRequest data is form data', () => {
      expect(typeof request[0].data).to.equal('string');
    });

    it('-bidRequest options have header type', () => {
      expect(request[0].options.contentType).to.exists;
    });
  });

  describe('+interpretResponse', () => {
    it('-required params available in response', () => {
      const result = spec.interpretResponse(bidResponse, bidRequest);
      let requiredKeys = [
        'requestId',
        'cpm',
        'width',
        'height',
        'creativeId',
        'currency',
        'netRevenue',
        'ttl',
        'referrer',
        'ad'
      ];
      const resultKeys = Object.keys(result[0]);
      requiredKeys.forEach(function(key) {
        expect(resultKeys.includes(key)).to.equal(true);
      });
    });

    it('-empty result if noad responded', () => {
      const noAdResult = spec.interpretResponse(bidResponseNoAd, bidRequest);
      expect(noAdResult.length).to.equal(0);
    });
  });
});
