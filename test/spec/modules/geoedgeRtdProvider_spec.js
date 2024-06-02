import * as utils from '../../../src/utils.js';
import { loadExternalScript } from '../../../src/adloader.js';
import * as geoedgeRtdModule from '../../../modules/geoedgeRtdProvider.js';
import { server } from '../../../test/mocks/xhr.js';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';

const {
  geoedgeSubmodule,
  getClientUrl,
  getInPageUrl,
  htmlPlaceholder,
  setWrapper,
  getMacros,
  WRAPPER_URL,
  preloadClient,
  markAsLoaded
} = geoedgeRtdModule;

const key = '123123123';
function makeConfig(gpt) {
  return {
    name: 'geoedge',
    params: {
      wap: false,
      key,
      bidders: {
        bidderA: true,
        bidderB: false
      },
      gpt
    }
  };
}

function mockBid(bidderCode) {
  return {
    ad: '<creative/>',
    adId: '1234',
    cpm: '1.00',
    width: 300,
    height: 250,
    bidderCode,
    requestId: utils.getUniqueIdentifierStr(),
    creativeId: 'id',
    currency: 'USD',
    netRevenue: true,
    ttl: 360
  };
}

function mockMessageFromClient(key) {
  return {
    key,
    impression: true,
    adId: 1234,
    type: 'impression'
  };
}

const mockWrapper = `<wrapper>${htmlPlaceholder}</wrapper>`;

describe('Geoedge RTD module', function () {
  describe('submodule', function () {
    describe('name', function () {
      it('should be geoedge', function () {
        expect(geoedgeSubmodule.name).to.equal('geoedge');
      });
    });
    describe('init', function () {
      before(function () {
        sinon.spy(geoedgeRtdModule, 'preloadClient');
      });
      after(function () {
        geoedgeRtdModule.preloadClient.restore();
      });
      it('should return false when missing params or key', function () {
        const missingParams = geoedgeSubmodule.init({});
        const missingKey = geoedgeSubmodule.init({ params: {} });
        expect(missingParams || missingKey).to.equal(false);
      });
      it('should return true when params are ok', function () {
        expect(geoedgeSubmodule.init(makeConfig(false))).to.equal(true);
      });
      it('should fetch the wrapper', function () {
        geoedgeSubmodule.init(makeConfig(false));
        const request = server.requests[0];
        const isWrapperRequest = request && request.url && request.url && request.url === WRAPPER_URL;
        expect(isWrapperRequest).to.equal(true);
      });
      it('should call preloadClient', function () {
        expect(preloadClient.called);
      });
      it('should emit billable events with applicable winning bids', function (done) {
        let counter = 0;
        events.on(EVENTS.BILLABLE_EVENT, function (event) {
          if (event.vendor === geoedgeSubmodule.name && event.type === 'impression') {
            counter += 1;
          }
          expect(counter).to.equal(1);
          done();
        });
        window.postMessage(mockMessageFromClient(key), '*');
      });
      it('should load the in page code when gpt params is true', function () {
        geoedgeSubmodule.init(makeConfig(true));
        const isInPageUrl = arg => arg === getInPageUrl(key);
        expect(loadExternalScript.calledWith(sinon.match(isInPageUrl))).to.equal(true);
      });
      it('should set the window.grumi config object when gpt params is true', function () {
        const hasGrumiObj = typeof window.grumi === 'object';
        expect(hasGrumiObj && window.grumi.key === key && window.grumi.fromPrebid).to.equal(true);
      });
    });
    describe('preloadClient', function () {
      let iframe;
      preloadClient(key);
      const loadExternalScriptCall = loadExternalScript.getCall(0);
      it('should create an invisible iframe and insert it to the DOM', function () {
        iframe = document.getElementById('grumiFrame');
        expect(iframe && iframe.style.display === 'none');
      });
      it('should assign params object to the iframe\'s window', function () {
        const grumi = iframe.contentWindow.grumi;
        expect(grumi.key).to.equal(key);
      });
      it('should preload the client into the iframe', function () {
        const isClientUrl = arg => arg === getClientUrl(key);
        expect(loadExternalScriptCall.calledWithMatch(isClientUrl)).to.equal(true);
      });
    });
    describe('setWrapper', function () {
      it('should set the wrapper', function () {
        setWrapper(mockWrapper);
        expect(geoedgeRtdModule.wrapper).to.equal(mockWrapper);
      });
    });
    describe('getMacros', function () {
      it('return a dictionary of macros replaced with values from bid object', function () {
        const bid = mockBid('testBidder');
        const dict = getMacros(bid, key);
        const hasCpm = dict['%_hbCpm!'] === bid.cpm;
        const hasCurrency = dict['%_hbCurrency!'] === bid.currency;
        expect(hasCpm && hasCurrency);
      });
    });
    describe('onBidResponseEvent', function () {
      const bidFromA = mockBid('bidderA');
      it('should wrap bid html when bidder is configured', function () {
        geoedgeSubmodule.onBidResponseEvent(bidFromA, makeConfig(false));
        expect(bidFromA.ad.indexOf('<wrapper>')).to.equal(0);
      });
      it('should not wrap bid html when bidder is not configured', function () {
        const bidFromB = mockBid('bidderB');
        geoedgeSubmodule.onBidResponseEvent(bidFromB, makeConfig(false));
        expect(bidFromB.ad.indexOf('<wrapper>')).to.equal(-1);
      });
      it('should only muatate the bid ad porperty', function () {
        const copy = Object.assign({}, bidFromA);
        delete copy.ad;
        const equalsOriginal = Object.keys(copy).every(key => copy[key] === bidFromA[key]);
        expect(equalsOriginal).to.equal(true);
      });
    });
  });
});
