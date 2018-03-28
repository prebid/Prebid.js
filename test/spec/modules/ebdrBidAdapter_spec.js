import { expect } from 'chai';
import { spec } from 'modules/ebdrBidAdapter';
import { VIDEO, BANNER } from 'src/mediaTypes';
import * as utils from 'src/utils';

describe('ebdrBidAdapter', () => {
  let bidRequests;

  beforeEach(() => {
    bidRequests = [
      {
        code: 'div-gpt-ad-1460505748561-0',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        bidder: 'ebdr',
        params: {
          zoneid: '99999',
          bidfloor: '1.00',
          IDFA: 'xxx-xxx',
          ADID: 'xxx-xxx',
          latitude: '34.089811',
          longitude: '-118.392805'
        },
        bidId: '2c5e8a1a84522d',
        bidderRequestId: '1d0c4017f02458',
        auctionId: '9adc85ed-43ee-4a78-816b-52b7e578f314'
      }, {
        adUnitCode: 'div-gpt-ad-1460505748561-1',
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [300, 250]
          }
        },
        bidder: 'ebdr',
        params: {
          zoneid: '99998',
          bidfloor: '1.00',
          IDFA: 'xxx-xxx',
          ADID: 'xxx-xxx',
          latitude: '34.089811',
          longitude: '-118.392805'
        },
        bidId: '23a01e95856577',
        bidderRequestId: '1d0c4017f02458',
        auctionId: '9adc85ed-43ee-4a78-816b-52b7e578f314'
      }
    ];
  });

  describe('spec.isBidRequestValid', () => {
    it('should return true when the required params are passed', () => {
      const bidRequest = bidRequests[0];
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when the only required param is missing', () => {
      const bidRequest = bidRequests[0];
      bidRequest.params = {
        zoneid: '99998',
        bidfloor: '1.00',
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when the "bidfloor" param is missing', () => {
      const bidRequest = bidRequests[0];
      bidRequest.params = {
        zoneid: '99998',
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
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
    describe('for banner bids', () => {
      it('must handle an empty bid size', () => {
        bidRequests[0].mediaTypes = { banner: {} };
        const requests = spec.buildRequests(bidRequests);
        const bidRequest = {};
        bidRequest['2c5e8a1a84522d'] = { mediaTypes: BANNER, w: null, h: null };
        expect(requests.bids['2c5e8a1a84522d']).to.deep.equals(bidRequest['2c5e8a1a84522d']);
      });
      it('should create a single GET', () => {
        bidRequests[0].mediaTypes = { banner: {} };
        bidRequests[1].mediaTypes = { banner: {} };
        const requests = spec.buildRequests(bidRequests);
        expect(requests.method).to.equal('GET');
      });
      it('must parse bid size from a nested array', () => {
        const width = 640;
        const height = 480;
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { banner: {sizes: [[ width, height ]]} };
        const requests = spec.buildRequests([ bidRequest ]);
        const data = {};
        data['2c5e8a1a84522d'] = { mediaTypes: BANNER, w: width, h: height };
        expect(requests.bids['2c5e8a1a84522d']).to.deep.equal(data['2c5e8a1a84522d']);
      });
    });
    describe('for video bids', () => {
      it('must handle an empty bid size', () => {
        bidRequests[1].mediaTypes = { video: {} };
        const requests = spec.buildRequests(bidRequests);
        const bidRequest = {};
        bidRequest['23a01e95856577'] = { mediaTypes: VIDEO, w: null, h: null };
        expect(requests.bids['23a01e95856577']).to.deep.equals(bidRequest['23a01e95856577']);
      });

      it('should create a GET request for each bid', () => {
        const bidRequest = bidRequests[1];
        const requests = spec.buildRequests([ bidRequest ]);
        expect(requests.method).to.equal('GET');
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

      it('should return a valid video bid response', () => {
        const ebdrReq = {bids: {}};
        bidRequests.forEach(bid => {
          let _mediaTypes = (bid.mediaTypes && bid.mediaTypes.video ? VIDEO : BANNER);
          ebdrReq.bids[bid.bidId] = {mediaTypes: _mediaTypes,
            w: _mediaTypes == BANNER ? bid.mediaTypes[_mediaTypes].sizes[0][0] : bid.mediaTypes[_mediaTypes].playerSize[0],
            h: _mediaTypes == BANNER ? bid.mediaTypes[_mediaTypes].sizes[0][1] : bid.mediaTypes[_mediaTypes].playerSize[1]
          };
        });
        const serverResponse = {id: '1d0c4017f02458', seatbid: [{bid: [{id: '23a01e95856577', impid: '23a01e95856577', price: 0.81, adid: 'abcde-12345', nurl: 'https://cdn0.bnmla.com/vtest.xml', adm: '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<VAST version=\"2.0\"><Ad id=\"static\"><InLine><AdSystem>Static VAST</AdSystem><AdTitle>Static VAST Tag</AdTitle><Impression /><Creatives><Creative><Linear><Duration>00:00:15</Duration><TrackingEvents><Tracking event=\"start\" /><Tracking event=\"firstQuartile\" /><Tracking event=\"midpoint\" /><Tracking event=\"thirdQuartile\" /><Tracking event=\"complete\" /><Tracking event=\"pause\" /><Tracking event=\"mute\" /><Tracking event=\"fullscreen\" /></TrackingEvents><VideoClicks><ClickThrough>http://www.engagebdr.com/</ClickThrough><ClickTracking /></VideoClicks><MediaFiles><MediaFile type=\"video/mp4\" bitrate=\"160\" width=\"1918\" height=\"1080\">c</MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>', adomain: ['advertiserdomain.com'], iurl: '', cid: 'campaign1', crid: 'abcde-12345', w: 300, h: 250}], seat: '19513bcfca8006'}], bidid: '19513bcfca8006', cur: 'USD'};
        const bidResponse = spec.interpretResponse({ body: serverResponse }, ebdrReq);
        expect(bidResponse[0]).to.deep.equal({
          requestId: bidRequests[1].bidId,
          vastXml: serverResponse.seatbid[0].bid[0].adm,
          mediaType: 'video',
          creativeId: serverResponse.seatbid[0].bid[0].crid,
          cpm: serverResponse.seatbid[0].bid[0].price,
          width: serverResponse.seatbid[0].bid[0].w,
          height: serverResponse.seatbid[0].bid[0].h,
          currency: 'USD',
          netRevenue: true,
          ttl: 3600,
          vastUrl: serverResponse.seatbid[0].bid[0].nurl
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
        const ebdrReq = {bids: {}};
        bidRequests.forEach(bid => {
          let _mediaTypes = (bid.mediaTypes && bid.mediaTypes.video ? VIDEO : BANNER);
          ebdrReq.bids[bid.bidId] = {mediaTypes: _mediaTypes,
            w: _mediaTypes == BANNER ? bid.mediaTypes[_mediaTypes].sizes[0][0] : bid.mediaTypes[_mediaTypes].playerSize[0],
            h: _mediaTypes == BANNER ? bid.mediaTypes[_mediaTypes].sizes[0][1] : bid.mediaTypes[_mediaTypes].playerSize[1]
          };
        });
        const serverResponse = {id: '1d0c4017f02458', seatbid: [{bid: [{id: '2c5e8a1a84522d', impid: '2c5e8a1a84522d', price: 0.81, adid: 'abcde-12345', nurl: '', adm: '<div><img src="http://cdnin.bnmla.com/0b1c6e85e9376e3092df8c9fc8ab9095.gif" width=350 height=250 /></div>', adomain: ['advertiserdomain.com'], iurl: '', cid: 'campaign1', crid: 'abcde-12345', w: 300, h: 250}], seat: '19513bcfca8006'}], bidid: '19513bcfca8006', cur: 'USD', w: 300, h: 250};
        const bidResponse = spec.interpretResponse({ body: serverResponse }, ebdrReq);
        expect(bidResponse[0]).to.deep.equal({
          requestId: bidRequests[ 0 ].bidId,
          ad: serverResponse.seatbid[0].bid[0].adm,
          mediaType: 'banner',
          creativeId: serverResponse.seatbid[0].bid[0].crid,
          cpm: serverResponse.seatbid[0].bid[0].price,
          width: serverResponse.seatbid[0].bid[0].w,
          height: serverResponse.seatbid[0].bid[0].h,
          currency: 'USD',
          netRevenue: true,
          ttl: 3600
        });
      });
    });
  });
});
