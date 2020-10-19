import { config } from '../../../src/config.js';
import * as utils from '../../../src/utils.js';
import * as geoedge from '../../../modules/geoedgeRtdProvider.js';
import { server } from '../../../test/mocks/xhr.js';

let key = '123123123';
function makeConfig () {
  return {
    dataProviders: [{
      name: 'geoedge',
      params: {
        wap: false,
        key: key,
        bidders: {
          bidderA: true,
          bidderB: false
        }
      }
    }]
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

let mockWrapper = `<wrapper>${geoedge.htmlPlaceholder}</wrapper>`;

describe('Geoedge RTD module', function () {
  describe('before init', function () {
    let insertElementStub;

    before(function () {
      insertElementStub = sinon.stub(utils, 'insertElement');
    });
    after(function () {
      utils.insertElement.restore();
    });
    it('should not fetch the wrapper if missing params', function () {
      var missingConf = makeConfig();
      delete missingConf.dataProviders[0].params;
      geoedge.setParams(missingConf);
      let request = server.requests[0];
      expect(request).to.equal(undefined);
    });
    it('should fetch the wrapper if params present', function () {
      geoedge.setParams(makeConfig());
      let request = server.requests[0];
      let isWrapperRequest = request && request.url && request.url && request.url === geoedge.WRAPPER_URL;
      expect(isWrapperRequest).to.equal(true);
    });
    it('should preload the client', function () {
      let isLinkPreloadAsScript = arg => arg.tagName === 'LINK' && arg.rel === 'preload' && arg.as === 'script' && arg.href.indexOf(geoedge.getClientUrl(key)) > 4;
      expect(insertElementStub.calledWith(sinon.match(isLinkPreloadAsScript))).to.equal(true);
    });
  });
  describe('setWrapper', function () {
    it('should set the wrapper', function () {
      geoedge.setWrapper(mockWrapper);
      expect(geoedge.wrapper).to.equal(mockWrapper);
    });
  });
  describe('submodule', function () {
    describe('name', function () {
      it('should be geoedge', function () {
        expect(geoedge.geoedgeSubmodule.name).to.equal('geoedge');
      });
    });
    describe('getData', function () {
      it('should call onDone with an empty object', function (done) {
        geoedge.geoedgeSubmodule.getData([], data => {
          expect(utils.isPlainObject(data) && utils.isEmpty(data)).to.equal(true);
          done();
        });
      });
    });
    describe('init', function () {
      it('should return true', function () {
        expect(geoedge.geoedgeSubmodule.init()).to.equal(true);
      });
    });
    describe('updateBidResponse', function () {
      let bidFromA = mockBid('bidderA');
      it('should wrap bid html when bidder is configured', function () {
        geoedge.geoedgeSubmodule.updateBidResponse(bidFromA);
        expect(bidFromA.ad.indexOf('<wrapper>')).to.equal(0);
      });
      it('should not wrap bid html when bidder is not configured', function () {
        let bidFromB = mockBid('bidderB');
        geoedge.geoedgeSubmodule.updateBidResponse(bidFromB);
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
