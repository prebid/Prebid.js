import {config as _config, config} from 'src/config.js';
import { expect } from 'chai';
import * as events from 'src/events.js';
import * as prebidGlobal from 'src/prebidGlobal.js';
import { intersectionSubmodule } from 'modules/intersectionRtdProvider.js';
import * as utils from 'src/utils.js';
import {getGlobal} from 'src/prebidGlobal.js';
import 'src/prebid.js';

describe('Intersection RTD Provider', function () {
  let sandbox;
  let placeholder;
  const pbjs = getGlobal();
  const adUnit = {
    code: 'ad-slot-1',
    mediaTypes: {
      banner: {
        sizes: [ [300, 250] ]
      }
    },
    bids: [
      {
        bidder: 'fake'
      }
    ]
  };
  const providerConfig = {name: 'intersection', waitForIt: true};
  const rtdConfig = {realTimeData: {auctionDelay: 200, dataProviders: [providerConfig]}}
  describe('IntersectionObserver not supported', function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });
    afterEach(function() {
      sandbox.restore();
      sandbox = undefined;
    });
    it('init should return false', function () {
      sandbox.stub(window, 'IntersectionObserver').value(undefined);
      expect(intersectionSubmodule.init({})).is.false;
    });
  });
  describe('IntersectionObserver supported', function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      placeholder = createDiv();
      append();
      const __config = {};
      sandbox.stub(_config, 'getConfig').callsFake(function (path) {
        return utils.deepAccess(__config, path);
      });
      sandbox.stub(_config, 'setConfig').callsFake(function (obj) {
        utils.mergeDeep(__config, obj);
      });
    });
    afterEach(function() {
      sandbox.restore();
      remove();
      sandbox = undefined;
      placeholder = undefined;
      pbjs.removeAdUnit();
    });
    it('init should return true', function () {
      expect(intersectionSubmodule.init({})).is.true;
    });
    it('should set intersection. (request with "adUnitCodes")', function(done) {
      pbjs.addAdUnits([utils.deepClone(adUnit)]);
      config.setConfig(rtdConfig);
      const onDone = sandbox.stub();
      const requestBidObject = {adUnitCodes: [adUnit.code]};
      intersectionSubmodule.init({});
      intersectionSubmodule.getBidRequestData(
        requestBidObject,
        onDone,
        providerConfig
      );
      setTimeout(function() {
        expect(pbjs.adUnits[0].bids[0]).to.have.property('intersection');
        done();
      }, 200);
    });
    it('should set intersection. (request with "adUnits")', function(done) {
      config.setConfig(rtdConfig);
      const onDone = sandbox.stub();
      const requestBidObject = {adUnits: [utils.deepClone(adUnit)]};
      intersectionSubmodule.init();
      intersectionSubmodule.getBidRequestData(
        requestBidObject,
        onDone,
        providerConfig
      );
      setTimeout(function() {
        expect(requestBidObject.adUnits[0].bids[0]).to.have.property('intersection');
        done();
      }, 200);
    });
    it('should set intersection. (request all)', function(done) {
      pbjs.addAdUnits([utils.deepClone(adUnit)]);
      config.setConfig(rtdConfig);
      const onDone = sandbox.stub();
      const requestBidObject = {};
      intersectionSubmodule.init({});
      intersectionSubmodule.getBidRequestData(
        requestBidObject,
        onDone,
        providerConfig
      );
      setTimeout(function() {
        expect(pbjs.adUnits[0].bids[0]).to.have.property('intersection');
        done();
      }, 200);
    });
    it('should call done due timeout', function(done) {
      config.setConfig(rtdConfig);
      remove();
      const onDone = sandbox.stub();
      const requestBidObject = {adUnits: [utils.deepClone(adUnit)]};
      intersectionSubmodule.init({});
      intersectionSubmodule.getBidRequestData(
        requestBidObject,
        onDone,
        {...providerConfig, test: 1}
      );
      setTimeout(function() {
        sinon.assert.calledOnce(onDone);
        expect(requestBidObject.adUnits[0].bids[0]).to.not.have.property('intersection');
        done();
      }, 300);
    });
  });
  function createDiv() {
    const div = document.createElement('div');
    div.id = adUnit.code;
    return div;
  }
  function append() {
    placeholder && document.body.appendChild(placeholder);
  }
  function remove() {
    placeholder && placeholder.parentElement && placeholder.parentElement.removeChild(placeholder);
  }
});
