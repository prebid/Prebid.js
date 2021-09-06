import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js'
import { beforeInit, geoedgeSubmodule, setWrapper, wrapper, htmlPlaceholder, WRAPPER_URL, getClientUrl } from '../../../modules/geoedgeRtdProvider.js';
import { server } from '../../../test/mocks/xhr.js';

let key = '123123123';
function makeConfig() {
  return {
    name: 'geoedge',
    params: {
      wap: false,
      key: key,
      bidders: {
        bidderA: true,
        bidderB: false
      }
    }
  };
}

function mockBid(bidderCode) {
  return {
    'ad': '<creative/>',
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

let mockWrapper = `<wrapper>${htmlPlaceholder}</wrapper>`;

describe('Geoedge RTD module', function () {
  describe('beforeInit', function () {
    let submoduleStub;

    before(function () {
      submoduleStub = sinon.stub(hook, 'submodule');
    });
    after(function () {
      submoduleStub.restore();
    });
    it('should fetch the wrapper', function () {
      beforeInit();
      let request = server.requests[0];
      let isWrapperRequest = request && request.url && request.url && request.url === WRAPPER_URL;
      expect(isWrapperRequest).to.equal(true);
    });
    it('should register RTD submodule provider', function () {
      expect(submoduleStub.calledWith('realTimeData', geoedgeSubmodule)).to.equal(true);
    });
  });
  describe('setWrapper', function () {
    it('should set the wrapper', function () {
      setWrapper(mockWrapper);
      expect(wrapper).to.equal(mockWrapper);
    });
  });
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
        expect(geoedgeSubmodule.init(makeConfig())).to.equal(true);
      });
      it('should preload the client', function () {
        let isLinkPreloadAsScript = arg => arg.tagName === 'LINK' && arg.rel === 'preload' && arg.as === 'script' && arg.href === getClientUrl(key);
        expect(insertElementStub.calledWith(sinon.match(isLinkPreloadAsScript))).to.equal(true);
      });
    });
    describe('onBidResponseEvent', function () {
      let bidFromA = mockBid('bidderA');
      it('should wrap bid html when bidder is configured', function () {
        geoedgeSubmodule.onBidResponseEvent(bidFromA, makeConfig());
        expect(bidFromA.ad.indexOf('<wrapper>')).to.equal(0);
      });
      it('should not wrap bid html when bidder is not configured', function () {
        let bidFromB = mockBid('bidderB');
        geoedgeSubmodule.onBidResponseEvent(bidFromB, makeConfig());
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
