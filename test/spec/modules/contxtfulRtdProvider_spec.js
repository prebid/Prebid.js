import { contxtfulSubmodule, extractParameters } from '../../../modules/contxtfulRtdProvider.js';
import { expect } from 'chai';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import * as events from '../../../src/events';

const VERSION = 'v1';
const CUSTOMER = 'CUSTOMER';
const CONTXTFUL_CONNECTOR_ENDPOINT = `https://api.receptivity.io/${VERSION}/prebid/${CUSTOMER}/connector/rxConnector.js`;

const RX_FROM_SESSION_STORAGE = { ReceptivityState: 'Receptive', test_info: 'rx_from_session_storage' };
const RX_FROM_API = { ReceptivityState: 'Receptive', test_info: 'rx_from_engine' };

const RX_API_MOCK = { receptivity: sinon.stub(), };
const RX_CONNECTOR_MOCK = {
  fetchConfig: sinon.stub(),
  rxApiBuilder: sinon.stub(),
};

const TIMEOUT = 10;
const RX_CONNECTOR_IS_READY_EVENT = new CustomEvent('rxConnectorIsReady', { detail: RX_CONNECTOR_MOCK });

function writeToStorage(requester, timeDiff) {
  let rx = RX_FROM_SESSION_STORAGE;
  let exp = new Date().getTime() + timeDiff;
  let item = { rx, exp, };
  sessionStorage.setItem(requester, JSON.stringify(item),);
}

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

describe('contxtfulRtdProvider', function () {
  let sandbox = sinon.sandbox.create();
  let loadExternalScriptTag;
  let eventsEmitSpy;

  beforeEach(() => {
    loadExternalScriptTag = document.createElement('script');
    loadExternalScriptStub.callsFake((_url, _moduleName) => loadExternalScriptTag);

    RX_API_MOCK.receptivity.reset();
    RX_API_MOCK.receptivity.callsFake((tagId) => RX_FROM_API);

    RX_CONNECTOR_MOCK.fetchConfig.reset();
    RX_CONNECTOR_MOCK.fetchConfig.callsFake((tagId) => new Promise((resolve, reject) => resolve({ tag_id: tagId })));

    RX_CONNECTOR_MOCK.rxApiBuilder.reset();
    RX_CONNECTOR_MOCK.rxApiBuilder.callsFake((_config) => new Promise((resolve, reject) => resolve(RX_API_MOCK)));

    eventsEmitSpy = sandbox.spy(events, ['emit']);

    let tagId = CUSTOMER;
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
    it('gets the RX API returned by an external script', (done) => {
      let config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      setTimeout(() => {
        contxtfulSubmodule.getTargetingData(['ad-slot'], config);
        expect(RX_CONNECTOR_MOCK.fetchConfig.callCount, 'fetchConfig').to.be.equal(1);
        expect(RX_CONNECTOR_MOCK.rxApiBuilder.callCount, 'rxApiBuilder').to.be.equal(1);
        done();
      }, TIMEOUT);
    });
  });

  describe('init', function () {
    it('uses the RX API to get receptivity', (done) => {
      let config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      setTimeout(() => {
        contxtfulSubmodule.getTargetingData(['ad-slot'], config);
        expect(RX_API_MOCK.receptivity.callCount, 'receptivity 42').to.be.equal(1);
        expect(RX_API_MOCK.receptivity.firstCall.returnValue, 'receptivity').to.be.equal(RX_FROM_API);
        done();
      }, TIMEOUT);
    });
  });

  describe('init', function () {
    it('detect that initial receptivity is not dispatched and it does not initialize receptivity value', (done) => {
      let config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);

      setTimeout(() => {
        let targetingData = contxtfulSubmodule.getTargetingData(['ad-slot'], config);
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
        let config = buildInitConfig(VERSION, CUSTOMER);
        contxtfulSubmodule.init(config);
        loadExternalScriptTag.dispatchEvent(initialReceptivityEvent);

        setTimeout(() => {
          let targetingData = contxtfulSubmodule.getTargetingData(['ad-slot'], config);
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
        let config = buildInitConfig(VERSION, CUSTOMER);
        contxtfulSubmodule.init(config);
        loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

        setTimeout(() => {
          let targetingData = contxtfulSubmodule.getTargetingData(adUnits, config);
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
        let config = buildInitConfig(VERSION, CUSTOMER);
        config.params.adServerTargeting = false;
        contxtfulSubmodule.init(config);
        loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

        setTimeout(() => {
          let _ = contxtfulSubmodule.getTargetingData(adUnits, config);
          expect(RX_API_MOCK.receptivity.callCount).to.be.equal(0);
          done();
        }, TIMEOUT);
      });

      it('honours adServerTargeting and it does not add receptivity to the ad units', function (done) {
        let config = buildInitConfig(VERSION, CUSTOMER);
        config.params.adServerTargeting = false;
        contxtfulSubmodule.init(config);
        loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

        setTimeout(() => {
          let targetingData = contxtfulSubmodule.getTargetingData(adUnits, config);
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
        let config = buildInitConfig(VERSION, CUSTOMER);
        // Simulate that there was a write to sessionStorage in the past.
        writeToStorage(config.params.customer, +100);
        contxtfulSubmodule.init(config);

        setTimeout(() => {
          expect(contxtfulSubmodule.getTargetingData(adUnits, config)).to.deep.equal(
            expected
          );
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

    theories.forEach(([adUnits, expected, _description]) => {
      it('ignores expired info from session storage and does not forward the info to ad units', function (done) {
        let config = buildInitConfig(VERSION, CUSTOMER);
        // Simulate that there was a write to sessionStorage in the past.
        writeToStorage(config.params.customer, -100);
        contxtfulSubmodule.init(config);
        expect(contxtfulSubmodule.getTargetingData(adUnits, config)).to.deep.equal(
          expected
        );
        done();
      });
    });
  });

  describe('getBidRequestData', function () {
    it('calls once the onDone callback', function (done) {
      contxtfulSubmodule.init(buildInitConfig(VERSION, CUSTOMER));
      loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      let reqBidsConfigObj = {
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
      let config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      let reqBidsConfigObj = {
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
      let config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      let reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      let expectedOrtb2 = {
        user: {
          data: [
            {
              name: 'contxtful',
              ext: {
                rx: RX_FROM_API,
                params: {
                  ev: config.params?.version,
                  ci: config.params?.customer,
                },
              },
            },
          ],
        },
      };

      setTimeout(() => {
        const onDone = () => undefined;
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDone, config);
        let actualOrtb2 = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]];
        expect(actualOrtb2).to.deep.equal(expectedOrtb2);
        done();
      }, TIMEOUT);
    });
  });

  describe('getBidRequestData', function () {
    it('uses non-expired info from session storage and adds receptivity to the reqBidsConfigObj', function (done) {
      let config = buildInitConfig(VERSION, CUSTOMER);
      // Simulate that there was a write to sessionStorage in the past.
      writeToStorage(config.params.bidders[0], +100);

      contxtfulSubmodule.init(config);

      let reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      let expectedOrtb2 = {
        user: {
          data: [
            {
              name: 'contxtful',
              ext: {
                rx: RX_FROM_SESSION_STORAGE,
                params: {
                  ev: config.params?.version,
                  ci: config.params?.customer,
                },
              },
            },
          ],
        },
      };

      // Since the RX_CONNECTOR_IS_READY_EVENT event was not dispatched, the RX engine is not loaded.
      setTimeout(() => {
        const noOp = () => undefined;
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, noOp, buildInitConfig(VERSION, CUSTOMER));
        let actualOrtb2 = reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]];
        expect(actualOrtb2).to.deep.equal(expectedOrtb2);
        done();
      }, TIMEOUT);
    });
  });

  describe('getBidRequestData', function () {
    it('uses the RX API', function (done) {
      let config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      let reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      setTimeout(() => {
        expect(RX_CONNECTOR_MOCK.fetchConfig.callCount).to.equal(1);
        expect(RX_CONNECTOR_MOCK.rxApiBuilder.callCount).to.equal(1);
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);
        expect(onDoneSpy.callCount).to.equal(1);
        expect(RX_API_MOCK.receptivity.callCount).to.equal(1);
        done();
      }, TIMEOUT);
    });
  });

  describe('getBidRequestData', function () {
    it('adds receptivity to the reqBidsConfigObj', function (done) {
      let config = buildInitConfig(VERSION, CUSTOMER);
      contxtfulSubmodule.init(config);
      loadExternalScriptTag.dispatchEvent(RX_CONNECTOR_IS_READY_EVENT);

      let reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {},
        },
      };

      let ortb2 = {
        user: {
          data: [
            {
              name: 'contxtful',
              ext: {
                rx: RX_FROM_API,
                params: {
                  ev: config.params?.version,
                  ci: config.params?.customer,
                },
              },
            },
          ],
        },
      };

      setTimeout(() => {
        const onDoneSpy = sinon.spy();
        contxtfulSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, config);
        expect(reqBidsConfigObj.ortb2Fragments.bidder[config.params.bidders[0]]).to.deep.equal(ortb2);
        done();
      }, TIMEOUT);
    });
  });
});
