import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { DEFAULT_MAX_FAILURE_MS, isHostname, replaceHostname, resetFailoverState, selectFailoverDomain, selectMaxFailureMs, withAjaxFailover, withDomainFailover } from 'libraries/ttdUtils/ajaxFailover.js';

describe('ttdUtils ajaxFailover', function () {
  describe('isHostname', function () {
    ['example.com', 'bid.example.com', 'sub-domain.example.co.uk', 'localhost', 'a', 'EXAMPLE.COM', '1.2.3.4'].forEach(function (value) {
      it(`should accept ${value}`, function () {
        expect(isHostname(value)).to.be.true;
      });
    });

    ['', 'https://example.com', 'example.com/path', 'example.com:8443', 'bid example.com', '-bad.example.com', 'bad-.example.com', 'example..com', '.example.com', 'example.com.', 'user@example.com', 'exa_mple.com', 'a'.repeat(64) + '.com', undefined, null, 123, {}, []].forEach(function (value) {
      it(`should reject ${JSON.stringify(value)}`, function () {
        expect(isHostname(value)).to.be.false;
      });
    });
  });

  describe('replaceHostname', function () {
    it('should replace the host and keep the path and query', function () {
      expect(replaceHostname('https://direct.adsrvr.org/bid/bidder/supplier?a=1&b=2', 'bid.example.com')).to.equal('https://bid.example.com/bid/bidder/supplier?a=1&b=2');
    });

    it('should drop the port', function () {
      expect(replaceHostname('https://direct.adsrvr.org:8443/bid/bidder/supplier', 'bid.example.com')).to.equal('https://bid.example.com/bid/bidder/supplier');
    });

    it('should keep the scheme', function () {
      expect(replaceHostname('http://direct.adsrvr.org/x', 'bid.example.com')).to.equal('http://bid.example.com/x');
    });

    it('should return null when the url already uses the hostname', function () {
      expect(replaceHostname('https://bid.example.com/x', 'bid.example.com')).to.be.null;
    });

    ['', 'not a url', '/relative/path', undefined, null].forEach(function (url) {
      it(`should return null for an invalid url ${JSON.stringify(url)}`, function () {
        expect(replaceHostname(url, 'bid.example.com')).to.be.null;
      });
    });
  });

  describe('withAjaxFailover', function () {
    const PRIMARY_URL = 'https://primary.example.com/bid';
    const FAILOVER_URL = 'https://failover.example.com/bid';
    const NETWORK_ERROR = { status: 0, timedOut: false };
    const PAYLOAD = '{"id":"1"}';
    const OPTIONS = { method: 'POST', contentType: 'text/plain', withCredentials: true };

    let clock;
    let logWarnStub;
    let logInfoStub;
    let getFailoverUrl;

    beforeEach(function () {
      resetFailoverState();
      clock = sinon.useFakeTimers();
      logWarnStub = sinon.stub(utils, 'logWarn');
      logInfoStub = sinon.stub(utils, 'logInfo');
      getFailoverUrl = sinon.stub().returns(FAILOVER_URL);
    });

    afterEach(function () {
      clock.restore();
      logWarnStub.restore();
      logInfoStub.restore();
      resetFailoverState();
    });

    // a fake ajax whose n-th call runs the n-th behavior
    function fakeAjax(...behaviors) {
      const ajax = sinon.stub();
      behaviors.forEach((behavior, i) => ajax.onCall(i).callsFake(behavior));
      return ajax;
    }

    // behaviors for the fake ajax: fail after `elapsed` ms, or succeed
    function fail(xhr, elapsed = 0) {
      return (url, callbacks) => {
        clock.tick(elapsed);
        callbacks.error('error', xhr);
      };
    }

    function succeed(body = 'response') {
      return (url, callbacks) => callbacks.success(body, { status: 200 });
    }

    function send(ajax, wrapperOptions = {}) {
      const callbacks = { success: sinon.spy(), error: sinon.spy() };
      withAjaxFailover(ajax, Object.assign({ getFailoverUrl }, wrapperOptions))(PRIMARY_URL, callbacks, PAYLOAD, OPTIONS);
      return callbacks;
    }

    it('should not retry when the request succeeds', function () {
      const ajax = fakeAjax(succeed());
      const callbacks = send(ajax);
      expect(ajax.calledOnce).to.be.true;
      expect(ajax.firstCall.args[0]).to.equal(PRIMARY_URL);
      expect(callbacks.success.calledOnceWith('response')).to.be.true;
      expect(callbacks.error.called).to.be.false;
      expect(getFailoverUrl.called).to.be.false;
    });

    it('should retry once on the failover url after a network error', function () {
      const ajax = fakeAjax(fail(NETWORK_ERROR), succeed('failover response'));
      const callbacks = send(ajax);
      expect(ajax.calledTwice).to.be.true;
      expect(getFailoverUrl.calledOnceWithExactly(PRIMARY_URL)).to.be.true;
      expect(ajax.secondCall.args[0]).to.equal(FAILOVER_URL);
      expect(callbacks.success.calledOnceWith('failover response')).to.be.true;
      expect(callbacks.error.called).to.be.false;
    });

    it('should resend the same payload and options', function () {
      const ajax = fakeAjax(fail(NETWORK_ERROR), succeed());
      send(ajax);
      expect(ajax.secondCall.args[2]).to.equal(PAYLOAD);
      expect(ajax.secondCall.args[3]).to.equal(OPTIONS);
    });

    it('should log the elapsed time and the failover host', function () {
      const ajax = fakeAjax(fail(NETWORK_ERROR, 42), succeed());
      send(ajax, { logPrefix: 'myPrefix' });
      expect(logWarnStub.calledOnce).to.be.true;
      expect(logWarnStub.firstCall.args[0]).to.equal('myPrefix: request failed with a network error after 42ms, retrying on failover.example.com');
    });

    it('should not retry when getFailoverUrl returns null', function () {
      getFailoverUrl.returns(null);
      const ajax = fakeAjax(fail(NETWORK_ERROR));
      const callbacks = send(ajax);
      expect(ajax.calledOnce).to.be.true;
      expect(callbacks.error.calledOnceWith('error', NETWORK_ERROR)).to.be.true;
      expect(logWarnStub.called).to.be.false;
    });

    it('should not retry when the request times out', function () {
      const ajax = fakeAjax(fail({ status: 0, timedOut: true }));
      const callbacks = send(ajax);
      expect(ajax.calledOnce).to.be.true;
      expect(callbacks.error.calledOnce).to.be.true;
      expect(getFailoverUrl.called).to.be.false;
    });

    [204, 301, 400, 404, 500, 503].forEach(function (status) {
      it(`should not retry on an HTTP error response (${status})`, function () {
        const ajax = fakeAjax(fail({ status, timedOut: false }));
        const callbacks = send(ajax);
        expect(ajax.calledOnce).to.be.true;
        expect(callbacks.error.calledOnce).to.be.true;
        expect(getFailoverUrl.called).to.be.false;
      });
    });

    it('should not retry when there is no xhr', function () {
      const ajax = fakeAjax((url, callbacks) => callbacks.error('error'));
      const callbacks = send(ajax);
      expect(ajax.calledOnce).to.be.true;
      expect(callbacks.error.calledOnce).to.be.true;
    });

    it('should retry a failure that takes exactly the default maximum', function () {
      expect(DEFAULT_MAX_FAILURE_MS).to.equal(100);
      const ajax = fakeAjax(fail(NETWORK_ERROR, 100), succeed());
      send(ajax);
      expect(ajax.calledTwice).to.be.true;
    });

    it('should not retry a failure that takes longer than the default maximum', function () {
      const ajax = fakeAjax(fail(NETWORK_ERROR, 101));
      const callbacks = send(ajax);
      expect(ajax.calledOnce).to.be.true;
      expect(callbacks.error.calledOnce).to.be.true;
      expect(getFailoverUrl.called).to.be.false;
    });

    it('should honor a custom maxFailureMs', function () {
      let ajax = fakeAjax(fail(NETWORK_ERROR, 300), succeed());
      send(ajax, { maxFailureMs: 200 });
      expect(ajax.calledOnce).to.be.true;

      ajax = fakeAjax(fail(NETWORK_ERROR, 300), succeed());
      send(ajax, { maxFailureMs: 300 });
      expect(ajax.calledTwice).to.be.true;
    });

    it('should report the failure of the retry and not retry again', function () {
      const failoverError = { status: 0, timedOut: false, reason: 'failover' };
      const ajax = fakeAjax(fail(NETWORK_ERROR), fail(failoverError));
      const callbacks = send(ajax);
      expect(ajax.calledTwice).to.be.true;
      expect(getFailoverUrl.calledOnce).to.be.true;
      expect(callbacks.error.calledOnceWith('error', failoverError)).to.be.true;
      expect(callbacks.success.called).to.be.false;
    });

    it('should pass the request through unchanged when callbacks have no error handler', function () {
      const ajax = sinon.stub();
      const callback = sinon.spy();
      withAjaxFailover(ajax, { getFailoverUrl })(PRIMARY_URL, callback, PAYLOAD, OPTIONS);
      expect(ajax.calledOnceWithExactly(PRIMARY_URL, callback, PAYLOAD, OPTIONS)).to.be.true;
      withAjaxFailover(ajax, { getFailoverUrl })(PRIMARY_URL, undefined, PAYLOAD, OPTIONS);
      expect(ajax.calledTwice).to.be.true;
    });

    it('should return what the wrapped ajax returns', function () {
      const ajax = sinon.stub().returns('result');
      expect(withAjaxFailover(ajax, { getFailoverUrl })(PRIMARY_URL, { success() {}, error() {} })).to.equal('result');
    });

    describe('remembering the failure', function () {
      const OTHER_URL = 'https://other.example.com/bid';

      // every request gets its own wrapped ajax, so only the remembered failure can carry over
      function sendTo(ajax, url = PRIMARY_URL) {
        const callbacks = { success: sinon.spy(), error: sinon.spy() };
        withAjaxFailover(ajax, { getFailoverUrl })(url, callbacks, PAYLOAD, OPTIONS);
        return callbacks;
      }

      // a first request that fails quickly and is retried on the failover url
      function failOver() {
        sendTo(fakeAjax(fail(NETWORK_ERROR), succeed()));
      }

      it('should send later requests straight to the failover url', function () {
        failOver();
        const ajax = fakeAjax(succeed('later response'));
        const callbacks = sendTo(ajax);
        expect(ajax.calledOnce).to.be.true;
        expect(ajax.firstCall.args[0]).to.equal(FAILOVER_URL);
        expect(ajax.firstCall.args[1]).to.equal(callbacks);
        expect(ajax.firstCall.args[2]).to.equal(PAYLOAD);
        expect(ajax.firstCall.args[3]).to.equal(OPTIONS);
        expect(getFailoverUrl.lastCall.args[0]).to.equal(PRIMARY_URL);
        expect(callbacks.success.calledOnceWith('later response')).to.be.true;
        expect(callbacks.error.called).to.be.false;
      });

      it('should keep doing so for every later request', function () {
        failOver();
        for (let i = 0; i < 3; i++) {
          const ajax = fakeAjax(succeed());
          sendTo(ajax);
          expect(ajax.calledOnce).to.be.true;
          expect(ajax.firstCall.args[0]).to.equal(FAILOVER_URL);
        }
      });

      it('should apply to every url, not only the one that failed', function () {
        failOver();
        const ajax = fakeAjax(succeed());
        sendTo(ajax, OTHER_URL);
        expect(ajax.calledOnce).to.be.true;
        expect(getFailoverUrl.lastCall.args[0]).to.equal(OTHER_URL);
        expect(ajax.firstCall.args[0]).to.equal(FAILOVER_URL);
      });

      it('should log that an earlier request failed', function () {
        failOver();
        logInfoStub.resetHistory();
        sendTo(fakeAjax(succeed()));
        expect(logInfoStub.calledOnce).to.be.true;
        expect(logInfoStub.firstCall.args[0]).to.equal('ajaxFailover: an earlier request failed with a network error, sending the request to failover.example.com');
      });

      it('should not retry or forget the failure when a request to the failover url fails', function () {
        failOver();
        const failoverError = { status: 0, timedOut: false, reason: 'failover' };
        const ajax = fakeAjax(fail(failoverError));
        const callbacks = sendTo(ajax);
        expect(ajax.calledOnce).to.be.true;
        expect(callbacks.error.calledOnceWith('error', failoverError)).to.be.true;

        const next = fakeAjax(succeed());
        sendTo(next);
        expect(next.firstCall.args[0]).to.equal(FAILOVER_URL);
      });

      it('should remember the failure even when the retry fails too', function () {
        sendTo(fakeAjax(fail(NETWORK_ERROR), fail(NETWORK_ERROR)));
        const ajax = fakeAjax(succeed());
        sendTo(ajax);
        expect(ajax.firstCall.args[0]).to.equal(FAILOVER_URL);
      });

      it('should not remember a failure that was not retried', function () {
        sendTo(fakeAjax(fail({ status: 0, timedOut: true })));
        sendTo(fakeAjax(fail({ status: 500, timedOut: false })));
        sendTo(fakeAjax(fail(NETWORK_ERROR, DEFAULT_MAX_FAILURE_MS + 1)));
        const ajax = fakeAjax(succeed());
        sendTo(ajax);
        expect(ajax.firstCall.args[0]).to.equal(PRIMARY_URL);
      });

      it('should not remember a failure when there is no failover url', function () {
        getFailoverUrl.returns(null);
        sendTo(fakeAjax(fail(NETWORK_ERROR)));
        getFailoverUrl.returns(FAILOVER_URL);
        const ajax = fakeAjax(succeed());
        sendTo(ajax);
        expect(ajax.firstCall.args[0]).to.equal(PRIMARY_URL);
      });

      it('should use the original url when there is no failover url to send to', function () {
        failOver();
        getFailoverUrl.returns(null);
        const ajax = fakeAjax(succeed());
        sendTo(ajax);
        expect(ajax.calledOnce).to.be.true;
        expect(ajax.firstCall.args[0]).to.equal(PRIMARY_URL);
      });

      it('should forget the failure when the state is reset', function () {
        failOver();
        resetFailoverState();
        const ajax = fakeAjax(succeed());
        sendTo(ajax);
        expect(ajax.firstCall.args[0]).to.equal(PRIMARY_URL);
      });

      it('should still pass requests without an error handler through unchanged', function () {
        failOver();
        const ajax = sinon.stub();
        const callback = sinon.spy();
        withAjaxFailover(ajax, { getFailoverUrl })(PRIMARY_URL, callback, PAYLOAD, OPTIONS);
        expect(ajax.calledOnceWithExactly(PRIMARY_URL, callback, PAYLOAD, OPTIONS)).to.be.true;
      });
    });

    describe('selectFailoverDomain', function () {
      it('should use the default domain when no domain is configured', function () {
        expect(selectFailoverDomain('default.example.com', undefined)).to.equal('default.example.com');
        expect(selectFailoverDomain('default.example.com', null)).to.equal('default.example.com');
        expect(selectFailoverDomain('default.example.com')).to.equal('default.example.com');
        expect(logWarnStub.called).to.be.false;
      });

      it('should use the configured domain when it is a valid hostname', function () {
        expect(selectFailoverDomain('default.example.com', 'bid.example.com')).to.equal('bid.example.com');
        expect(selectFailoverDomain('default.example.com', 'sub-domain.example.co.uk')).to.equal('sub-domain.example.co.uk');
        expect(logWarnStub.called).to.be.false;
      });

      ['https://bid.example.com', 'bid.example.com/path', 'bid.example.com:8443', 'bid example.com', '', '-bad.example.com', 123, {}, true].forEach(function (configured) {
        it(`should warn and use the default domain when the configured domain is ${JSON.stringify(configured)}`, function () {
          expect(selectFailoverDomain('default.example.com', configured, 'myPrefix')).to.equal('default.example.com');
          expect(logWarnStub.calledOnce).to.be.true;
          expect(logWarnStub.firstCall.args[0]).to.equal('myPrefix: failoverDomain must be a hostname without a scheme or path, using default.example.com');
        });
      });

      it('should use a default log prefix', function () {
        selectFailoverDomain('default.example.com', 'not a hostname');
        expect(logWarnStub.firstCall.args[0]).to.match(/^ajaxFailover: /);
      });
    });

    describe('selectMaxFailureMs', function () {
      it('should use DEFAULT_MAX_FAILURE_MS when no value is configured', function () {
        expect(selectMaxFailureMs(undefined)).to.equal(DEFAULT_MAX_FAILURE_MS);
        expect(selectMaxFailureMs(null)).to.equal(DEFAULT_MAX_FAILURE_MS);
        expect(selectMaxFailureMs()).to.equal(DEFAULT_MAX_FAILURE_MS);
        expect(logWarnStub.called).to.be.false;
      });

      [1, 50, 100, 250.5, 5000].forEach(function (configured) {
        it(`should use the configured value ${configured}`, function () {
          expect(selectMaxFailureMs(configured)).to.equal(configured);
          expect(logWarnStub.called).to.be.false;
        });
      });

      [0, -1, NaN, Infinity, -Infinity, '200', '', true, false, {}, []].forEach(function (configured) {
        it(`should warn and use DEFAULT_MAX_FAILURE_MS when the configured value is ${typeof configured} "${String(configured)}"`, function () {
          expect(selectMaxFailureMs(configured, 'myPrefix')).to.equal(DEFAULT_MAX_FAILURE_MS);
          expect(logWarnStub.calledOnce).to.be.true;
          expect(logWarnStub.firstCall.args[0]).to.equal(`myPrefix: failoverMaxFailureMs must be a number of milliseconds greater than 0, using ${DEFAULT_MAX_FAILURE_MS}`);
        });
      });

      it('should use a default log prefix', function () {
        selectMaxFailureMs(-1);
        expect(logWarnStub.firstCall.args[0]).to.match(/^ajaxFailover: /);
      });
    });

    describe('withDomainFailover', function () {
      function sendToDomain(ajax, domainOptions) {
        const callbacks = { success: sinon.spy(), error: sinon.spy() };
        withDomainFailover(ajax, Object.assign({ defaultDomain: 'default.example.com' }, domainOptions))(PRIMARY_URL, callbacks, PAYLOAD, OPTIONS);
        return callbacks;
      }

      it('should return the given ajax function when enabled is false', function () {
        const ajax = fakeAjax(fail(NETWORK_ERROR));
        expect(withDomainFailover(ajax, { enabled: false, defaultDomain: 'default.example.com' })).to.equal(ajax);
        const callbacks = sendToDomain(ajax, { enabled: false });
        expect(ajax.calledOnce).to.be.true;
        expect(callbacks.error.calledOnce).to.be.true;
        expect(logWarnStub.called).to.be.false;
      });

      [undefined, null, true, 'false', 0].forEach(function (enabled) {
        it(`should fail over when enabled is ${JSON.stringify(enabled)}`, function () {
          const ajax = fakeAjax(fail(NETWORK_ERROR), succeed());
          sendToDomain(ajax, { enabled });
          expect(ajax.calledTwice).to.be.true;
        });
      });

      it('should fail over to the default domain, keeping the rest of the url', function () {
        const ajax = fakeAjax(fail(NETWORK_ERROR), succeed('failover response'));
        const callbacks = sendToDomain(ajax);
        expect(ajax.secondCall.args[0]).to.equal('https://default.example.com/bid');
        expect(ajax.secondCall.args[2]).to.equal(PAYLOAD);
        expect(ajax.secondCall.args[3]).to.equal(OPTIONS);
        expect(callbacks.success.calledOnceWith('failover response')).to.be.true;
      });

      it('should fail over to the configured domain when there is one', function () {
        const ajax = fakeAjax(fail(NETWORK_ERROR), succeed());
        sendToDomain(ajax, { userConfiguredDomain: 'bid.example.com' });
        expect(ajax.secondCall.args[0]).to.equal('https://bid.example.com/bid');
      });

      it('should warn and fail over to the default domain when the configured domain is invalid', function () {
        const ajax = fakeAjax(fail(NETWORK_ERROR), succeed());
        sendToDomain(ajax, { userConfiguredDomain: 'https://bid.example.com/', logPrefix: 'myPrefix' });
        expect(ajax.secondCall.args[0]).to.equal('https://default.example.com/bid');
        // one warning for the invalid domain and one for the retry itself
        expect(logWarnStub.calledTwice).to.be.true;
        expect(logWarnStub.firstCall.args[0]).to.contain('failoverDomain');
        expect(logWarnStub.secondCall.args[0]).to.match(/^myPrefix: /);
      });

      it('should not select a domain unless the failure qualifies for a retry', function () {
        const ajax = fakeAjax(fail({ status: 500, timedOut: false }));
        const callbacks = sendToDomain(ajax, { userConfiguredDomain: 'not a hostname' });
        expect(ajax.calledOnce).to.be.true;
        expect(callbacks.error.calledOnce).to.be.true;
        expect(logWarnStub.called).to.be.false;
      });

      it('should not retry when the domain is the one that failed', function () {
        const ajax = fakeAjax(fail(NETWORK_ERROR));
        const callbacks = sendToDomain(ajax, { userConfiguredDomain: 'primary.example.com' });
        expect(ajax.calledOnce).to.be.true;
        expect(callbacks.error.calledOnce).to.be.true;
      });

      it('should send later requests straight to the failover domain after a failover', function () {
        sendToDomain(fakeAjax(fail(NETWORK_ERROR), succeed()));
        const ajax = fakeAjax(succeed());
        sendToDomain(ajax, { userConfiguredDomain: 'bid.example.com' });
        expect(ajax.calledOnce).to.be.true;
        expect(ajax.firstCall.args[0]).to.equal('https://bid.example.com/bid');
      });

      it('should ignore a remembered failure when enabled is false', function () {
        sendToDomain(fakeAjax(fail(NETWORK_ERROR), succeed()));
        const ajax = fakeAjax(succeed());
        sendToDomain(ajax, { enabled: false });
        expect(ajax.calledOnce).to.be.true;
        expect(ajax.firstCall.args[0]).to.equal(PRIMARY_URL);
      });

      it('should use the configured max failure time and the log prefix', function () {
        let ajax = fakeAjax(fail(NETWORK_ERROR, 300), succeed());
        sendToDomain(ajax, { userConfiguredMaxFailureMs: 200 });
        expect(ajax.calledOnce).to.be.true;

        ajax = fakeAjax(fail(NETWORK_ERROR, 300), succeed());
        sendToDomain(ajax, { userConfiguredMaxFailureMs: 300, logPrefix: 'myPrefix' });
        expect(ajax.calledTwice).to.be.true;
        expect(logWarnStub.lastCall.args[0]).to.equal('myPrefix: request failed with a network error after 300ms, retrying on default.example.com');
      });

      it('should use DEFAULT_MAX_FAILURE_MS when no max failure time is configured', function () {
        let ajax = fakeAjax(fail(NETWORK_ERROR, DEFAULT_MAX_FAILURE_MS), succeed());
        sendToDomain(ajax);
        expect(ajax.calledTwice).to.be.true;

        resetFailoverState();
        ajax = fakeAjax(fail(NETWORK_ERROR, DEFAULT_MAX_FAILURE_MS + 1));
        sendToDomain(ajax);
        expect(ajax.calledOnce).to.be.true;
      });

      it('should warn and use DEFAULT_MAX_FAILURE_MS when the configured max failure time is invalid', function () {
        const ajax = fakeAjax(fail(NETWORK_ERROR, DEFAULT_MAX_FAILURE_MS + 1));
        sendToDomain(ajax, { userConfiguredMaxFailureMs: -5, logPrefix: 'myPrefix' });
        expect(ajax.calledOnce).to.be.true;
        expect(logWarnStub.calledOnce).to.be.true;
        expect(logWarnStub.firstCall.args[0]).to.match(/^myPrefix: failoverMaxFailureMs/);
      });

      it('should not check the configured max failure time when the failover is disabled', function () {
        withDomainFailover(sinon.stub(), { enabled: false, defaultDomain: 'default.example.com', userConfiguredMaxFailureMs: -5 });
        expect(logWarnStub.called).to.be.false;
      });
    });
  });
});
