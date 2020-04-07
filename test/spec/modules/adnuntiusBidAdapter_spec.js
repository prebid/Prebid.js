// import or require modules necessary for the test, e.g.:
import { expect } from 'chai'; // may prefer 'assert' in place of 'expect'
import { spec } from 'modules/adnuntiusBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('adnuntiusBidAdapter', function () {
  const ENDPOINT_URL = 'https://delivery.adnuntius.com/i?tzo=-60&format=json';
  const adapter = newBidder(spec);
  const bidRequests = [
    {
      bidder: 'adnuntius',
      params: {
        auId: '8b6bc',
        network: 'adnuntius',
      },
      bidId: '123'
    }
  ];

  const serverResponse = {
    body: {
      'adUnits': [
        {
          'auId': '000000000008b6bc',
          'targetId': '',
          'html': '<h1>hi!</h1>',
          'matchedAdCount': 1,
          'responseId': 'adn-rsp-1460129238',
          'ads': [
            {
              'destinationUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fc%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN%3Fct%3D2501%26r%3Dhttp%253A%252F%252Fgoogle.com',
              'assets': {
                'image': {
                  'cdnId': 'https://assets.adnuntius.com/oEmZa5uYjxENfA1R692FVn6qIveFpO8wUbpyF2xSOCc.jpg',
                  'width': '980',
                  'height': '120'
                }
              },
              'clickUrl': 'https://delivery.adnuntius.com/c/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'urls': {
                'destination': 'https://delivery.adnuntius.com/c/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN?ct=2501&r=http%3A%2F%2Fgoogle.com'
              },
              'urlsEsc': {
                'destination': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fc%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN%3Fct%3D2501%26r%3Dhttp%253A%252F%252Fgoogle.com'
              },
              'destinationUrls': {
                'destination': 'http://google.com'
              },
              'cpm': { 'amount': 5.0, 'currency': 'NOK' },
              'bid': { 'amount': 0.005, 'currency': 'NOK' },
              'cost': { 'amount': 0.005, 'currency': 'NOK' },
              'impressionTrackingUrls': [],
              'impressionTrackingUrlsEsc': [],
              'adId': 'adn-id-1347343135',
              'selectedColumn': '0',
              'selectedColumnPosition': '0',
              'renderedPixel': 'https://delivery.adnuntius.com/b/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN.html',
              'renderedPixelEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fb%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN.html',
              'visibleUrl': 'https://delivery.adnuntius.com/s?rt=52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'visibleUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fs%3Frt%3D52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'viewUrl': 'https://delivery.adnuntius.com/v?rt=52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'viewUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fv%3Frt%3D52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'rt': '52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'creativeWidth': '980',
              'creativeHeight': '120',
              'creativeId': 'wgkq587vgtpchsx1',
              'lineItemId': 'scyjdyv3mzgdsnpf',
              'layoutId': 'sw6gtws2rdj1kwby',
              'layoutName': 'Responsive image'
            }
          ]
        }
      ]
    }
  }

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bidRequests[0])).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('Test requests', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expect(request[0].url).to.equal(ENDPOINT_URL);
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{\"adUnits\":[{\"auId\":\"8b6bc\"}]}');
    });
  });

  describe('interpretResponse', function () {
    it('should return valid response when passed valid server response', function () {
      const request = spec.buildRequests(bidRequests);
      const interpretedResponse = spec.interpretResponse(serverResponse, request[0]);
      const ad = serverResponse.body.adUnits[0].ads[0]
      expect(interpretedResponse).to.have.lengthOf(1);
      expect(interpretedResponse[0].cpm).to.equal(ad.cpm.amount);
      expect(interpretedResponse[0].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[0].currency).to.equal(ad.cpm.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].ad).to.equal(serverResponse.body.adUnits[0].html);
      expect(interpretedResponse[0].ttl).to.equal(360);
    });
  });
});
