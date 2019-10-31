import { expect } from 'chai';
import { spec } from 'modules/oneVideoBidAdapter';
import * as utils from 'src/utils';
import {config} from 'src/config';

describe('OneVideoBidAdapter', function () {
  let bidRequest;
  let bidderRequest;
  let mockConfig;

  beforeEach(function () {
    bidRequest = {
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 480]
        }
      },
      bidder: 'oneVideo',
      sizes: [640, 480],
      bidId: '30b3efwfwe1e',
      adUnitCode: 'video1',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          playbackmethod: [1, 5],
          placement: 123,
          sid: 134,
          rewarded: 1
        },
        site: {
          id: 1,
          page: 'https://news.yahoo.com/portfolios',
          referrer: 'http://www.yahoo.com'
        },
        pubId: 'brxd'
      }
    };
  });

  describe('spec.isBidRequestValid', function () {
    it('should return true when the required params are passed', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when the "video" param is missing', function () {
      bidRequest.params = {
        pubId: 'brxd'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "pubId" param is missing', function () {
      bidRequest.params = {
        video: {
          playerWidth: 480,
          playerHeight: 640,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          playbackmethod: [1, 5],
          placement: 123,
          sid: 134,
          rewarded: 1
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
    it('should return true when the "pubId" param is missing', function () {
      bidRequest.params = {
        video: {
          playerWidth: 480,
          playerHeight: 640,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          playbackmethod: [1, 5],
          placement: 123,
          sid: 134,
          rewarded: 1
        },
        pubId: 'brxd'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when no bid params are passed', function () {
      bidRequest.params = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });

  describe('spec.buildRequests', function () {
    it('should create a POST request for every bid', function () {
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(location.protocol + spec.ENDPOINT + bidRequest.params.pubId);
    });

    it('should attach the bid request object', function () {
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].bidRequest).to.equal(bidRequest);
    });

    it('should attach request data', function () {
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      const [ width, height ] = bidRequest.sizes;
      const placement = bidRequest.params.video.placement;
      const rewarded = bidRequest.params.video.rewarded;
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
      expect(data.imp[0].ext.placement).to.equal(placement);
      expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
      expect(data.imp[0].ext.rewarded).to.equal(rewarded);
    });

    it('must parse bid size from a nested array', function () {
      const width = 640;
      const height = 480;
      bidRequest.sizes = [[ width, height ]];
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
    });
  });

  describe('spec.interpretResponse', function () {
    it('should return no bids if the response is not valid', function () {
      const bidResponse = spec.interpretResponse({ body: null }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "nurl" and "adm" are missing', function () {
      const serverResponse = {seatbid: [{bid: [{price: 6.01}]}]};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "price" is missing', function () {
      const serverResponse = {seatbid: [{bid: [{adm: '<VAST></VAST>'}]}]};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return a valid bid response with just "adm"', function () {
      const serverResponse = {seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      let o = {
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        cpm: serverResponse.seatbid[0].bid[0].price,
        adId: serverResponse.seatbid[0].bid[0].adid,
        creativeId: serverResponse.seatbid[0].bid[0].crid,
        vastXml: serverResponse.seatbid[0].bid[0].adm,
        width: 640,
        height: 480,
        mediaType: 'video',
        currency: 'USD',
        ttl: 100,
        netRevenue: true,
        adUnitCode: bidRequest.adUnitCode,
        renderer: (bidRequest.mediaTypes.video.context === 'outstream') ? newRenderer(bidRequest, bidResponse) : undefined,
      };
      expect(bidResponse).to.deep.equal(o);
    });
  });

  describe('when GDPR applies', function () {
    beforeEach(function () {
      bidderRequest = {
        gdprConsent: {
          consentString: 'test-gdpr-consent-string',
          gdprApplies: true
        }
      };

      mockConfig = {
        consentManagement: {
          cmpApi: 'iab',
          timeout: 1111,
          allowAuctionWithoutConsent: 'cancel'
        }
      };
    });

    it('should send a signal to specify that GDPR applies to this request', function () {
      const request = spec.buildRequests([ bidRequest ], bidderRequest);
      expect(request[0].data.regs.ext.gdpr).to.equal(1);
    });

    it('should send the consent string', function () {
      const request = spec.buildRequests([ bidRequest ], bidderRequest);
      expect(request[0].data.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should send schain object', function () {
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.source.ext.schain.nodes[0].sid).to.equal(bidRequest.params.video.sid);
      expect(data.source.ext.schain.nodes[0].rid).to.equal(data.id);
    });
  });
  describe('should send banner object', function () {
    it('should send banner object when display is 1', function () {
      bidRequest = {
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480]
          }
        },
        bidder: 'oneVideo',
        sizes: [640, 480],
        bidId: '30b3efwfwe1e',
        adUnitCode: 'video1',
        params: {
          video: {
            playerWidth: 640,
            playerHeight: 480,
            mimes: ['video/mp4', 'application/javascript'],
            protocols: [2, 5],
            api: [2],
            position: 1,
            delivery: [2],
            playbackmethod: [1, 5],
            placement: 123,
            sid: 134,
            display: 1
          },
          site: {
            id: 1,
            page: 'https://www.yahoo.com/',
            referrer: 'http://www.yahoo.com'
          },
          pubId: 'OneMDisplay'
        }
      };
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      const width = bidRequest.params.video.playerWidth;
      const height = bidRequest.params.video.playerHeight;
      const position = bidRequest.params.video.position;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      expect(data.imp[0].banner.w).to.equal(width);
      expect(data.imp[0].banner.h).to.equal(height);
      expect(data.imp[0].banner.pos).to.equal(position);
      expect(data.imp[0].banner.mimes).to.equal(bidRequest.params.video.mimes);
    });
    it('should send video object when display is other than 1', function () {
      bidRequest = {
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480]
          }
        },
        bidder: 'oneVideo',
        sizes: [640, 480],
        bidId: '30b3efwfwe1e',
        adUnitCode: 'video1',
        params: {
          video: {
            playerWidth: 640,
            playerHeight: 480,
            mimes: ['video/mp4', 'application/javascript'],
            protocols: [2, 5],
            api: [2],
            position: 1,
            delivery: [2],
            playbackmethod: [1, 5],
            placement: 123,
            sid: 134,
            display: 12
          },
          site: {
            id: 1,
            page: 'https://www.yahoo.com/',
            referrer: 'http://www.yahoo.com'
          },
          pubId: 'OneMDisplay'
        }
      };
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      const width = bidRequest.params.video.playerWidth;
      const height = bidRequest.params.video.playerHeight;
      const position = bidRequest.params.video.position;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
      expect(data.imp[0].video.pos).to.equal(position);
      expect(data.imp[0].video.mimes).to.equal(bidRequest.params.video.mimes);
    });
    it('should send video object when display is not passed', function () {
      bidRequest = {
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480]
          }
        },
        bidder: 'oneVideo',
        sizes: [640, 480],
        bidId: '30b3efwfwe1e',
        adUnitCode: 'video1',
        params: {
          video: {
            playerWidth: 640,
            playerHeight: 480,
            mimes: ['video/mp4', 'application/javascript'],
            protocols: [2, 5],
            api: [2],
            position: 1,
            delivery: [2],
            playbackmethod: [1, 5],
            placement: 123,
            sid: 134
          },
          site: {
            id: 1,
            page: 'https://www.yahoo.com/',
            referrer: 'http://www.yahoo.com'
          },
          pubId: 'OneMDisplay'
        }
      };
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      const width = bidRequest.params.video.playerWidth;
      const height = bidRequest.params.video.playerHeight;
      const position = bidRequest.params.video.position;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
      expect(data.imp[0].video.pos).to.equal(position);
      expect(data.imp[0].video.mimes).to.equal(bidRequest.params.video.mimes);
    });
  });
});
