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

  describe('interpretResponse()', () => {
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
  });
});
