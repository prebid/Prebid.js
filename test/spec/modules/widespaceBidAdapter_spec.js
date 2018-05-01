import { expect } from 'chai';
import { spec } from 'modules/widespaceBidAdapter';
import includes from 'core-js/library/fn/array/includes';

describe('+widespaceAdatperTest', () => {
  // Dummy bid request
  const bidRequest = [{
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'auctionId': 'bf1e57ee-fff2-4304-8143-91aaf423a948',
    'bidId': '4045696e2278cd',
    'bidder': 'widespace',
    'params': {
      sid: '7b6589bf-95c8-4656-90b9-af9737bb9ad3',
      currency: 'EUR',
      demo: {
        gender: 'M',
        country: 'Sweden',
        region: 'Stockholm',
        postal: '15115',
        city: 'Stockholm',
        yob: '1984'
      }
    },
    'bidderRequestId': '37a5f053efef34',
    'sizes': [[320, 320], [300, 250], [300, 300]],
    'transactionId': '4f68b713-04ba-4d7f-8df9-643bcdab5efb'
  }, {
    'adUnitCode': 'div-gpt-ad-1460505748561-1',
    'auctionId': 'bf1e57ee-fff2-4304-8143-91aaf423a944',
    'bidId': '4045696e2278ab',
    'bidder': 'widespace',
    'params': {
      sid: '7b6589bf-95c8-4656-90b9-af9737bb9ad4',
      demo: {
        gender: 'M',
        country: 'Sweden',
        region: 'Stockholm',
        postal: '15115',
        city: 'Stockholm',
        yob: '1984'
      }
    },
    'bidderRequestId': '37a5f053efef34',
    'sizes': [[300, 300]],
    'transactionId': '4f68b713-04ba-4d7f-8df9-643bcdab5efv'
  }];

  // Dummy bid response with ad code
  const bidResponse = {
    body: [{
      'adId': '12345',
      'bidId': '67890',
      'code': '<div></div>',
      'cpm': 6.6,
      'currency': 'EUR',
      'height': 300,
      'netRev': true,
      'reqId': '224804081406',
      'status': 'ad',
      'ttl': 30,
      'width': 300,
      'syncPixels': ['https://url1.com/url', 'https://url2.com/url']
    }],
    headers: {}
  };

  // Dummy bid response of noad
  const bidResponseNoAd = {
    body: [{
      'status': 'noad',
    }],
    headers: {}
  };

  // Appending a div with id of adUnitCode so we can calculate vol
  const div1 = document.createElement('div');
  div1.id = bidRequest[0].adUnitCode;
  document.body.appendChild(div1);
  const div2 = document.createElement('div');
  div2.id = bidRequest[0].adUnitCode;
  document.body.appendChild(div2);

  // Adding custom data cookie se we can test cookie is readable
  const theDate = new Date();
  const expDate = new Date(theDate.setMonth(theDate.getMonth() + 1)).toGMTString();
  window.document.cookie = `wsCustomData1={id: test};path=/;expires=${expDate};`;
  const PERF_DATA = JSON.stringify({perf_status: 'OK', perf_reqid: '226920425154', perf_ms: '747'});
  window.document.cookie = `wsPerfData123=${PERF_DATA};path=/;expires=${expDate};`;

  // Connect dummy data test
  const CONNECTION = navigator.connection || navigator.webkitConnection;
  if (CONNECTION && CONNECTION.type && CONNECTION.downlinkMax) {
    navigator.connection.downlinkMax = 80;
    navigator.connection.type = 'wifi';
  }

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

    it('-cookie test for wsCustomData ', () => {
      expect(request[0].data.indexOf('hb.cd') > -1).to.equal(true);
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
      requiredKeys.forEach((key) => {
        expect(includes(resultKeys, key)).to.equal(true);
      });

      // Each value except referrer should not be empty|null|undefined
      result.forEach((res) => {
        Object.keys(res).forEach((resKey) => {
          if (resKey !== 'referrer') {
            expect(res[resKey]).to.not.be.null;
            expect(res[resKey]).to.not.be.undefined;
            expect(res[resKey]).to.not.equal('');
          }
        });
      });
    });

    it('-empty result if noad responded', () => {
      const noAdResult = spec.interpretResponse(bidResponseNoAd, bidRequest);
      expect(noAdResult.length).to.equal(0);
    });

    it('-empty response should not breake anything in adapter', () => {
      const noResponse = spec.interpretResponse({}, bidRequest);
      expect(noResponse.length).to.equal(0);
    });
  });

  describe('+getUserSyncs', () => {
    it('-always return an array', () => {
      const userSync_test1 = spec.getUserSyncs({}, [bidResponse]);
      expect(Array.isArray(userSync_test1)).to.equal(true);

      const userSync_test2 = spec.getUserSyncs({}, [bidResponseNoAd]);
      expect(Array.isArray(userSync_test2)).to.equal(true);

      const userSync_test3 = spec.getUserSyncs({}, [bidResponse, bidResponseNoAd]);
      expect(Array.isArray(userSync_test3)).to.equal(true);

      const userSync_test4 = spec.getUserSyncs();
      expect(Array.isArray(userSync_test4)).to.equal(true);

      const userSync_test5 = spec.getUserSyncs({}, []);
      expect(Array.isArray(userSync_test5)).to.equal(true);
    });
  });
});
