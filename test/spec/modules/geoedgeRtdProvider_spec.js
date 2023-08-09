import * as utils from '../../../src/utils.js';
import {loadExternalScript} from '../../../src/adloader.js';
import {
  geoedgeSubmodule,
  getClientUrl,
  getInPageUrl,
  htmlPlaceholder,
  setWrapper,
  wrapper,
  WRAPPER_URL
} from '../../../modules/geoedgeRtdProvider.js';
import {server} from '../../../test/mocks/xhr.js';
import * as events from '../../../src/events.js';
import CONSTANTS from '../../../src/constants.json';

let key = '123123123';
function makeConfig(gpt) {
  return {
    name: 'geoedge',
    params: {
      wap: false,
      key: key,
      bidders: {
        bidderA: true,
        bidderB: false
      },
      gpt: gpt
    }
  };
}

function mockBid(bidderCode) {
  return {
    'ad': '<creative/>',
    'adId': '1234',
    'cpm': '1.00',
    'width': 300,
    'height': 250,
    'bidderCode': bidderCode,
    'requestId': utils.getUniqueIdentifierStr(),
    'creativeId': 'id',
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 360
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

let mockWrapper = `<wrapper>${htmlPlaceholder}</wrapper>`;

describe('Geoedge RTD module', function () {
  describe('submodule', function () {
    describe('name', function () {
      it('should be geoedge', function () {
        expect(geoedgeSubmodule.name).to.equal('geoedge');
      });
    });
    describe('init', function () {
      let insertElementStub;

      before(function () {
        insertElementStub = sinon.stub(utils, 'insertElement');
      });
      after(function () {
        utils.insertElement.restore();
      });
      it('should return false when missing params or key', function () {
        let missingParams = geoedgeSubmodule.init({});
        let missingKey = geoedgeSubmodule.init({ params: {} });
        expect(missingParams || missingKey).to.equal(false);
      });
      it('should return true when params are ok', function () {
        expect(geoedgeSubmodule.init(makeConfig(false))).to.equal(true);
      });
      it('should fetch the wrapper', function () {
        geoedgeSubmodule.init(makeConfig(false));
        let request = server.requests[0];
        let isWrapperRequest = request && request.url && request.url && request.url === WRAPPER_URL;
        expect(isWrapperRequest).to.equal(true);
      });
      it('should preload the client', function () {
        let isLinkPreloadAsScript = arg => arg.tagName === 'LINK' && arg.rel === 'preload' && arg.as === 'script' && arg.href === getClientUrl(key);
        expect(insertElementStub.calledWith(sinon.match(isLinkPreloadAsScript))).to.equal(true);
      });
      it('should emit billable events with applicable winning bids', function (done) {
        let counter = 0;
        events.on(CONSTANTS.EVENTS.BILLABLE_EVENT, function (event) {
          if (event.vendor === 'geoedge' && event.type === 'impression') {
            counter += 1;
          }
          expect(counter).to.equal(1);
          done();
        });
        window.postMessage(mockMessageFromClient(key), '*');
      });
      it('should load the in page code when gpt params is true', function () {
        geoedgeSubmodule.init(makeConfig(true));
        let isInPageUrl = arg => arg == getInPageUrl(key);
        expect(loadExternalScript.calledWith(sinon.match(isInPageUrl))).to.equal(true);
      });
      it('should set the window.grumi config object when gpt params is true', function () {
        let hasGrumiObj = typeof window.grumi === 'object';
        expect(hasGrumiObj && window.grumi.key === key && window.grumi.fromPrebid).to.equal(true);
      });
    });
    describe('setWrapper', function () {
      it('should set the wrapper', function () {
        setWrapper(mockWrapper);
        expect(wrapper).to.equal(mockWrapper);
      });
    });
    describe('onBidResponseEvent', function () {
      let bidFromA = mockBid('bidderA');
      it('should wrap bid html when bidder is configured', function () {
        geoedgeSubmodule.onBidResponseEvent(bidFromA, makeConfig(false));
        expect(bidFromA.ad.indexOf('<wrapper>')).to.equal(0);
      });
      it('should not wrap bid html when bidder is not configured', function () {
        let bidFromB = mockBid('bidderB');
        geoedgeSubmodule.onBidResponseEvent(bidFromB, makeConfig(false));
        expect(bidFromB.ad.indexOf('<wrapper>')).to.equal(-1);
      });
      it('should only muatate the bid ad porperty', function () {
        let copy = Object.assign({}, bidFromA);
        delete copy.ad;
        let equalsOriginal = Object.keys(copy).every(key => copy[key] === bidFromA[key]);
        expect(equalsOriginal).to.equal(true);
      });
    });
  });
});
