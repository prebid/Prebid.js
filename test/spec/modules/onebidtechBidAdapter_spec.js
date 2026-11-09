import { expect } from 'chai';
import { spec } from 'modules/onebidtechBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { server } from 'test/mocks/xhr.js';
import { config } from 'src/config.js';

const PLACEMENT_ID = '194f787b85c829fb8822cdaf1ae64435';

describe('One Bid Tech Bid Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('returns true when a placementId is present', function () {
      const bid = { params: { placementId: PLACEMENT_ID } };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('returns false (not throw) when params is entirely absent', function () {
      expect(() => spec.isBidRequestValid({})).to.not.throw();
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('returns false when placementId is missing', function () {
      const bid = { params: { bidFloor: 1.5 } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when placementId is an empty string', function () {
      const bid = { params: { placementId: '' } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when the bid itself is missing', function () {
      expect(spec.isBidRequestValid(null)).to.equal(false);
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });

    it('returns false when placementId is not a string', function () {
      const bid = { params: { placementId: 12345 } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      }
    ];

    const bidderRequest = {
      bidderRequestId: 'req1',
      refererInfo: { page: 'https://example.com', domain: 'example.com' },
      gdprConsent: { gdprApplies: true, consentString: 'consentXYZ' },
      uspConsent: '1YNN'
    };

    it('builds the endpoint URL from the first bid request\'s placementId', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(`https://r.one-bid.com/ssp/${PLACEMENT_ID}`);
    });

    it('does not put placementId on the impression itself -- routing is URL-only', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0]).to.not.have.property('tagid');
    });

    it('carries the original bids through for interpretResponse matching', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.bids).to.equal(bidRequests);
    });

    it('forwards GDPR and USP consent', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user.gdpr).to.equal(1);
      expect(payload.user.gdprConsentString).to.equal('consentXYZ');
      expect(payload.user.usPrivacy).to.equal('1YNN');
    });

    it('uses text/plain content type to keep this a CORS simple request (no preflight)', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.options.contentType).to.equal('text/plain');
    });

    it('still serializes a valid JSON body despite the text/plain content type', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(() => JSON.parse(request.data)).to.not.throw();
      const payload = JSON.parse(request.data);
      expect(payload.imp).to.have.lengthOf(1);
    });

    it('forwards GPP consent', function () {
      const gppRequest = {
        ...bidderRequest,
        gppConsent: { gppString: 'DBABMA~gpp', applicableSections: [7] }
      };
      const request = spec.buildRequests(bidRequests, gppRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user.gpp).to.equal('DBABMA~gpp');
      expect(payload.user.gppSid).to.deep.equal([7]);
    });

    describe('COPPA', function () {
      afterEach(function () {
        config.resetConfig();
      });

      it('sets user.coppa when the coppa config is enabled', function () {
        config.setConfig({ coppa: true });
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(JSON.parse(request.data).user.coppa).to.equal(1);
      });

      it('does not set user.coppa by default', function () {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(JSON.parse(request.data).user).to.not.have.property('coppa');
      });
    });

    it('falls back to the legacy bid.sizes when no mediaTypes sizes are declared', function () {
      const legacyBids = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        sizes: [[320, 50]]
      }];
      const request = spec.buildRequests(legacyBids, bidderRequest);
      const imp = JSON.parse(request.data).imp[0];
      expect(imp.banner).to.deep.include({ w: 320, h: 50 });
    });
  });

  describe('buildRequests -- bid floor precedence', function () {
    const bidderRequest = {
      bidderRequestId: 'req1',
      refererInfo: { page: 'https://example.com', domain: 'example.com' }
    };

    it('uses the static params.bidFloor when getFloor is not a function', function () {
      const bidRequests = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID, bidFloor: 1.5 },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      }];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].bidfloor).to.equal(1.5);
    });

    it('prefers the floors-module getFloor() result over the static param', function () {
      const bidRequests = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID, bidFloor: 1.5 },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        getFloor: () => ({ currency: 'USD', floor: 3.25 })
      }];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].bidfloor).to.equal(3.25);
    });

    it('calls getFloor with the impression\'s real mediaType and size, not placeholders', function () {
      let receivedArgs;
      const bidRequests = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: { video: { playerSize: [[640, 480]] } },
        getFloor: (args) => {
          receivedArgs = args;
          return { currency: 'USD', floor: 4 };
        }
      }];

      spec.buildRequests(bidRequests, bidderRequest);
      expect(receivedArgs.mediaType).to.equal('video');
      expect(receivedArgs.size).to.deep.equal([640, 480]);
    });

    it('falls back to the static param when getFloor returns no usable floor', function () {
      const bidRequests = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID, bidFloor: 0.75 },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        getFloor: () => ({})
      }];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].bidfloor).to.equal(0.75);
    });

    describe('floor currency', function () {
      function floorImp(overrides) {
        const bidRequests = [{
          bidder: 'onebidtech',
          bidId: 'bid1',
          params: { placementId: PLACEMENT_ID },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          ...overrides
        }];
        return JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data).imp[0];
      }

      it('sends the currency getFloor returned when it could not convert to the requested one', function () {
        const imp = floorImp({ getFloor: () => ({ currency: 'EUR', floor: 3 }) });

        expect(imp.bidfloor).to.equal(3);
        expect(imp.bidfloorcur).to.equal('EUR');
      });

      it('keeps the requested currency when getFloor converted to it', function () {
        const imp = floorImp({ getFloor: () => ({ currency: 'USD', floor: 3.25 }) });

        expect(imp.bidfloor).to.equal(3.25);
        expect(imp.bidfloorcur).to.equal('USD');
      });

      it('falls back to the requested currency when getFloor returns a floor without one', function () {
        const imp = floorImp({ getFloor: () => ({ floor: 2 }) });

        expect(imp.bidfloor).to.equal(2);
        expect(imp.bidfloorcur).to.equal('USD');
      });

      it('asks getFloor for the currency set in params.currency', function () {
        let receivedArgs;
        floorImp({
          params: { placementId: PLACEMENT_ID, currency: 'EUR' },
          getFloor: (args) => {
            receivedArgs = args;
            return { currency: 'EUR', floor: 1 };
          }
        });

        expect(receivedArgs.currency).to.equal('EUR');
      });

      it('labels the static floor with params.currency', function () {
        const imp = floorImp({ params: { placementId: PLACEMENT_ID, bidFloor: 2, currency: 'EUR' } });

        expect(imp.bidfloor).to.equal(2);
        expect(imp.bidfloorcur).to.equal('EUR');
      });

      it('uses the static floor in the requested currency when getFloor returns nothing', function () {
        const imp = floorImp({
          params: { placementId: PLACEMENT_ID, bidFloor: 0.75, currency: 'EUR' },
          getFloor: () => null
        });

        expect(imp.bidfloor).to.equal(0.75);
        expect(imp.bidfloorcur).to.equal('EUR');
      });
    });
  });

  describe('interpretResponse', function () {
    const request = {
      bids: [
        { bidId: 'bid1', mediaTypes: { banner: { sizes: [[300, 250]] } } }
      ]
    };

    const videoRequest = {
      bids: [
        { bidId: 'bid1', mediaTypes: { video: { playerSize: [[640, 480]] } } }
      ]
    };

    it('returns an empty array when there is no seatbid', function () {
      const serverResponse = { body: {} };
      expect(spec.interpretResponse(serverResponse, request)).to.deep.equal([]);
    });

    it('maps a valid banner server bid to a Prebid bid response', function () {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{ impid: 'bid1', price: 1.25, w: 300, h: 250, crid: 'creative1', adm: '<div>ad</div>', adomain: ['advertiser.com'] }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].mediaType).to.equal('banner');
      expect(result[0].ad).to.equal('<div>ad</div>');
    });

    it('maps a valid video server bid to vastXml, not banner ad', function () {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{ impid: 'bid1', price: 2.5, crid: 'creative2', adm: '<VAST></VAST>', adomain: ['advertiser.com'] }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, videoRequest);
      expect(result).to.have.lengthOf(1);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].vastXml).to.equal('<VAST></VAST>');
      expect(result[0].ad).to.be.undefined;
    });

    it('skips bids with zero or missing price', function () {
      const serverResponse = { body: { seatbid: [{ bid: [{ impid: 'bid1', price: 0 }] }] } };
      expect(spec.interpretResponse(serverResponse, request)).to.have.lengthOf(0);
    });

    it('carries the win-notice nurl from the server bid onto the bid response', function () {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: 'bid1',
              price: 1.25,
              w: 300,
              h: 250,
              crid: 'creative1',
              adm: '<div>ad</div>',
              nurl: 'https://win.example.com/notice?price=${AUCTION_PRICE}'
            }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, request);
      expect(result[0].nurl).to.equal('https://win.example.com/notice?price=${AUCTION_PRICE}');
    });

    it('leaves nurl undefined when the server bid does not include one', function () {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{ impid: 'bid1', price: 1.25, w: 300, h: 250, crid: 'creative1', adm: '<div>ad</div>' }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, request);
      expect(result[0].nurl).to.be.undefined;
    });
  });

  describe('onBidWon', function () {
    const request = {
      bids: [
        { bidId: 'bid1', mediaTypes: { banner: { sizes: [[300, 250]] } } }
      ]
    };

    it('does not throw when nurl is absent', function () {
      expect(() => spec.onBidWon({})).to.not.throw();
    });

    it('sends the win notice via a keepalive GET when interpretResponse has populated nurl', function () {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: 'bid1',
              price: 1.25,
              w: 300,
              h: 250,
              crid: 'creative1',
              adm: '<div>ad</div>',
              nurl: 'https://win.example.com/notice'
            }]
          }]
        }
      };

      const [wonBid] = spec.interpretResponse(serverResponse, request);
      // interpretResponse must actually set nurl, or the request below would
      // never be made.
      expect(wonBid.nurl).to.equal('https://win.example.com/notice');

      spec.onBidWon(wonBid);

      expect(server.requests).to.have.lengthOf(1);
      const [noticeRequest] = server.requests;
      expect(noticeRequest.method).to.equal('GET');
      expect(noticeRequest.url).to.equal('https://win.example.com/notice');
      if (typeof Request !== 'undefined' && 'keepalive' in Request.prototype) {
        expect(noticeRequest.fetch.request.keepalive).to.equal(true);
      }
    });

    it('replaces ${AUCTION_PRICE} in the nurl with originalCpm, not the adjusted cpm', function () {
      spec.onBidWon({
        nurl: 'https://win.example.com/notice?price=${AUCTION_PRICE}',
        cpm: 1.1,
        originalCpm: 1.5
      });

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.equal('https://win.example.com/notice?price=1.5');
    });

    it('falls back to cpm for ${AUCTION_PRICE} when originalCpm is absent', function () {
      spec.onBidWon({
        nurl: 'https://win.example.com/notice?price=${AUCTION_PRICE}',
        cpm: 1.25
      });

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.equal('https://win.example.com/notice?price=1.25');
    });

    it('does not send a win notice when nurl is missing', function () {
      spec.onBidWon({});
      expect(server.requests).to.have.lengthOf(0);
    });
  });

  describe('onTimeout', function () {
    it('does not throw', function () {
      expect(() => spec.onTimeout({ bidder: 'onebidtech', bidId: 'bid1' })).to.not.throw();
    });
  });

  describe('multiformat ad units (banner + video on the same bid)', function () {
    const bidderRequest = {
      bidderRequestId: 'req1',
      refererInfo: { page: 'https://example.com', domain: 'example.com' }
    };

    const multiformatBid = {
      bidder: 'onebidtech',
      bidId: 'bid1',
      params: { placementId: PLACEMENT_ID },
      mediaTypes: {
        banner: { sizes: [[300, 250]] },
        video: { playerSize: [[640, 480]] }
      }
    };

    it('builds both imp.banner and imp.video, each with its own sizes', function () {
      const request = spec.buildRequests([multiformatBid], bidderRequest);
      const imp = JSON.parse(request.data).imp[0];
      expect(imp.banner).to.deep.include({ w: 300, h: 250 });
      expect(imp.video).to.include({ w: 640, h: 480 });
    });

    it('does not let the video branch overwrite banner with video dimensions', function () {
      const request = spec.buildRequests([multiformatBid], bidderRequest);
      const imp = JSON.parse(request.data).imp[0];
      expect(imp.banner.w).to.equal(300);
      expect(imp.banner.h).to.equal(250);
    });

    it('asks the floors module for the wildcard floor exactly once, not a per-format min/max', function () {
      const calls = [];
      const bid = {
        ...multiformatBid,
        getFloor: (args) => {
          calls.push(args);
          return { currency: 'USD', floor: 3.5 };
        }
      };
      const request = spec.buildRequests([bid], bidderRequest);
      const imp = JSON.parse(request.data).imp[0];

      expect(calls).to.have.lengthOf(1);
      expect(calls[0]).to.deep.include({ mediaType: '*', size: '*' });
      expect(imp.bidfloor).to.equal(3.5);
    });

    it('still asks per-format when only one media type is declared', function () {
      const bannerOnly = {
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        getFloor: (args) => ({ currency: 'USD', floor: args.mediaType === 'banner' ? 2 : 99 })
      };
      const request = spec.buildRequests([bannerOnly], bidderRequest);
      const imp = JSON.parse(request.data).imp[0];
      expect(imp.bidfloor).to.equal(2);
    });

    it('classifies the response by bid.mtype rather than by request shape', function () {
      const request = { bids: [multiformatBid] };

      const videoResponse = spec.interpretResponse({
        body: { seatbid: [{ bid: [{ impid: 'bid1', price: 1, mtype: 2, adm: '<VAST/>' }] }] }
      }, request);
      expect(videoResponse[0].mediaType).to.equal('video');
      expect(videoResponse[0].width).to.equal(640);
      expect(videoResponse[0].height).to.equal(480);

      const bannerResponse = spec.interpretResponse({
        body: { seatbid: [{ bid: [{ impid: 'bid1', price: 1, mtype: 1, adm: '<div>ad</div>' }] }] }
      }, request);
      expect(bannerResponse[0].mediaType).to.equal('banner');
      expect(bannerResponse[0].width).to.equal(300);
      expect(bannerResponse[0].height).to.equal(250);
    });

    it('falls back to sniffing VAST markup when the backend omits mtype', function () {
      const request = { bids: [multiformatBid] };
      const response = spec.interpretResponse({
        body: { seatbid: [{ bid: [{ impid: 'bid1', price: 1, adm: '<VAST version="3.0"></VAST>' }] }] }
      }, request);
      expect(response[0].mediaType).to.equal('video');
    });
  });

  describe('supply chain (schain)', function () {
    const bidRequests = [{
      bidder: 'onebidtech',
      bidId: 'bid1',
      params: { placementId: PLACEMENT_ID },
      mediaTypes: { banner: { sizes: [[300, 250]] } }
    }];
    const baseBidderRequest = {
      refererInfo: { page: 'https://example.com', domain: 'example.com' }
    };

    it('picks up the legacy bidRequest.schain and serializes it under source.ext, not ext', function () {
      const bids = [{ ...bidRequests[0], schain: { ver: '1.0', nodes: [{ asi: 'legacy.com' }] } }];
      const request = spec.buildRequests(bids, baseBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.source).to.deep.equal({ ext: { schain: { ver: '1.0', nodes: [{ asi: 'legacy.com' }] } } });
      expect(payload.ext).to.be.undefined;
    });

    it('picks up schain from bidderRequest.ortb2.source.ext.schain when the legacy field is absent', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        ortb2: { source: { ext: { schain: { ver: '1.0', nodes: [{ asi: 'ortb2.com' }] } } } }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.source.ext.schain.nodes[0].asi).to.equal('ortb2.com');
    });

    it('prefers the ORTB2 location when both are present', function () {
      const bids = [{ ...bidRequests[0], schain: { ver: '1.0', nodes: [{ asi: 'legacy.com' }] } }];
      const bidderRequest = {
        ...baseBidderRequest,
        ortb2: { source: { ext: { schain: { ver: '1.0', nodes: [{ asi: 'ortb2.com' }] } } } }
      };
      const request = spec.buildRequests(bids, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.source.ext.schain.nodes[0].asi).to.equal('ortb2.com');
    });

    it('omits the source key entirely when no schain is present anywhere', function () {
      const request = spec.buildRequests(bidRequests, baseBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.not.have.property('source');
    });
  });

  describe('site / app context from ORTB2', function () {
    const bidRequests = [{
      bidder: 'onebidtech',
      bidId: 'bid1',
      params: { placementId: PLACEMENT_ID },
      mediaTypes: { banner: { sizes: [[300, 250]] } }
    }];
    const refererInfo = { page: 'https://referer.example.com/p', domain: 'referer.example.com' };

    it('sends ortb2.app as app, with its identity, and no site', function () {
      const ortb2 = { app: { bundle: 'com.example.app', name: 'Example', publisher: { id: 'pub1' } } };
      const payload = JSON.parse(spec.buildRequests(bidRequests, { refererInfo, ortb2 }).data);

      expect(payload.app).to.deep.equal(ortb2.app);
      expect(payload).to.not.have.property('site');
    });

    it('keeps publisher and content from ortb2.site', function () {
      const ortb2 = {
        site: {
          page: 'https://fpd.example.com/article',
          domain: 'fpd.example.com',
          publisher: { id: 'pub1', name: 'Pub' },
          content: { title: 'An article' }
        }
      };
      const payload = JSON.parse(spec.buildRequests(bidRequests, { refererInfo, ortb2 }).data);

      expect(payload.site).to.deep.equal(ortb2.site);
      expect(payload).to.not.have.property('app');
    });

    it('prefers ortb2.site page/domain over the referer', function () {
      const ortb2 = { site: { page: 'https://fpd.example.com/a', domain: 'fpd.example.com' } };
      const payload = JSON.parse(spec.buildRequests(bidRequests, { refererInfo, ortb2 }).data);

      expect(payload.site.page).to.equal('https://fpd.example.com/a');
      expect(payload.site.domain).to.equal('fpd.example.com');
    });

    it('falls back to the referer for page/domain when ortb2 has no site data', function () {
      const payload = JSON.parse(spec.buildRequests(bidRequests, { refererInfo }).data);

      expect(payload.site).to.deep.equal({ page: refererInfo.page, domain: refererInfo.domain });
    });

    it('fills only the missing field from the referer', function () {
      const ortb2 = { site: { page: 'https://fpd.example.com/a', publisher: { id: 'pub1' } } };
      const payload = JSON.parse(spec.buildRequests(bidRequests, { refererInfo, ortb2 }).data);

      expect(payload.site.page).to.equal('https://fpd.example.com/a');
      expect(payload.site.domain).to.equal('referer.example.com');
      expect(payload.site.publisher).to.deep.equal({ id: 'pub1' });
    });

    it('does not mutate the ortb2 object it was given', function () {
      const ortb2 = { site: { publisher: { id: 'pub1' } } };
      spec.buildRequests(bidRequests, { refererInfo, ortb2 });

      expect(ortb2.site).to.deep.equal({ publisher: { id: 'pub1' } });
    });
  });

  describe('impression-level ORTB2 (ortb2Imp)', function () {
    const bidderRequest = {
      bidderRequestId: 'req1',
      refererInfo: { page: 'https://example.com', domain: 'example.com' }
    };

    function impFor(overrides) {
      const bidRequests = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        ...overrides
      }];
      return JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data).imp[0];
    }

    it('forwards instl, ext (tid, gpid, data) and pmp from ortb2Imp', function () {
      const imp = impFor({
        ortb2Imp: {
          instl: 1,
          ext: { tid: 'tid-123', gpid: '/123/slot', data: { pbadslot: 'top' } },
          pmp: { private_auction: 0, deals: [{ id: 'deal1', bidfloor: 2 }] }
        }
      });

      expect(imp.instl).to.equal(1);
      expect(imp.ext).to.deep.equal({ tid: 'tid-123', gpid: '/123/slot', data: { pbadslot: 'top' } });
      expect(imp.pmp.deals[0].id).to.equal('deal1');
    });

    it('does not let ortb2Imp override the fields the adapter owns', function () {
      const imp = impFor({
        ortb2Imp: { id: 'from-ortb2', bidfloor: 99, bidfloorcur: 'EUR', secure: 0, instl: 1 }
      });

      expect(imp.id).to.equal('bid1');
      expect(imp.bidfloor).to.equal(0);
      expect(imp.bidfloorcur).to.equal('USD');
      expect(imp.secure).to.equal(1);
      expect(imp.instl).to.equal(1);
    });

    it('keeps FPD banner fields such as pos next to the adapter\'s own sizes', function () {
      const imp = impFor({ ortb2Imp: { banner: { pos: 1, w: 1, h: 1 } } });

      expect(imp.banner.pos).to.equal(1);
      expect(imp.banner.w).to.equal(300);
      expect(imp.banner.h).to.equal(250);
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }]);
    });

    it('keeps FPD video fields, with the ad unit\'s declared values taking precedence', function () {
      const imp = impFor({
        mediaTypes: { video: { playerSize: [[640, 480]], maxduration: 30 } },
        ortb2Imp: { video: { maxduration: 5, rwdd: 1 } }
      });

      expect(imp.video.rwdd).to.equal(1);
      expect(imp.video.maxduration).to.equal(30);
      expect(imp.video.w).to.equal(640);
    });

    it('does not add a media type the ad unit does not declare', function () {
      const imp = impFor({
        mediaTypes: { video: { playerSize: [[640, 480]] } },
        ortb2Imp: { banner: { pos: 1 }, audio: { mimes: ['audio/mp3'] }, native: { request: '{}' } }
      });

      expect(imp).to.have.property('video');
      expect(imp).to.not.have.any.keys('banner', 'audio', 'native');
    });

    it('gives each impression its own ortb2Imp', function () {
      const bids = [
        { bidder: 'onebidtech', bidId: 'bid1', params: { placementId: PLACEMENT_ID }, mediaTypes: { banner: { sizes: [[300, 250]] } }, ortb2Imp: { instl: 1 } },
        { bidder: 'onebidtech', bidId: 'bid2', params: { placementId: PLACEMENT_ID }, mediaTypes: { banner: { sizes: [[728, 90]] } }, ortb2Imp: { ext: { gpid: 'second' } } }
      ];
      const imps = JSON.parse(spec.buildRequests(bids, bidderRequest).data).imp;

      expect(imps[0].instl).to.equal(1);
      expect(imps[0]).to.not.have.property('ext');
      expect(imps[1].ext.gpid).to.equal('second');
      expect(imps[1]).to.not.have.property('instl');
    });

    it('does not mutate the ortb2Imp it was given', function () {
      const ortb2Imp = { instl: 1, banner: { pos: 1 }, ext: { gpid: 'g' } };
      impFor({ ortb2Imp });

      expect(ortb2Imp).to.deep.equal({ instl: 1, banner: { pos: 1 }, ext: { gpid: 'g' } });
    });

    it('is unchanged when the bid has no ortb2Imp', function () {
      const imp = impFor({});

      expect(imp).to.not.have.any.keys('instl', 'ext', 'pmp');
    });
  });

  describe('global ORTB2 restrictions', function () {
    const bidRequests = [{
      bidder: 'onebidtech',
      bidId: 'bid1',
      params: { placementId: PLACEMENT_ID },
      mediaTypes: { banner: { sizes: [[300, 250]] } }
    }];
    const refererInfo = { page: 'https://example.com', domain: 'example.com' };

    function build(ortb2) {
      return JSON.parse(spec.buildRequests(bidRequests, { bidderRequestId: 'req1', refererInfo, ortb2 }).data);
    }

    it('forwards the publisher\'s blocked categories, advertisers and apps', function () {
      const payload = build({
        bcat: ['IAB25', 'IAB26'],
        cattax: 2,
        badv: ['blocked.example.com'],
        bapp: ['com.blocked.app']
      });

      expect(payload.bcat).to.deep.equal(['IAB25', 'IAB26']);
      expect(payload.cattax).to.equal(2);
      expect(payload.badv).to.deep.equal(['blocked.example.com']);
      expect(payload.bapp).to.deep.equal(['com.blocked.app']);
    });

    it('forwards seat and language allow/block lists', function () {
      const payload = build({
        wseat: ['seat1'],
        bseat: ['seat2'],
        wlang: ['en'],
        wlangb: ['en-US']
      });

      expect(payload.wseat).to.deep.equal(['seat1']);
      expect(payload.bseat).to.deep.equal(['seat2']);
      expect(payload.wlang).to.deep.equal(['en']);
      expect(payload.wlangb).to.deep.equal(['en-US']);
    });

    it('adds none of these keys when ortb2 does not set them', function () {
      const payload = build({ site: { publisher: { id: 'pub1' } } });

      ['bcat', 'cattax', 'badv', 'bapp', 'wseat', 'bseat', 'wlang', 'wlangb'].forEach((field) => {
        expect(payload).to.not.have.property(field);
      });
    });

    it('does not let ortb2 override the fields the adapter owns', function () {
      const payload = build({ id: 'from-ortb2', cur: ['EUR'], imp: [], bcat: ['IAB25'] });

      expect(payload.id).to.equal('req1');
      expect(payload.cur).to.deep.equal(['USD']);
      expect(payload.imp).to.have.lengthOf(1);
      expect(payload.bcat).to.deep.equal(['IAB25']);
    });

    it('still works when there is no ortb2 at all', function () {
      const payload = JSON.parse(spec.buildRequests(bidRequests, { bidderRequestId: 'req1', refererInfo }).data);

      expect(payload).to.not.have.property('bcat');
      expect(payload.imp).to.have.lengthOf(1);
    });
  });

  describe('banner constraints from mediaTypes.banner', function () {
    const bidderRequest = {
      bidderRequestId: 'req1',
      refererInfo: { page: 'https://example.com', domain: 'example.com' }
    };

    function bannerImp(banner, extra) {
      const bids = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: { banner },
        ...extra
      }];
      return JSON.parse(spec.buildRequests(bids, bidderRequest).data).imp[0].banner;
    }

    it('forwards the publisher\'s pos, btype, battr, mimes, api, topframe, expdir and vcm', function () {
      const banner = bannerImp({
        sizes: [[300, 250]],
        pos: 1,
        btype: [1, 4],
        battr: [3, 8],
        mimes: ['image/png', 'image/jpeg'],
        api: [3, 5],
        topframe: 1,
        expdir: [2, 4],
        vcm: 0
      });

      expect(banner).to.include({ pos: 1, topframe: 1, vcm: 0 });
      expect(banner.btype).to.deep.equal([1, 4]);
      expect(banner.battr).to.deep.equal([3, 8]);
      expect(banner.mimes).to.deep.equal(['image/png', 'image/jpeg']);
      expect(banner.api).to.deep.equal([3, 5]);
      expect(banner.expdir).to.deep.equal([2, 4]);
    });

    it('leaves out values that fail the OpenRTB type check', function () {
      const banner = bannerImp({ sizes: [[300, 250]], pos: 1.5, btype: 'popup', topframe: 2 });

      expect(banner).to.not.have.any.keys('pos', 'btype', 'topframe');
    });

    it('does not send fields the publisher did not declare', function () {
      const banner = bannerImp({ sizes: [[300, 250]] });

      expect(banner).to.not.have.any.keys('pos', 'btype', 'battr', 'mimes', 'api', 'topframe', 'expdir', 'vcm');
    });

    it('always builds w, h and format from the declared sizes, not from banner fields', function () {
      const banner = bannerImp({ sizes: [[300, 250], [728, 90]], w: 1, h: 1, format: [{ w: 2, h: 2 }] });

      expect(banner.w).to.equal(300);
      expect(banner.h).to.equal(250);
      expect(banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    });

    it('lets the ad unit\'s declared banner values win over ortb2Imp.banner', function () {
      const banner = bannerImp({ sizes: [[300, 250]], pos: 1 }, { ortb2Imp: { banner: { pos: 3, topframe: 1 } } });

      expect(banner.pos).to.equal(1);
      expect(banner.topframe).to.equal(1);
    });

    it('forwards banner constraints on multiformat ad units too', function () {
      const bids = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: {
          banner: { sizes: [[300, 250]], pos: 1, btype: [1] },
          video: { playerSize: [[640, 480]], maxduration: 15 }
        }
      }];
      const imp = JSON.parse(spec.buildRequests(bids, bidderRequest).data).imp[0];

      expect(imp.banner.pos).to.equal(1);
      expect(imp.banner.btype).to.deep.equal([1]);
      expect(imp.video.maxduration).to.equal(15);
    });
  });

  describe('video constraints from mediaTypes.video', function () {
    const bidderRequest = {
      bidderRequestId: 'req1',
      refererInfo: { page: 'https://example.com', domain: 'example.com' }
    };

    function videoImp(video) {
      const bids = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: { video }
      }];
      return JSON.parse(spec.buildRequests(bids, bidderRequest).data).imp[0].video;
    }

    it('forwards the publisher\'s duration, api, playback, linearity, plcmt and pos constraints', function () {
      const video = videoImp({
        playerSize: [[640, 480]],
        mimes: ['video/mp4', 'video/webm'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30,
        api: [1, 2],
        playbackmethod: [2],
        linearity: 1,
        plcmt: 1,
        pos: 1,
        startdelay: 0,
        skip: 1,
        skipafter: 5,
        minbitrate: 300,
        maxbitrate: 1500
      });

      expect(video).to.include({
        minduration: 5,
        maxduration: 30,
        linearity: 1,
        plcmt: 1,
        pos: 1,
        startdelay: 0,
        skip: 1,
        skipafter: 5,
        minbitrate: 300,
        maxbitrate: 1500
      });
      expect(video.api).to.deep.equal([1, 2]);
      expect(video.playbackmethod).to.deep.equal([2]);
      expect(video.protocols).to.deep.equal([2, 3, 5, 6]);
      expect(video.mimes).to.deep.equal(['video/mp4', 'video/webm']);
    });

    it('still forwards the legacy placement field', function () {
      expect(videoImp({ playerSize: [[640, 480]], placement: 3 }).placement).to.equal(3);
    });

    it('leaves out values that fail the OpenRTB type check', function () {
      const video = videoImp({
        playerSize: [[640, 480]],
        maxduration: 'thirty',
        api: 'vpaid',
        pos: 1.5
      });

      expect(video).to.not.have.any.keys('maxduration', 'api', 'pos');
    });

    it('does not send fields the publisher did not declare', function () {
      const video = videoImp({ playerSize: [[640, 480]] });

      expect(video).to.not.have.any.keys('minduration', 'maxduration', 'api', 'playbackmethod', 'linearity', 'plcmt', 'pos');
    });

    it('takes width and height from the player size and defaults mimes to video/mp4', function () {
      const video = videoImp({ playerSize: [[640, 480]], w: 1, h: 1 });

      expect(video.w).to.equal(640);
      expect(video.h).to.equal(480);
      expect(video.mimes).to.deep.equal(['video/mp4']);
    });

    it('forwards video constraints on multiformat ad units too', function () {
      const bids = [{
        bidder: 'onebidtech',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { playerSize: [[640, 480]], maxduration: 15, api: [2] }
        }
      }];
      const imp = JSON.parse(spec.buildRequests(bids, bidderRequest).data).imp[0];

      expect(imp.video.maxduration).to.equal(15);
      expect(imp.video.api).to.deep.equal([2]);
      expect(imp.banner).to.deep.include({ w: 300, h: 250 });
    });
  });
});
