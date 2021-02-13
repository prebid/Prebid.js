import adapterManager from 'src/adapterManager.js';
import analyticsAdapter, { command as analyticsCommand, COMMAND } from 'modules/adlooxAnalyticsAdapter.js';
import { AUCTION_COMPLETED } from 'src/auction.js';
import { expect } from 'chai';
import events from 'src/events.js';
import { EVENTS } from 'src/constants.json';
import * as utils from 'src/utils.js';

const analyticsAdapterName = 'adloox';

describe('Adloox Analytics Adapter', function () {
  let sandbox;

  const esplode = 'esplode';

  const bid = {
    bidder: 'dummy',
    adUnitCode: 'ad-slot-1',
    mediaType: 'display'
  };

  const auctionDetails = {
    auctionStatus: AUCTION_COMPLETED,
    bidsReceived: [
      bid
    ]
  };

  const analyticsOptions = {
    js: 'https://j.adlooxtracking.com/ads/js/tfav_adl_%%clientid%%.js',
    client: 'adlooxtest',
    clientid: 127,
    platformid: 0,
    tagid: 0,
    params: {
      dummy1: '%%client%%',
      dummy2: '%%pbAdSlot%%',
      dummy3: function(bid) { throw new Error(esplode) }
    }
  };

  adapterManager.registerAnalyticsAdapter({
    code: analyticsAdapterName,
    adapter: analyticsAdapter
  });

  describe('enableAnalytics', function () {
    describe('invalid options', function () {
      it('should require options', function (done) {
        adapterManager.enableAnalytics({
          provider: analyticsAdapterName
        });
        expect(analyticsAdapter.context).is.null;

        done();
      });

      it('should reject non-string options.js', function (done) {
        const analyticsOptionsLocal = utils.deepClone(analyticsOptions);
        analyticsOptionsLocal.js = function () { };

        adapterManager.enableAnalytics({
          provider: analyticsAdapterName,
          options: analyticsOptionsLocal
        });
        expect(analyticsAdapter.context).is.null;

        done();
      });

      it('should reject non-function options.toselector', function (done) {
        const analyticsOptionsLocal = utils.deepClone(analyticsOptions);
        analyticsOptionsLocal.toselector = esplode;

        adapterManager.enableAnalytics({
          provider: analyticsAdapterName,
          options: analyticsOptionsLocal
        });
        expect(analyticsAdapter.context).is.null;

        done();
      });

      [ 'client', 'clientid', 'platformid', 'tagid' ].forEach(function (o) {
        it('should require options.' + o, function (done) {
          const analyticsOptionsLocal = utils.deepClone(analyticsOptions);
          delete analyticsOptionsLocal[o];

          adapterManager.enableAnalytics({
            provider: analyticsAdapterName,
            options: analyticsOptionsLocal
          });
          expect(analyticsAdapter.context).is.null;

          done();
        });
      });

      it('should reject non-object options.params', function (done) {
        const analyticsOptionsLocal = utils.deepClone(analyticsOptions);
        analyticsOptionsLocal.params = esplode;

        adapterManager.enableAnalytics({
          provider: analyticsAdapterName,
          options: analyticsOptionsLocal
        });
        expect(analyticsAdapter.context).is.null;

        done();
      });
    });
  });

  describe('process', function () {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      sandbox.stub(events, 'getEvents').returns([]);

      adapterManager.enableAnalytics({
        provider: analyticsAdapterName,
        options: utils.deepClone(analyticsOptions)
      });

      expect(analyticsAdapter.context).is.not.null;
    });

    afterEach(function () {
      analyticsAdapter.disableAnalytics();
      expect(analyticsAdapter.context).is.null;

      sandbox.restore();
      sandbox = undefined;
    });

    describe('event', function () {
      it('should preload the script on AUCTION_END only once', function (done) {
        const insertElementStub = sandbox.stub(utils, 'insertElement');

        const uri = utils.parseUrl(analyticsAdapter.url(analyticsOptions.js));
        const isLinkPreloadAsScript = arg => arg.tagName === 'LINK' && arg.rel === 'preload' && arg.as === 'script' && arg.href === `${uri.protocol}://${uri.host}${uri.pathname}`;

        events.emit(EVENTS.AUCTION_END, auctionDetails);
        expect(insertElementStub.calledWith(sinon.match(isLinkPreloadAsScript))).to.true;

        events.emit(EVENTS.AUCTION_END, auctionDetails);
        expect(insertElementStub.callCount).to.equal(1);

        done();
      });

      it('should inject verification JS on BID_WON located immediately after slot', function (done) {
        const url = analyticsAdapter.url(`${analyticsOptions.js}#`);

        const parent = document.createElement('div');

        const slot = document.createElement('div');
        slot.id = bid.adUnitCode;
        parent.appendChild(slot);

        const dummy = document.createElement('div');
        parent.appendChild(dummy);

        const script = document.createElement('script');
        const createElementStub = sandbox.stub(document, 'createElement');
        createElementStub.withArgs('script').returns(script);

        const querySelectorStub = sandbox.stub(document, 'querySelector');
        querySelectorStub.withArgs(`#${bid.adUnitCode}`).returns(slot);

        events.emit(EVENTS.BID_WON, bid);

        expect(script.src.substr(0, url.length)).to.equal(url);
        expect(slot.nextSibling).to.equal(script);
        expect(/[#&]creatype=2(&|$)/.test(script.src)).to.true; // prebid 'display' -> adloox '2'
        expect(new RegExp('[#&]dummy3=' + encodeURIComponent('ERROR: ' + esplode) + '(&|$)').test(script.src)).to.true;

        done();
      });
    });

    describe('command', function () {
      it('should return config', function (done) {
        const expected = utils.deepClone(analyticsOptions);
        delete expected.js;
        delete expected.toselector;
        delete expected.params;

        analyticsCommand(COMMAND.CONFIG, null, function (response) {
          expect(utils.deepEqual(response, expected)).is.true;

          done();
        });
      });

      it('should return expanded URL', function (done) {
        const data = {
          url: 'https://example.com?',
          args: [
            [ 'client', '%%client%%' ]
          ],
          bid: bid,
          ids: true
        };
        const expected = `${data.url}${data.args[0][0]}=${analyticsOptions.client}`;

        analyticsCommand(COMMAND.URL, data, function (response) {
          expect(response.substr(0, expected.length)).is.equal(expected);

          done();
        });
      });

      it('should inject tracking event', function (done) {
        const data = {
          eventType: EVENTS.BID_WON,
          args: bid
        };

        analyticsCommand(COMMAND.TRACK, data, function (response) {
          expect(response).is.undefined;

          done();
        });
      });
    });
  });
});
