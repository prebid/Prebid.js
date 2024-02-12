"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GreedyPromise = void 0;
exports.defer = defer;
var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));
var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));
function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classStaticPrivateMethodGet(receiver, classConstructor, method) { _classCheckPrivateStaticAccess(receiver, classConstructor); return method; }
function _classCheckPrivateStaticAccess(receiver, classConstructor) { if (receiver !== classConstructor) { throw new TypeError("Private static access of wrong provenance"); } }
const SUCCESS = 0;
const FAIL = 1;

/**
 * A version of Promise that runs callbacks synchronously when it can (i.e. after it's been fulfilled or rejected).
 */
var _result = /*#__PURE__*/new WeakMap();
var _callbacks = /*#__PURE__*/new WeakMap();
class GreedyPromise {
  /**
   * Convenience wrapper for setTimeout; takes care of returning an already fulfilled GreedyPromise when the delay is zero.
   *
   * @param {Number} delayMs delay in milliseconds
   * @returns {GreedyPromise} a promise that resolves (to undefined) in `delayMs` milliseconds
   */
  static timeout() {
    let delayMs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    return new GreedyPromise(resolve => {
      delayMs === 0 ? resolve() : setTimeout(resolve, delayMs);
    });
  }
  constructor(resolver) {
    _classPrivateFieldInitSpec(this, _result, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _callbacks, {
      writable: true,
      value: void 0
    });
    if (typeof resolver !== 'function') {
      throw new Error('resolver not a function');
    }
    const result = [];
    const callbacks = [];
    let [resolve, reject] = [SUCCESS, FAIL].map(type => {
      return function (value) {
        if (type === SUCCESS && typeof (value === null || value === void 0 ? void 0 : value.then) === 'function') {
          value.then(resolve, reject);
        } else if (!result.length) {
          result.push(type, value);
          while (callbacks.length) callbacks.shift()();
        }
      };
    });
    try {
      resolver(resolve, reject);
    } catch (e) {
      reject(e);
    }
    (0, _classPrivateFieldSet2.default)(this, _result, result);
    (0, _classPrivateFieldSet2.default)(this, _callbacks, callbacks);
  }
  then(onSuccess, onError) {
    const result = (0, _classPrivateFieldGet2.default)(this, _result);
    return new this.constructor((resolve, reject) => {
      const continuation = () => {
        let value = result[1];
        let [handler, resolveFn] = result[0] === SUCCESS ? [onSuccess, resolve] : [onError, reject];
        if (typeof handler === 'function') {
          try {
            value = handler(value);
          } catch (e) {
            reject(e);
            return;
          }
          resolveFn = resolve;
        }
        resolveFn(value);
      };
      result.length ? continuation() : (0, _classPrivateFieldGet2.default)(this, _callbacks).push(continuation);
    });
  }
  catch(onError) {
    return this.then(null, onError);
  }
  finally(onFinally) {
    let val;
    return this.then(v => {
      val = v;
      return onFinally();
    }, e => {
      val = this.constructor.reject(e);
      return onFinally();
    }).then(() => val);
  }
  static race(promises) {
    return new this((resolve, reject) => {
      _classStaticPrivateMethodGet(this, GreedyPromise, _collect).call(this, promises, (success, result) => success ? resolve(result) : reject(result));
    });
  }
  static all(promises) {
    return new this((resolve, reject) => {
      let res = [];
      _classStaticPrivateMethodGet(this, GreedyPromise, _collect).call(this, promises, (success, val, i) => success ? res[i] = val : reject(val), () => resolve(res));
    });
  }
  static allSettled(promises) {
    return new this(resolve => {
      let res = [];
      _classStaticPrivateMethodGet(this, GreedyPromise, _collect).call(this, promises, (success, val, i) => res[i] = success ? {
        status: 'fulfilled',
        value: val
      } : {
        status: 'rejected',
        reason: val
      }, () => resolve(res));
    });
  }
  static resolve(value) {
    return new this(resolve => resolve(value));
  }
  static reject(error) {
    return new this((resolve, reject) => reject(error));
  }
}

/**
 * @returns a {promise, resolve, reject} trio where `promise` is resolved by calling `resolve` or `reject`.
 */
exports.GreedyPromise = GreedyPromise;
function _collect(promises, collector, done) {
  let cnt = promises.length;
  function clt() {
    collector.apply(this, arguments);
    if (--cnt <= 0 && done) done();
  }
  promises.length === 0 && done ? done() : promises.forEach((p, i) => this.resolve(p).then(val => clt(true, val, i), err => clt(false, err, i)));
}
function defer() {
  let {
    promiseFactory = resolver => new GreedyPromise(resolver)
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  function invoker(delegate) {
    return val => delegate(val);
  }
  let resolveFn, rejectFn;
  return {
    promise: promiseFactory((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    }),
    resolve: invoker(resolveFn),
    reject: invoker(rejectFn)
  };
}