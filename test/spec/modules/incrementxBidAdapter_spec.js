import { expect } from 'chai';
import { spec } from 'modules/incrementxBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { INSTREAM, OUTSTREAM } from 'src/video.js';

describe('incrementx', function () {
  const bannerBidRequest = {
    bidder: 'incrementx',
    params: {
      placementId: 'IX-HB-12345'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    sizes: [
      [300, 250],
      [300, 600]
    ],
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    bidId: '2faedf3e89d123',
    bidderRequestId: '1c78fb49cc71c6',
    auctionId: 'b4f81e8e36232',
    transactionId: '0d95b2c1-a834-4e50-a962-9b6aa0e1c8fb'
  };
  const videoBidRequest = {
    bidder: 'incrementx',
    params: {
      placementId: 'IX-HB-12346'
    },
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: ['640x480']
      }
    },
    adUnitCode: 'div-gpt-ad-1460505748561-1',
    bidId: '2faedf3e89d124',
    bidderRequestId: '1c78fb49cc71c7',
    auctionId: 'b4f81e8e36233',
    transactionId: '0d95b2c1-a834-4e50-a962-9b6aa0e1c8fc'
  };
  const instreamVideoBidRequest = {
    bidder: 'incrementx',
    params: {
      placementId: 'IX-HB-12347'
    },
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6],
        playbackmethod: [1, 2],
        skip: 1,
        skipafter: 5
      }
    },
    adUnitCode: 'div-gpt-ad-1460505748561-2',
    bidId: '2faedf3e89d125',
    bidderRequestId: '1c78fb49cc71c8',
    auctionId: 'b4f81e8e36234',
    transactionId: '0d95b2c1-a834-4e50-a962-9b6aa0e1c8fd'
  };

  describe('isBidRequestValid', function () {
    it('should return true when required params are found', function () {
      expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(true);
      expect(spec.isBidRequestValid(videoBidRequest)).to.equal(true);
      expect(spec.isBidRequestValid(instreamVideoBidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      refererInfo: {
        page: 'https://someurl.com'
      }
    };
    it('should build banner request', function () {
      const requests = spec.buildRequests([bannerBidRequest], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('https://hb.incrementxserv.com/vzhbidder/bid');
      const data = JSON.parse(decodeURI(requests[0].data.q));
      expect(data._vzPlacementId).to.equal('IX-HB-12345');
      expect(data.sizes).to.to.a('array');
      expect(data.mChannel).to.equal(1);
    });
    it('should build outstream video request', function () {
      const requests = spec.buildRequests([videoBidRequest], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('https://hb.incrementxserv.com/vzhbidder/bid');
      const data = JSON.parse(decodeURI(requests[0].data.q));
      expect(data._vzPlacementId).to.equal('IX-HB-12346');
      expect(data.sizes).to.be.a('array');
      expect(data.mChannel).to.equal(2);
      // For video, bidderRequestData should be included
      expect(requests[0].data.bidderRequestData).to.exist;
    });
    it('should build instream video request', function () {
      const requests = spec.buildRequests([instreamVideoBidRequest], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('https://hb.incrementxserv.com/vzhbidder/bid');
      const data = JSON.parse(decodeURI(requests[0].data.q));
      expect(data._vzPlacementId).to.equal('IX-HB-12347');
      expect(data.sizes).to.be.a('array');
      expect(data.mChannel).to.equal(2);

      // For video, bidderRequestData should be included
      expect(requests[0].data.bidderRequestData).to.exist;
      const decodedBidderRequestData = decodeURI(requests[0].data.bidderRequestData);
      expect(decodedBidderRequestData).to.be.a('string');
      // Verify it can be parsed as JSON
      expect(() => JSON.parse(decodedBidderRequestData)).to.not.throw();
    });
  });

  describe('interpretResponse', function () {
    const bannerServerResponse = {
      body: {
        slotBidId: '2faedf3e89d123',
        cpm: 0.5,
        adWidth: 300,
        adHeight: 250,
        ad: '<div>Banner Ad</div>',
        mediaType: BANNER,
        netRevenue: true,
        currency: 'USD',
        advertiserDomains: ['example.com']
      }
    };
    const videoServerResponse = {
      body: {
        slotBidId: '2faedf3e89d124',
        cpm: 1.0,
        adWidth: 640,
        adHeight: 480,
        ad: '<VAST>Test VAST</VAST>',
        mediaType: VIDEO,
        netRevenue: true,
        currency: 'USD',
        rUrl: 'https://example.com/vast.xml',
        advertiserDomains: ['example.com']
      }
    };
    const instreamVideoServerResponse = {
      body: {
        slotBidId: '2faedf3e89d125',
        cpm: 1.5,
        adWidth: 640,
        adHeight: 480,
        ad: '<VAST>Test Instream VAST</VAST>',
        mediaType: VIDEO,
        netRevenue: true,
        currency: 'USD',
        ttl: 300,
        advertiserDomains: ['example.com']
      }
    };

    const bidderRequest = {
      refererInfo: {
        page: 'https://someurl.com'
      },
      data: {
        bidderRequestData: JSON.stringify({
          bids: [videoBidRequest]
        })
      }
    };

    const instreamBidderRequest = {
      refererInfo: {
        page: 'https://someurl.com'
      },
      data: {
        bidderRequestData: JSON.stringify({
          bids: [instreamVideoBidRequest]
        })
      }
    };

    it('should handle banner response', function () {
      const bidResponses = spec.interpretResponse(bannerServerResponse, bidderRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const bid = bidResponses[0];
      expect(bid.requestId).to.equal('2faedf3e89d123');
      expect(bid.cpm).to.equal(0.5);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.ad).to.equal('<div>Banner Ad</div>');
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('should handle outstream video response', function () {
      const bidResponses = spec.interpretResponse(videoServerResponse, bidderRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const bid = bidResponses[0];
      expect(bid.requestId).to.equal('2faedf3e89d124');
      expect(bid.cpm).to.equal(1.0);
      expect(bid.width).to.equal(640);
      expect(bid.height).to.equal(480);
      expect(bid.vastXml).to.equal('<VAST>Test VAST</VAST>');
      expect(bid.renderer).to.exist;
      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('should handle instream video response', function () {
      const bidResponses = spec.interpretResponse(instreamVideoServerResponse, instreamBidderRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const bid = bidResponses[0];
      expect(bid.requestId).to.equal('2faedf3e89d125');
      expect(bid.cpm).to.equal(1.5);
      expect(bid.width).to.equal(640);
      expect(bid.height).to.equal(480);
      expect(bid.vastUrl).to.equal('<VAST>Test Instream VAST</VAST>');
      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.ttl).to.equal(300);
      expect(bid.renderer).to.not.exist;
      expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
    });
  });
});
