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

    it('should return true when region is empty string (default region applies)', function () {
      const bid = { ...validBannerBid, params: { seat: 'Gmtb', region: '' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true when partner is missing (default partner applies)', function () {
      const bid = { ...validBannerBid, params: { seat: 'Gmtb', region: 'us-e' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true when partner is empty string (default partner applies)', function () {
      const bid = { ...validBannerBid, params: { seat: 'Gmtb', region: 'us-e', partner: '' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when params is missing', function () {
      const bid = { bidId: 'x', mediaTypes: { banner: { sizes: [[300, 250]] } } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when seat is not a string', function () {
      const bid = { ...validBannerBid, params: { seat: 123, region: 'us-e', partner: 'floxis' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true for any region (no gating)', function () {
      const bid = { ...validBannerBid, params: { ...DEFAULT_PARAMS, region: 'eu-w' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true for any partner (no gating)', function () {
      const bid = { ...validBannerBid, params: { ...DEFAULT_PARAMS, partner: 'mypartner' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
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

    it('should build a request to a custom partner+region host (no gating)', function () {
      const bidWithPartner = {
        ...validBannerBid,
        params: { seat: 'Gmtb', region: 'apac-sin', partner: 'mypartner' }
      };
      const requests = spec.buildRequests([bidWithPartner], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].url).to.equal('https://mypartner-apac-sin.floxis.tech/pbjs?seat=Gmtb');
    });

    it('should not build a request when partner is not a valid host label', function () {
      const bidWithBadPartner = {
        ...validBannerBid,
        params: { seat: 'Gmtb', partner: 'evil.com/path?x=' }
      };
      const requests = spec.buildRequests([bidWithBadPartner], bidderRequest);
      expect(requests).to.be.an('array').that.is.empty;
    });

    it('should not build a request when region is not a valid host label', function () {
      const bidWithBadRegion = {
        ...validBannerBid,
        params: { seat: 'Gmtb', region: 'evil.com/' }
      };
      const requests = spec.buildRequests([bidWithBadRegion], bidderRequest);
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

    it('should build separate requests for distinct partner/region groups', function () {
      const customBid = {
        ...validVideoBid,
        params: {
          seat: 'Seat2',
          region: 'eu-w',
          partner: 'mypartner'
        }
      };

      const requests = spec.buildRequests([validBannerBid, customBid], bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const urls = requests.map((r) => r.url);
      expect(urls).to.include('https://us-e.floxis.tech/pbjs?seat=Gmtb');
      expect(urls).to.include('https://mypartner-eu-w.floxis.tech/pbjs?seat=Seat2');
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

      it('should not set bidfloor when getFloor returns 0', function () {
        const bidZeroFloor = {
          ...validBannerBid,
          getFloor: function () {
            return { floor: 0, currency: 'USD' };
          }
        };
        const requests = spec.buildRequests([bidZeroFloor], bidderRequest);
        expect(requests[0].data.imp[0].bidfloor).to.be.undefined;
      });

      it('should fall back to params.bidFloor when getFloor is absent', function () {
        const bidStaticFloor = {
          ...validBannerBid,
          params: { ...DEFAULT_PARAMS, bidFloor: 1.75, bidFloorCur: 'USD' }
        };
        const requests = spec.buildRequests([bidStaticFloor], bidderRequest);
        const imp = requests[0].data.imp[0];
        expect(imp.bidfloor).to.equal(1.75);
        expect(imp.bidfloorcur).to.equal('USD');
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

      it('should forward COPPA from ortb2.regs', function () {
        const coppaReq = { ...bidderRequest, ortb2: { regs: { coppa: 1 } } };
        const data = spec.buildRequests([validBannerBid], coppaReq)[0].data;
        expect(data.regs.coppa).to.equal(1);
      });

      it('should forward GPP from ortb2.regs', function () {
        const gppReq = { ...bidderRequest, ortb2: { regs: { gpp: 'DBACNYA~xxx', gpp_sid: [7] } } };
        const data = spec.buildRequests([validBannerBid], gppReq)[0].data;
        expect(data.regs.gpp).to.equal('DBACNYA~xxx');
        expect(data.regs.gpp_sid).to.deep.equal([7]);
      });

      it('should forward user.ext.eids', function () {
        const eids = [{ source: 'id5-sync.com', uids: [{ id: 'ID5-x', atype: 1 }] }];
        const eidsReq = { ...bidderRequest, ortb2: { user: { ext: { eids } } } };
        const data = spec.buildRequests([validBannerBid], eidsReq)[0].data;
        expect(data.user.ext.eids).to.deep.equal(eids);
      });

      it('should forward source.ext.schain', function () {
        const schain = { ver: '1.0', complete: 1, nodes: [{ asi: 'floxis.tech', sid: '1', hp: 1 }] };
        const schainReq = { ...bidderRequest, ortb2: { source: { ext: { schain } } } };
        const data = spec.buildRequests([validBannerBid], schainReq)[0].data;
        expect(data.source.ext.schain).to.deep.equal(schain);
      });

      it('should pass tmax from the bidder request timeout', function () {
        const data = spec.buildRequests([validBannerBid], bidderRequest)[0].data;
        expect(data.tmax).to.equal(3000);
      });

      it('should default cur to USD', function () {
        const data = spec.buildRequests([validBannerBid], bidderRequest)[0].data;
        expect(data.cur).to.deep.equal(['USD']);
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

  // Floxis now emits OpenRTB 2.6 bid.mtype for Prebid.js supply (banner=1, video=2, native=4).
  // The ortbConverter's setResponseMediaType requires it: without mtype it cannot resolve the
  // media type and drops the bid (bids:[]). These tests assert each media type round-trips to
  // exactly one Prebid bid with the correct mediaType and intact cpm/burl, plus the control that
  // a banner response WITHOUT mtype is dropped. Audio (OpenRTB mtype=3) is N/A: the Floxis adapter
  // declares supportedMediaTypes [BANNER, VIDEO, NATIVE] only, so no audio handling is forced.
  describe('mtype media-type resolution (ortbConverter end-to-end)', function () {
    const BURL = 'https://us-e.floxis.tech/wn?p=${AUCTION_PRICE}';

    it('resolves a banner mtype=1 response to exactly one BANNER bid with cpm/burl intact', function () {
      const request = spec.buildRequests([validBannerBid], { bidderCode: 'floxis', auctionId: 'a-banner' })[0];
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: validBannerBid.bidId,
              price: 1.23,
              w: 300,
              h: 250,
              crid: 'creative-banner',
              adm: '<div>banner</div>',
              burl: BURL,
              mtype: 1
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('<div>banner</div>');
      expect(bids[0].burl).to.equal(BURL);
    });

    if (FEATURES.VIDEO) {
      it('resolves a video mtype=2 response to exactly one VIDEO bid with cpm/burl intact', function () {
        const request = spec.buildRequests([validVideoBid], { bidderCode: 'floxis', auctionId: 'a-video' })[0];
        const serverResponse = {
          body: {
            seatbid: [{
              bid: [{
                impid: validVideoBid.bidId,
                price: 5.5,
                w: 640,
                h: 480,
                crid: 'creative-video',
                adm: '<VAST></VAST>',
                burl: BURL,
                mtype: 2
              }]
            }]
          }
        };
        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.be.an('array').with.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].cpm).to.equal(5.5);
        expect(bids[0].vastXml).to.equal('<VAST></VAST>');
        expect(bids[0].burl).to.equal(BURL);
      });
    }

    if (FEATURES.NATIVE) {
      it('resolves a native mtype=4 response to exactly one NATIVE bid with cpm/burl intact', function () {
        const request = spec.buildRequests([validNativeBid], { bidderCode: 'floxis', auctionId: 'a-native' })[0];
        const nativeAdm = JSON.stringify({
          ver: '1.2',
          link: { url: 'https://example.com/click' },
          assets: [
            { id: 1, title: { text: 'Native Title' } },
            { id: 2, img: { url: 'https://example.com/img.png', w: 150, h: 50 } }
          ]
        });
        const serverResponse = {
          body: {
            seatbid: [{
              bid: [{
                impid: validNativeBid.bidId,
                price: 2.75,
                crid: 'creative-native',
                adm: nativeAdm,
                burl: BURL,
                mtype: 4
              }]
            }]
          }
        };
        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.be.an('array').with.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        expect(bids[0].cpm).to.equal(2.75);
        expect(bids[0].burl).to.equal(BURL);
      });
    }

    it('drops a banner response that omits mtype (the original ortbConverter drop bug)', function () {
      const request = spec.buildRequests([validBannerBid], { bidderCode: 'floxis', auctionId: 'a-nomtype' })[0];
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: validBannerBid.bidId,
              price: 1.23,
              w: 300,
              h: 250,
              crid: 'creative-banner',
              adm: '<div>banner</div>'
              // no mtype -> setResponseMediaType cannot resolve -> bid dropped
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('does not advertise an audio media type (audio is N/A for Prebid.js)', function () {
      expect(spec.supportedMediaTypes).to.not.include('audio');
    });
  });

  describe('getUserSyncs', function () {
    // Server-echo: the /pbjs response carries seat + region in the x-floxis-sync header (on bid and
    // no-bid alike). getUserSyncs reads it off serverResponses — no module state. A no-bid is a 204 with
    // an empty body, so these fixtures carry only the header (body is irrelevant to sync derivation).
    function syncResponse(headerValue, body = '') {
      return {
        body,
        headers: { get: (name) => (name === 'x-floxis-sync' ? headerValue : null) }
      };
    }
    const RESPONSES = [syncResponse('seat=Gmtb&region=us-e')];

    it('should return empty array when no sync method is enabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, RESPONSES)).to.be.an('array').that.is.empty;
    });

    it('should return empty array when the adapter did not respond this auction (no serverResponses)', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])).to.be.an('array').that.is.empty;
    });

    it('should sync on a no-bid response (empty body) as long as the sync header is present', function () {
      const noBid = syncResponse('seat=Gmtb&region=us-e', '');
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [noBid]);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].url).to.equal('https://px-us-e.floxis.tech/sync?seat=Gmtb');
    });

    it('should be a no-op when the response carries no sync header (older backend)', function () {
      const noHeader = { body: '', headers: { get: () => null } };
      expect(spec.getUserSyncs({ iframeEnabled: true }, [noHeader])).to.be.an('array').that.is.empty;
    });

    it('should ignore a malformed sync header that lacks a valid region', function () {
      const malformed = syncResponse('seat=Gmtb&region=evil.com/x');
      expect(spec.getUserSyncs({ iframeEnabled: true }, [malformed])).to.be.an('array').that.is.empty;
    });

    it('should emit an iframe sync to the region trackers host for the seat', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, RESPONSES);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://px-us-e.floxis.tech/sync?seat=Gmtb');
    });

    it('should emit an image sync when only pixels are enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, RESPONSES);
      expect(syncs[0].type).to.equal('image');
    });

    it('should use the echoed custom region for the sync host', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [syncResponse('seat=Gmtb&region=apac-sin')]);
      expect(syncs[0].url).to.equal('https://px-apac-sin.floxis.tech/sync?seat=Gmtb');
    });

    it('should append gdpr, us_privacy and gpp consent params', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        RESPONSES,
        { gdprApplies: true, consentString: 'CONSENT123' },
        '1YNN',
        { gppString: 'GPPSTR', applicableSections: [7, 8] }
      );
      const url = syncs[0].url;
      expect(url).to.include('seat=Gmtb');
      expect(url).to.include('gdpr=1');
      expect(url).to.include('gdpr_consent=CONSENT123');
      expect(url).to.include('us_privacy=1YNN');
      expect(url).to.include('gpp=GPPSTR');
      expect(url).to.include('gpp_sid=7%2C8');
    });

    it('should set gdpr=0 when gdprApplies is false and omit empty consent', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, RESPONSES, { gdprApplies: false, consentString: '' });
      expect(syncs[0].url).to.include('gdpr=0');
      expect(syncs[0].url).to.not.include('gdpr_consent=');
    });

    it('should omit the gdpr param entirely when gdprApplies is not a boolean', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, RESPONSES, { consentString: 'TC123' });
      expect(syncs[0].url).to.not.match(/[?&]gdpr=/);
      expect(syncs[0].url).to.include('gdpr_consent=TC123');
    });

    it('should emit one sync per distinct seat across responses', function () {
      const responses = [syncResponse('seat=Gmtb&region=us-e'), syncResponse('seat=Seat2&region=us-e')];
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, responses);
      expect(syncs).to.have.lengthOf(2);
      const urls = syncs.map((s) => s.url);
      expect(urls).to.include('https://px-us-e.floxis.tech/sync?seat=Gmtb');
      expect(urls).to.include('https://px-us-e.floxis.tech/sync?seat=Seat2');
    });

    it('should dedupe syncs that share a seat and region across responses', function () {
      const responses = [syncResponse('seat=Gmtb&region=us-e'), syncResponse('seat=Gmtb&region=us-e')];
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, responses);
      expect(syncs).to.have.lengthOf(1);
    });
  });

  describe('onBidBillable', function () {
    let triggerPixelStub;

    beforeEach(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      triggerPixelStub.restore();
    });

    it('should fire the burl pixel with the AUCTION_PRICE macro substituted', function () {
      spec.onBidBillable({ burl: 'https://example.com/burl?p=${AUCTION_PRICE}', cpm: 1.23, originalCpm: 1.23 });
      expect(triggerPixelStub.calledWith('https://example.com/burl?p=1.23')).to.be.true;
    });

    it('should prefer originalCpm over cpm for the macro', function () {
      spec.onBidBillable({ burl: 'https://example.com/burl?p=${AUCTION_PRICE}', cpm: 0.9, originalCpm: 1.5 });
      expect(triggerPixelStub.calledWith('https://example.com/burl?p=1.5')).to.be.true;
    });

    it('should not fire a pixel when burl is absent', function () {
      spec.onBidBillable({ cpm: 1.0 });
      expect(triggerPixelStub.called).to.be.false;
    });
  });

  describe('onTimeout', function () {
    let politeStub;

    beforeEach(function () {
      // Telemetry beacons route through politeTriggerPixel(url, 'omit'); stub it to capture the call.
      politeStub = sinon.stub(utils, 'politeTriggerPixel');
    });

    afterEach(function () {
      politeStub.restore();
    });

    const beaconUrl = (i = 0) => politeStub.getCall(i).args[0];

    it('should fire a timeout event beacon to the pinned us-e host', function () {
      spec.onTimeout([{ params: { seat: 'Gmtb', region: 'us-e' }, timeout: 2000, auctionId: 'a1' }]);
      expect(politeStub.calledOnce).to.be.true;
      const url = beaconUrl();
      expect(url).to.include('https://px-us-e.floxis.tech/event');
      expect(url).to.include('event=timeout');
      expect(url).to.include('seat=Gmtb');
      expect(url).to.include('region=us-e');
      expect(url).to.include('duration=2000');
      expect(url).to.include('auctionId=a1');
    });

    it('should send the beacon cookieless via politeTriggerPixel (credentials omitted)', function () {
      spec.onTimeout([{ params: { seat: 'Gmtb', region: 'us-e' }, timeout: 2000, auctionId: 'a1' }]);
      expect(politeStub.calledOnce).to.be.true;
      expect(politeStub.firstCall.args[1]).to.equal('omit'); // no Floxis sync cookie rides along
    });

    it('should beacon to px-us-e even when region is eu (host is NOT region-derived)', function () {
      spec.onTimeout([{ params: { seat: 'Gmtb', region: 'eu' }, timeout: 1500, auctionId: 'a2' }]);
      const url = beaconUrl();
      expect(url).to.include('https://px-us-e.floxis.tech/event');
      expect(url).to.include('region=eu');
      expect(url).not.to.include('px-eu');
    });

    it('should deduplicate beacons for the same seat+region across entries', function () {
      spec.onTimeout([
        { params: { seat: 'Gmtb', region: 'us-e' }, timeout: 2000, auctionId: 'a1' },
        { params: { seat: 'Gmtb', region: 'us-e' }, timeout: 2000, auctionId: 'a1' }
      ]);
      expect(politeStub.callCount).to.equal(1);
    });

    it('should emit one beacon per distinct seat+region pair', function () {
      spec.onTimeout([
        { params: { seat: 'Gmtb', region: 'us-e' }, timeout: 1000, auctionId: 'a1' },
        { params: { seat: 'Seat2', region: 'us-e' }, timeout: 1000, auctionId: 'a1' }
      ]);
      expect(politeStub.callCount).to.equal(2);
    });

    it('should not throw on an empty array', function () {
      expect(() => spec.onTimeout([])).not.to.throw();
      expect(politeStub.called).to.be.false;
    });

    it('should not throw when called with a non-array', function () {
      expect(() => spec.onTimeout(null)).not.to.throw();
      expect(() => spec.onTimeout(undefined)).not.to.throw();
    });

    it('should skip entries with missing params', function () {
      expect(() => spec.onTimeout([{ timeout: 2000, auctionId: 'a1' }])).not.to.throw();
      expect(politeStub.called).to.be.false;
    });

    it('should skip entries with no seat', function () {
      spec.onTimeout([{ params: { region: 'us-e' }, timeout: 2000 }]);
      expect(politeStub.called).to.be.false;
    });

    it('should default region to us-e when region is absent from params', function () {
      spec.onTimeout([{ params: { seat: 'Gmtb' }, timeout: 500 }]);
      expect(politeStub.calledOnce).to.be.true;
      const url = beaconUrl();
      expect(url).to.include('region=us-e');
    });
  });

  describe('onBidderError', function () {
    let politeStub;

    beforeEach(function () {
      politeStub = sinon.stub(utils, 'politeTriggerPixel');
    });

    afterEach(function () {
      politeStub.restore();
    });

    const beaconUrl = (i = 0) => politeStub.getCall(i).args[0];

    const makeBidderRequest = (overrides = {}) => ({
      auctionId: 'a1',
      bids: [{ params: { seat: 'Gmtb', region: 'us-e' } }],
      refererInfo: { page: 'https://pub.example.com/page?q=secret', domain: 'pub.example.com' },
      ...overrides
    });

    it('should fire a bidder-error beacon to the pinned us-e host', function () {
      spec.onBidderError({ error: { status: 500, timedOut: false }, bidderRequest: makeBidderRequest() });
      expect(politeStub.calledOnce).to.be.true;
      const url = beaconUrl();
      expect(url).to.include('https://px-us-e.floxis.tech/event');
      expect(url).to.include('event=bidder-error');
      expect(url).to.include('seat=Gmtb');
      expect(url).to.include('region=us-e');
      expect(url).to.include('status=500');
      expect(url).to.include('timedout=0');
      expect(url).to.include('auctionId=a1');
    });

    it('should send the beacon cookieless via politeTriggerPixel (credentials omitted)', function () {
      spec.onBidderError({ error: { status: 500, timedOut: false }, bidderRequest: makeBidderRequest() });
      expect(politeStub.calledOnce).to.be.true;
      expect(politeStub.firstCall.args[1]).to.equal('omit');
    });

    it('should beacon to px-us-e even when region is eu (host is NOT region-derived)', function () {
      spec.onBidderError({
        error: { status: 503, timedOut: false },
        bidderRequest: makeBidderRequest({ bids: [{ params: { seat: 'Gmtb', region: 'eu' } }] })
      });
      const url = beaconUrl();
      expect(url).to.include('https://px-us-e.floxis.tech/event');
      expect(url).to.include('region=eu');
      expect(url).not.to.include('px-eu');
    });

    it('should set timedout=1 when error.timedOut is true', function () {
      spec.onBidderError({ error: { timedOut: true }, bidderRequest: makeBidderRequest() });
      const url = beaconUrl();
      expect(url).to.include('timedout=1');
    });

    it('should omit status when error.status is absent', function () {
      spec.onBidderError({ error: { timedOut: false }, bidderRequest: makeBidderRequest() });
      const url = beaconUrl();
      expect(url).not.to.match(/[?&]status=/);
    });

    it('should include puburl as the publisher domain (no query string identifiers)', function () {
      spec.onBidderError({ error: { status: 500, timedOut: false }, bidderRequest: makeBidderRequest() });
      const url = beaconUrl();
      expect(url).to.include('puburl=pub.example.com');
      expect(url).not.to.include('secret'); // the page query string never leaves the browser
    });

    it('should deduplicate beacons for the same seat+region across bids', function () {
      spec.onBidderError({
        error: { status: 503, timedOut: false },
        bidderRequest: {
          auctionId: 'a1',
          bids: [
            { params: { seat: 'Gmtb', region: 'us-e' } },
            { params: { seat: 'Gmtb', region: 'us-e' } }
          ]
        }
      });
      expect(politeStub.callCount).to.equal(1);
    });

    it('should emit one beacon per distinct seat+region pair', function () {
      spec.onBidderError({
        error: { status: 503, timedOut: false },
        bidderRequest: {
          auctionId: 'a1',
          bids: [
            { params: { seat: 'Gmtb', region: 'us-e' } },
            { params: { seat: 'Seat2', region: 'us-e' } }
          ]
        }
      });
      expect(politeStub.callCount).to.equal(2);
    });

    it('should not throw when bidderRequest is missing', function () {
      expect(() => spec.onBidderError({ error: { status: 500 } })).not.to.throw();
      expect(politeStub.called).to.be.false;
    });

    it('should not throw when bidderRequest.bids is empty', function () {
      expect(() => spec.onBidderError({ error: {}, bidderRequest: { bids: [] } })).not.to.throw();
      expect(politeStub.called).to.be.false;
    });

    it('should skip bids with no seat', function () {
      spec.onBidderError({ error: {}, bidderRequest: { bids: [{ params: { region: 'us-e' } }] } });
      expect(politeStub.called).to.be.false;
    });

    it('should append consent params when bidderRequest carries them', function () {
      const bidderRequest = {
        ...makeBidderRequest(),
        gdprConsent: { gdprApplies: true, consentString: 'CONSENT123' },
        uspConsent: '1YNN'
      };
      spec.onBidderError({ error: { status: 500, timedOut: false }, bidderRequest });
      const url = beaconUrl();
      expect(url).to.include('gdpr=1');
      expect(url).to.include('gdpr_consent=CONSENT123');
      expect(url).to.include('us_privacy=1YNN');
    });
  });

  describe('bid response meta', function () {
    function responseWithExt(ext) {
      const request = spec.buildRequests([validBannerBid], { bidderCode: 'floxis', auctionId: 'a-meta' })[0];
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: validBannerBid.bidId, price: 1.0, w: 300, h: 250, crid: 'c1', adm: '<div>ad</div>', mtype: 1, ext
            }]
          }]
        }
      };
      return spec.interpretResponse(serverResponse, request);
    }

    it('should map DSP ext fields into bid.meta', function () {
      const bids = responseWithExt({ dspid: 42, advertiser_name: 'AdvCo', agency_name: 'AgCo', agency_id: 'ag-7' });
      expect(bids[0].meta.networkId).to.equal(42);
      expect(bids[0].meta.advertiserName).to.equal('AdvCo');
      expect(bids[0].meta.agencyName).to.equal('AgCo');
      expect(bids[0].meta.agencyId).to.equal('ag-7');
    });

    it('should mirror the resolved mediaType into bid.meta', function () {
      const bids = responseWithExt({});
      expect(bids[0].meta.mediaType).to.equal(BANNER);
    });

    it('should leave meta DSP fields unset when ext is absent', function () {
      const bids = responseWithExt(undefined);
      expect(bids[0].meta.networkId).to.be.undefined;
      expect(bids[0].meta.advertiserName).to.be.undefined;
    });
  });
});
