import {expect} from 'chai';
import {BidInterceptor} from '../../../modules/debugging/bidInterceptor.js';
import {bidderBidInterceptor} from '../../../modules/debugging/index.js';
import {pbsBidInterceptor} from '../../../modules/debugging/pbsInterceptor.js';

describe('bid interceptor', () => {
  let interceptor, mockSetTimeout;
  beforeEach(() => {
    mockSetTimeout = sinon.stub().callsFake((fn) => fn());
    interceptor = new BidInterceptor({setTimeout: mockSetTimeout});
  });

  function setRules(...rules) {
    interceptor.updateConfig({
      intercept: rules
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
          setRules({when: matcher});
          const rule = interceptor.match({key: 'value'});
          expect(rule).to.not.eql(null);
        });

        it('should work on matching nested properties', () => {
          setRules({when: {outer: {inner: matcher}}});
          const rule = interceptor.match({outer: {inner: {key: 'value'}}});
          expect(rule).to.not.eql(null);
        });

        it('should not work on non-matching inputs', () => {
          setRules({when: matcher});
          expect(interceptor.match({key: 'different-value'})).to.not.be.ok;
          expect(interceptor.match({differentKey: 'value'})).to.not.be.ok;
        });
      });
    });

    it('should respect rule order', () => {
      setRules({when: {key: 'value'}}, {when: {}}, {when: {}});
      const rule = interceptor.match({});
      expect(rule.no).to.equal(2);
    });

    it('should pass extra arguments to property function matchers', () => {
      let matchDef = {
        key: sinon.stub(),
        outer: {inner: {key: sinon.stub()}}
      };
      const extraArgs = [{}, {}];
      setRules({when: matchDef});
      interceptor.match({key: {}, outer: {inner: {key: {}}}}, ...extraArgs);
      [matchDef.key, matchDef.outer.inner.key].forEach((fn) => {
        expect(fn.calledOnceWith(sinon.match.any, ...extraArgs.map(sinon.match.same))).to.be.true;
      });
    });

    it('should pass extra arguments to single-function matcher', () => {
      let matchDef = sinon.stub();
      setRules({when: matchDef});
      const args = [{}, {}, {}];
      interceptor.match(...args);
      expect(matchDef.calledOnceWith(...args.map(sinon.match.same))).to.be.true;
    });
  });

  describe('rule', () => {
    function matchingRule({replace, options}) {
      setRules({when: {}, then: replace, options: options});
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
      const bidRequest = {bids: args.bids || []};
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
          {when: match1, then: repl1, options: {delay: DELAY_1}},
          {when: match2, then: repl2, options: {delay: DELAY_2}},
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
        expect(addBid.calledWith(sinon.match({replace: 1, isDebug: true}), REQUEST.bids[1])).to.be.true;
        expect(addBid.calledWith(sinon.match({replace: 2, isDebug: true}), REQUEST.bids[2])).to.be.true;
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

  function interceptorArgs({spec = {}, bids = [], bidRequest = {}, ajax = {}, wrapCallback = {}, cbs = {}} = {}) {
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
    const REMAINING_BIDS = [{id: 1}, {id: 2}];
    beforeEach(() => {
      interceptResult = {bids: REMAINING_BIDS, bidRequest: {bids: REMAINING_BIDS}};
    });

    it('should call next', () => {
      const callbacks = {
        onResponse: {},
        onRequest: {},
        onBid: {}
      };
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

describe('pbsBidInterceptor', () => {
  const EMPTY_INT_RES = {bids: [], bidRequest: {bids: []}};
  let next, interceptBids, s2sBidRequest, bidRequests, ajax, onResponse, onError, onBid, interceptResults,
    addBids, dones, reqIdx;

  beforeEach(() => {
    reqIdx = 0;
    [addBids, dones] = [[], []];
    next = sinon.spy();
    ajax = sinon.spy();
    onResponse = sinon.spy();
    onError = sinon.spy();
    onBid = sinon.spy();
    interceptBids = sinon.stub().callsFake((opts) => {
      addBids.push(opts.addBid);
      dones.push(opts.done);
      return interceptResults[reqIdx++];
    });
    s2sBidRequest = {};
    bidRequests = [{bids: []}, {bids: []}];
    interceptResults = [EMPTY_INT_RES, EMPTY_INT_RES];
  });

  function callInterceptor() {
    return pbsBidInterceptor(next, interceptBids, s2sBidRequest, bidRequests, ajax, {onResponse, onError, onBid});
  }

  it('passes addBids that trigger onBid', () => {
    callInterceptor();
    bidRequests.forEach((_, i) => {
      const bid = {adUnitCode: i, prop: i};
      const bidRequest = {req: i};
      addBids[i](bid, bidRequest);
      expect(onBid.calledWith({adUnit: i, bid: sinon.match(bid)}));
    });
  });

  describe('on no match', () => {
    it('should not call next', () => {
      callInterceptor();
      expect(next.called).to.be.false;
    });

    it('should pass done callbacks that trigger a dummy onResponse once they all run', () => {
      callInterceptor();
      expect(onResponse.called).to.be.false;
      bidRequests.forEach((_, i) => {
        dones[i]();
        expect(onResponse.called).to.equal(i === bidRequests.length - 1);
      });
      expect(onResponse.calledWith(true, [])).to.be.true;
    });
  });

  describe('on match', () => {
    let matchingBids;
    beforeEach(() => {
      matchingBids = [
        [{bidId: 1, matching: true}, {bidId: 2, matching: true}],
        [],
        [{bidId: 3, matching: true}]
      ];
      interceptResults = matchingBids.map((bids) => ({bids, bidRequest: {bids}}));
      s2sBidRequest = {
        ad_units: [
          {bids: [{bid_id: 1, matching: true}, {bid_id: 3, matching: true}, {bid_id: 100}, {bid_id: 101}]},
          {bids: [{bid_id: 2, matching: true}, {bid_id: 110}, {bid_id: 111}]},
          {bids: [{bid_id: 120}]}
        ]
      };
      bidRequests = matchingBids.map((mBids, i) => [
        {bidId: 100 + (i * 10)},
        {bidId: 101 + (i * 10)},
        ...mBids
      ]);
    });

    it('should call next', () => {
      callInterceptor();
      expect(next.calledOnceWith(
        sinon.match.any,
        sinon.match.any,
        ajax,
        sinon.match({
          onError,
          onBid
        })
      )).to.be.true;
    });

    it('should filter out intercepted bids from s2sBidRequest', () => {
      callInterceptor();
      const interceptedS2SReq = next.args[0][0];
      const allMatching = interceptedS2SReq.ad_units.every((u) => u.bids.length > 0 && u.bids.every((b) => b.matching));
      expect(allMatching).to.be.true;
    });

    it('should pass bidRequests as returned by interceptBids', () => {
      callInterceptor();
      const passedBidReqs = next.args[0][1];
      interceptResults
        .filter((r) => r.bids.length > 0)
        .forEach(({bidRequest}, i) => {
          expect(passedBidReqs[i]).to.equal(bidRequest);
        });
    });

    it('should pass an onResponse that triggers original onResponse only once all intercept dones are called', () => {
      callInterceptor();
      const interceptedOnResponse = next.args[0][next.args[0].length - 1].onResponse;
      expect(onResponse.called).to.be.false;
      const responseArgs = ['dummy', 'args'];
      interceptedOnResponse(...responseArgs);
      expect(onResponse.called).to.be.false;
      dones.forEach((f, i) => {
        f();
        expect(onResponse.called).to.equal(i === dones.length - 1);
      });
      expect(onResponse.calledOnceWith(...responseArgs)).to.be.true;
    });
  });
});
