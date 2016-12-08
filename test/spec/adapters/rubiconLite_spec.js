import { expect } from 'chai';
import adloader from 'src/adloader';
import adapterManager from 'src/adaptermanager';
import bidManager from 'src/bidmanager';
import RubiconAdapter from 'src/adapters/rubiconLite';
import {parse as parseQuery} from 'querystring';

var CONSTANTS = require('src/constants.json');

describe('the rubiconLite adapter', () => {

  let sandbox,
      adUnit,
      bidderRequest;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    adUnit = {
      code: '/19968336/header-bid-tag-0',
      sizes: [[300, 250], [320, 50]],
      bids: [
        {
          bidder: 'rubiconLite',
          params: {
            accountId: '14062',
            siteId: '70608',
            zoneId: '335918',
            userId: '12346',
            keywords: ['a','b','c'],
            inventory: {
              rating:'5-star',
              prodtype:'tech'
            },
            visitor: {
              ucat:'new',
              lastsearch:'iphone'
            },
            position: 'atf',
            referrer: 'localhost'
          }
        }
      ]
    };

    bidderRequest = {
      bidderCode: 'rubiconLite',
      requestId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      bidderRequestId: '178e34bad3658f',
      bids: [
        {
          bidder: 'rubiconLite',
          params: {
            accountId: '14062',
            siteId: '70608',
            zoneId: '335918',
            userId: '12346',
            keywords: ['a','b','c'],
            inventory: {
              rating:'5-star',
              prodtype:'tech'
            },
            visitor: {
              ucat:'new',
              lastsearch:'iphone'
            },
            position: 'atf',
            referrer: 'localhost'
          },
          placementCode: '/19968336/header-bid-tag-0',
          sizes: [[300, 250], [320, 50]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          requestId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a'
        }
      ],
      start: 1472239426002,
      timeout: 5000
    };

  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('callBids public interface', () => {

    let rubiconAdapter = adapterManager.bidderRegistry['rubiconLite'];

    it('should receive a well-formed bidRequest from the adaptermanager', () => {

      sandbox.stub(rubiconAdapter, 'callBids');

      adapterManager.callBids({
          adUnits: [clone(adUnit)]
      });

      let bidderRequest = rubiconAdapter.callBids.getCall(0).args[0];

      expect(bidderRequest).to.have.property('bids')
        .that.is.an('array')
        .with.lengthOf(1);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('bidder', 'rubiconLite');

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('placementCode', adUnit.code);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('sizes')
        .that.is.an('array')
        .with.lengthOf(2)
        .that.deep.equals(adUnit.sizes);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('params')
        .that.deep.equals(adUnit.bids[0].params)

    });

  });

  describe('callBids implementation', () => {

    let rubiconAdapter;

    describe('requests', () => {

      let xhr,
          screen;

      beforeEach(() => {
        rubiconAdapter = new RubiconAdapter();

        xhr = sandbox.useFakeXMLHttpRequest();
      });

      afterEach(() => {
        xhr.restore();
      });

      it('should make a well-formed optimized request', () => {

        rubiconAdapter.callBids(bidderRequest);

        let request = xhr.requests[0];

        expect(request instanceof sinon.FakeXMLHttpRequest).to.equal(true);

        expect(request.withCredentials).to.equal(true);

        let [path, query] = request.url.split('?');
        query = parseQuery(query);

        expect(path).to.equal(
          '//fastlane.rubiconproject.com/a/api/fastlane.json'
        );

        let expectedQuery = {
          'account_id': '14062',
          'site_id': '70608',
          'zone_id': '335918',
          'size_id': '15',
          'alt_size_ids': '43',
          'p_pos': 'atf',
          'rp_floor': '0.01',
          'tk_flint': 'pbjs.lite',
          'p_screen_res': /\d+x\d+/,
          'tk_user_key': '12346',
          'kw': 'a,b,c',
          'tg_v.ucat': 'new',
          'tg_v.lastsearch': 'iphone',
          'tg_i.rating': '5-star',
          'tg_i.prodtype': 'tech',
          'rf': 'localhost'
        };

        // test that all values above are both present and correct
        Object.keys(expectedQuery).forEach(key => {
          let value = expectedQuery[key];
          if(value instanceof RegExp) {
            expect(query[key]).to.match(value);
          } else {
            expect(query[key]).to.equal(value);
          }
        });

        expect(query).to.have.property('rand');

      });

    });


    describe('response handler', () => {
      let bids,
          server;

      beforeEach(() => {
        bids = [];

        server = sinon.fakeServer.create();

        sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
          bids.push(bid);
        });
      });

      afterEach(() => {
        server.restore();
      });

      it('should handle a success response and sort by cpm', () => {

        server.respondWith(JSON.stringify({
          "status": "ok",
          "account_id": 14062,
          "site_id": 70608,
          "zone_id": 530022,
          "size_id": 15,
          "alt_size_ids": [
            43
          ],
          "tracking": "",
          "inventory": {},
          "ads": [
            {
              "status": "ok",
              "impression_id": "153dc240-8229-4604-b8f5-256933b9374c",
              "size_id": "15",
              "ad_id": "6",
              "advertiser": 7,
              "network": 8,
              "creative_id": 9,
              "type": "script",
              "script": "alert('foo')",
              "campaign_id": 10,
              "cpm": 0.811,
              "targeting": [
                {
                  "key": "rpfl_14062",
                  "values": [
                    "15_tier_all_test"
                  ]
                }
              ]
            },
            {
              "status": "ok",
              "impression_id": "153dc240-8229-4604-b8f5-256933b9374d",
              "size_id": "43",
              "ad_id": "7",
              "advertiser": 7,
              "network": 8,
              "creative_id": 9,
              "type": "script",
              "script": "alert('foo')",
              "campaign_id": 10,
              "cpm": 0.911,
              "targeting": [
                {
                  "key": "rpfl_14062",
                  "values": [
                    "15_tier_all_test"
                  ]
                }
              ]
            }
          ]
        }));

        rubiconAdapter.callBids(bidderRequest);

        server.respond();

        expect(bidManager.addBidResponse.calledTwice).to.equal(true);

        expect(bids).to.be.lengthOf(2);

        expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
        expect(bids[0].bidderCode).to.equal("rubiconLite");
        expect(bids[0].width).to.equal(320);
        expect(bids[0].height).to.equal(50);
        expect(bids[0].cpm).to.equal(0.911);
        expect(bids[0].ad).to.contain(`alert('foo')`)
          .and.to.contain(`<html>`)
          .and.to.contain(`<div data-rp-impression-id='153dc240-8229-4604-b8f5-256933b9374d'>`);

        expect(bids[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
        expect(bids[1].bidderCode).to.equal("rubiconLite");
        expect(bids[1].width).to.equal(300);
        expect(bids[1].height).to.equal(250);
        expect(bids[1].cpm).to.equal(0.811);
        expect(bids[1].ad).to.contain(`alert('foo')`)
          .and.to.contain(`<html>`)
          .and.to.contain(`<div data-rp-impression-id='153dc240-8229-4604-b8f5-256933b9374c'>`);
      });

      it('should be fine with a CPM of 0', () => {
        server.respondWith(JSON.stringify({
          "status": "ok",
          "account_id": 14062,
          "site_id": 70608,
          "zone_id": 530022,
          "size_id": 15,
          "alt_size_ids": [
            43
          ],
          "tracking": "",
          "inventory": {},
          "ads": [{
              "status": "ok",
              "cpm": 0,
              "size_id": 15
            }]
        }));

        rubiconAdapter.callBids(bidderRequest);

        server.respond();

        expect(bidManager.addBidResponse.calledOnce).to.equal(true);
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      });

      it('should handle an error with no ads returned', () => {
        server.respondWith(JSON.stringify({
          "status": "ok",
          "account_id": 14062,
          "site_id": 70608,
          "zone_id": 530022,
          "size_id": 15,
          "alt_size_ids": [
            43
          ],
          "tracking": "",
          "inventory": {},
          "ads": []
        }));

        rubiconAdapter.callBids(bidderRequest);

        server.respond();

        expect(bidManager.addBidResponse.calledOnce).to.equal(true);
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      });

      it('should handle an error with bad status', () => {
        server.respondWith(JSON.stringify({
          "status": "ok",
          "account_id": 14062,
          "site_id": 70608,
          "zone_id": 530022,
          "size_id": 15,
          "alt_size_ids": [
            43
          ],
          "tracking": "",
          "inventory": {},
          "ads": [{
              "status": "not_ok",
            }]
        }));

        rubiconAdapter.callBids(bidderRequest);

        server.respond();

        expect(bidManager.addBidResponse.calledOnce).to.equal(true);
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      });

      it('should handle an error because of malformed json response', () => {
        server.respondWith("{test{");

        rubiconAdapter.callBids(bidderRequest);

        server.respond();

        expect(bidManager.addBidResponse.calledOnce).to.equal(true);
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
        expect(bids[0].error instanceof SyntaxError).to.equal(true);
      });

    })


  });

});

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
