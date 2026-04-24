import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from 'modules/floxisBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import * as utils from 'src/utils.js';

describe('floxisBidAdapter', function () {
  const DEFAULT_PARAMS = { seat: 'Gmtb', region: 'us-e', partner: 'floxis' };

  const validBannerBid = {
    bidId: 'bid-1',
    bidder: 'floxis',
    adUnitCode: 'adunit-banner',
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    params: { ...DEFAULT_PARAMS }
  };

  const validVideoBid = {
    bidId: 'bid-2',
    bidder: 'floxis',
    adUnitCode: 'adunit-video',
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3],
        context: 'instream'
      }
    },
    params: { ...DEFAULT_PARAMS }
  };

  const validNativeBid = {
    bidId: 'bid-3',
    bidder: 'floxis',
    adUnitCode: 'adunit-native',
    mediaTypes: {
      native: {
        image: { required: true, sizes: [150, 50] },
        title: { required: true, len: 80 }
      }
    },
    params: { ...DEFAULT_PARAMS }
  };

  describe('isBidRequestValid', function () {
    it('should return true for valid banner bid', function () {
      expect(spec.isBidRequestValid(validBannerBid)).to.be.true;
    });

    it('should return true for valid video bid', function () {
      expect(spec.isBidRequestValid(validVideoBid)).to.be.true;
    });

    it('should return true for valid native bid', function () {
      expect(spec.isBidRequestValid(validNativeBid)).to.be.true;
    });

    it('should return false when seat is missing', function () {
      const bid = { ...validBannerBid, params: { region: 'us-e' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when seat is empty string', function () {
      const bid = { ...validBannerBid, params: { seat: '', region: 'us-e' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true when region is missing (default region applies)', function () {
      const bid = { ...validBannerBid, params: { seat: 'Gmtb' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when region is empty string', function () {
      const bid = { ...validBannerBid, params: { seat: 'Gmtb', region: '' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true when partner is missing (default partner applies)', function () {
      const bid = { ...validBannerBid, params: { seat: 'Gmtb', region: 'us-e' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when partner is empty string', function () {
      const bid = { ...validBannerBid, params: { seat: 'Gmtb', region: 'us-e', partner: '' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params is missing', function () {
      const bid = { bidId: 'x', mediaTypes: { banner: { sizes: [[300, 250]] } } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when seat is not a string', function () {
      const bid = { ...validBannerBid, params: { seat: 123, region: 'us-e', partner: 'floxis' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when region is not in whitelist', function () {
      const bid = { ...validBannerBid, params: { ...DEFAULT_PARAMS, region: 'eu-w' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when partner is not in whitelist', function () {
      const bid = { ...validBannerBid, params: { ...DEFAULT_PARAMS, partner: 'mypartner' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true with default partner', function () {
      const bid = { ...validBannerBid, params: { ...DEFAULT_PARAMS, partner: 'floxis' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
  });

  describe('supportedMediaTypes', function () {
    it('should include banner, video, and native', function () {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO, NATIVE]);
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      bidderCode: 'floxis',
      auctionId: 'auction-123',
      timeout: 3000
    };

    it('should return an array with one POST request', function () {
      const requests = spec.buildRequests([validBannerBid], bidderRequest);
      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
    });

    it('should build URL without partner prefix when partner is floxis', function () {
      const requests = spec.buildRequests([validBannerBid], bidderRequest);
      expect(requests[0].url).to.equal('https://us-e.floxis.tech/pbjs?seat=Gmtb');
    });

    it('should return no requests for non-whitelisted partner', function () {
      const bidWithPartner = {
        ...validBannerBid,
        params: { ...DEFAULT_PARAMS, partner: 'mypartner' }
      };
      const requests = spec.buildRequests([bidWithPartner], bidderRequest);
      expect(requests).to.be.an('array').that.is.empty;
    });

    it('should default region to us-e when missing', function () {
      const bidWithoutRegion = {
        ...validBannerBid,
        params: { seat: 'Gmtb', partner: 'floxis' }
      };
      const requests = spec.buildRequests([bidWithoutRegion], bidderRequest);
      expect(requests[0].url).to.equal('https://us-e.floxis.tech/pbjs?seat=Gmtb');
    });

    it('should default partner to floxis when missing', function () {
      const bidWithoutPartner = {
        ...validBannerBid,
        params: { seat: 'Gmtb', region: 'us-e' }
      };
      const requests = spec.buildRequests([bidWithoutPartner], bidderRequest);
      expect(requests[0].url).to.equal('https://us-e.floxis.tech/pbjs?seat=Gmtb');
    });

    it('should return empty array for empty bid requests', function () {
      const requests = spec.buildRequests([], bidderRequest);
      expect(requests).to.be.an('array').that.is.empty;
    });

    it('should produce valid ORTB request payload', function () {
      const requests = spec.buildRequests([validBannerBid], bidderRequest);
      const data = requests[0].data;
      expect(data).to.be.an('object');
      expect(data.imp).to.be.an('array').with.lengthOf(1);
      expect(data.at).to.equal(1);
    });

    it('should set ext with adapter info', function () {
      const requests = spec.buildRequests([validBannerBid], bidderRequest);
      const data = requests[0].data;
      expect(data.ext.prebid.adapter).to.equal('floxis');
      expect(data.ext.prebid.adapterVersion).to.be.undefined;
      expect(data.ext.prebid.version).to.equal('$prebid.version$');
    });

    it('should build banner imp correctly', function () {
      const requests = spec.buildRequests([validBannerBid], bidderRequest);
      const imp = requests[0].data.imp[0];
      expect(imp).to.have.property('banner');
      expect(imp.banner.format).to.be.an('array');
      expect(imp.secure).to.equal(1);
    });

    if (FEATURES.VIDEO) {
      it('should build video imp correctly', function () {
        const requests = spec.buildRequests([validVideoBid], bidderRequest);
        const imp = requests[0].data.imp[0];
        expect(imp).to.have.property('video');
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.video.protocols).to.deep.equal([2, 3]);
      });
    }

    it('should handle multiple bids in single request', function () {
      const requests = spec.buildRequests([validBannerBid, validVideoBid], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp).to.have.lengthOf(2);
    });

    it('should split requests by seat when using allowed defaults', function () {
      const mixedBid = {
        ...validVideoBid,
        params: {
          seat: 'Seat2',
          region: 'us-e',
          partner: 'floxis'
        }
      };

      const requests = spec.buildRequests([validBannerBid, mixedBid], bidderRequest);
      expect(requests).to.have.lengthOf(2);
      expect(requests[0].url).to.equal('https://us-e.floxis.tech/pbjs?seat=Gmtb');
      expect(requests[1].url).to.equal('https://us-e.floxis.tech/pbjs?seat=Seat2');
      expect(requests[0].data.imp).to.have.lengthOf(1);
      expect(requests[1].data.imp).to.have.lengthOf(1);
    });

    it('should ignore non-whitelisted bids in mixed request arrays', function () {
      const invalidBid = {
        ...validVideoBid,
        params: {
          seat: 'Seat2',
          region: 'eu-w',
          partner: 'mypartner'
        }
      };

      const requests = spec.buildRequests([validBannerBid, invalidBid], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].url).to.equal('https://us-e.floxis.tech/pbjs?seat=Gmtb');
      expect(requests[0].data.imp).to.have.lengthOf(1);
    });

    it('should set withCredentials option', function () {
      const requests = spec.buildRequests([validBannerBid], bidderRequest);
      expect(requests[0].options.withCredentials).to.be.true;
    });

    describe('Floors Module support', function () {
      it('should set bidfloor from getFloor', function () {
        const bidWithFloor = {
          ...validBannerBid,
          getFloor: function () {
            return { floor: 2.5, currency: 'USD' };
          }
        };
        const requests = spec.buildRequests([bidWithFloor], bidderRequest);
        const imp = requests[0].data.imp[0];
        expect(imp.bidfloor).to.equal(2.5);
        expect(imp.bidfloorcur).to.equal('USD');
      });

      it('should not set bidfloor when getFloor is not present', function () {
        const requests = spec.buildRequests([validBannerBid], bidderRequest);
        const imp = requests[0].data.imp[0];
        expect(imp.bidfloor).to.be.undefined;
      });

      it('should handle getFloor throwing an error gracefully', function () {
        const bidBrokenFloor = {
          ...validBannerBid,
          getFloor: function () {
            throw new Error('floor error');
          }
        };
        const requests = spec.buildRequests([bidBrokenFloor], bidderRequest);
        const imp = requests[0].data.imp[0];
        expect(imp.bidfloor).to.be.undefined;
      });
    });

    describe('ortb2 passthrough', function () {
      it('should merge ortb2 data into the ORTB request', function () {
        const ortb2BidderRequest = {
          ...bidderRequest,
          ortb2: {
            regs: { ext: { gdpr: 1 } },
            user: { ext: { consent: 'consent-string-123' } }
          }
        };
        const requests = spec.buildRequests([validBannerBid], ortb2BidderRequest);
        const data = requests[0].data;
        expect(data.regs.ext.gdpr).to.equal(1);
        expect(data.user.ext.consent).to.equal('consent-string-123');
      });

      it('should merge ortb2 USP data into the ORTB request', function () {
        const uspBidderRequest = {
          ...bidderRequest,
          ortb2: {
            regs: { ext: { us_privacy: '1YNN' } }
          }
        };
        const requests = spec.buildRequests([validBannerBid], uspBidderRequest);
        const data = requests[0].data;
        expect(data.regs.ext.us_privacy).to.equal('1YNN');
      });
    });
  });

  describe('interpretResponse', function () {
    function buildRequest() {
      return spec.buildRequests([validBannerBid], {
        bidderCode: 'floxis',
        auctionId: 'auction-123'
      })[0];
    }

    it('should parse valid banner ORTB response', function () {
      const request = buildRequest();
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: validBannerBid.bidId,
              price: 1.23,
              w: 300,
              h: 250,
              crid: 'creative-1',
              adm: '<div>ad</div>',
              mtype: 1
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].creativeId).to.equal('creative-1');
      expect(bids[0].ad).to.equal('<div>ad</div>');
      expect(bids[0].requestId).to.equal(validBannerBid.bidId);
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].currency).to.equal('USD');
    });

    if (FEATURES.VIDEO) {
      it('should parse valid video ORTB response', function () {
        const videoRequest = spec.buildRequests([validVideoBid], {
          bidderCode: 'floxis',
          auctionId: 'auction-456'
        })[0];
        const serverResponse = {
          body: {
            seatbid: [{
              bid: [{
                impid: validVideoBid.bidId,
                price: 5.00,
                w: 640,
                h: 480,
                crid: 'video-creative-1',
                adm: '<VAST></VAST>',
                mtype: 2
              }]
            }]
          }
        };
        const bids = spec.interpretResponse(serverResponse, videoRequest);
        expect(bids).to.be.an('array').with.lengthOf(1);
        expect(bids[0].cpm).to.equal(5.00);
        expect(bids[0].vastXml).to.equal('<VAST></VAST>');
        expect(bids[0].mediaType).to.equal(VIDEO);
      });
    }

    it('should return empty array for empty response', function () {
      const request = buildRequest();
      const bids = spec.interpretResponse({ body: {} }, request);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should return empty array for null response body', function () {
      const request = buildRequest();
      const bids = spec.interpretResponse({ body: null }, request);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should return empty array for undefined response', function () {
      const request = buildRequest();
      const bids = spec.interpretResponse(undefined, request);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should return empty array for undefined request', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: validBannerBid.bidId,
              price: 1.23,
              w: 300,
              h: 250,
              crid: 'creative-1',
              adm: '<div>ad</div>',
              mtype: 1
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, undefined);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should handle multiple bids in seatbid', function () {
      const bids2 = [
        { ...validBannerBid, bidId: 'bid-a' },
        { ...validBannerBid, bidId: 'bid-b', adUnitCode: 'adunit-2' }
      ];
      const request = spec.buildRequests(bids2, { bidderCode: 'floxis', auctionId: 'a1' })[0];
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [
              { impid: 'bid-a', price: 1.0, w: 300, h: 250, crid: 'c1', adm: '<div>1</div>', mtype: 1 },
              { impid: 'bid-b', price: 2.0, w: 300, h: 250, crid: 'c2', adm: '<div>2</div>', mtype: 1 }
            ]
          }]
        }
      };
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(2);
      expect(result[0].cpm).to.equal(1.0);
      expect(result[1].cpm).to.equal(2.0);
    });

    it('should set advertiserDomains from adomain', function () {
      const request = buildRequest();
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: validBannerBid.bidId,
              price: 1.0,
              w: 300,
              h: 250,
              crid: 'c1',
              adm: '<div>ad</div>',
              adomain: ['adv.com'],
              mtype: 1
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['adv.com']);
    });
  });

  describe('getUserSyncs', function () {
    it('should return empty array', function () {
      expect(spec.getUserSyncs()).to.be.an('array').that.is.empty;
    });
  });

  describe('onBidWon', function () {
    let triggerPixelStub;

    beforeEach(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      triggerPixelStub.restore();
    });

    it('should fire burl pixel', function () {
      spec.onBidWon({ burl: 'https://example.com/burl' });
      expect(triggerPixelStub.calledWith('https://example.com/burl')).to.be.true;
    });

    it('should fire nurl pixel', function () {
      spec.onBidWon({ nurl: 'https://example.com/nurl' });
      expect(triggerPixelStub.calledWith('https://example.com/nurl')).to.be.true;
    });

    it('should fire both burl and nurl pixels', function () {
      spec.onBidWon({
        burl: 'https://example.com/burl',
        nurl: 'https://example.com/nurl'
      });
      expect(triggerPixelStub.callCount).to.equal(2);
    });

    it('should not fire pixels when no urls present', function () {
      spec.onBidWon({});
      expect(triggerPixelStub.called).to.be.false;
    });
  });
});
