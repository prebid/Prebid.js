import { contxtfulSubmodule, extractParameters } from '../../../modules/contxtfulRtdProvider.js';
import { expect } from 'chai';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import { getStorageManager } from '../../../src/storageManager.js';
import { MODULE_TYPE_UID } from '../../../src/activities/modules.js';
import * as events from '../../../src/events.js';
import * as utils from 'src/utils.js';
import * as gptUtils from '../../../libraries/gptUtils/gptUtils.js'
import Sinon from 'sinon';
import { deepClone, getWinDimensions } from '../../../src/utils.js';

const MODULE_NAME = 'contxtful';

const VERSION = 'v1';
const CUSTOMER = 'CUSTOMER';
const SM = 'SM';
const CONTXTFUL_CONNECTOR_ENDPOINT = `https://api.receptivity.io/${VERSION}/prebid/${CUSTOMER}/connector/rxConnector.js`;

const RX_FROM_SESSION_STORAGE = { ReceptivityState: 'Receptive', test_info: 'rx_from_session_storage' };
const RX_FROM_API = { ReceptivityState: 'Receptive', test_info: 'rx_from_engine' };

const RX_API_MOCK = { receptivity: sinon.stub(), receptivityBatched: sinon.stub() };
const RX_API_MOCK_WITH_BUNDLE = { receptivity: sinon.stub(), receptivityBatched: sinon.stub(), getOrtb2Fragment: sinon.stub() }

const RX_CONNECTOR_MOCK = {
  fetchConfig: sinon.stub(),
  rxApiBuilder: sinon.stub(),
};

const TIMEOUT = 10;
const RX_CONNECTOR_IS_READY_EVENT = new CustomEvent('rxConnectorIsReady', { detail: { [CUSTOMER]: RX_CONNECTOR_MOCK }, bubbles: true });

function buildInitConfig(version, customer) {
  return {
    name: 'contxtful',
    params: {
      version: version,
      customer: customer,
      hostname: 'api.receptivity.io',
      bidders: ['mock-bidder-code'],
      adServerTargeting: true,
    },
  };
}

function fakeGetElementById(width, height, x, y) {
  const obj = { x, y, width, height };

  return {
    ...obj,
    getBoundingClientRect: () => {
      return {
        width: obj.width,
        height: obj.height,
        left: obj.x,
        top: obj.y,
        right: obj.x + obj.width,
        bottom: obj.y + obj.height
      };
    }
  };
}

describe('contxtfulRtdProvider', function () {
  const sandbox = sinon.createSandbox();
  let loadExternalScriptTag;
  let eventsEmitSpy;

  const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

  beforeEach(() => {
    loadExternalScriptTag = document.createElement('script');
    loadExternalScriptStub.callsFake((_url, _moduleName) => loadExternalScriptTag);

    RX_API_MOCK.receptivity.resetHistory();
    RX_API_MOCK.receptivity.callsFake(() => RX_FROM_API);

    RX_API_MOCK.receptivityBatched.resetHistory();
    RX_API_MOCK.receptivityBatched.callsFake((bidders) => bidders.reduce((accumulator, bidder) => { accumulator[bidder] = RX_FROM_API; return accumulator; }, {}));

    RX_API_MOCK_WITH_BUNDLE.receptivity.resetHistory();
    RX_API_MOCK_WITH_BUNDLE.receptivity.callsFake(() => RX_FROM_API);

    RX_API_MOCK_WITH_BUNDLE.receptivityBatched.resetHistory();
    RX_API_MOCK_WITH_BUNDLE.receptivityBatched.callsFake((bidders) => bidders.reduce((accumulator, bidder) => { accumulator[bidder] = RX_FROM_API; return accumulator; }, {}));

    RX_API_MOCK_WITH_BUNDLE.getOrtb2Fragment.resetHistory();
    RX_API_MOCK_WITH_BUNDLE.getOrtb2Fragment.callsFake((bidders, reqBidsConfigObj) => {
      const bidderObj = bidders.reduce((accumulator, bidder) => { accumulator[bidder] = { user: { data: [{ name: MODULE_NAME, value: RX_FROM_API }] } }; return accumulator; }, {});
      return { global: { user: { site: { id: 'globalsiteId' } } }, bidder: bidderObj }
    }
    );

    RX_CONNECTOR_MOCK.fetchConfig.resetHistory();
    RX_CONNECTOR_MOCK.fetchConfig.callsFake((tagId) => new Promise((resolve, reject) => resolve({ tag_id: tagId })));

    RX_CONNECTOR_MOCK.rxApiBuilder.resetHistory();
    RX_CONNECTOR_MOCK.rxApiBuilder.callsFake((_config) => new Promise((resolve, reject) => resolve(RX_API_MOCK)));

    eventsEmitSpy = sandbox.spy(events, ['emit']);

    sandbox.stub(utils, 'generateUUID').returns(SM);

    const tagId = CUSTOMER;
    sessionStorage.clear();
  });

  afterEach(function () {
    delete window.Contxtful;
    sandbox.restore();
  });

  describe('extractParameters', () => {
    const {
      params: { customer, version },
    } = buildInitConfig(VERSION, CUSTOMER);
    const theories = [
      [
        null,
        'params.version should be a non-empty string',
        'null object for config',
      ],
      [
        {},
        'params.version should be a non-empty string',
        'empty object for config',
      ],
      [
        { customer },
        'params.version should be a non-empty string',
        'customer only in config',
      ],
      [
        { version },
        'params.customer should be a non-empty string',
        'version only in config',
      ],
      [
        { customer, version: '' },
        'params.version should be a non-empty string',
        'empty string for version',
      ],
      [
        { customer: '', version },
        'params.customer should be a non-empty string',
        'empty string for customer',
      ],
      [
        { customer: '', version: '' },
        'params.version should be a non-empty string',
        'empty string for version & customer',
      ],
    ];

    theories.forEach(([params, expectedErrorMessage, _description]) => {
      const config = { name: 'contxtful', params };
      it('detects invalid configuration and throws the expected error', () => {
        expect(() => extractParameters(config)).to.throw(
          expectedErrorMessage
        );
      });
    });
  });

  describe('extractParameters', function () {
    it('detects invalid configuration and returns false', () => {
      expect(contxtfulSubmodule.init({})).to.be.false;
    });
  });

  describe('init', function () {
    it('uses a valid configuration and returns true when initializing', () => {
      const config = buildInitConfig(VERSION, CUSTOMER);
      expect(contxtfulSubmodule.init(config)).to.be.true;
    });

    it('loads a RX connector script asynchronously', (done) => {
      contxtfulSubmodule.init(buildInitConfig(VERSION, CUSTOMER));

      setTimeout(() => {
        expect(loadExternalScriptStub.calledOnce).to.be.true;
        expect(loadExternalScriptStub.args[0][0]).to.equal(
          CONTXTFUL_CONNECTOR_ENDPOINT
        );

        done();
      }, TIMEOUT);
    });
  });

  describe('init', function () {
    it('returns true when initializing', () => {
      loadExternalScriptStub.callsFake((url, moduleCode, callback, doc, attributes) => {
        return { addEventListener: (type, listener) => { } };
      });
      const config = buildInitConfig(VERSION, CUSTOMER);
      expect(contxtfulSubmodule.init(config)).to.be.true;
    });
  });

  describe('init', function () {
    it('uses the RX API to get receptivity', (done) => {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      setTimeout(() => {
        contxtfulSubmodule.getTargetingData(['ad-slot'], config);
        expect(RX_API_MOCK.receptivity.callCount, 'receptivity 42').to.be.equal(1);
        expect(RX_API_MOCK.receptivity.firstCall.returnValue, 'receptivity').to.be.equal(RX_FROM_API);
        done();
      }, TIMEOUT);
    });
  });

  describe('init', function () {
    it('gets the RX API returned by an external script', (done) => {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      setTimeout(() => {
        contxtfulSubmodule.getTargetingData(['ad-slot'], config);
        expect(RX_CONNECTOR_MOCK.fetchConfig.callCount, 'fetchConfig').at.least(1);
        expect(RX_CONNECTOR_MOCK.rxApiBuilder.callCount, 'rxApiBuilder').at.least(1);
        done();
      }, TIMEOUT);
    });
  });

  describe('init', function () {
    it('detect that initial receptivity is not dispatched and it does not initialize receptivity value', (done) => {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);

      setTimeout(() => {
        const targetingData = contxtfulSubmodule.getTargetingData(['ad-slot'], config);
        expect(targetingData).to.deep.equal({});
        done();
      }, TIMEOUT);
    });
  });

  describe('init', function () {
    const theories = [
      [new Event('initialReceptivity'), 'event without details'],
      [new CustomEvent('initialReceptivity', {}), 'custom event without details'],
      [new CustomEvent('initialReceptivity', { detail: {} }), 'custom event with invalid details'],
      [new CustomEvent('initialReceptivity', { detail: { ReceptivityState: '' } }), 'custom event with details without ReceptivityState'],
    ];

    theories.forEach(([initialReceptivityEvent, _description]) => {
      it('figures out that initial receptivity is invalid and it does not initialize receptivity value', (done) => {
        const config = buildInitConfig(VERSION, CUSTOMER);
        contxtfulSubmodule.init(config);
        loadExternalScriptTag.dispatchEvent(initialReceptivityEvent);

        setTimeout(() => {
          const targetingData = contxtfulSubmodule.getTargetingData(['ad-slot'], config);
          expect(targetingData).to.deep.equal({});
          done();
        }, TIMEOUT);
      });
    })
  });

  describe('getTargetingData', function () {
    const theories = [
      [undefined, {}, 'undefined ad-slots'],
      [[], {}, 'empty ad-slots'],
      [
        ['ad-slot'],
        { 'ad-slot': RX_FROM_API },
        'single ad-slot',
      ],
      [
        ['ad-slot-1', 'ad-slot-2'],
        {
          'ad-slot-1': RX_FROM_API,
          'ad-slot-2': RX_FROM_API,
        },
        'many ad-slots',
      ],
    ];

    theories.forEach(([adUnits, expected, description]) => {
      it('adds receptivity to the ad units using the RX API', function (done) {
        const config = buildInitConfig(VERSION, CUSTOMER);
        contxtfulSubmodule.init(config);
        window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

        setTimeout(() => {
          const targetingData = contxtfulSubmodule.getTargetingData(adUnits, config);
          expect(targetingData, description).to.deep.equal(expected, description);
          done();
        }, TIMEOUT);
      });
    });
  });

  describe('getTargetingData', function () {
    const theories = [
      [undefined, {}, 'undefined ad-slots'],
      [[], {}, 'empty ad-slots'],
      [
        ['ad-slot'],
        {},
        'single ad-slot',
      ],
      [
        ['ad-slot-1', 'ad-slot-2'],
        {
        },
        'many ad-slots',
      ],
    ];

    theories.forEach(([adUnits, expected, description]) => {
      it('honours "adServerTargeting" and the RX API is not called', function (done) {
        const config = buildInitConfig(VERSION, CUSTOMER);
        config.params.adServerTargeting = false;
        contxtfulSubmodule.init(config);
        window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

        setTimeout(() => {
          const _ = contxtfulSubmodule.getTargetingData(adUnits, config);
          expect(RX_API_MOCK.receptivity.callCount).to.be.equal(0);
          done();
        }, TIMEOUT);
      });

      it('honours adServerTargeting and it does not add receptivity to the ad units', function (done) {
        const config = buildInitConfig(VERSION, CUSTOMER);
        config.params.adServerTargeting = false;
        contxtfulSubmodule.init(config);
        window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

        setTimeout(() => {
          const targetingData = contxtfulSubmodule.getTargetingData(adUnits, config);
          expect(targetingData, description).to.deep.equal(expected);
          done();
        }, TIMEOUT);
      });
    });
  });

  describe('getTargetingData', function () {
    const theories = [
      [undefined, {}, 'undefined ad-slots'],
      [[], {}, 'empty ad-slots'],
      [
        ['ad-slot'],
        { 'ad-slot': RX_FROM_SESSION_STORAGE },
        'single ad-slot',
      ],
      [
        ['ad-slot-1', 'ad-slot-2'],
        {
          'ad-slot-1': RX_FROM_SESSION_STORAGE,
          'ad-slot-2': RX_FROM_SESSION_STORAGE,
        },
        'many ad-slots',
      ],
    ];

    theories.forEach(([adUnits, expected, _description]) => {
      it('uses non-expired info from session storage and adds receptivity to the ad units using session storage', function (done) {
        // Simulate that there was a write to sessionStorage in the past.
        storage.setDataInSessionStorage(CUSTOMER, JSON.stringify({ exp: new Date().getTime() + 1000, rx: RX_FROM_SESSION_STORAGE }))

        const config = buildInitConfig(VERSION, CUSTOMER);
        contxtfulSubmodule.init(config);

        const targetingData = contxtfulSubmodule.getTargetingData(adUnits, config);
        expect(targetingData).to.deep.equal(expected);

        done();
      });
    });
  });

  describe('getTargetingData', function () {
    const theories = [
      [undefined, {}, 'undefined ad-slots'],
      [[], {}, 'empty ad-slots'],
      [
        ['ad-slot'],
        {},
        'single ad-slot',
      ],
      [
        ['ad-slot-1', 'ad-slot-2'],
        {
        },
        'many ad-slots',
      ],
    ];

    theories.forEach(([adUnits, expected, _description]) => {
      it('ignores expired info from session storage and does not forward the info to ad units', function (done) {
        // Simulate that there was a write to sessionStorage in the past.
        storage.setDataInSessionStorage(CUSTOMER, JSON.stringify({ exp: new Date().getTime() - 100, rx: RX_FROM_SESSION_STORAGE }));

        const config = buildInitConfig(VERSION, CUSTOMER);
        contxtfulSubmodule.init(config);

        const targetingData = contxtfulSubmodule.getTargetingData(adUnits, config);
        expect(targetingData).to.deep.equal(expected);

        done();
      });
    });
  });

  describe('getBidRequestData', function () {
    it('calls once the onDone callback', function (done) {
      contxtfulSubmodule.init(buildInitConfig(VERSION, CUSTOMER));
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, buildInitConfig(VERSION, CUSTOMER));
        expect(onDoneSpy.calledOnce).to.be.true;
        done();
      }, TIMEOUT);
    });
  });

  describe('getBidRequestData', function () {
    it('does not write receptivity to the global OpenRTB 2 fragment', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      setTimeout(() => {
        const onDone = () => 42;
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDone, config);
        expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({});
        done();
      }, TIMEOUT);
    });
  });

  describe('getBidRequestData', function () {
    it('writes receptivity to the configured bidder OpenRTB 2 fragments', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      const expectedData = {
        name: 'contxtful',
        ext: {
          rx: RX_FROM_API,
          params: {
            ev: config.params?.version,
            ci: config.params?.customer,
          },
        },
      };

      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

        const data = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0];

        expect(data.name).to.deep.equal(expectedData.name);
        expect(data.ext.rx).to.deep.equal(expectedData.ext.rx);
        expect(data.ext.params).to.deep.equal(expectedData.ext.params);
        done();
      }, TIMEOUT);
    });
  });

  describe('getBidRequestData', function () {
    it('uses non-expired info from session storage and adds receptivity to the reqBidsConfigObj', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);

      // Simulate that there was a write to sessionStorage in the past.
      const bidder = config.params.bidders[0];

      storage.setDataInSessionStorage(`${config.params.customer}_${bidder}`, JSON.stringify({ exp: new Date().getTime() + 1000, rx: RX_FROM_SESSION_STORAGE }));

      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      contxtfulSubmodule.init(config);

      // Since the RX_CONNECTOR_IS_READY_EVENT event was not dispatched, the RX engine is not loaded.
      contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, () => { }, config);

      setTimeout(() => {
        const ortb2BidderFragment = reqBidsConfigObj.ortb2Fragments.bidder[bidder];
        const userData = ortb2BidderFragment.user.data;
        const contxtfulData = userData[0];

        expect(contxtfulData.name).to.be.equal('contxtful');
        expect(contxtfulData.ext.rx).to.deep.equal(RX_FROM_SESSION_STORAGE);
        expect(contxtfulData.ext.params).to.deep.equal({
          ev: config.params.version,
          ci: config.params.customer,
        });

        done();
      }, TIMEOUT);
    });
  });

  describe('getBidRequestData', function () {
    it('uses the RX API', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      setTimeout(() => {
        expect(RX_CONNECTOR_MOCK.fetchConfig.callCount).at.least(1);
        expect(RX_CONNECTOR_MOCK.rxApiBuilder.callCount).at.least(1);
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);
        expect(onDoneSpy.callCount).to.equal(1);
        expect(RX_API_MOCK.receptivityBatched.callCount).to.equal(1);
        done();
      }, TIMEOUT);
    });
  });

  describe('getBidRequestData', function () {
    it('adds receptivity to the reqBidsConfigObj', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      const expectedData = {
        name: 'contxtful',
        ext: {
          rx: RX_FROM_API,
          sm: SM,
          params: {
            ev: config.params?.version,
            ci: config.params?.customer,
          },
        },
      };

      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

        const data = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0];

        expect(data.name).to.deep.equal(expectedData.name);
        expect(data.ext.rx).to.deep.equal(expectedData.ext.rx);
        expect(data.ext.sm).to.deep.equal(expectedData.ext.sm);
        expect(data.ext.params).to.deep.equal(expectedData.ext.params);
        done();
      }, TIMEOUT);
    });

    it('does not change the sm', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      const firstReqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      const secondReqBidsConfigObj = deepClone(firstReqBidsConfigObj);

      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(firstReqBidsConfigObj, onDoneSpy, config);
        contxtfulSubmodule.getBidRequestData(secondReqBidsConfigObj, onDoneSpy, config);

        const firstData = firstReqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0];
        const secondData = secondReqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0];

        expect(firstData.ext.sm).to.equal(secondData.ext.sm);

        done();
      }, TIMEOUT);
    });

    describe('before rxApi is loaded', function () {
      const moveEventTheories = [
        [
          new PointerEvent('pointermove', { clientX: 1, clientY: 2 }),
          { x: 1, y: 2 },
          'pointer move',
        ]
      ];

      moveEventTheories.forEach(([event, expected, _description]) => {
        it('adds move event', function (done) {
          const config = buildInitConfig(VERSION, CUSTOMER);
          contxtfulSubmodule.init(config);

          window.dispatchEvent(event);

          const reqBidsConfigObj = {
            ortb2Fragments: {
              global: {},
              bidder: {},
            },
          };

          setTimeout(() => {
            const onDoneSpy = sinon.spy();
            contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

            const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;

            const events = JSON.parse(atob(ext.events));

            expect(events.ui.position.x).to.be.deep.equal(expected.x);
            expect(events.ui.position.y).to.be.deep.equal(expected.y);
            expect(Sinon.match.number.test(events.ui.position.timestampMs)).to.be.true;
            done();
          }, TIMEOUT);
        });
      });

      it('adds screen event', function (done) {
        const config = buildInitConfig(VERSION, CUSTOMER);
        contxtfulSubmodule.init(config);

        // Cannot change the window size from JS
        // So we take the current size as expectation
        const { innerHeight: height, innerWidth: width } = getWinDimensions()

        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
        };

        setTimeout(() => {
          const onDoneSpy = sinon.spy();
          contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

          const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;

          const events = JSON.parse(atob(ext.events));

          expect(events.ui.screen.topLeft).to.be.deep.equal({ x: 0, y: 0 }, 'screen top left');
          expect(events.ui.screen.width).to.be.deep.equal(width, 'screen width');
          expect(events.ui.screen.height).to.be.deep.equal(height, 'screen height');
          expect(Sinon.match.number.test(events.ui.screen.timestampMs), 'screen timestamp').to.be.true;
          done();
        }, TIMEOUT);
      });
    });
  });

  describe('when there is no ad units', function () {
    it('adds empty ad unit positions', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };
      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

        const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
        const pos = JSON.parse(atob(ext.pos));

        expect(Object.keys(pos).length).to.be.equal(0);
        done();
      }, TIMEOUT);
    });
  });

  describe('when there are ad units', function () {
    it('return empty objects for ad units that we can\'t get position of', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      const reqBidsConfigObj = {
        adUnits: [
          { code: 'code1' },
          { code: 'code2' }
        ],
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };
      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

        const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
        const pos = JSON.parse(atob(ext.pos));

        expect(Object.keys(pos).length).to.be.equal(0);
        done();
      }, TIMEOUT);
    });

    it('returns the IAB position if the ad unit div id cannot be bound but property pos can be found in the ad unit', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      const reqBidsConfigObj = {
        adUnits: [
          { code: 'code1', mediaTypes: { banner: { pos: 4 } } },
          { code: 'code2', mediaTypes: { banner: { pos: 5 } } },
          { code: 'code3', mediaTypes: { banner: { pos: 0 } } },
        ],
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };
      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

        const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
        const pos = JSON.parse(atob(ext.pos));

        expect(Object.keys(pos).length).to.be.equal(3);
        expect(pos['code1'].p).to.be.equal(4);
        expect(pos['code2'].p).to.be.equal(5);
        expect(pos['code3'].p).to.be.equal(0);
        done();
      }, TIMEOUT);
    })

    function getFakeRequestBidConfigObj() {
      return {
        adUnits: [
          { code: 'code1', ortb2Imp: { ext: { data: { divId: 'divId1' } } } },
          { code: 'code2', ortb2Imp: { ext: { data: { divId: 'divId2' } } } }
        ],
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };
    }

    function InitDivStubPositions(config, withIframe, isVisible, forceGetElementById = true) {
      const fakeElem = fakeGetElementById(100, 100, 30, 30);
      if (isVisible) {
        fakeElem.checkVisibility = function () { return true };
        sandbox.stub(window.top, 'getComputedStyle').returns({ display: 'block' });
      } else {
        fakeElem.checkVisibility = function () { return false };
        sandbox.stub(window.top, 'getComputedStyle').returns({ display: 'none' });
      }

      if (withIframe) {
        const ws = {
          frameElement: {
            getBoundingClientRect: () => fakeElem.getBoundingClientRect()
          },
          document: {
            getElementById: (id) => fakeElem,

          }
        }
        sandbox.stub(utils, 'getWindowSelf').returns(window.top);
        sandbox.stub(utils, 'inIframe').returns(true);
        sandbox.stub(fakeElem, 'checkVisibility').returns(isVisible);
      } else {
        sandbox.stub(utils, 'inIframe').returns(false);
        sandbox.stub(fakeElem, 'checkVisibility').returns(isVisible);
      }
      if (forceGetElementById) {
        sandbox.stub(window.top.document, 'getElementById').returns(fakeElem);
      }
      contxtfulSubmodule.init(config);
    }

    describe('when the div id cannot be found, we should try with GPT method', function () {
      it('returns an empty list if gpt not find the div', function (done) {
        const config = buildInitConfig(VERSION, CUSTOMER);
        const reqBidsConfigObj = {
          adUnits: [
            { code: 'code1' },
            { code: 'code2' }
          ],
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
        };
        InitDivStubPositions(config, false, true, false);
        const fakeElem = fakeGetElementById(100, 100, 30, 30);
        sandbox.stub(window.top.document, 'getElementById').returns(function (id) {
          if (id === 'code1' || id === 'code2') {
            return undefined;
          } else {
            return fakeElem;
          }
        });
        setTimeout(() => {
          const onDoneSpy = sinon.spy();
          contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

          const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
          const pos = JSON.parse(atob(ext.pos));

          expect(Object.keys(pos).length).to.be.equal(0);
          done();
        }, TIMEOUT);
      })

      it('returns object visibility and position if gpt not found but the div id is the ad unit code', function (done) {
        const config = buildInitConfig(VERSION, CUSTOMER);
        const reqBidsConfigObj = {
          adUnits: [
            { code: 'code1' },
            { code: 'code2' }
          ],
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
        };
        InitDivStubPositions(config, false, true);
        setTimeout(() => {
          const onDoneSpy = sinon.spy();
          contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

          const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
          const pos = JSON.parse(atob(ext.pos));

          expect(Object.keys(pos).length).to.be.equal(2);
          expect(pos['code1'].p.x).to.be.equal(30);
          expect(pos['code1'].p.y).to.be.equal(30);
          expect(pos['code1'].v).to.be.equal(true);
          done();
        }, TIMEOUT);
      });

      it('returns object visibility and position if gpt finds the div', function (done) {
        const config = buildInitConfig(VERSION, CUSTOMER);
        const reqBidsConfigObj = {
          adUnits: [
            { code: 'code1' },
            { code: 'code2' }
          ],
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
        };
        InitDivStubPositions(config, false, true);
        sandbox.stub(gptUtils, 'getGptSlotInfoForAdUnitCode').returns({ divId: 'div1' });

        setTimeout(() => {
          const onDoneSpy = sinon.spy();
          contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

          const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
          const pos = JSON.parse(atob(ext.pos));

          expect(Object.keys(pos).length).to.be.equal(2);
          expect(pos['code1'].p.x).to.be.equal(30);
          expect(pos['code1'].p.y).to.be.equal(30);
          expect(pos['code1'].v).to.be.equal(true);
          done();
        }, TIMEOUT);
      });
    });

    describe('when we get object visibility and position for ad units that we can get div id', function () {
      const config = buildInitConfig(VERSION, CUSTOMER);

      describe('when we are not in an iframe', function () {
        it('return object visibility true if element is visible', function (done) {
          const reqBidsConfigObj = getFakeRequestBidConfigObj();
          InitDivStubPositions(config, false, true);
          setTimeout(() => {
            const onDoneSpy = sinon.spy();
            contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

            const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
            const pos = JSON.parse(atob(ext.pos));

            expect(Object.keys(pos).length).to.be.equal(2);
            expect(pos['code1'].p.x).to.be.equal(30);
            expect(pos['code1'].p.y).to.be.equal(30);
            expect(pos['code1'].v).to.be.equal(true);
            done();
          }, TIMEOUT);
        });

        it('return object visibility false if element is not visible', function (done) {
          const reqBidsConfigObj = getFakeRequestBidConfigObj();
          InitDivStubPositions(config, false, false);
          setTimeout(() => {
            const onDoneSpy = sinon.spy();
            contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

            const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
            const pos = JSON.parse(atob(ext.pos));

            expect(Object.keys(pos).length).to.be.equal(2);
            expect(pos['code1'].v).to.be.equal(false);
            expect(pos['code2'].v).to.be.equal(false);
            done();
          }, TIMEOUT);
        });
      });

      describe('when we are in an iframe', function () {
        it('return object visibility true if element is visible', function (done) {
          const reqBidsConfigObj = getFakeRequestBidConfigObj();
          InitDivStubPositions(config, true, true)
          setTimeout(() => {
            const onDoneSpy = sinon.spy();
            contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

            const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
            const pos = JSON.parse(atob(ext.pos));

            expect(Object.keys(pos).length).to.be.equal(2);
            expect(pos['code1'].p.x).to.be.equal(30);
            expect(pos['code1'].p.y).to.be.equal(30);
            expect(pos['code1'].v).to.be.equal(true);
            done();
          }, TIMEOUT);
        });

        it('return object visibility false if element is not visible', function (done) {
          const reqBidsConfigObj = getFakeRequestBidConfigObj();
          InitDivStubPositions(config, true, false);
          setTimeout(() => {
            const onDoneSpy = sinon.spy();
            contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

            const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;
            const pos = JSON.parse(atob(ext.pos));

            expect(Object.keys(pos).length).to.be.equal(2);
            expect(pos['code1'].v).to.be.equal(false);
            done();
          }, TIMEOUT);
        });
      });
    });
  });

  describe('after rxApi is loaded', function () {
    it('should add event', function (done) {
      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);

        const ext = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]].user.data[0].ext;

        const events = ext.events;

        expect(events).to.be.not.undefined;
        done();
      }, TIMEOUT);
    });
  })

  describe('when rxConnector contains getOrtb2Fragment function', () => {
    it('should just take whatever it contains and merge to the fragment', function (done) {
      RX_CONNECTOR_MOCK.rxApiBuilder.resetHistory();
      RX_CONNECTOR_MOCK.rxApiBuilder.callsFake((_config) => new Promise((resolve, reject) => resolve(RX_API_MOCK_WITH_BUNDLE)));

      const config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      window.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);
        const global = reqBidsConfigObj.ortb2Fragments.global;
        const bidder = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]];

        const globalExpected = { user: { site: { id: 'globalsiteId' } } };
        const bidderExpected = { user: { data: [{ name: MODULE_NAME, value: RX_FROM_API }] } };
        expect(RX_API_MOCK_WITH_BUNDLE.getOrtb2Fragment.callCount).to.equal(1);
        expect(global).to.deep.equal(globalExpected);
        expect(bidder).to.deep.equal(bidderExpected);
        done();
      }, TIMEOUT);
    })
  })
});
