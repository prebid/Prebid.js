describe('mobfox adapter tests', function () {
  const expect = require('chai').expect;
  const utils = require('src/utils');
  const adapter = require('modules/mobfoxBidAdapter');

  const bidRequest = [{
    code: 'div-gpt-ad-1460505748561-0',
    sizes: [[320, 480], [300, 250], [300, 600]],
    // Replace this object to test a new Adapter!
    bidder: 'mobfox',
    bidId: '5t5t5t5',
    params: {
      s: '267d72ac3f77a3f447b32cf7ebf20673', // required - The hash of your inventory to identify which app is making the request,
      imp_instl: 1 // optional - set to 1 if using interstitial otherwise delete or set to 0
    },
    placementCode: 'div-gpt-ad-1460505748561-0',
    auctionId: 'c241c810-18d9-4aa4-a62f-8c1980d8d36b',
    transactionId: '31f42cba-5920-4e47-adad-69c79d0d4fb4'
  }];

  describe('validRequests', function () {
    let bidRequestInvalid1 = [{
      code: 'div-gpt-ad-1460505748561-0',
      sizes: [[320, 480], [300, 250], [300, 600]],
      // Replace this object to test a new Adapter!
      bidder: 'mobfox',
      bidId: '5t5t5t5',
      params: {
        imp_instl: 1 // optional - set to 1 if using interstitial otherwise delete or set to 0
      },
      placementCode: 'div-gpt-ad-1460505748561-0',
      auctionId: 'c241c810-18d9-4aa4-a62f-8c1980d8d36b',
      transactionId: '31f42cba-5920-4e47-adad-69c79d0d4fb4'
    }];

    it('test valid MF request success', function () {
      let isValid = adapter.spec.isBidRequestValid(bidRequest[0]);
      expect(isValid).to.equal(true);
    });

    it('test valid MF request failed1', function () {
      let isValid = adapter.spec.isBidRequestValid(bidRequestInvalid1[0]);
      expect(isValid).to.equal(false);
    });
  })

  describe('buildRequests', function () {
    it('test build MF request', function () {
      let request = adapter.spec.buildRequests(bidRequest);
      let payload = request.data.split('&');
      expect(payload[0]).to.equal('rt=api-fetchip');
      expect(payload[1]).to.equal('r_type=banner');
      expect(payload[2]).to.equal('r_resp=json');
      expect(payload[3]).to.equal('s=267d72ac3f77a3f447b32cf7ebf20673');
      expect(payload[5]).to.equal('adspace_width=320');
      expect(payload[6]).to.equal('adspace_height=480');
      expect(payload[7]).to.equal('imp_instl=1');
    });

    it('test build MF request', function () {
      let request = adapter.spec.buildRequests(bidRequest);
      let payload = request.data.split('&');
      expect(payload[0]).to.equal('rt=api-fetchip');
      expect(payload[1]).to.equal('r_type=banner');
      expect(payload[2]).to.equal('r_resp=json');
      expect(payload[3]).to.equal('s=267d72ac3f77a3f447b32cf7ebf20673');
      expect(payload[5]).to.equal('adspace_width=320');
      expect(payload[6]).to.equal('adspace_height=480');
      expect(payload[7]).to.equal('imp_instl=1');
    });
  })

  describe('interceptResponse', function () {
    let mockServerResponse = {
      body: {
        request: {
          clicktype: 'safari',
          clickurl: 'https://tokyo-my.mobfox.com/exchange.click.php?h=494ef76d5b0287a8b5ac8724855cb5e0',
          cpmPrice: 50,
          htmlString: 'test',
          refresh: '30',
          scale: 'no',
          skippreflight: 'yes',
          type: 'textAd',
          urltype: 'link'
        }
      },
      headers: {
        get: function (header) {
          if (header === 'X-Pricing-CPM') {
            return 50;
          }
        }
      }
    };
    it('test intercept response', function () {
      let request = adapter.spec.buildRequests(bidRequest);
      let bidResponses = adapter.spec.interpretResponse(mockServerResponse, request);
      expect(bidResponses.length).to.equal(1);
      expect(bidResponses[0].ad).to.equal('test');
      expect(bidResponses[0].cpm).to.equal(50);
      expect(bidResponses[0].creativeId).to.equal('267d72ac3f77a3f447b32cf7ebf20673');
      expect(bidResponses[0].requestId).to.equal('5t5t5t5');
      expect(bidResponses[0].currency).to.equal('USD');
      expect(bidResponses[0].height).to.equal('480');
      expect(bidResponses[0].netRevenue).to.equal(true);
      expect(bidResponses[0].referrer).to.equal('https://tokyo-my.mobfox.com/exchange.click.php?h=494ef76d5b0287a8b5ac8724855cb5e0');
      expect(bidResponses[0].ttl).to.equal(360);
      expect(bidResponses[0].width).to.equal('320');
    });

    it('test intercept response with empty server response', function () {
      let request = adapter.spec.buildRequests(bidRequest);
      let serverResponse = {
        request: {
          error: 'cannot get response'
        }
      };
      let bidResponses = adapter.spec.interpretResponse(serverResponse, request);
      expect(bidResponses.length).to.equal(0);
    })
  })
});
