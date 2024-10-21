import { contxtfulSubmodule } from '../../../modules/contxtfulRtdProvider.js';
import { expect } from 'chai';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

import * as events from '../../../src/events';

const _ = null;
const VERSION = 'v1';
const CUSTOMER = 'CUSTOMER';
const CONTXTFUL_CONNECTOR_ENDPOINT = `https://api.receptivity.io/${VERSION}/prebid/${CUSTOMER}/connector/p.js`;
const INITIAL_RECEPTIVITY = { ReceptivityState: 'INITIAL_RECEPTIVITY' };
const INITIAL_RECEPTIVITY_EVENT = new CustomEvent('initialReceptivity', { detail: INITIAL_RECEPTIVITY });

const CONTXTFUL_API = { GetReceptivity: sinon.stub() }
const RX_ENGINE_IS_READY_EVENT = new CustomEvent('rxEngineIsReady', {detail: CONTXTFUL_API});

function buildInitConfig(version, customer) {
  return {
    name: 'contxtful',
    params: {
      version,
      customer,
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

    CONTXTFUL_API.GetReceptivity.reset();

    eventsEmitSpy = sandbox.spy(events, ['emit']);
  });

  afterEach(function () {
    delete window.Contxtful;
    sandbox.restore();
  });

  describe('extractParameters with invalid configuration', () => {
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
      it('throws the expected error', () => {
        expect(() => contxtfulSubmodule.extractParameters(config)).to.throw(
          expectedErrorMessage
        );
      });
    });
  });

  describe('initialization with invalid config', function () {
    it('returns false', () => {
      expect(contxtfulSubmodule.init({})).to.be.false;
    });
  });

  describe('initialization with valid config', function () {
    it('returns true when initializing', () => {
      const config = buildInitConfig(VERSION, CUSTOMER);
      expect(contxtfulSubmodule.init(config)).to.be.true;
    });

    it('loads contxtful module script asynchronously', (done) => {
      contxtfulSubmodule.init(buildInitConfig(VERSION, CUSTOMER));

      setTimeout(() => {
        expect(loadExternalScriptStub.calledOnce).to.be.true;
        expect(loadExternalScriptStub.args[0][0]).to.equal(
          CONTXTFUL_CONNECTOR_ENDPOINT
        );
        done();
      }, 10);
    });
  });

  describe('load external script return falsy', function () {
    it('returns true when initializing', () => {
      loadExternalScriptStub.callsFake(() => {});
      const config = buildInitConfig(VERSION, CUSTOMER);
      expect(contxtfulSubmodule.init(config)).to.be.true;
    });
  });

  describe('rxEngine from external script', function () {
    it('use rxEngine api to get receptivity', () => {
      contxtfulSubmodule.init(buildInitConfig(VERSION, CUSTOMER));
      loadExternalScriptTag.dispatchEvent(RX_ENGINE_IS_READY_EVENT);

      contxtfulSubmodule.getTargetingData(['ad-slot']);

      expect(CONTXTFUL_API.GetReceptivity.calledOnce).to.be.true;
    });
  });

  describe('initial receptivity is not dispatched', function () {
    it('does not initialize receptivity value', () => {
      contxtfulSubmodule.init(buildInitConfig(VERSION, CUSTOMER));

      let targetingData = contxtfulSubmodule.getTargetingData(['ad-slot']);
      expect(targetingData).to.deep.equal({});
    });
  });

  describe('initial receptivity is invalid', function () {
    const theories = [
      [new Event('initialReceptivity'), 'event without details'],
      [new CustomEvent('initialReceptivity', { }), 'custom event without details'],
      [new CustomEvent('initialReceptivity', { detail: {} }), 'custom event with invalid details'],
      [new CustomEvent('initialReceptivity', { detail: { ReceptivityState: '' } }), 'custom event with details without ReceptivityState'],
    ];

    theories.forEach(([initialReceptivityEvent, _description]) => {
      it('does not initialize receptivity value', () => {
        contxtfulSubmodule.init(buildInitConfig(VERSION, CUSTOMER));
        loadExternalScriptTag.dispatchEvent(initialReceptivityEvent);

        let targetingData = contxtfulSubmodule.getTargetingData(['ad-slot']);
        expect(targetingData).to.deep.equal({});
      });
    })
  });

  describe('getTargetingData', function () {
    const theories = [
      [undefined, {}, 'undefined ad-slots'],
      [[], {}, 'empty ad-slots'],
      [
        ['ad-slot'],
        { 'ad-slot': { ReceptivityState: 'INITIAL_RECEPTIVITY' } },
        'single ad-slot',
      ],
      [
        ['ad-slot-1', 'ad-slot-2'],
        {
          'ad-slot-1': { ReceptivityState: 'INITIAL_RECEPTIVITY' },
          'ad-slot-2': { ReceptivityState: 'INITIAL_RECEPTIVITY' },
        },
        'many ad-slots',
      ],
    ];

    theories.forEach(([adUnits, expected, _description]) => {
      it('adds "ReceptivityState" to the adUnits', function () {
        contxtfulSubmodule.init(buildInitConfig(VERSION, CUSTOMER));
        loadExternalScriptTag.dispatchEvent(INITIAL_RECEPTIVITY_EVENT);

        expect(contxtfulSubmodule.getTargetingData(adUnits)).to.deep.equal(
          expected
        );
      });
    });
  });
});
