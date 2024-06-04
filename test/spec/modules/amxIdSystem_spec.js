import { amxIdSubmodule, storage } from 'modules/amxIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

const TEST_ID = '51b561e3-0d82-4aea-8487-093fffca4a3a';
const ERROR_CODES = [404, 501, 500, 403];

const config = {
  params: {
    tagId: Math.floor(Math.random() * 9e9).toString(36),
  },
  storage: {
    type: 'html5',
  },
};
describe('AMX ID', () => {
  describe('amxid submodule', () => {
    it('should expose a "name" property containing amxId', () => {
      expect(amxIdSubmodule.name).to.equal('amxId');
    });

    it('should expose a "gvlid" property containing the GVL ID 737', () => {
      expect(amxIdSubmodule.gvlid).to.equal(737);
    });
  });

  describe('decode', () => {
    it('should respond with an object with "amxId" key containing the value', () => {
      expect(amxIdSubmodule.decode(TEST_ID)).to.deep.equal({
        amxId: TEST_ID
      });
    });

    it('should respond with undefined if the value is not a string', () => {
      [1, null, undefined, NaN, [], {}].forEach((value) => {
        expect(amxIdSubmodule.decode(value)).to.equal(undefined);
      });
    });
  });

  describe('validateConfig', () => {
    let logErrorSpy;

    beforeEach(() => {
      logErrorSpy = sinon.spy(utils, 'logError');
    });
    afterEach(() => {
      logErrorSpy.restore();
    });

    it('should allow configuration with no storage', () => {
      expect(
        amxIdSubmodule.getId(
          {
            ...config,
            storage: undefined
          },
          null,
          null
        )
      ).to.not.equal(undefined);
    });

    it('should return undefined if expires > 30', () => {
      const expires = Math.floor(Math.random() * 90) + 30.01;
      expect(
        amxIdSubmodule.getId(
          {
            ...config,
            storage: {
              type: 'html5',
              expires,
            },
          },
          null,
          null
        )
      ).to.equal(undefined);

      expect(logErrorSpy.calledOnce).to.be.true;
      expect(logErrorSpy.lastCall.lastArg).to.contain(expires);
    });
  });

  describe('getId', () => {
    const spy = sinon.spy();

    beforeEach(() => {
      spy.resetHistory();
    });

    it('should call the sync endpoint and accept a valid response', () => {
      storage.setDataInLocalStorage('__amuidpb', TEST_ID);

      const { callback } = amxIdSubmodule.getId(config, null, null);
      callback(spy);

      const [request] = server.requests;
      expect(request.withCredentials).to.be.true
      expect(request.requestHeaders['Content-Type']).to.match(/text\/plain/)

      const { search } = utils.parseUrl(request.url);
      expect(search.av).to.equal(amxIdSubmodule.version);
      expect(search.am).to.equal(TEST_ID);
      expect(request.method).to.equal('GET');

      request.respond(
        200,
        {},
        JSON.stringify({
          id: TEST_ID,
          v: '1.0a',
        })
      );

      expect(spy.calledOnce).to.be.true;
      expect(spy.lastCall.lastArg).to.equal(TEST_ID);
    });

    it('should return undefined if the server has an error status code', () => {
      const { callback } = amxIdSubmodule.getId(config, null, null);
      callback(spy);

      const [request] = server.requests;
      const responseCode =
        ERROR_CODES[Math.floor(Math.random() * ERROR_CODES.length)];
      request.respond(responseCode, {}, '');

      expect(spy.calledOnce).to.be.true;
      expect(spy.lastCall.lastArg).to.equal(undefined);
    });

    it('should return undefined if the response has invalid keys', () => {
      const { callback } = amxIdSubmodule.getId(config, null, null);
      callback(spy);

      const [request] = server.requests;
      request.respond(
        200,
        {},
        JSON.stringify({
          test: TEST_ID,
        })
      );

      expect(spy.calledOnce).to.be.true;
      expect(spy.lastCall.lastArg).to.equal(undefined);
    });

    it('should returned undefined if the server JSON is invalid', () => {
      const { callback } = amxIdSubmodule.getId(config, null, null);
      callback(spy);

      const [request] = server.requests;
      request.respond(200, {}, '{,,}');

      expect(spy.calledOnce).to.be.true;
      expect(spy.lastCall.lastArg).to.equal(undefined);
    });

    it('should use the intermediate value for the sync server', () => {
      const { callback } = amxIdSubmodule.getId(config, null, null);
      callback(spy);

      const [request] = server.requests;
      const intermediateValue = 'https://example-publisher.com/api/sync';

      request.respond(
        200,
        {},
        JSON.stringify({
          u: intermediateValue,
        })
      );

      const [, secondRequest] = server.requests;
      expect(secondRequest.url).to.match(new RegExp(`^${intermediateValue}\?`));
      secondRequest.respond(
        200,
        {},
        JSON.stringify({
          id: TEST_ID,
        })
      );

      expect(spy.calledOnce).to.be.true;
      expect(spy.lastCall.lastArg).to.equal(TEST_ID);
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(amxIdSubmodule);
    });
    it('amxId', () => {
      const id = 'c4bcadb0-124f-4468-a91a-d3d44cf311c5'
      const userId = {
        amxId: id
      };

      const [eid] = createEidsArray(userId);
      expect(eid).to.deep.equal({
        source: 'amxdt.net',
        uids: [{
          atype: 1,
          id,
        }]
      });
    });
  })
})
