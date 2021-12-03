import {expect} from 'chai';
import {
  addBidderRequestsBound,
  addBidderRequestsHook,
  addBidResponseBound,
  addBidResponseHook, bidderBidInterceptor,
  BidInterceptor,
  disableOverrides,
  getConfig,
  sessionLoader
} from 'src/debugging.js';
import {addBidderRequests, addBidResponse} from 'src/auction.js';
import {config} from 'src/config.js';

describe('Debugging', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
    window.sessionStorage.clear();
    config.resetConfig();
  });

  describe('bid overrides', () => {
    describe('initialization', function () {
      beforeEach(function () {
        sandbox.stub(config, 'setConfig');
      });

      afterEach(function () {
        disableOverrides();
      });

      it('should happen when enabled with setConfig', function () {
        getConfig({
          enabled: true
        });

        expect(addBidResponse.getHooks().some(hook => hook.hook === addBidResponseBound)).to.equal(true);
        expect(addBidderRequests.getHooks().some(hook => hook.hook === addBidderRequestsBound)).to.equal(true);
      });

      it('should happen when configuration found in sessionStorage', function () {
        sessionLoader({
          getItem: () => ('{"enabled": true}')
        });
        expect(addBidResponse.getHooks().some(hook => hook.hook === addBidResponseBound)).to.equal(true);
        expect(addBidderRequests.getHooks().some(hook => hook.hook === addBidderRequestsBound)).to.equal(true);
      });

      it('should not throw if sessionStorage is inaccessible', function () {
        expect(() => {
          sessionLoader({
            getItem() {
              throw new Error('test');
            }
          });
        }).not.to.throw();
      });

      const interceptorConfigKey = BidInterceptor.prototype.KEYS.rules;

      describe(`when '${interceptorConfigKey}' config exists`, () => {
        it('should pass it through BidInterceptor#serializeConfig before saving', () => {
          const config = 'raw';
          const result = 'serialized';
          sandbox.stub(BidInterceptor.prototype, 'serializeConfig').returns(result);
          sandbox.stub(window.sessionStorage, 'setItem');
          sandbox.stub(BidInterceptor.prototype, 'updateConfig');
          getConfig({
            enabled: true,
            [interceptorConfigKey]: config
          });
          expect(BidInterceptor.prototype.serializeConfig.calledWith(config)).to.be.true;
          expect(window.sessionStorage.setItem.calledWith(sinon.match({
            [interceptorConfigKey]: result
          })));
        });
      });
    });

    describe('bidResponse hook', function () {
      let mockBids;
      let bids;

      beforeEach(function () {
        let baseBid = {
          'bidderCode': 'rubicon',
          'width': 970,
          'height': 250,
          'statusMessage': 'Bid available',
          'mediaType': 'banner',
          'source': 'client',
          'currency': 'USD',
          'cpm': 0.5,
          'ttl': 300,
          'netRevenue': false,
          'adUnitCode': '/19968336/header-bid-tag-0'
        };
        mockBids = [];
        mockBids.push(baseBid);
        mockBids.push(Object.assign({}, baseBid, {
          bidderCode: 'appnexus'
        }));

        bids = [];
      });

      function run(overrides) {
        mockBids.forEach(bid => {
          let next = (adUnitCode, bid) => {
            bids.push(bid);
          };
          addBidResponseHook.bind(overrides)(next, bid.adUnitCode, bid);
        });
      }

      it('should allow us to exclude bidders', function () {
        run({
          enabled: true,
          bidders: ['appnexus']
        });

        expect(bids.length).to.equal(1);
        expect(bids[0].bidderCode).to.equal('appnexus');
      });

      it('should allow us to override all bids', function () {
        run({
          enabled: true,
          bids: [{
            cpm: 2
          }]
        });

        expect(bids.length).to.equal(2);
        expect(bids[0].cpm).to.equal(2);
        expect(bids[1].cpm).to.equal(2);
      });

      it('should allow us to override bids by bidder', function () {
        run({
          enabled: true,
          bids: [{
            bidder: 'rubicon',
            cpm: 2
          }]
        });

        expect(bids.length).to.equal(2);
        expect(bids[0].cpm).to.equal(2);
        expect(bids[1].cpm).to.equal(0.5);
      });

      it('should allow us to override bids by adUnitCode', function () {
        mockBids[1].adUnitCode = 'test';

        run({
          enabled: true,
          bids: [{
            adUnitCode: 'test',
            cpm: 2
          }]
        });

        expect(bids.length).to.equal(2);
        expect(bids[0].cpm).to.equal(0.5);
        expect(bids[1].cpm).to.equal(2);
      });
    });

    describe('bidRequests hook', function () {
      let mockBidRequests;
      let bidderRequests;

      beforeEach(function () {
        let baseBidderRequest = {
          'bidderCode': 'rubicon',
          'bids': [{
            'width': 970,
            'height': 250,
            'statusMessage': 'Bid available',
            'mediaType': 'banner',
            'source': 'client',
            'currency': 'USD',
            'cpm': 0.5,
            'ttl': 300,
            'netRevenue': false,
            'adUnitCode': '/19968336/header-bid-tag-0'
          }]
        };
        mockBidRequests = [];
        mockBidRequests.push(baseBidderRequest);
        mockBidRequests.push(Object.assign({}, baseBidderRequest, {
          bidderCode: 'appnexus'
        }));

        bidderRequests = [];
      });

      function run(overrides) {
        let next = (b) => {
          bidderRequests = b;
        };
        addBidderRequestsHook.bind(overrides)(next, mockBidRequests);
      }

      it('should allow us to exclude bidders', function () {
        run({
          enabled: true,
          bidders: ['appnexus']
        });

        expect(bidderRequests.length).to.equal(1);
        expect(bidderRequests[0].bidderCode).to.equal('appnexus');
      });
    });
  });

  describe('bid interceptor', () => {
    let interceptor, K, mockSetTimeout;
    beforeEach(() => {
      mockSetTimeout = sinon.stub().callsFake((fn) => fn());
      interceptor = new BidInterceptor({setTimeout: mockSetTimeout});
      K = interceptor.KEYS;
    });

    function setRules(...rules) {
      interceptor.updateConfig({
        [K.rules]: rules
      });
    }

    describe('serializeConfig', () => {
      Object.entries({
        regexes: /pat/,
        functions: () => ({})
      }).forEach(([test, arg]) => {
        it(`should filter out ${test}`, () => {
          const valid = [{key1: 'value'}, {key2: 'value'}];
          const ser = interceptor.serializeConfig([...valid, {outer: {inner: arg}}]);
          expect(ser).to.eql(valid);
        });
      });
    });

    describe('match()', () => {
      Object.entries({
        value: {key: 'value'},
        regex: {key: /^value$/},
        'function': (o) => o.key === 'value'
      }).forEach(([test, matcher]) => {
        describe(`by ${test}`, () => {
          it('should work on matching top-level properties', () => {
            setRules({[K.match]: matcher});
            const rule = interceptor.match({key: 'value'});
            expect(rule).to.not.eql(null);
          });

          it('should work on matching nested properties', () => {
            setRules({[K.match]: {outer: {inner: matcher}}});
            const rule = interceptor.match({outer: {inner: {key: 'value'}}});
            expect(rule).to.not.eql(null);
          });

          it('should not work on non-matching inputs', () => {
            setRules({[K.match]: matcher});
            expect(interceptor.match({key: 'different-value'})).to.not.be.ok;
            expect(interceptor.match({differentKey: 'value'})).to.not.be.ok;
          })
        });
      });

      it('should respect rule order', () => {
        setRules({[K.match]: {key: 'value'}}, {[K.match]: {}}, {[K.match]: {}});
        const rule = interceptor.match({});
        expect(rule.no).to.equal(2);
      });

      it('should pass extra arguments to property function matchers', () => {
        let matchDef = {
          key: sinon.stub(),
          outer: {inner: {key: sinon.stub()}}
        }
        const extraArgs = [{}, {}];
        setRules({[K.match]: matchDef});
        interceptor.match({key: {}, outer: {inner: {key: {}}}}, ...extraArgs);
        [matchDef.key, matchDef.outer.inner.key].forEach((fn) => {
          expect(fn.calledOnceWith(sinon.match.any, ...extraArgs.map(sinon.match.same))).to.be.true;
        });
      });

      it('should pass extra arguments to single-function matcher', () => {
        let matchDef = sinon.stub();
        setRules({[K.match]: matchDef});
        const args = [{}, {}, {}];
        interceptor.match(...args);
        expect(matchDef.calledOnceWith(...args.map(sinon.match.same))).to.be.true;
      });
    });

    describe('rule', () => {
      function matchingRule({replace, options}) {
        setRules({[K.match]: {}, [K.replace]: replace, [K.options]: options});
        return interceptor.match({});
      }

      describe('.replace()', () => {
        const REQUIRED_KEYS = [
          // https://docs.prebid.org/dev-docs/bidder-adaptor.html#bidder-adaptor-Interpreting-the-Response
          'requestId', 'cpm', 'currency', 'width', 'height', 'ttl',
          'creativeId', 'netRevenue', 'meta', 'ad'
        ];
        it('should include required bid response keys by default', () => {
          expect(matchingRule({}).replace({})).to.include.keys(REQUIRED_KEYS);
        });

        Object.entries({
          value: {key: 'value'},
          'function': () => ({key: 'value'})
        }).forEach(([test, replDef]) => {
          describe(`by ${test}`, () => {
            it('should merge top-level properties with replace definition', () => {
              const result = matchingRule({replace: replDef}).replace({});
              expect(result).to.include.keys(REQUIRED_KEYS);
              expect(result.key).to.equal('value');
            });

            it('should merge nested properties with replace definition', () => {
              const result = matchingRule({replace: {outer: {inner: replDef}}}).replace({});
              expect(result).to.include.keys(REQUIRED_KEYS);
              expect(result.outer.inner).to.eql({key: 'value'});
            });
          });
        });

        it('should pass extra arguments to single function replacer', () => {
          const replDef = sinon.stub();
          const args = [{}, {}, {}];
          matchingRule({replace: replDef}).replace(...args);
          expect(replDef.calledOnceWith(...args.map(sinon.match.same))).to.be.true;
        });

        it('should pass extra arguments to function property replacers', () => {
          const replDef = {
            key: sinon.stub(),
            outer: {inner: {key: sinon.stub()}}
          };
          const args = [{}, {}, {}];
          matchingRule({replace: replDef}).replace(...args);
          [replDef.key, replDef.outer.inner.key].forEach((repl) => {
            expect(repl.calledOnceWith(...args.map(sinon.match.same))).to.be.true;
          });
        });
      });

      describe('.options', () => {
        it('should include default rule options', () => {
          const optDef = {someOption: 'value'};
          const ruleOptions = matchingRule({options: optDef}).options;
          expect(ruleOptions).to.include(optDef);
          expect(ruleOptions).to.include(interceptor.DEFAULT_RULE_OPTIONS);
        });

        it('should override defaults', () => {
          const optDef = {delay: 123};
          const ruleOptions = matchingRule({options: optDef}).options;
          expect(ruleOptions).to.eql(optDef);
        });
      });
    });

    describe('intercept()', () => {
      let done, addBid;

      function intercept(args = {}) {
        const bidRequest = {bids: args.bids || []}
        return interceptor.intercept(Object.assign({bidRequest, done, addBid}, args));
      }

      beforeEach(() => {
        done = sinon.spy();
        addBid = sinon.spy();
      });

      describe('on no match', () => {
        it('should return untouched bids and bidRequest', () => {
          const bids = [{}, {}];
          const bidRequest = {};
          const result = intercept({bids, bidRequest});
          expect(result.bids).to.equal(bids);
          expect(result.bidRequest).to.equal(bidRequest);
        });

        it('should call done() immediately', () => {
          intercept();
          expect(done.calledOnce).to.be.true;
          expect(mockSetTimeout.args[0][1]).to.equal(0);
        });

        it('should not call addBid', () => {
          intercept();
          expect(addBid.called).to.not.be.ok;
        });
      });

      describe('on match', () => {
        let match1, match2, repl1, repl2;
        const DELAY_1 = 123;
        const DELAY_2 = 321;
        const REQUEST = {
          bids: [
            {id: 1, match: false},
            {id: 2, match: 1},
            {id: 3, match: 2}
          ]
        };

        beforeEach(() => {
          match1 = sinon.stub().callsFake((bid) => bid.match === 1);
          match2 = sinon.stub().callsFake((bid) => bid.match === 2);
          repl1 = sinon.stub().returns({replace: 1});
          repl2 = sinon.stub().returns({replace: 2});
          setRules(
            {[K.match]: match1, [K.replace]: repl1, [K.options]: {[K.delay]: DELAY_1}},
            {[K.match]: match2, [K.replace]: repl2, [K.options]: {[K.delay]: DELAY_2}},
          );
        });

        it('should return only non-matching bids', () => {
          const {bids, bidRequest} = intercept({bidRequest: REQUEST});
          expect(bids).to.eql([REQUEST.bids[0]]);
          expect(bidRequest.bids).to.eql([REQUEST.bids[0]]);
        });

        it('should call addBid for each matching bid', () => {
          intercept({bidRequest: REQUEST});
          expect(addBid.callCount).to.equal(2);
          expect(addBid.calledWith(sinon.match({replace: 1}), REQUEST.bids[1])).to.be.true;
          expect(addBid.calledWith(sinon.match({replace: 2}), REQUEST.bids[2])).to.be.true;
          [DELAY_1, DELAY_2].forEach((delay) => {
            expect(mockSetTimeout.calledWith(sinon.match.any, delay)).to.be.true;
          });
        });

        it('should call done()', () => {
          intercept({bidRequest: REQUEST});
          expect(done.calledOnce).to.be.true;
        });

        it('should pass bid and bidRequest to match and replace functions', () => {
          intercept({bidRequest: REQUEST});
          Object.entries({
            1: [match1, repl1],
            2: [match2, repl2]
          }).forEach(([index, fns]) => {
            fns.forEach((fn) => {
              expect(fn.calledWith(REQUEST.bids[index], REQUEST)).to.be.true;
            });
          });
        });
      });
    });
  });

  describe('bidderBidInterceptor', () => {
    let next, interceptBids, onCompletion, interceptResult, done, addBid;

    function interceptorArgs({
      spec = {},
      bids = [],
      bidRequest = {},
      ajax = {},
      wrapCallback = {},
      cbs = {}
    } = {}) {
      return [next, interceptBids, spec, bids, bidRequest, ajax, wrapCallback, Object.assign({onCompletion}, cbs)];
    }

    beforeEach(() => {
      next = sinon.spy();
      interceptBids = sinon.stub().callsFake((opts) => {
        done = opts.done;
        addBid = opts.addBid;
        return interceptResult;
      });
      onCompletion = sinon.spy();
      interceptResult = {bids: [], bidRequest: {}};
    });

    it('should pass to interceptBid an addBid that triggers onBid', () => {
      const onBid = sinon.spy();
      bidderBidInterceptor(...interceptorArgs({cbs: {onBid}}));
      const bid = {};
      addBid(bid);
      expect(onBid.calledWith(sinon.match.same(bid))).to.be.true;
    });

    describe('with no remaining bids', () => {
      it('should pass a done callback that triggers onCompletion', () => {
        bidderBidInterceptor(...interceptorArgs());
        expect(onCompletion.calledOnce).to.be.false;
        interceptBids.args[0][0].done();
        expect(onCompletion.calledOnce).to.be.true;
      });

      it('should not call next()', () => {
        bidderBidInterceptor(...interceptorArgs());
        expect(next.called).to.be.false;
      });
    });

    describe('with remaining bids', () => {
      const REMAINING_BIDS = [{id: 1}, {id: 2}]
      beforeEach(() => {
        interceptResult = {bids: REMAINING_BIDS, bidRequest: {bids: REMAINING_BIDS}};
      });

      it('should call next', () => {
        const callbacks = {
          onResponse: {},
          onRequest: {},
          onBid: {}
        }
        const args = interceptorArgs({cbs: callbacks});
        const expectedNextArgs = [
          args[2],
          interceptResult.bids,
          interceptResult.bidRequest,
          ...args.slice(5, args.length - 1),
        ].map(sinon.match.same)
          .concat([sinon.match({
            onResponse: sinon.match.same(callbacks.onResponse),
            onRequest: sinon.match.same(callbacks.onRequest),
            onBid: sinon.match.same(callbacks.onBid)
          })]);
        bidderBidInterceptor(...args);
        expect(next.calledOnceWith(...expectedNextArgs)).to.be.true;
      });

      it('should trigger onCompletion once both interceptBids.done and next.cbs.onCompletion are called ', () => {
        bidderBidInterceptor(...interceptorArgs());
        expect(onCompletion.calledOnce).to.be.false;
        next.args[0][next.args[0].length - 1].onCompletion();
        expect(onCompletion.calledOnce).to.be.false;
        done();
        expect(onCompletion.calledOnce).to.be.true;
      });
    });
  });
});
