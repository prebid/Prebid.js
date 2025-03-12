import {expect} from 'chai';
import {geolocationSubmodule} from 'modules/geolocationRtdProvider.js';
import * as activityRules from 'src/activities/rules.js';
import 'src/prebid.js';
import {PbPromise} from '../../../src/utils/promise.js';
import {ACTIVITY_TRANSMIT_PRECISE_GEO} from '../../../src/activities/activities.js';

describe('Geolocation RTD Provider', function () {
  let sandbox;

  before(() => {
    if (!navigator.permissions) {
      navigator.permissions = {mock: true, query: false}
    }
  });

  after(() => {
    if (navigator.permissions.mock) {
      delete navigator.permissions;
    }
  });

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  })

  describe('Geolocation not supported', function() {
    Object.entries({
      'permissions.query': () => sandbox.stub(navigator.permissions, 'query').value(undefined),
      'permissions': () => sandbox.stub(navigator, 'permissions').value(undefined),
    }).forEach(([t, setup]) => {
      describe(`${t} not available`, () => {
        beforeEach(setup);
        it('init should return false', function () {
          expect(geolocationSubmodule.init({})).is.false;
        });
      });
    });
  });

  describe('Geolocation supported', function() {
    let clock, rtdConfig, permState, permGiven, onDone;

    beforeEach(() => {
      onDone = sinon.stub();
      permState = 'prompt';
      rtdConfig = {params: {}};
      clock = sandbox.useFakeTimers(11000);
      sandbox.stub(navigator.geolocation, 'getCurrentPosition').value((cb) => {
        // eslint-disable-next-line standard/no-callback-literal
        cb({coords: {latitude: 1, longitude: 2}, timestamp: 1000});
      });
      permGiven = new Promise((resolve) => {
        sandbox.stub(navigator.permissions, 'query').value(() => {
          permGiven = Promise.resolve({
            state: permState,
          })
          return permGiven;
        });
      })
      geolocationSubmodule.init(rtdConfig);
    });

    it('init should return true', function () {
      expect(geolocationSubmodule.init({})).is.true;
    });

    Object.entries({
      'not necessary, requestPermission not set': [undefined, 'granted'],
      'not necessary, requestPermission = false': [false, 'granted'],
      'required, with requestPermission = true': [true, 'prompt']
    }).forEach(([t, [requestPermission, navPerm]]) => {
      describe(`when browser permission is ${t}`, () => {
        beforeEach(() => {
          permState = navPerm;
          rtdConfig.params.requestPermission = requestPermission;
        });

        it(`should set geolocation`, async () => {
          const requestBidObject = {ortb2Fragments: {global: {}}};
          geolocationSubmodule.getBidRequestData(requestBidObject, onDone, rtdConfig);
          await permGiven;
          clock.tick(300);
          expect(onDone.called).to.be.true;
          expect(requestBidObject.ortb2Fragments.global.device.geo).to.eql({
            type: 1,
            lat: 1,
            lon: 2,
            lastfix: 10
          })
        })
      })
    })

    Object.entries({
      'transmitPreciseGeo is denied': () => sandbox.stub(activityRules, 'isActivityAllowed').callsFake(activity => activity !== ACTIVITY_TRANSMIT_PRECISE_GEO),
      'permissions are required, but requestPermission is not set': () => { delete rtdConfig.params.requestPermission; permState = 'prompt' },
      'permissions are required, but requestPermission is false': () => { rtdConfig.params.requestPermission = false; permState = 'prompt' }
    }).forEach(([t, setup]) => {
      describe(`when ${t}`, () => {
        beforeEach(setup);

        it(`should NOT set geo`, () => {
          const req = {ortb2Fragments: {global: {}}};
          geolocationSubmodule.getBidRequestData(req, onDone, rtdConfig);
          clock.tick(300);
          expect(req.ortb2Fragments.global.device?.geo).to.not.exist;
        })
      })
    });
  });
});
