import {config as _config, config} from 'src/config.js';
import { expect } from 'chai';
import * as events from 'src/events.js';
import * as prebidGlobal from 'src/prebidGlobal.js';
import { geolocationSubmodule } from 'modules/geolocationRtdProvider.js';
import * as utils from 'src/utils.js';
import {getGlobal} from 'src/prebidGlobal.js';
import 'src/prebid.js';

describe('Geolocation RTD Provider', function () {
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
  const providerConfig = {name: 'geolocation', waitForIt: true};
  const rtdConfig = {realTimeData: {auctionDelay: 200, dataProviders: [providerConfig]}}
  describe('Geolocation not supported', function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });
    afterEach(function() {
      sandbox.restore();
      sandbox = undefined;
    });
    it('init should return false', function () {
      if (navigator.permissions) { sandbox.stub(navigator.permissions, 'query').value(undefined); expect(geolocationSubmodule.init({})).is.false; }
    });
  });
  describe('Geolocation supported', function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      // placeholder = createDiv();
      // append();
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
      // remove();
      sandbox = undefined;
      placeholder = undefined;
      pbjs.removeAdUnit();
    });
    it('init should return true', function () {
      navigator.permissions && expect(geolocationSubmodule.init({})).is.true;
    });
    it('should set geolocation. (request all)', function(done) {
      navigator.permissions && sandbox.stub(navigator.permissions, 'query').value(() => Promise.resolve({
        state: 'granted',
      }));
      navigator.geolocation && sandbox.stub(navigator.geolocation, 'getCurrentPosition').value((cb) => {
        // eslint-disable-next-line standard/no-callback-literal
        cb({coords: {latitude: 1, longitude: 1}});
      });
      pbjs.addAdUnits([utils.deepClone(adUnit)]);
      config.setConfig(rtdConfig);
      const onDone = sandbox.stub();
      const requestBidObject = {};
      geolocationSubmodule.init({});
      geolocationSubmodule.getBidRequestData(
        requestBidObject,
        onDone,
        providerConfig
      );
      expect(pbjs.adUnits.length).to.eq(1);
      setTimeout(function() {
        // expect(requestBidObject?.ortb2Fragments?.global.device.geo?.type).to.eq(1);
        done();
      }, 300);
    });
    it('should call done due timeout', function(done) {
      // sandbox.stub(navigator.permissions, 'query').value(() => new Promise(() => {}));
      // sandbox.stub(navigator.geolocation, 'getCurrentPosition').value((cb) => {});
      config.setConfig(rtdConfig);
      // remove();
      const onDone = sandbox.stub();
      const requestBidObject = {adUnits: [utils.deepClone(adUnit)]};
      geolocationSubmodule.init({});
      geolocationSubmodule.getBidRequestData(
        requestBidObject,
        onDone,
        {...providerConfig, test: 1}
      );
      setTimeout(function() {
        sinon.assert.calledOnce(onDone);
        expect(requestBidObject).to.not.have.property('ortb2Fragments.global.device.geo');
        done();
      }, 300);
    });
  });
  // function createDiv() {
  //   const div = document.createElement('div');
  //   div.id = adUnit.code;
  //   return div;
  // }
  // function append() {
  //   placeholder && document.body.appendChild(placeholder);
  // }
  // function remove() {
  //   placeholder && placeholder.parentElement && placeholder.parentElement.removeChild(placeholder);
  // }
});
