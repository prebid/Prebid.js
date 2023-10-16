import { zeusPrimeSubmodule } from 'modules/zeusPrimeRtdProvider';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils';

async function waitForStatus(statusVar) {
  const MAX_COUNT = 20;
  let count = 0;
  while (
    count <= MAX_COUNT &&
    window.zeusPrime.status &&
    window.zeusPrime.status[statusVar] !== true
  ) {
    count += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (count === MAX_COUNT) {
    throw new Error('Timeout waiting for zeusPrimeRtdProvider to complete');
  }
}

/**
 * Execute all the commands in the googletag.cmd queue.
 */
function executeGoogletagTargeting() {
  window.googletag.cmd.forEach((cmd) => cmd());
}

describe('Zeus Prime RTD submodule', () => {
  let logErrorSpy;
  let logMessageSpy;
  let setTargetingStub;
  let originalGtag;

  beforeEach(() => {
    logErrorSpy = sinon.spy(utils, 'logError');
    logMessageSpy = sinon.spy(utils, 'logMessage');
    setTargetingStub = sinon.stub();
    window.zeusPrime = { cmd: [] };
    originalGtag = window.googletag;
    window.googletag = {
      cmd: [],
      pubads: () => ({
        setTargeting: setTargetingStub,
      }),
    };

    // Mock subtle since this doesnt exists in some test environments due to security in newer browsers.
    if (typeof window.crypto.subtle === 'undefined') {
      Object.defineProperty(crypto, 'subtle', { value: { digest: () => 'mockHash' } })
    }
  });

  afterEach(() => {
    logErrorSpy.restore();
    logMessageSpy.restore();
    window.googletag = originalGtag;
  });

  it('should init and set key-value for zeus_<gamId>', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/',
      },
    });

    // wait for the script to finish
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(window.googletag.cmd).to.have.length(1);
    sinon.assert.callCount(setTargetingStub, 1);
    sinon.assert.calledWith(setTargetingStub, 'zeus_1234', 'www.example.com');
  });

  it('should init and set key-value for zeus_<gamId> from command queue', async () => {
    window.zeusPrime.cmd.push((prime) => (prime.gamId = '9876'));
    zeusPrimeSubmodule.init({
      params: {
        hostname: 'www.example.com',
        pathname: '/',
      },
    });

    // wait for the script to finish
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(window.googletag.cmd).to.have.length(1);
    sinon.assert.callCount(setTargetingStub, 1);
    sinon.assert.calledWith(setTargetingStub, 'zeus_9876', 'www.example.com');
  });

  it('should init with values from location and set key-value for zeus_<gamId>', async () => {
    zeusPrimeSubmodule.init({ params: { gamId: '1234' } });

    // wait for the script to finish
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(window.googletag.cmd).to.have.length(1);
    sinon.assert.callCount(setTargetingStub, 1);
    sinon.assert.calledWith(setTargetingStub, 'zeus_1234', 'localhost');
    expect(window.zeusPrime.pathname).to.equal('/context.html');
  });

  it('should emit error when gamId is not set', async () => {
    zeusPrimeSubmodule.init({});

    // wait for the script to finish
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(window.googletag.cmd).to.have.length(0);
    sinon.assert.callCount(setTargetingStub, 0);
    sinon.assert.calledWith(
      logErrorSpy,
      'zeusPrimeRtdProvider: ',
      'Failed to run.',
      'window.zeusPrime.gamId must be a string. Received: undefined'
    );
  });

  it('should not make a call to the server when url is a homepage', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/',
      },
    });

    // wait for the script to finish
    await waitForStatus('scriptComplete');

    expect(server.requests).to.have.length(0);
  });

  it('should make a call to the server and set key-vlaue when url is an article page and returns topics', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('insightsReqReceived');

    // Response
    server.requests[0].respond(
      200,
      { 'Content-Type': 'application/json' },
      '{"topics": ["bs0"]}'
    );

    // Wait for the script to process the response
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(server.requestCount).to.be.equal(1);
    expect(window.googletag.cmd).to.have.length(2);
    sinon.assert.calledTwice(setTargetingStub);
    sinon.assert.calledWith(
      setTargetingStub.firstCall,
      'zeus_1234',
      'www.example.com'
    );
    sinon.assert.calledWith(setTargetingStub.secondCall, 'zeus_insights', [
      'bs0',
    ]);
    sinon.assert.notCalled(logErrorSpy);
  });

  it('should not set insights keyvalue when server returns 204', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('insightsReqReceived');

    // Response
    server.requests[0].respond(204, { 'Content-Type': 'application/json' });

    // Wait for the script to process the response
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(server.requestCount).to.be.equal(1);
    expect(window.googletag.cmd).to.have.length(1);
    sinon.assert.calledOnce(setTargetingStub);
    sinon.assert.calledWith(
      setTargetingStub.firstCall,
      'zeus_1234',
      'www.example.com'
    );
    sinon.assert.notCalled(logErrorSpy);
  });

  it('should not set insights keyvalue when server returns empty topics array', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('insightsReqReceived');

    // Respond
    server.requests[0].respond(
      200,
      { 'Content-Type': 'application/json' },
      '{ "topics": [] }'
    );

    // Wait for the script to process the response
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(server.requestCount).to.be.equal(1);
    expect(window.googletag.cmd).to.have.length(1);
    sinon.assert.calledOnce(setTargetingStub);
    sinon.assert.calledWith(
      setTargetingStub.firstCall,
      'zeus_1234',
      'www.example.com'
    );
    sinon.assert.notCalled(logErrorSpy);
  });

  it('should not set insights keyvalue and emit error when server returns error status (400)', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('insightsReqReceived');

    // Response
    server.requests[0].respond(
      404,
      { 'Content-Type': 'application/json' },
      '{"message": "Not found"}'
    );

    // Wait for the script to process the response
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(server.requestCount).to.be.equal(1);
    expect(window.googletag.cmd).to.have.length(1);
    sinon.assert.calledOnce(setTargetingStub);
    sinon.assert.calledWith(
      setTargetingStub.firstCall,
      'zeus_1234',
      'www.example.com'
    );
    sinon.assert.calledWith(
      logErrorSpy,
      'zeusPrimeRtdProvider: ',
      'Topics request returned error: 404'
    );
  });

  it('should not set insights keyvalue and emit error when response is not received (network request)', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('insightsReqReceived');

    // Response
    server.requests[0].error();

    // Wait for the script to process the response
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(server.requestCount).to.be.equal(1);
    expect(window.googletag.cmd).to.have.length(1);
    sinon.assert.calledOnce(setTargetingStub);
    sinon.assert.calledWith(
      setTargetingStub.firstCall,
      'zeus_1234',
      'www.example.com'
    );
    sinon.assert.calledWith(
      logErrorSpy,
      'zeusPrimeRtdProvider: ',
      'failed to request topics'
    );
  });

  it('fails gracefully when crypto fails', async () => {
    const digestStub = sinon.stub(window.crypto.subtle, 'digest');
    digestStub.throwsException('Failed to generate digest.');

    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('scriptComplete');

    sinon.assert.calledWith(
      logErrorSpy,
      'zeusPrimeRtdProvider: ',
      'Failed to load hash'
    );

    digestStub.restore();
  });

  it('script should add zeus_prime key and not send request when disabled is set', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        disabled: true,
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('scriptComplete');

    // execute any googletag commands added to the queue during execution
    executeGoogletagTargeting();

    expect(server.requestCount).to.be.equal(0);
    expect(window.googletag.cmd).to.have.length(1);
    sinon.assert.calledWith(setTargetingStub, 'zeus_prime', 'false');
  });

  it('debug true enables debug logging', async () => {
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        debug: true,
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('scriptComplete');

    sinon.assert.called(logMessageSpy);
    sinon.assert.notCalled(logErrorSpy);
  });

  it('debug false disables debug logging', async () => {
    window.zeusPrime.disabled = false;
    zeusPrimeSubmodule.init({
      params: {
        gamId: '1234',
        hostname: 'www.example.com',
        pathname: '/article/some-article',
      },
    });

    // Wait for request to be sent
    await waitForStatus('scriptComplete');

    sinon.assert.notCalled(logMessageSpy);
    sinon.assert.notCalled(logErrorSpy);
  });
});
