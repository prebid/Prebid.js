import { expect } from 'chai';
import { spec, VIDEO_ENDPOINT, BANNER_ENDPOINT, OUTSTREAM_SRC, DEFAULT_MIMES } from 'modules/beachfrontBidAdapter';
import * as utils from 'src/utils';

describe('BeachfrontAdapter', () => {
  let bidRequests;

  beforeEach(() => {
    bidRequests = [
      {
        bidder: 'beachfront',
        params: {
          bidfloor: 2.00,
          appId: '3b16770b-17af-4d22-daff-9606bdf2c9c3'
        },
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        sizes: [ 300, 250 ],
        bidId: '25186806a41eab',
        bidderRequestId: '15bdd8d4a0ebaf',
        auctionId: 'f17d62d0-e3e3-48d0-9f73-cb4ea358a309'
      }, {
        bidder: 'beachfront',
        params: {
          bidfloor: 1.00,
          appId: '11bc5dd5-7421-4dd8-c926-40fa653bec76'
        },
        adUnitCode: 'div-gpt-ad-1460505748561-1',
        sizes: [ 300, 600 ],
        bidId: '365088ee6d649d',
        bidderRequestId: '15bdd8d4a0ebaf',
        auctionId: 'f17d62d0-e3e3-48d0-9f73-cb4ea358a309'
      }
    ];
  });

  describe('spec.isBidRequestValid', () => {
    it('should return true when the required params are passed', () => {
      const bidRequest = bidRequests[0];
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when the "bidfloor" param is missing', () => {
      const bidRequest = bidRequests[0];
      bidRequest.params = {
        appId: '11bc5dd5-7421-4dd8-c926-40fa653bec76'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "appId" param is missing', () => {
      const bidRequest = bidRequests[0];
      bidRequest.params = {
        bidfloor: 5.00
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when no bid params are passed', () => {
      const bidRequest = bidRequests[0];
      bidRequest.params = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when a bid request is not passed', () => {
      expect(spec.isBidRequestValid()).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  describe('spec.buildRequests', () => {
    describe('for video bids', () => {
      it('should attach the bid request object', () => {
        bidRequests[0].mediaTypes = { video: {} };
        bidRequests[1].mediaTypes = { video: {} };
        const requests = spec.buildRequests(bidRequests);
        expect(requests[0].bidRequest).to.equal(bidRequests[0]);
        expect(requests[1].bidRequest).to.equal(bidRequests[1]);
      });

      it('should create a POST request for each bid', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { video: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        expect(requests[0].method).to.equal('POST');
        expect(requests[0].url).to.equal(VIDEO_ENDPOINT + bidRequest.params.appId);
      });

      it('should attach request data', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { video: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        const [ width, height ] = bidRequest.sizes;
        const topLocation = utils.getTopWindowLocation();
        expect(data.isPrebid).to.equal(true);
        expect(data.appId).to.equal(bidRequest.params.appId);
        expect(data.domain).to.equal(document.location.hostname);
        expect(data.id).to.be.a('string');
        expect(data.imp[0].video).to.deep.contain({ w: width, h: height, mimes: DEFAULT_MIMES });
        expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
        expect(data.site).to.deep.equal({ page: topLocation.href, domain: topLocation.hostname });
        expect(data.device).to.deep.contain({ ua: navigator.userAgent, language: navigator.language, js: 1 });
        expect(data.cur).to.deep.equal(['USD']);
      });

      it('must parse bid size from a nested array', () => {
        const width = 640;
        const height = 480;
        const bidRequest = bidRequests[0];
        bidRequest.sizes = [[ width, height ]];
        bidRequest.mediaTypes = { video: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        expect(data.imp[0].video).to.deep.contain({ w: width, h: height });
      });

      it('must parse bid size from a string', () => {
        const width = 640;
        const height = 480;
        const bidRequest = bidRequests[0];
        bidRequest.sizes = `${width}x${height}`;
        bidRequest.mediaTypes = { video: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        expect(data.imp[0].video).to.deep.contain({ w: width, h: height });
      });

      it('must handle an empty bid size', () => {
        const bidRequest = bidRequests[0];
        bidRequest.sizes = [];
        bidRequest.mediaTypes = { video: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        expect(data.imp[0].video).to.deep.contain({ w: undefined, h: undefined });
      });

      it('must override video targeting params', () => {
        const bidRequest = bidRequests[0];
        const mimes = ['video/webm'];
        bidRequest.mediaTypes = { video: {} };
        bidRequest.params.video = { mimes };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        expect(data.imp[0].video).to.deep.contain({ mimes });
      });
    });

    describe('for banner bids', () => {
      it('should attach the bid requests array', () => {
        bidRequests[0].mediaTypes = { banner: {} };
        bidRequests[1].mediaTypes = { banner: {} };
        const requests = spec.buildRequests(bidRequests);
        expect(requests[0].bidRequest).to.deep.equal(bidRequests);
      });

      it('should create a single POST request for all bids', () => {
        bidRequests[0].mediaTypes = { banner: {} };
        bidRequests[1].mediaTypes = { banner: {} };
        const requests = spec.buildRequests(bidRequests);
        expect(requests.length).to.equal(1);
        expect(requests[0].method).to.equal('POST');
        expect(requests[0].url).to.equal(BANNER_ENDPOINT);
      });

      it('should attach request data', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { banner: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        const [ width, height ] = bidRequest.sizes;
        const topLocation = utils.getTopWindowLocation();
        expect(data.slots).to.deep.equal([
          {
            slot: bidRequest.adUnitCode,
            id: bidRequest.params.appId,
            bidfloor: bidRequest.params.bidfloor,
            sizes: [{ w: width, h: height }]
          }
        ]);
        expect(data.page).to.equal(topLocation.href);
        expect(data.domain).to.equal(topLocation.hostname);
        expect(data.search).to.equal(topLocation.search);
        expect(data.ua).to.equal(navigator.userAgent);
      });

      it('must parse bid size from a nested array', () => {
        const width = 640;
        const height = 480;
        const bidRequest = bidRequests[0];
        bidRequest.sizes = [[ width, height ]];
        bidRequest.mediaTypes = { banner: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        expect(data.slots[0].sizes).to.deep.equal([
          { w: width, h: height }
        ]);
      });

      it('must parse bid size from a string', () => {
        const width = 640;
        const height = 480;
        const bidRequest = bidRequests[0];
        bidRequest.sizes = `${width}x${height}`;
        bidRequest.mediaTypes = { banner: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        expect(data.slots[0].sizes).to.deep.equal([
          { w: width, h: height }
        ]);
      });

      it('must handle an empty bid size', () => {
        const bidRequest = bidRequests[0];
        bidRequest.sizes = [];
        bidRequest.mediaTypes = { banner: {} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = requests[0].data;
        expect(data.slots[0].sizes).to.deep.equal([]);
      });
    });
  });

  describe('spec.interpretResponse', () => {
    describe('for video bids', () => {
      it('should return no bids if the response is not valid', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { video: {} };
        const bidResponse = spec.interpretResponse({ body: null }, { bidRequest });
        expect(bidResponse.length).to.equal(0);
      });

      it('should return no bids if the response "url" is missing', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { video: {} };
        const serverResponse = {
          bidPrice: 5.00
        };
        const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
        expect(bidResponse.length).to.equal(0);
      });

      it('should return no bids if the response "bidPrice" is missing', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { video: {} };
        const serverResponse = {
          url: 'http://reachms.bfmio.com/getmu?aid=bid:19c4a196-fb21-4c81-9a1a-ecc5437a39da'
        };
        const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
        expect(bidResponse.length).to.equal(0);
      });

      it('should return a valid video bid response', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { video: {} };
        const serverResponse = {
          bidPrice: 5.00,
          url: 'http://reachms.bfmio.com/getmu?aid=bid:19c4a196-fb21-4c81-9a1a-ecc5437a39da',
          cmpId: '123abc'
        };
        const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
        const [ width, height ] = bidRequest.sizes;
        expect(bidResponse).to.deep.equal({
          requestId: bidRequest.bidId,
          bidderCode: spec.code,
          cpm: serverResponse.bidPrice,
          creativeId: serverResponse.cmpId,
          vastUrl: serverResponse.url,
          width: width,
          height: height,
          renderer: null,
          mediaType: 'video',
          currency: 'USD',
          netRevenue: true,
          ttl: 300
        });
      });

      it('should return a renderer for outstream video bids', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { video: { context: 'outstream' } };
        const serverResponse = {
          bidPrice: 5.00,
          url: 'http://reachms.bfmio.com/getmu?aid=bid:19c4a196-fb21-4c81-9a1a-ecc5437a39da',
          cmpId: '123abc'
        };
        const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
        expect(bidResponse.renderer).to.deep.contain({
          id: bidRequest.bidId,
          url: OUTSTREAM_SRC
        });
      });
    });

    describe('for banner bids', () => {
      it('should return no bids if the response is not valid', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { banner: {} };
        const bidResponse = spec.interpretResponse({ body: null }, { bidRequest });
        expect(bidResponse.length).to.equal(0);
      });

      it('should return no bids if the response is empty', () => {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { banner: {} };
        const bidResponse = spec.interpretResponse({ body: [] }, { bidRequest });
        expect(bidResponse.length).to.equal(0);
      });

      it('should return valid banner bid responses', () => {
        bidRequests[0].mediaTypes = { banner: {} };
        bidRequests[0].sizes = [[ 300, 250 ], [ 728, 90 ]];
        bidRequests[1].mediaTypes = { banner: {} };
        bidRequests[1].sizes = [[ 300, 600 ], [ 200, 200 ]];
        const serverResponse = [{
          slot: bidRequests[0].adUnitCode,
          adm: '<div id="44851937"></div>',
          crid: 'crid_1',
          price: 3.02,
          w: 728,
          h: 90
        }, {
          slot: bidRequests[1].adUnitCode,
          adm: '<div id="44860506"></div>',
          crid: 'crid_2',
          price: 3.06,
          w: 300,
          h: 600
        }];
        const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest: bidRequests });
        expect(bidResponse.length).to.equal(2);
        for (let i = 0; i < bidRequests.length; i++) {
          expect(bidResponse[ i ]).to.deep.equal({
            requestId: bidRequests[ i ].bidId,
            bidderCode: spec.code,
            ad: serverResponse[ i ].adm,
            creativeId: serverResponse[ i ].crid,
            cpm: serverResponse[ i ].price,
            width: serverResponse[ i ].w,
            height: serverResponse[ i ].h,
            mediaType: 'banner',
            currency: 'USD',
            netRevenue: true,
            ttl: 300
          });
        }
      });
    });
  });
});
