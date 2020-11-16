import { expect } from 'chai';
import { spec } from 'modules/vmgBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('VmgAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  })

  describe('isBidRequestValid', function () {
    let bidRequest = {
      adUnitCode: 'div-0',
      auctionId: 'd69cdd3f-75e3-42dc-b313-e54c0a99c757',
      bidId: '280e2eb8ac3891',
      bidRequestsCount: 1,
      bidder: 'vmg',
      bidderRequestId: '14690d27b056c8',
      mediaTypes: {
        banner: {
          sizes: [ [ 970, 250 ] ]
        }
      },
      sizes: [ 970, 250 ],
      src: 'client',
      transactionId: 'af62f065-dfa7-4564-8cb2-d277dc6069f2'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  })

  describe('buildRequests', function () {
    let validBidRequests = [
      {
        adUnitCode: 'div-0',
        auctionId: 'd69cdd3f-75e3-42dc-b313-e54c0a99c757',
        bidId: '280e2eb8ac3891',
        bidRequestsCount: 1,
        bidder: 'vmg',
        bidderRequestId: '14690d27b056c8',
        mediaTypes: {
          banner: {
            sizes: [ [ 970, 250 ] ]
          }
        },
        sizes: [ 970, 250 ],
        src: 'client',
        transactionId: 'af62f065-dfa7-4564-8cb2-d277dc6069f2'
      }
    ];

    let bidderRequest = {
      auctionId: 'd69cdd3f-75e3-42dc-b313-e54c0a99c757',
      auctionStart: 1549316149227,
      bidderCode: 'vmg',
      bidderRequestId: '14690d27b056c8',
      refererInfo: {
        canonicalUrl: undefined,
        numIframes: 0,
        reachedTop: true,
        referer: 'https://vmg.nyc/public_assets/adapt/prebid.html',
        stack: [ 'https://vmg.nyc/public_assets/adapt/prebid.html' ]
      },
      start: 1549316149229,
      timeout: 1000
    };

    it('buildRequests fires', function () {
      let request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request).to.exist;
      expect(request.method).to.equal('POST');
      expect(request.data).to.exist;
    });
  })

  describe('interpretResponse', function () {
    let serverResponse = {};
    serverResponse.body = {
      'div-0': ['test']
    };

    var bidRequest = {
      data: '[{"adUnitCode":"div-0","referer":"https://vmg.nyc/public_assets/adapt/prebid.html","bidId":"280e2eb8ac3891"}]',
      method: 'POST',
      url: 'https://predict.vmg.nyc'
    };

    it('interpresResponse fires', function () {
      let bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses[0].dealId[0]).to.equal('test');
    });
  });
});
