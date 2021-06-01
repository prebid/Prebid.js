import * as utils from 'src/utils.js';
import { expect } from 'chai';
import { spec } from 'modules/meazyBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const MEAZY_PID = '6910b7344ae566a1'
const VALID_ENDPOINT = `https://rtb-filter.meazy.co/pbjs?host=${utils.getOrigin()}&api_key=${MEAZY_PID}`;

const bidderRequest = {
  refererInfo: {
    referer: 'page',
    stack: ['page', 'page1']
  }
};

const bidRequest = {
  bidder: 'meazy',
  adUnitCode: 'test-div',
  sizes: [[300, 250], [300, 600]],
  params: {
    pid: MEAZY_PID
  },
  bidId: '30b31c1838de1e',
  bidderRequestId: '22edbae2733bf6',
  auctionId: '1d1a030790a475',
};

const bidContent = {
  'id': '30b31c1838de1e',
  'bidid': '9780a52ff05c0e92780f5baf9cf3f4e8',
  'cur': 'USD',
  'seatbid': [{
    'bid': [{
      'id': 'ccf05fb8effb3d02',
      'impid': 'B19C34BBD69DAF9F',
      'burl': 'https://track.meazy.co/imp?bidid=9780a52ff05c0e92780f5baf9cf3f4e8&user=fdc401a2-92f1-42bd-ac22-d570520ad0ec&burl=1&ssp=5&project=2&cost=${AUCTION_PRICE}',
      'adm': '<iframe src="https://ads.meazy.co/ad?u=fdc401a2-92f1-42bd-ac22-d570520ad0ec&s=6&p=2&g=e97b3549dc62c94d7e6b1d6db50917f9&gu=%252Fsergi-s-podvesnoy-chastyu%252Fserebryanye-serezhki-s-fianitami-302-00130-16373%252F&r=9780a52ff05c0e92780f5baf9cf3f4e8&si=75&sz=300x250&ssp=5&ts=1563820889&iph=6712b60796a2ed8ce4da786a7715ff2c25295aea&pl=ukr.net&bp=1.5&sp=${AUCTION_PRICE}" width="300" height="250" scrolling="no" style="overflow:hidden" frameBorder="0"></iframe>',
      'adid': 'ad-2.6.75.300x250',
      'price': 1.5,
      'w': 300,
      'h': 250,
      'cid': '2.6.75',
      'crid': '2.6.75.300x250',
      'dealid': 'default'
    }],
    'seat': '2'
  }]
};

const bidContentExt = {
  ...bidContent,
  ext: {
    'syncUrl': 'https://sync.meazy.co/sync/img?api_key=6910b7344ae566a1'
  }
};

const bidResponse = {
  body: bidContent
};

const noBidResponse = { body: {'nbr': 2} };

describe('meazyBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return false', function () {
      let bid = Object.assign({}, bidRequest);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('should format valid url', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      expect(request.url).to.equal(VALID_ENDPOINT);
    });

    it('should format valid url', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      expect(request.url).to.equal(VALID_ENDPOINT);
    });

    it('should format valid request body', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.id).to.exist;
      expect(payload.imp).to.exist;
      expect(payload.imp[0]).to.exist;
      expect(payload.imp[0].banner).to.exist;
      expect(payload.imp[0].banner.format).to.exist;
      expect(payload.device).to.exist;
      expect(payload.site).to.exist;
      expect(payload.site.domain).to.exist;
      expect(payload.cur).to.exist;
    });

    it('should format valid url', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      expect(request.url).to.equal(VALID_ENDPOINT);
    });

    it('should not fill user.ext object', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user.ext).to.equal(undefined);
    });

    it('should fill user.ext object', function () {
      const consentString = 'hellogdpr';
      const request = spec.buildRequests([bidRequest], { ...bidderRequest, gdprConsent: { gdprApplies: true, consentString } });
      const payload = JSON.parse(request.data);
      expect(payload.user.ext).to.exist.and.to.be.a('object');
      expect(payload.user.ext.consent).to.equal(consentString);
      expect(payload.user.ext.gdpr).to.equal(1);
    });
  });

  describe('interpretResponse', function () {
    it('should get correct bid response', function () {
      const result = spec.interpretResponse(bidResponse);
      const validResponse = [{
        requestId: '30b31c1838de1e',
        cpm: 1.5,
        width: 300,
        height: 250,
        creativeId: '2.6.75.300x250',
        netRevenue: true,
        dealId: 'default',
        currency: 'USD',
        ttl: 900,
        ad: '<iframe src="https://ads.meazy.co/ad?u=fdc401a2-92f1-42bd-ac22-d570520ad0ec&s=6&p=2&g=e97b3549dc62c94d7e6b1d6db50917f9&gu=%252Fsergi-s-podvesnoy-chastyu%252Fserebryanye-serezhki-s-fianitami-302-00130-16373%252F&r=9780a52ff05c0e92780f5baf9cf3f4e8&si=75&sz=300x250&ssp=5&ts=1563820889&iph=6712b60796a2ed8ce4da786a7715ff2c25295aea&pl=ukr.net&bp=1.5&sp=${AUCTION_PRICE}" width="300" height="250" scrolling="no" style="overflow:hidden" frameBorder="0"></iframe>'
      }];

      expect(result).to.deep.equal(validResponse);
    });

    it('handles nobid responses', function () {
      let result = spec.interpretResponse(noBidResponse);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const syncOptionsFF = { iframeEnabled: false };
    const syncOptionsEF = { iframeEnabled: true };
    const syncOptionsEE = { pixelEnabled: true, iframeEnabled: true };
    const syncOptionsFE = { pixelEnabled: true, iframeEnabled: false };

    const successIFrame = { type: 'iframe', url: 'https://sync.meazy.co/sync/iframe' };
    const successPixel = { type: 'image', url: 'https://sync.meazy.co/sync/img?api_key=6910b7344ae566a1' };

    it('should return an empty array', function () {
      expect(spec.getUserSyncs(syncOptionsFF, [])).to.be.empty;
      expect(spec.getUserSyncs(syncOptionsFF, [ bidResponse ])).to.be.empty;
      expect(spec.getUserSyncs(syncOptionsFE, [ bidResponse ])).to.be.empty;
    });

    it('should be equal to the expected result', function () {
      expect(spec.getUserSyncs(syncOptionsEF, [ bidResponse ])).to.deep.equal([successIFrame]);
      expect(spec.getUserSyncs(syncOptionsFE, [ { body: bidContentExt } ])).to.deep.equal([successPixel]);
      expect(spec.getUserSyncs(syncOptionsEE, [ { body: bidContentExt } ])).to.deep.equal([successPixel, successIFrame]);
      expect(spec.getUserSyncs(syncOptionsEE, [])).to.deep.equal([successIFrame]);
    })
  });
});
