import { expect } from 'chai';
import {spec} from 'modules/interactiveOffersBidAdapter.js';

describe('Interactive Offers Prebbid.js Adapter', function() {
  describe('isBidRequestValid function', function() {
    let bid = {bidder: 'interactiveOffers', params: {partnerId: '100', tmax: 300}, mediaTypes: {banner: {sizes: [[300, 250]]}}, adUnitCode: 'pageAd01', transactionId: '16526f30-3be2-43f6-ab37-f1ab1f2ac25d', sizes: [[300, 250]], bidId: '227faa83f86546', bidderRequestId: '1eb79bc9dd44a', auctionId: '1aad860c-e04b-482b-acac-0da55ed491c8', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0};

    it('returns true if all the required params are present and properly formatted', function() {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('returns false if any if the required params is missing', function() {
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false if any if the required params is not properly formatted', function() {
      bid.params = {partnerid: '100', tmax: 250};
      expect(spec.isBidRequestValid(bid)).to.be.false;
      bid.params = {partnerId: '100', tmax: '+250'};
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });
  describe('buildRequests function', function() {
    let validBidRequests = [{bidder: 'interactiveOffers', params: {partnerId: '100', tmax: 300}, mediaTypes: {banner: {sizes: [[300, 250]]}}, adUnitCode: 'pageAd01', transactionId: '16526f30-3be2-43f6-ab37-f1ab1f2ac25d', sizes: [[300, 250]], bidId: '227faa83f86546', bidderRequestId: '1eb79bc9dd44a', auctionId: '1aad860c-e04b-482b-acac-0da55ed491c8', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}];
    let bidderRequest = {bidderCode: 'interactiveOffers', auctionId: '1aad860c-e04b-482b-acac-0da55ed491c8', bidderRequestId: '1eb79bc9dd44a', bids: [{bidder: 'interactiveOffers', params: {partnerId: '100', tmax: 300}, mediaTypes: {banner: {sizes: [[300, 250]]}}, adUnitCode: 'pageAd01', transactionId: '16526f30-3be2-43f6-ab37-f1ab1f2ac25d', sizes: [[300, 250]], bidId: '227faa83f86546', bidderRequestId: '1eb79bc9dd44a', auctionId: '1aad860c-e04b-482b-acac-0da55ed491c8', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}], timeout: 5000, refererInfo: {referer: 'http://www.google.com', reachedTop: true, isAmp: false, numIframes: 0, stack: ['http://www.google.com'], canonicalUrl: null}};

    it('returns a Prebid.js request object with a valid json string at the "data" property', function() {
      let request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).length !== 0;
    });
  });
  describe('interpretResponse function', function() {
    let openRTBResponse = {body: [{cur: 'USD', id: '2052afa35febb79baa9893cc3ae8b83b89740df65fe98b1bd358dbae6e912801', seatbid: [{seat: 1493, bid: [{ext: {tagid: '227faa83f86546'}, crid: '24477', adm: '<a href="http://url.com" border="0"></a><img src="http://url.com" border="0" width="1" height="1"><img src="http://url.com/linkTrack/" border="0" width="1" height="1">', nurl: '', adid: '1138', adomain: ['url.com'], price: '1.53', w: 300, h: 250, iurl: 'http://url.com', cat: ['IAB13-11'], id: '5507ced7a39c06942d3cb260197112ba712e4180', attr: [], impid: 1, cid: '13280'}]}], 'bidid': '0959b9d58ba71b3db3fa29dce3b117c01fc85de0'}], 'headers': {}};
    let prebidRequest = {method: 'POST', url: 'https://url.com', data: '{"id": "1aad860c-e04b-482b-acac-0da55ed491c8", "site": {"id": "url.com", "name": "url.com", "domain": "url.com", "page": "http://url.com", "ref": "http://url.com", "publisher": {"id": 100, "name": "http://url.com", "domain": "url.com"}, "content": {"language": "pt-PT"}}, "source": {"fd": 0, "tid": "1aad860c-e04b-482b-acac-0da55ed491c8", "pchain": ""}, "device": {"ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36", "language": "pt-PT"}, "user": {}, "imp": [{"id":1, "secure": 0, "tagid": "227faa83f86546", "banner": {"pos": 0, "w": 300, "h": 250, "format": [{"w": 300, "h": 250}]}}], "tmax": 300}', bidderRequest: {bidderCode: 'interactiveOffers', auctionId: '1aad860c-e04b-482b-acac-0da55ed491c8', bidderRequestId: '1eb79bc9dd44a', bids: [{bidder: 'interactiveOffers', params: {partnerId: '100', tmax: 300}, mediaTypes: {banner: {sizes: [[300, 250]]}}, adUnitCode: 'pageAd01', transactionId: '16526f30-3be2-43f6-ab37-f1ab1f2ac25d', sizes: [[300, 250]], bidId: '227faa83f86546', bidderRequestId: '1eb79bc9dd44a', auctionId: '1aad860c-e04b-482b-acac-0da55ed491c8', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}], timeout: 5000, refererInfo: {referer: 'http://url.com', reachedTop: true, isAmp: false, numIframes: 0, stack: ['http://url.com'], canonicalUrl: null}}};

    it('returns an array of Prebid.js response objects', function() {
      let prebidResponses = spec.interpretResponse(openRTBResponse, prebidRequest);
      expect(prebidResponses).to.not.be.empty;
      expect(prebidResponses[0].meta.advertiserDomains[0]).to.equal('url.com');
    });
  });
});
