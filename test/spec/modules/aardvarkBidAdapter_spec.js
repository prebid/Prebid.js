import { expect } from 'chai';
import { spec } from 'modules/aardvarkBidAdapter';

describe('aardvarkAdapterTest', () => {
  describe('forming valid bidRequests', () => {
    it('should accept valid bidRequests', () => {
      expect(spec.isBidRequestValid({
        bidder: 'aardvark',
        params: {
          ai: 'xiby',
          sc: 'TdAx',
        },
        sizes: [[300, 250]]
      })).to.equal(true);
    });

    it('should reject invalid bidRequests', () => {
      expect(spec.isBidRequestValid({
        bidder: 'aardvark',
        params: {
          ai: 'xiby',
        },
        sizes: [[300, 250]]
      })).to.equal(false);
    });
  });

  describe('executing network requests', () => {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    },
    {
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'RAZd',
        host: 'adzone.pub.com'
      },
      adUnitCode: 'bbb',
      transactionId: '193995b4-7122-4739-959b-2463282a138b',
      sizes: [[800, 600]],
      bidId: '22aidtbx5eabd9',
      bidderRequestId: '70deaff71c281d',
      auctionId: 'e97cafd0-ebfc-4f5c-b7c9-baa0fd335a4a'
    }];

    it('should use HTTP GET method', () => {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('GET');
      });
    });

    it('should call the correct bidRequest url', () => {
      const requests = spec.buildRequests(bidRequests);
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.match(new RegExp('^\/\/adzone.pub.com/xiby/TdAx_RAZd/aardvark\?'));
    });

    it('should have correct data', () => {
      const requests = spec.buildRequests(bidRequests);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.version).to.equal(1);
      expect(requests[0].data.jsonp).to.equal(false);
      expect(requests[0].data.TdAx).to.equal('1abgs362e0x48a8');
      expect(requests[0].data.rtkreferer).to.not.be.undefined;
      expect(requests[0].data.RAZd).to.equal('22aidtbx5eabd9');
    });
  });

  describe('splitting multi-auction ad units into own requests', () => {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'Toby',
        sc: 'TdAx',
        categories: ['cat1', 'cat2']
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    },
    {
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'RAZd',
        host: 'adzone.pub.com'
      },
      adUnitCode: 'bbb',
      transactionId: '193995b4-7122-4739-959b-2463282a138b',
      sizes: [[800, 600]],
      bidId: '22aidtbx5eabd9',
      bidderRequestId: '70deaff71c281d',
      auctionId: 'e97cafd0-ebfc-4f5c-b7c9-baa0fd335a4a'
    }];

    it('should use HTTP GET method', () => {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('GET');
      });
    });

    it('should call the correct bidRequest urls for each auction', () => {
      const requests = spec.buildRequests(bidRequests);
      expect(requests[0].url).to.match(new RegExp('^\/\/bidder.rtk.io/Toby/TdAx/aardvark\?'));
      expect(requests[0].data.categories.length).to.equal(2);
      expect(requests[1].url).to.match(new RegExp('^\/\/adzone.pub.com/xiby/RAZd/aardvark\?'));
    });

    it('should have correct data', () => {
      const requests = spec.buildRequests(bidRequests);
      expect(requests.length).to.equal(2);
      expect(requests[0].data.version).to.equal(1);
      expect(requests[0].data.jsonp).to.equal(false);
      expect(requests[0].data.TdAx).to.equal('1abgs362e0x48a8');
      expect(requests[0].data.rtkreferer).to.not.be.undefined;
      expect(requests[0].data.RAZd).to.be.undefined;
      expect(requests[1].data.version).to.equal(1);
      expect(requests[1].data.jsonp).to.equal(false);
      expect(requests[1].data.TdAx).to.be.undefined;
      expect(requests[1].data.rtkreferer).to.not.be.undefined;
      expect(requests[1].data.RAZd).to.equal('22aidtbx5eabd9');
    });
  });

  describe('GDPR conformity', () => {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    }];

    const bidderRequest = {
      gdprConsent: {
        consentString: 'awefasdfwefasdfasd',
        gdprApplies: true
      }
    };

    it('should transmit correct data', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.gdpr).to.equal(true);
      expect(requests[0].data.consent).to.equal('awefasdfwefasdfasd');
    });
  });

  describe('GDPR absence conformity', () => {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    }];

    const bidderRequest = {
      gdprConsent: undefined
    };

    it('should transmit correct data', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.gdpr).to.be.undefined;
      expect(requests[0].data.consent).to.be.undefined;
    });
  });

  describe('interpretResponse', () => {
    it('should handle bid responses', () => {
      const serverResponse = {
        body: [
          {
            media: 'banner',
            nurl: 'http://www.nurl.com/0',
            cpm: 0.09,
            width: 300,
            height: 250,
            cid: '22aidtbx5eabd9',
            adm: '</tag1>',
            dealId: 'dealing',
            ttl: 200,
          },
          {
            media: 'banner',
            nurl: 'http://www.nurl.com/1',
            cpm: 0.19,
            width: 300,
            height: 250,
            cid: '1abgs362e0x48a8',
            adm: '</tag2>',
            ttl: 200,
          }
        ],
        headers: {}
      };

      const result = spec.interpretResponse(serverResponse, {});
      expect(result.length).to.equal(2);

      expect(result[0].requestId).to.equal('22aidtbx5eabd9');
      expect(result[0].cpm).to.equal(0.09);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].currency).to.equal('USD');
      expect(result[0].ttl).to.equal(200);
      expect(result[0].dealId).to.equal('dealing');
      expect(result[0].ad).to.not.be.undefined;

      expect(result[1].requestId).to.equal('1abgs362e0x48a8');
      expect(result[1].cpm).to.equal(0.19);
      expect(result[1].width).to.equal(300);
      expect(result[1].height).to.equal(250);
      expect(result[1].currency).to.equal('USD');
      expect(result[1].ttl).to.equal(200);
      expect(result[1].ad).to.not.be.undefined;
    });

    it('should handle nobid responses', () => {
      var emptyResponse = [{
        nurl: '',
        cid: '9e5a09319e18f1',
        media: 'banner',
        error: 'No bids received for 9DgF',
        adm: '',
        id: '9DgF',
        cpm: 0.00
      }];

      var result = spec.interpretResponse({ body: emptyResponse }, {});
      expect(result.length).to.equal(1);
      expect(result[0].cpm).to.equal(0.0);
    });
  });
});
