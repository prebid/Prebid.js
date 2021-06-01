import { expect } from 'chai';
import { spec } from '../../../modules/segmentoBidAdapter.js';

const BIDDER_CODE = 'segmento';
const URL = 'https://prebid-bidder.rutarget.ru/bid';
const SYNC_IFRAME_URL = 'https://tag.rutarget.ru/tag?event=otherPage&check=true&response=syncframe&synconly=true';
const SYNC_IMAGE_URL = 'https://tag.rutarget.ru/tag?event=otherPage&check=true&synconly=true';
const RUB = 'RUB';
const TIME_TO_LIVE = 0;

describe('SegmentoAdapter', function () {
  describe('isBidRequestValid', function () {
    const bid = {
      bidder: BIDDER_CODE,
      bidId: '51ef8751f9aead',
      params: {
        placementId: 34
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      sizes: [[320, 50], [300, 250], [300, 600]],
      bidderRequestId: '418b37f85e772c',
      auctionId: '18fd8b8b0bd757'
    };

    it('should return true if placementId is a number', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false if placementId is not a number', function () {
      bid.params.placementId = 'placementId';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if no placementId param', function () {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bids = [{
      bidder: 'segmento',
      bidId: '51ef8751f9aead',
      params: {
        placementId: 34
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      sizes: [[320, 50], [300, 250], [300, 600]],
      bidderRequestId: '418b37f85e772c',
      auctionId: '18fd8b8b0bd757'
    }];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://comepage.com'
      }
    };

    const request = spec.buildRequests(bids, bidderRequest);
    it('should return POST method', function () {
      expect(request.method).to.equal('POST');
    });

    it('should return valid url', function () {
      expect(request.url).to.equal(URL);
    });

    it('should return valid data', function () {
      const data = request.data;
      expect(data).to.have.all.keys('settings', 'places');
      expect(data.settings.currency).to.be.equal(RUB);
      expect(data.settings.referrer).to.be.a('string');
      expect(data.settings.referrer).to.be.equal(bidderRequest.refererInfo.referer);
      const places = data.places;
      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        const bid = bids[i];
        expect(place).to.have.all.keys('id', 'placementId', 'sizes');
        expect(place.id).to.be.a('string');
        expect(place.id).to.be.equal(bid.bidId);
        expect(place.placementId).to.be.a('number');
        expect(place.placementId).to.be.equal(bid.params.placementId);
        expect(place.sizes).to.be.an('array');
        expect(place.sizes).to.deep.equal(bid.sizes);
      }
    });

    it('should return empty places if no valid bids are passed', function () {
      const request = spec.buildRequests([], {});
      expect(request.data.places).to.be.an('array').to.deep.equal([]);
    });
  });

  describe('interpretResponse', function() {
    const serverResponse = {
      body: {
        bids: [{
          id: '51ef8751f9aead',
          cpm: 0.23,
          currency: RUB,
          creativeId: 123,
          displayUrl: 'displayUrl?t=123&p=456',
          size: {
            width: 300,
            height: 250
          }
        }]
      }
    };

    const emptyServerResponse = {
      body: {
        bids: []
      }
    };

    it('should return valid data', function () {
      const response = spec.interpretResponse(serverResponse);
      expect(response).to.be.an('array');
      for (let i = 0; i < response.length; i++) {
        const item = response[i];
        const bid = serverResponse.body.bids[i];
        expect(item).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'creativeId',
          'currency', 'netRevenue', 'ttl', 'adUrl');
        expect(item.requestId).to.be.a('string');
        expect(item.requestId).to.be.equal(bid.id);
        expect(item.cpm).to.be.a('number');
        expect(item.cpm).to.be.equal(bid.cpm);
        expect(item.width).to.be.a('number');
        expect(item.width).to.be.equal(bid.size.width);
        expect(item.height).to.be.a('number');
        expect(item.height).to.be.equal(bid.size.height);
        expect(item.creativeId).to.be.a('number');
        expect(item.creativeId).to.be.equal(bid.creativeId);
        expect(item.currency).to.be.a('string');
        expect(item.currency).to.be.equal(bid.currency);
        expect(item.netRevenue).to.be.a('boolean');
        expect(item.netRevenue).to.equal(true);
        expect(item.ttl).to.be.a('number');
        expect(item.ttl).to.be.equal(TIME_TO_LIVE);
        expect(item.adUrl).to.be.a('string');
        expect(item.adUrl).to.be.equal(bid.displayUrl);
      }
    });

    it('should return empty array if no bids', function () {
      const response = spec.interpretResponse(emptyServerResponse);
      expect(response).to.be.an('array').to.deep.equal([]);
    });

    it('should return empty array if server response is invalid', function () {
      const response = spec.interpretResponse({});
      expect(response).to.be.an('array').to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function() {
    it('should return iframe type if iframe enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true });
      const sync = syncs[0];
      expect(syncs).to.be.an('array').with.lengthOf(1);
      expect(sync).to.have.all.keys('type', 'url');
      expect(sync.type).to.be.a('string');
      expect(sync.type).to.be.equal('iframe');
      expect(sync.url).to.be.a('string');
      expect(sync.url).to.be.equal(SYNC_IFRAME_URL);
    });

    it('should return iframe type if iframe disabled, but image enable', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true });
      const sync = syncs[0];
      expect(syncs).to.be.an('array').with.lengthOf(1);
      expect(sync).to.have.all.keys('type', 'url');
      expect(sync.type).to.be.a('string');
      expect(sync.type).to.be.equal('image');
      expect(sync.url).to.be.a('string');
      expect(sync.url).to.be.equal(SYNC_IMAGE_URL);
    });

    it('should return empty array if iframe and pixels disabled', function () {
      const syncs = spec.getUserSyncs({});
      expect(syncs).to.be.an('array').to.deep.equal([]);
    });
  });
});
