import {expect} from 'chai';
import {spec, internal as r2b2, internal} from 'modules/r2b2BidAdapter.js';
import * as utils from '../../../src/utils';
import 'modules/schain.js';
import 'modules/userId/index.js';

function encodePlacementIds (ids) {
  return btoa(JSON.stringify(ids));
}

describe('R2B2 adapter', function () {
  let serverResponse, requestForInterpretResponse;
  let bidderRequest;
  let bids = [];
  let gdprConsent = {
    gdprApplies: true,
    consentString: 'consent-string',
  };
  let schain = {
    ver: '1.0',
    complete: 1,
    nodes: [{
      asi: 'example.com',
      sid: '00001',
      hp: 1
    }]
  };
  const usPrivacyString = '1YNN';
  const impId = 'impID';
  const price = 10.6;
  const ad = 'adm';
  const creativeId = 'creativeID';
  const cid = 41849;
  const cdid = 595121;
  const unitCode = 'unitCode';
  const bidId1 = '1';
  const bidId2 = '2';
  const bidId3 = '3';
  const bidId4 = '4';
  const bidId5 = '5';
  const bidWonUrl = 'url1';
  const setTargetingUrl = 'url2';
  const bidder = 'r2b2';
  const foreignBidder = 'differentBidder';
  const id1 = { pid: 'd/g/p' };
  const id1Object = { d: 'd', g: 'g', p: 'p', m: 0 };
  const id2 = { pid: 'd/g/p/1' };
  const id2Object = { d: 'd', g: 'g', p: 'p', m: 1 };
  const badId = { pid: 'd/g/' };
  const bid1 = { bidId: bidId1, bidder, params: [ id1 ] };
  const bid2 = { bidId: bidId2, bidder, params: [ id2 ] };
  const bidWithBadSetup = { bidId: bidId3, bidder, params: [ badId ] };
  const bidForeign1 = { bidId: bidId4, bidder: foreignBidder, params: [ { id: 'abc' } ] };
  const bidForeign2 = { bidId: bidId5, bidder: foreignBidder, params: [ { id: 'xyz' } ] };
  const fakeTime = 1234567890;
  const cacheBusterRegex = /[\?&]cb=([^&]+)/;
  let bidStub, time;

  beforeEach(function () {
    bids = [{
      bidder: 'r2b2',
      params: {
        pid: 'example.com/generic/300x250/1'
      },
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      },
      adUnitCode: unitCode,
      transactionId: '29c408b9-65ce-48b1-9167-18a57791f908',
      sizes: [
        [300, 250]
      ],
      bidId: '20917a54ee9858',
      bidderRequestId: '15270d403778d',
      auctionId: '36acef1b-f635-4f57-b693-5cc55ee16346',
      src: 'client',
      ortb2: {
        regs: {
          ext: {
            gdpr: 1,
            us_privacy: '1YYY'
          }
        },
        user: {
          ext: {
            consent: 'consent-string'
          }
        },
        site: {},
        device: {}
      },
      schain
    }, {
      bidder: 'r2b2',
      params: {
        pid: 'example.com/generic/300x600/0'
      },
      mediaTypes: {
        banner: {
          sizes: [
            [300, 600]
          ]
        }
      },
      adUnitCode: unitCode,
      transactionId: '29c408b9-65ce-48b1-9167-18a57791f908',
      sizes: [
        [300, 600]
      ],
      bidId: '3dd53d30c691fe',
      bidderRequestId: '15270d403778d',
      auctionId: '36acef1b-f635-4f57-b693-5cc55ee16346',
      src: 'client',
      ortb2: {
        regs: {
          ext: {
            gdpr: 1,
            us_privacy: '1YYY'
          }
        },
        user: {
          ext: {
            consent: 'consent-string'
          }
        },
        site: {},
        device: {}
      },
      schain
    }];
    bidderRequest = {
      bidderCode: 'r2b2',
      auctionId: '36acef1b-f635-4f57-b693-5cc55ee16346',
      bidderRequestId: '15270d403778d',
      bids: bids,
      ortb2: {
        regs: {
          ext: {
            gdpr: 1,
            us_privacy: '1YYY'
          }
        },
        user: {
          ext: {
            consent: 'consent-string'
          }
        },
        site: {},
        device: {}
      },
      gdprConsent: {
        consentString: 'consent-string',
        vendorData: {},
        gdprApplies: true,
        apiVersion: 2
      },
      uspConsent: '1YYY',
    };
    serverResponse = {
      id: 'a66a6e32-2a7d-4ed3-bb13-6f3c9bdcf6a1',
      seatbid: [{
        bid: [{
          id: '4756cc9e9b504fd0bd39fdd594506545',
          impid: impId,
          price: price,
          adm: ad,
          crid: creativeId,
          w: 300,
          h: 250,
          ext: {
            prebid: {
              meta: {
                adaptercode: 'r2b2'
              },
              type: 'banner'
            },
            r2b2: {
              cdid: cdid,
              cid: cid,
              useRenderer: true
            }
          }
        }],
        seat: 'seat'
      }]
    };
    requestForInterpretResponse = {
      data: {
        imp: [
          {id: impId}
        ]
      },
      bids
    };
  });

  describe('isBidRequestValid', function () {
    let bid = {};

    it('should return false when missing required "pid" param', function () {
      bid.params = {random: 'param'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {d: 'd', g: 'g', p: 'p', m: 1};
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    });

    it('should return false when "pid" is malformed', function () {
      bid.params = {pid: 'pid'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {pid: '///'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {pid: '/g/p/m'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {pid: 'd//p/m'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {pid: 'd/g//m'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {pid: 'd/p/'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {pid: 'd/g/p/m/t'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when "pid" is a correct dgpm', function () {
      bid.params = {pid: 'd/g/p/m'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return true when type is blank', function () {
      bid.params = {pid: 'd/g/p/'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return true when type is missing', function () {
      bid.params = {pid: 'd/g/p'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return true when "pid" is a number', function () {
      bid.params = {pid: 12356};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return true when "pid" is a numeric string', function () {
      bid.params = {pid: '12356'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return true for selfpromo unit', function () {
      bid.params = {pid: 'selfpromo'};
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      r2b2.placementsToSync = [];
      r2b2.mappedParams = {};
    });

    it('should set correct request method and url and pass bids', function () {
      let requests = spec.buildRequests([bids[0]], bidderRequest);
      expect(requests).to.be.an('array').that.has.lengthOf(1);
      let request = requests[0]
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://hb.r2b2.cz/openrtb2/bid');
      expect(request.data).to.be.an('object');
      expect(request.bids).to.deep.equal(bids);
    });

    it('should pass correct parameters', function () {
      let requests = spec.buildRequests([bids[0]], bidderRequest);
      let {data} = requests[0];
      let {imp, device, site, source, ext, cur, test} = data;
      expect(imp).to.be.an('array').that.has.lengthOf(1);
      expect(device).to.be.an('object');
      expect(site).to.be.an('object');
      expect(source).to.be.an('object');
      expect(cur).to.deep.equal(['USD']);
      expect(ext.version).to.equal('1.0.0');
      expect(test).to.equal(0);
    });

    it('should pass correct imp', function () {
      let requests = spec.buildRequests([bids[0]], bidderRequest);
      let {data} = requests[0];
      let {imp} = data;
      expect(imp).to.be.an('array').that.has.lengthOf(1);
      expect(imp[0]).to.be.an('object');
      let bid = imp[0];
      expect(bid.id).to.equal('20917a54ee9858');
      expect(bid.banner).to.deep.equal({topframe: 0, format: [{w: 300, h: 250}]});
      expect(bid.ext).to.be.an('object');
      expect(bid.ext.r2b2).to.deep.equal({d: 'example.com', g: 'generic', p: '300x250', m: 1});
    });

    it('should map type correctly', function () {
      let result, bid;
      let requestWithId = function(id) {
        let b = bids[0];
        b.params.pid = id;
        let passedBids = [b];
        bidderRequest.bids = passedBids;
        return spec.buildRequests(passedBids, bidderRequest);
      };

      result = requestWithId('example.com/generic/300x250/mobile');
      bid = result[0].data.imp[0];
      expect(bid.ext.r2b2.m).to.be.a('number').that.is.equal(1);

      result = requestWithId('example.com/generic/300x250/desktop');
      bid = result[0].data.imp[0];
      expect(bid.ext.r2b2.m).to.be.a('number').that.is.equal(0);

      result = requestWithId('example.com/generic/300x250/1');
      bid = result[0].data.imp[0];
      expect(bid.ext.r2b2.m).to.be.a('number').that.is.equal(1);

      result = requestWithId('example.com/generic/300x250/0');
      bid = result[0].data.imp[0];
      expect(bid.ext.r2b2.m).to.be.a('number').that.is.equal(0);

      result = requestWithId('example.com/generic/300x250/m');
      bid = result[0].data.imp[0];
      expect(bid.ext.r2b2.m).to.be.a('number').that.is.equal(1);

      result = requestWithId('example.com/generic/300x250');
      bid = result[0].data.imp[0];
      expect(bid.ext.r2b2.m).to.be.a('number').that.is.equal(0);
    });

    it('should pass correct parameters for test ad', function () {
      let testAdBid = bids[0];
      testAdBid.params = {pid: 'selfpromo'};
      let requests = spec.buildRequests([testAdBid], bidderRequest);
      let {data} = requests[0];
      let {imp} = data;
      expect(imp).to.be.an('array').that.has.lengthOf(1);
      expect(imp[0]).to.be.an('object');
      let bid = imp[0];
      expect(bid.ext).to.be.an('object');
      expect(bid.ext.r2b2).to.deep.equal({d: 'test', g: 'test', p: 'selfpromo', m: 0, 'selfpromo': 1});
    });

    it('should pass multiple bids', function () {
      let requests = spec.buildRequests(bids, bidderRequest);
      expect(requests).to.be.an('array').that.has.lengthOf(1);
      let {data} = requests[0];
      let {imp} = data;
      expect(imp).to.be.an('array').that.has.lengthOf(bids.length);
      let bid1 = imp[0];
      expect(bid1.ext.r2b2).to.deep.equal({d: 'example.com', g: 'generic', p: '300x250', m: 1});
      let bid2 = imp[1];
      expect(bid2.ext.r2b2).to.deep.equal({d: 'example.com', g: 'generic', p: '300x600', m: 0});
    });

    it('should set up internal variables', function () {
      let requests = spec.buildRequests(bids, bidderRequest);
      let bid1Id = bids[0].bidId;
      let bid2Id = bids[1].bidId;
      expect(r2b2.placementsToSync).to.be.an('array').that.has.lengthOf(2);
      expect(r2b2.mappedParams).to.have.property(bid1Id);
      expect(r2b2.mappedParams[bid1Id]).to.deep.equal({d: 'example.com', g: 'generic', p: '300x250', m: 1, pid: 'example.com/generic/300x250/1'});
      expect(r2b2.mappedParams).to.have.property(bid2Id);
      expect(r2b2.mappedParams[bid2Id]).to.deep.equal({d: 'example.com', g: 'generic', p: '300x600', m: 0, pid: 'example.com/generic/300x600/0'});
    });

    it('should pass gdpr properties', function () {
      let requests = spec.buildRequests(bids, bidderRequest);
      let {data} = requests[0];
      let {user, regs} = data;
      expect(user).to.be.an('object').that.has.property('ext');
      expect(regs).to.be.an('object').that.has.property('ext');
      expect(user.ext.consent).to.equal('consent-string');
      expect(regs.ext.gdpr).to.equal(1);
    });

    it('should pass us privacy properties', function () {
      let requests = spec.buildRequests(bids, bidderRequest);
      let {data} = requests[0];
      let {regs} = data;
      expect(regs).to.be.an('object').that.has.property('ext');
      expect(regs.ext.us_privacy).to.equal('1YYY');
    });

    it('should pass supply chain', function () {
      let requests = spec.buildRequests(bids, bidderRequest);
      let {data} = requests[0];
      let {source} = data;
      expect(source).to.be.an('object').that.has.property('ext');
      expect(source.ext.schain).to.deep.equal({
        complete: 1,
        nodes: [
          {asi: 'example.com', hp: 1, sid: '00001'}
        ],
        ver: '1.0'
      })
    });

    it('should pass extended ids', function () {
      let eidsArray = [
        {
          source: 'adserver.org',
          uids: [
            {
              atype: 1,
              ext: {
                rtiPartner: 'TDID',
              },
              id: 'TTD_ID_FROM_USER_ID_MODULE',
            },
          ],
        },
        {
          source: 'pubcid.org',
          uids: [
            {
              atype: 1,
              id: 'pubCommonId_FROM_USER_ID_MODULE',
            },
          ],
        },
      ];
      bids[0].userIdAsEids = eidsArray;
      let requests = spec.buildRequests(bids, bidderRequest);
      let request = requests[0];
      let eids = request.data.user.ext.eids;

      expect(eids).to.deep.equal(eidsArray);
    });
  });

  describe('interpretResponse', function () {
    it('should respond with empty response when there are no bids', function () {
      let result = spec.interpretResponse({ body: {} }, {});
      expect(result).to.be.an('array').that.has.lengthOf(0);
      result = spec.interpretResponse({ body: { seatbid: [] } }, {});
      expect(result).to.be.an('array').that.has.lengthOf(0);
      result = spec.interpretResponse({ body: { seatbid: [ {} ] } }, {});
      expect(result).to.be.an('array').that.has.lengthOf(0);
      result = spec.interpretResponse({ body: { seatbid: [ { bids: [] } ] } }, {});
      expect(result).to.be.an('array').that.has.lengthOf(0);
    });

    it('should map params correctly', function () {
      let result = spec.interpretResponse({ body: serverResponse }, requestForInterpretResponse);
      expect(result).to.be.an('array').that.has.lengthOf(1);
      let bid = result[0];
      expect(bid.requestId).to.equal(impId);
      expect(bid.cpm).to.equal(price);
      expect(bid.ad).to.equal(ad);
      expect(bid.currency).to.equal('USD');
      expect(bid.mediaType).to.equal('banner');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(360);
      expect(bid.creativeId).to.equal(creativeId);
    });

    it('should set up renderer on bid', function () {
      let result = spec.interpretResponse({ body: serverResponse }, requestForInterpretResponse);
      expect(result).to.be.an('array').that.has.lengthOf(1);
      let bid = result[0];
      expect(bid.renderer).to.be.an('object');
      expect(bid.renderer).to.have.property('render').that.is.a('function');
      expect(bid.renderer).to.have.property('url').that.is.a('string');
    });

    it('should map ext params correctly', function() {
      let dgpm = {something: 'something'};
      r2b2.mappedParams = {};
      r2b2.mappedParams[impId] = dgpm;
      let result = spec.interpretResponse({ body: serverResponse }, requestForInterpretResponse);
      expect(result).to.be.an('array').that.has.lengthOf(1);
      let bid = result[0];
      expect(bid.ext).to.be.an('object');
      let { ext } = bid;
      expect(ext.dgpm).to.deep.equal(dgpm);
      expect(ext.cid).to.equal(cid);
      expect(ext.cdid).to.equal(cdid);
      expect(ext.adUnit).to.equal(unitCode);
      expect(ext.mediaType).to.deep.equal({
        type: 'banner',
        settings: {
          chd: null,
          width: 300,
          height: 250,
          ad: {
            type: 'content',
            data: ad
          }
        }
      });
    });

    it('should handle multiple bids', function() {
      const impId2 = '123456';
      const price2 = 12;
      const ad2 = 'gaeouho';
      const w2 = 300;
      const h2 = 600;
      let b = serverResponse.seatbid[0].bid[0];
      let b2 = Object.assign({}, b);
      b2.impid = impId2;
      b2.price = price2;
      b2.adm = ad2;
      b2.w = w2;
      b2.h = h2;
      serverResponse.seatbid[0].bid.push(b2);
      requestForInterpretResponse.data.imp.push({id: impId2});
      let result = spec.interpretResponse({ body: serverResponse }, requestForInterpretResponse);
      expect(result).to.be.an('array').that.has.lengthOf(2);
      let firstBid = result[0];
      let secondBid = result[1];
      expect(firstBid.requestId).to.equal(impId);
      expect(firstBid.ad).to.equal(ad);
      expect(firstBid.cpm).to.equal(price);
      expect(firstBid.width).to.equal(300);
      expect(firstBid.height).to.equal(250);
      expect(secondBid.requestId).to.equal(impId2);
      expect(secondBid.ad).to.equal(ad2);
      expect(secondBid.cpm).to.equal(price2);
      expect(secondBid.width).to.equal(w2);
      expect(secondBid.height).to.equal(h2);
    });
  });

  describe('getUserSyncs', function() {
    const syncOptions = {
      iframeEnabled: true,
      pixelEnabled: true
    };

    it('should return an array with a sync for all bids', function() {
      r2b2.placementsToSync = [id1Object, id2Object];
      const expectedEncodedIds = encodePlacementIds(r2b2.placementsToSync);
      const syncs = spec.getUserSyncs(syncOptions);
      expect(syncs).to.be.an('array').that.has.lengthOf(1);
      const sync = syncs[0];
      expect(sync).to.be.an('object');
      expect(sync.type).to.equal('iframe');
      expect(sync.url).to.include(`?p=${expectedEncodedIds}`);
    });

    it('should return the sync and include gdpr and usp parameters in the url', function() {
      r2b2.placementsToSync = [id1Object, id2Object];
      const syncs = spec.getUserSyncs(syncOptions, {}, gdprConsent, usPrivacyString);
      const sync = syncs[0];
      expect(sync).to.be.an('object');
      expect(sync.url).to.include(`&gdpr=1`);
      expect(sync.url).to.include(`&gdpr_consent=${gdprConsent.consentString}`);
      expect(sync.url).to.include(`&us_privacy=${usPrivacyString}`);
    });
  });

  describe('events', function() {
    beforeEach(function() {
      time = sinon.useFakeTimers(fakeTime);
      sinon.stub(utils, 'triggerPixel');
      r2b2.mappedParams = {};
      r2b2.mappedParams[bidId1] = id1Object;
      r2b2.mappedParams[bidId2] = id2Object;
      bidStub = {
        adserverTargeting: { hb_bidder: bidder, hb_pb: '10.00', hb_size: '300x300' },
        cpm: 10,
        currency: 'USD',
        ext: {
          dgpm: { d: 'r2b2.cz', g: 'generic', m: 1, p: '300x300', pid: 'r2b2.cz/generic/300x300/1' }
        },
        params: [ { pid: 'r2b2.cz/generic/300x300/1' } ],
      };
    });
    afterEach(function() {
      utils.triggerPixel.restore();
      time.restore();
    });

    describe('onBidWon', function () {
      it('exists and is a function', () => {
        expect(spec.onBidWon).to.exist.and.to.be.a('function');
      });
      it('should return nothing and trigger a pixel with passed url', function () {
        bidStub.ext.events = {
          onBidWon: bidWonUrl,
          onSetTargeting: setTargetingUrl
        };
        const response = spec.onBidWon(bidStub);
        expect(response).to.be.an('undefined');
        expect(utils.triggerPixel.called).to.equal(true);
        expect(utils.triggerPixel.callCount).to.equal(1);
        expect(utils.triggerPixel.calledWithMatch(bidWonUrl)).to.equal(true);
      });
      it('should not trigger a pixel if url is not available', function () {
        bidStub.ext.events = null;
        spec.onBidWon(bidStub);
        expect(utils.triggerPixel.callCount).to.equal(0);
        bidStub.ext.events = {
          onBidWon: '',
          onSetTargeting: '',
        };
        spec.onBidWon(bidStub);
        expect(utils.triggerPixel.callCount).to.equal(0);
      });
    });

    describe('onSetTargeting', function () {
      it('exists and is a function', () => {
        expect(spec.onSetTargeting).to.exist.and.to.be.a('function');
      });
      it('should return nothing and trigger a pixel with passed url', function () {
        bidStub.ext.events = {
          onBidWon: bidWonUrl,
          onSetTargeting: setTargetingUrl
        };
        const response = spec.onSetTargeting(bidStub);
        expect(response).to.be.an('undefined');
        expect(utils.triggerPixel.called).to.equal(true);
        expect(utils.triggerPixel.callCount).to.equal(1);
        expect(utils.triggerPixel.calledWithMatch(setTargetingUrl)).to.equal(true);
      });
      it('should not trigger a pixel if url is not available', function () {
        bidStub.ext.events = null;
        spec.onSetTargeting(bidStub);
        expect(utils.triggerPixel.callCount).to.equal(0);
        bidStub.ext.events = {
          onBidWon: '',
          onSetTargeting: '',
        };
        spec.onSetTargeting(bidStub);
        expect(utils.triggerPixel.callCount).to.equal(0);
      });
    });

    describe('onTimeout', function () {
      it('exists and is a function', () => {
        expect(spec.onTimeout).to.exist.and.to.be.a('function');
      });
      it('should return nothing and trigger a pixel', function () {
        const bids = [bid1, bid2];
        const response = spec.onTimeout(bids);
        expect(response).to.be.an('undefined');
        expect(utils.triggerPixel.callCount).to.equal(1);
      });
      it('should not trigger a pixel if no bids available', function () {
        const bids = [];
        spec.onTimeout(bids);
        expect(utils.triggerPixel.callCount).to.equal(0);
      });
      it('should trigger a pixel with correct ids and a cache buster', function () {
        const bids = [bid1, bidForeign1, bidForeign2, bid2, bidWithBadSetup];
        const expectedIds = [id1Object, id2Object];
        const expectedEncodedIds = encodePlacementIds(expectedIds);
        spec.onTimeout(bids);
        expect(utils.triggerPixel.callCount).to.equal(1);
        const triggeredUrl = utils.triggerPixel.args[0][0];
        expect(triggeredUrl).to.include(`p=${expectedEncodedIds}`);
        expect(triggeredUrl.match(cacheBusterRegex)).to.exist;
      });
    });

    describe('onBidderError', function () {
      it('exists and is a function', () => {
        expect(spec.onBidderError).to.exist.and.to.be.a('function');
      });
      it('should return nothing and trigger a pixel', function () {
        const bidderRequest = { bids: [bid1, bid2] };
        const response = spec.onBidderError({ bidderRequest });
        expect(response).to.be.an('undefined')
        expect(utils.triggerPixel.callCount).to.equal(1);
      });
      it('should not trigger a pixel if no bids available', function () {
        const bidderRequest = { bids: [] };
        spec.onBidderError({ bidderRequest });
        expect(utils.triggerPixel.callCount).to.equal(0);
      });
      it('should call triggerEvent with correct ids and a cache buster', function () {
        const bids = [bid1, bid2, bidWithBadSetup]
        const bidderRequest = { bids };
        const expectedIds = [id1Object, id2Object];
        const expectedEncodedIds = encodePlacementIds(expectedIds);
        spec.onBidderError({ bidderRequest });
        expect(utils.triggerPixel.callCount).to.equal(1);
        const triggeredUrl = utils.triggerPixel.args[0][0];
        expect(triggeredUrl).to.include(`p=${expectedEncodedIds}`);
        expect(triggeredUrl.match(cacheBusterRegex)).to.exist;
      });
    });
  });
});
