import { amxIdSubmodule } from 'modules/amxIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';

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

  it('should return undefined if config.storage is not present', () => {
    expect(
      amxIdSubmodule.getId(
        {
          ...config,
          storage: null,
        },
        null,
        null
      )
    ).to.equal(undefined);

    expect(logErrorSpy.calledOnce).to.be.true;
    expect(logErrorSpy.lastCall.lastArg).to.contain('storage is required');
  });

  it('should return undefined if config.storage.type !== "html5"', () => {
    expect(
      amxIdSubmodule.getId(
        {
          ...config,
          storage: {
            type: 'cookie',
          },
        },
        null,
        null
      )
    ).to.equal(undefined);

    expect(logErrorSpy.calledOnce).to.be.true;
    expect(logErrorSpy.lastCall.lastArg).to.contain('cookie');
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
    const { callback } = amxIdSubmodule.getId(config, null, null);
    callback(spy);

    const [request] = server.requests;
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
    expect(secondRequest.url).to.be.equal(intermediateValue);
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
