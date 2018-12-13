
import { expect } from 'chai';
import { createHook, hooks } from 'src/hook';

describe('the hook module', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should allow context to be passed to hooks, but keep bound contexts', function () {
    let context;
    let fn = function(cb) {
      context = this;
      cb();
    };

    let boundContext = {};
    let calledBoundContext;
    let hook = function(cb) {
      calledBoundContext = this;
      cb();
    }.bind(boundContext);

    let hookFn = createHook('asyncSeries', fn);
    hookFn.addHook(hook);

    let newContext = {};
    hookFn.bind(newContext)(function() {});

    expect(context).to.equal(newContext);
    expect(calledBoundContext).to.equal(boundContext);
  });

  describe('asyncSeries', function () {
    it('should call function as normal if no hooks attached', function () {
      let fn = sandbox.spy();
      let hookFn = createHook('asyncSeries', fn);

      hookFn(1);

      expect(fn.calledOnce).to.equal(true);
      expect(fn.firstCall.args[0]).to.equal(1);
    });

    it('should call hooks correctly applied in asyncSeries', function () {
      let called = [];

      let testFn = (called) => {
        called.push(testFn);
      };
      let testHook = (called, next) => {
        called.push(testHook);
        next(called);
      };
      let testHook2 = (called, next) => {
        called.push(testHook2);
        next(called);
      };

      let hookedTestFn = createHook('asyncSeries', testFn);
      hookedTestFn.addHook(testHook);
      hookedTestFn.addHook(testHook2);

      hookedTestFn(called);

      expect(called).to.deep.equal([
        testHook,
        testHook2,
        testFn
      ]);
    });

    it('should allow context to be passed to hooks, but keep bound contexts', function () {
      let context;
      let fn = function() {
        context = this;
      };

      let boundContext1 = {};
      let calledBoundContext1;
      let hook1 = function(next) {
        calledBoundContext1 = this;
        next()
      }.bind(boundContext1);

      let hookFn = createHook('asyncSeries', fn);
      hookFn.addHook(hook1);

      let newContext = {};
      hookFn = hookFn.bind(newContext);
      hookFn();

      expect(context).to.equal(newContext);
      expect(calledBoundContext1).to.equal(boundContext1);
    });
  });
});
