import { expect } from 'chai';
import * as utils from 'src/utils';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { REQUEST_URL, SP_OUTSTREAM_PLAYER_URL, CONVERTER, spec } from '../../../modules/silverpushBidAdapter.js';

const bannerBid = {
  bidder: 'silverpush',
  params: {
    publisherId: '012345',
    bidFloor: 1.5
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 50],
      ],
    },
  },
  adUnitCode: 'div-gpt-ad-928572628472-0',
  bidId: 'dl38fjf9d',
  bidderRequestId: 'brid00000000',
  auctionId: 'aucid0000000',
};

const videoBid = {
  bidder: 'silverpush',
  params: {
    publisherId: '012345',
    bidFloor: 0.1
  },
  mediaTypes: {
    video: {
      api: [1, 2, 4, 6],
      mimes: ['video/mp4'],
      playbackmethod: [2, 4, 6],
      playerSize: [[1024, 768]],
      protocols: [3, 4, 7, 8, 10],
      placement: 1,
      minduration: 0,
      maxduration: 60,
      startdelay: 0
    },
  },
  adUnitCode: 'div-gpt-ad-928572628472-1',
  bidId: '281141d3541362',
  bidderRequestId: 'brid00000000',
  auctionId: 'aucid0000000',
};

const bidderRequest = {
  auctionId: 'aucid0000000',
  bidderRequestId: 'brid00000000',
  timeout: 200,
  refererInfo: {
    page: 'https://hello-world-page.com/',
    domain: 'hello-world-page.com',
    ref: 'http://example-domain.com/foo',
  }
};

const bannerReponse = {
  'id': 'brid00000000',
  'seatbid': [
    {
      'bid': [
        {
          'id': 'ARUYoUZx',
          'impid': 'dl38fjf9d',
          'price': 1.64,
          'adid': 'aaaaadddddddd',
          'burl': 'http://0.0.0.0:8181/burl',
          'adm': '<div><img src="url_str"><div>',
          'adomain': [
            'https://www.exampleabc.com'
          ],
          'iurl': 'https://example.example.com/2.png',
          'cid': 'aaaaadddddddd',
          'crid': 'aaaaadddddddd',
          'h': 250,
          'w': 300
        }
      ]
    }
  ],
  'bidid': 'ARUYoUZx',
  'cur': 'USD'
}

const videoResponse = {
  'id': 'brid00000000',
  'seatbid': [
    {
      'bid': [
        {
          'id': 'soCWeklh',
          'impid': '281141d3541362',
          'price': 1.09,
          'adid': 'outstream_video',
          'burl': 'http://0.0.0.0:8181/burl',
          'adm': '<VAST version="4.2"></VAST>\n',
          'adomain': [
            'https://www.exampleabc.com'
          ],
          'cid': '229369649',
          'crid': 'aaaaadddddddd',
          'h': 768,
          'w': 1024
        }
      ]
    }
  ],
  'bidid': 'soCWeklh',
  'cur': 'USD'
}

describe('Silverpush Adapter', function () {
  describe('isBidRequestValid()', () => {
    it('should return false when publisherId is not defined', () => {
      const bid = utils.deepClone(bannerBid);
      delete bid.params.publisherId;

      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when publisherId is empty string', () => {
      const bid = utils.deepClone(bannerBid);
      bid.params.publisherId = '';

      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when publisherId is a number', () => {
      const bid = utils.deepClone(bannerBid);
      bid.params.publisherId = 12345;

      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when there is no banner in mediaTypes', () => {
      const bid = utils.deepClone(bannerBid);
      delete bid.mediaTypes.banner;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when sizes for banner are not specified', () => {
      const bid = utils.deepClone(bannerBid);
      delete bid.mediaTypes.banner.sizes;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when there is no video in mediaTypes', () => {
      const bid = utils.deepClone(videoBid);
      delete bid.mediaTypes.video;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should reutrn false if player size is not set', () => {
      const bid = utils.deepClone(videoBid);
      delete bid.mediaTypes.video.playerSize;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });
  });

  describe('buildRequests()', () => {
    it('should build correct request for banner bid with both w, h', () => {
      const bid = utils.deepClone(bannerBid);

      const [request] = spec.buildRequests([bid], bidderRequest);
      const requestData = request.data;

      expect(requestData.imp[0].banner.w).to.equal(300);
      expect(requestData.imp[0].banner.h).to.equal(250);
    });

    it('should return default bidfloor when bidFloor is not defined', () => {
      const bid = utils.deepClone(bannerBid);
      delete bid.params.bidFloor;

      const [request] = spec.buildRequests([bid], bidderRequest);
      const requestData = request.data;

      expect(requestData.imp[0].bidfloor).to.equal(0.05);
    });

    it('should contain deals in request if deal is specified in params', () => {
      const bid = utils.deepClone(bannerBid);
      bid.params.deals = [{ id: 'test' }];

      const [request] = spec.buildRequests([bid], bidderRequest);
      const requestData = request.data;

      expect(requestData.imp[0].pmp.deals).to.equal(bid.params.deals);
    });

    it('should return bidfloor when bidFloor is defined', () => {
      const bid = utils.deepClone(bannerBid);

      const [request] = spec.buildRequests([bid], bidderRequest);
      const requestData = request.data;

      expect(requestData.imp[0].bidfloor).to.equal(bannerBid.params.bidFloor);
    });

    it('should build correct request for video bid with playerSize', () => {
      const bid = utils.deepClone(videoBid);

      const [request] = spec.buildRequests([bid], bidderRequest);
      const requestData = request.data;

      expect(requestData.imp[0].video.w).to.equal(1024);
      expect(requestData.imp[0].video.h).to.equal(768);
    });

    it('should use bidder video params if they are set', () => {
      const videoBidWithParams = utils.deepClone(videoBid);
      const bidderVideoParams = {
        api: [1, 2],
        mimes: ['video/mp4', 'video/x-flv'],
        playbackmethod: [3, 4],
        protocols: [5, 6],
        placement: 1,
        minduration: 0,
        maxduration: 60,
        w: 1024,
        h: 768,
        startdelay: 0
      };

      videoBidWithParams.params.video = bidderVideoParams;

      const requests = spec.buildRequests([videoBidWithParams], bidderRequest);
      const request = requests[0].data;

      expect(request.imp[0]).to.deep.include({
        video: {
          ...bidderVideoParams,
          w: videoBidWithParams.mediaTypes.video.playerSize[0][0],
          h: videoBidWithParams.mediaTypes.video.playerSize[0][1],
        },
      });
    });
  });

  describe('getOS()', () => {
    it('shold return correct os name for Windows', () => {
      let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246';
      let osName = spec.getOS(userAgent);

      expect(osName).to.equal('Windows');
    });

    it('shold return correct os name for Mac OS', () => {
      let userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9';
      let osName = spec.getOS(userAgent);

      expect(osName).to.equal('macOS');
    });

    it('shold return correct os name for Android', () => {
      let userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G996U Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Mobile Safari/537.36';
      let osName = spec.getOS(userAgent);

      expect(osName).to.equal('Android');
    });

    it('shold return correct os name for ios', () => {
      let userAgent = 'Mozilla/5.0 (iPhone14,3; U; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/19A346 Safari/602.1';
      let osName = spec.getOS(userAgent);

      expect(osName).to.equal('iOS');
    });

    it('shold return correct os name for Linux', () => {
      let userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1';
      let osName = spec.getOS(userAgent);

      expect(osName).to.equal('Linux');
    });
  });

  describe('interpretResponse()', () => {
    it('should return nbr to 0 when response not received', () => {
      const requests = spec.buildRequests([bannerBid], bidderRequest);
      const bids = spec.interpretResponse({ body: null }, requests[0]);

      expect(bids[0]).to.equal(undefined);
    });

    it('should correctly interpret valid banner response', () => {
      const response = utils.deepClone(bannerReponse);
      const requests = spec.buildRequests([bannerBid], bidderRequest);
      const bids = spec.interpretResponse({ body: response }, requests[0]);

      expect(bids[0].ad).to.equal('<div><img src="url_str"><div>');
      expect(bids[0].burl).to.equal('http://0.0.0.0:8181/burl');
      expect(bids[0].cpm).to.equal(1.64);
      expect(bids[0].creativeId).to.equal('aaaaadddddddd');
      expect(bids[0].creative_id).to.equal('aaaaadddddddd');
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].height).to.equal(250);
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].meta.advertiserDomains[0]).to.equal('https://www.exampleabc.com');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].requestId).to.equal('dl38fjf9d');
      expect(bids[0].seatBidId).to.equal('ARUYoUZx');
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].width).to.equal(300);
    });

    if (FEATURES.VIDEO) {
      it('should correctly interpret valid instream video response', () => {
        const response = utils.deepClone(videoResponse);
        videoBid.mediaTypes.video.context = 'outstream';
        const requests = spec.buildRequests([videoBid], bidderRequest);
        const bids = spec.interpretResponse({ body: response }, requests[0]);

        expect(bids[0].vastXml).to.equal('<VAST version="4.2"></VAST>\n');
        expect(bids[0].burl).to.equal('http://0.0.0.0:8181/burl');
        expect(bids[0].cpm).to.equal(1.09);
        expect(bids[0].creativeId).to.equal('aaaaadddddddd');
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].mediaType).to.equal('video');
        expect(bids[0].meta.advertiserDomains[0]).to.equal('https://www.exampleabc.com');
        expect(bids[0].requestId).to.equal('281141d3541362');
        expect(bids[0].seatBidId).to.equal('soCWeklh');
        expect(bids[0].width).to.equal(1024);
        expect(bids[0].height).to.equal(768);
      });

      it('should correctly interpret valid outstream video response', () => {
        const response = utils.deepClone(videoResponse);
        videoBid.mediaTypes.video.context = 'outstream';

        const requests = spec.buildRequests([videoBid], bidderRequest);
        const bids = spec.interpretResponse({ body: response }, requests[0]);

        expect(bids[0].vastXml).to.equal('<VAST version="4.2"></VAST>\n');
        expect(bids[0].rendererUrl).to.equal(SP_OUTSTREAM_PLAYER_URL);
        expect(bids[0].renderer.url).to.equal(SP_OUTSTREAM_PLAYER_URL);
        expect(bids[0].burl).to.equal('http://0.0.0.0:8181/burl');
        expect(bids[0].cpm).to.equal(1.09);
        expect(bids[0].creativeId).to.equal('aaaaadddddddd');
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].mediaType).to.equal('video');
        expect(bids[0].meta.advertiserDomains[0]).to.equal('https://www.exampleabc.com');
        expect(bids[0].requestId).to.equal('281141d3541362');
        expect(bids[0].seatBidId).to.equal('soCWeklh');
        expect(bids[0].width).to.equal(1024);
        expect(bids[0].height).to.equal(768);
      });
    }
  });

  describe('onBidWon', function() {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(spec, 'getRequest')
    })

    afterEach(() => {
      ajaxStub.restore()
    })

    it('Should not trigger pixel if bid does not contain burl', function() {
      const result = spec.onBidWon({});

      expect(ajaxStub.calledOnce).to.equal(false);
    })

    it('Should trigger pixel with correct macros if bid burl is present', function() {
      const result = spec.onBidWon({
        cpm: 1.5,
        auctionId: 'auc123',
        requestId: 'req123',
        adId: 'ad1234',
        seatBidId: 'sea123',
        burl: 'http://won.foo.bar/trk?ap=${AUCTION_PRICE}&aid=${AUCTION_ID}&imp=${AUCTION_IMP_ID}&adid=${AUCTION_AD_ID}&sid=${AUCTION_SEAT_ID}'
      });

      expect(ajaxStub.calledOnceWith('http://won.foo.bar/trk?ap=1.5&aid=auc123&imp=req123&adid=ad1234&sid=sea123')).to.equal(true);
    })
  })
});
