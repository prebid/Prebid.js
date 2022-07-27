import {GreedyPromise, defer} from '../../../../src/utils/promise.js';

describe('GreedyPromise', () => {
  it('throws when resolver is not a function', () => {
    expect(() => new GreedyPromise()).to.throw();
  })

  Object.entries({
    'resolved': (use) => new GreedyPromise((resolve) => use(resolve)),
    'rejected': (use) => new GreedyPromise((_, reject) => use(reject))
  }).forEach(([t, makePromise]) => {
    it(`runs callbacks immediately when ${t}`, () => {
      let cbRan = false;
      const cb = () => { cbRan = true };
      let resolver;
      makePromise((fn) => { resolver = fn }).then(cb, cb);
      resolver();
      expect(cbRan).to.be.true;
    })
  });

  describe('unhandled rejections', () => {
    let unhandled, done, stop;

    function reset(expectUnhandled) {
      let pending = expectUnhandled;
      let resolver;
      unhandled.reset();
      unhandled.callsFake(() => {
        pending--;
        if (pending === 0) {
          resolver();
        }
      })
      done = new Promise((resolve) => {
        resolver = resolve;
        stop = function () {
          if (expectUnhandled === 0) {
            resolve()
          } else {
            resolver = resolve;
          }
        }
      })
    }

    before(() => {
      unhandled = sinon.stub();
      window.addEventListener('unhandledrejection', unhandled);
    });

    after(() => {
      window.removeEventListener('unhandledrejection', unhandled);
    });

    function getUnhandledErrors() {
      return unhandled.args.map((args) => args[0].reason);
    }

    Object.entries({
      'simple reject': [1, (P) => { P.reject('err'); stop() }],
      'caught reject': [0, (P) => P.reject('err').catch((e) => { stop(); return e })],
      'unhandled reject with finally': [1, (P) => P.reject('err').finally(() => 'finally')],
      'error handler that throws': [1, (P) => P.reject('err').catch((e) => { stop(); throw e })],
      'rejection handled later in the chain': [0, (P) => P.reject('err').then((v) => v).catch((e) => { stop(); return e })],
      'multiple errors in one chain': [1, (P) => P.reject('err').then((v) => v).catch((e) => e).then((v) => { stop(); return P.reject(v) })],
      'multiple errors in one chain, all handled': [0, (P) => P.reject('err').then((v) => v).catch((e) => e).then((v) => P.reject(v)).catch((e) => { stop(); return e })],
      'separate chains for rejection and handling': [1, (P) => {
        const p = P.reject('err');
        p.catch((e) => { stop(); return e; })
        p.then((v) => v);
      }],
      'separate rejections merged without handling': [2, (P) => {
        const p1 = P.reject('err1');
        const p2 = P.reject('err2');
        p1.then(() => p2).finally(stop);
      }],
      'separate rejections merged for handling': [0, (P) => {
        const p1 = P.reject('err1');
        const p2 = P.reject('err2');
        P.all([p1, p2]).catch((e) => { stop(); return e });
      }],
      // eslint-disable-next-line no-throw-literal
      'exception in resolver': [1, (P) => new P(() => { stop(); throw 'err'; })],
      // eslint-disable-next-line no-throw-literal
      'exception in resolver, caught': [0, (P) => new P(() => { throw 'err' }).catch((e) => { stop(); return e })],
      'errors from nested promises': [1, (P) => new P((resolve) => setTimeout(() => { resolve(P.reject('err')); stop(); }))],
      'errors from nested promises, caught': [0, (P) => new P((resolve) => setTimeout(() => resolve(P.reject('err')))).catch((e) => { stop(); return e })],
    }).forEach(([t, [expectUnhandled, op]]) => {
      describe(`on ${t}`, () => {
        it('should match vanilla Promises', () => {
          let vanillaUnhandled;
          reset(expectUnhandled);
          op(Promise);
          return done.then(() => {
            vanillaUnhandled = getUnhandledErrors();
            reset(expectUnhandled);
            op(GreedyPromise);
            return done;
          }).then(() => {
            const actualUnhandled = getUnhandledErrors();
            expect(actualUnhandled.length).to.eql(expectUnhandled);
            expect(actualUnhandled).to.eql(vanillaUnhandled);
          })
        })
      })
    });
  });

  describe('idioms', () => {
    let makePromise, pendingFailure, pendingSuccess;

    Object.entries({
      // eslint-disable-next-line no-throw-literal
      'resolver that throws': (P) => new P(() => { throw 'error' }),
      'resolver that resolves multiple times': (P) => new P((resolve) => { resolve('first'); resolve('second'); }),
      'resolver that rejects multiple times': (P) => new P((resolve, reject) => { reject('first'); reject('second') }),
      'resolver that resolves and rejects': (P) => new P((resolve, reject) => { reject('first'); resolve('second') }),
      'resolver that resolves with multiple arguments': (P) => new P((resolve) => resolve('one', 'two')),
      'resolver that rejects with multiple arguments': (P) => new P((resolve, reject) => reject('one', 'two')),
      'resolver that resolves to a promise': (P) => new P((resolve) => resolve(makePromise(P, 'val'))),
      'resolver that resolves to a promise that resolves to a promise': (P) => new P((resolve) => resolve(makePromise(P, makePromise(P, 'val')))),
      'resolver that resolves to a rejected promise': (P) => new P((resolve) => resolve(makePromise(P, 'err', true))),
      'simple .then': (P) => makePromise(P, 'value').then((v) => `${v} and then`),
      'chained .then': (P) => makePromise(P, 'value').then((v) => makePromise(P, `${v} and then`)),
      '.then with error handler': (P) => makePromise(P, 'err', true).then(null, (e) => `${e} and then`),
      '.then with chained error handler': (P) => makePromise(P, 'err', true).then(null, (e) => makePromise(P, `${e} and then`)),
      '.then that throws': (P) => makePromise(P, 'value').then((v) => { throw v }),
      '.then that throws in error handler': (P) => makePromise(P, 'err', true).then(null, (e) => { throw e }),
      '.then with no args': (P) => makePromise(P, 'value').then(),
      '.then that rejects': (P) => makePromise(P, 'value').then((v) => P.reject(v)),
      '.then that rejects in error handler': (P) => makePromise(P, 'err', true).then(null, (err) => P.reject(err)),
      '.then with no error handler on a rejection': (P) => makePromise(P, 'err', true).then((v) => `resolved ${v}`),
      '.then with no success handler on a resolution': (P) => makePromise(P, 'value').then(null, (e) => `caught ${e}`),
      'simple .catch': (P) => makePromise(P, 'err', true).catch((err) => `caught ${err}`),
      'identity .catch': (P) => makePromise(P, 'err', true).catch((err) => err).then((v) => v),
      '.catch that throws': (P) => makePromise(P, 'err', true).catch((err) => { throw err }),
      'chained .catch': (P) => makePromise(P, 'err', true).catch((err) => makePromise(P, err)),
      'chained .catch that rejects': (P) => makePromise(P, 'err', true).catch((err) => P.reject(`reject with ${err}`)),
      'simple .finally': (P) => {
        let fval;
        return makePromise(P, 'value')
          .finally(() => fval = 'finally ran')
          .then((val) => `${val} ${fval}`)
      },
      'chained .finally': (P) => {
        let fval;
        return makePromise(P, 'value')
          .finally(() => pendingSuccess.then(() => { fval = 'finally ran' }))
          .then((val) => `${val} ${fval}`)
      },
      '.finally on a rejection': (P) => {
        let fval;
        return makePromise(P, 'error', true)
          .finally(() => { fval = 'finally' })
          .catch((err) => `${err} ${fval}`)
      },
      'chained .finally on a rejection': (P) => {
        let fval;
        return makePromise(P, 'error', true)
          .finally(() => pendingSuccess.then(() => { fval = 'finally' }))
          .catch((err) => `${err} ${fval}`)
      },
      // eslint-disable-next-line no-throw-literal
      '.finally that throws': (P) => makePromise(P, 'value').finally(() => { throw 'error' }),
      'chained .finally that rejects': (P) => makePromise(P, 'value').finally(() => P.reject('error')),
      'scalar Promise.resolve': (P) => P.resolve('scalar'),
      'null Promise.resolve': (P) => P.resolve(null),
      'chained Promise.resolve': (P) => P.resolve(pendingSuccess),
      'chained Promise.resolve on failure': (P) => P.resolve(pendingFailure),
      'scalar Promise.reject': (P) => P.reject('scalar'),
      'chained Promise.reject': (P) => P.reject(pendingSuccess),
      'chained Promise.reject on failure': (P) => P.reject(pendingFailure),
      'simple Promise.all': (P) => P.all([makePromise(P, 'one'), makePromise(P, 'two')]),
      'Promise.all with scalars': (P) => P.all([makePromise(P, 'one'), 'two']),
      'Promise.all with errors': (P) => P.all([makePromise(P, 'one'), makePromise(P, 'two'), makePromise(P, 'err', true)]),
      'Promise.allSettled': (P) => P.allSettled([makePromise(P, 'one', true), makePromise(P, 'two'), makePromise(P, 'three', true)]),
      'Promise.allSettled with scalars': (P) => P.allSettled([makePromise(P, 'value'), 'scalar']),
      'Promise.race that succeeds': (P) => P.race([makePromise(P, 'error', true, 10), makePromise(P, 'success')]),
      'Promise.race that fails': (P) => P.race([makePromise(P, 'success', false, 10), makePromise(P, 'error', true)]),
      'Promise.race with scalars': (P) => P.race(['scalar', makePromise(P, 'success')]),
    }).forEach(([t, op]) => {
      describe(t, () => {
        describe('when mixed with deferrals', () => {
          beforeEach(() => {
            makePromise = function(ctor, value, fail = false, delay = 0) {
              // eslint-disable-next-line new-cap
              return new ctor((resolve, reject) => {
                setTimeout(() => fail ? reject(value) : resolve(value), delay)
              })
            };
            pendingSuccess = makePromise(Promise, 'pending result', false, 10);
            pendingFailure = makePromise(Promise, 'pending failure', true, 10);
          });

          it(`behaves like vanilla promises`, () => {
            const vanilla = op(Promise);
            const greedy = op(GreedyPromise);
            // note that we are not using `allSettled` & co to resolve our promises,
            // to avoid transformations those methods do under the hood
            const {actual = {}, expected = {}} = {};
            return new Promise((resolve) => {
              let pending = 2;
              function collect(dest, slot) {
                return function (value) {
                  dest[slot] = value;
                  pending--;
                  if (pending === 0) {
                    resolve()
                  }
                }
              }
              vanilla.then(collect(expected, 'success'), collect(expected, 'failure'));
              greedy.then(collect(actual, 'success'), collect(actual, 'failure'));
            }).then(() => {
              expect(actual).to.eql(expected);
            });
          });

          it(`once resolved, runs callbacks immediately`, () => {
            const promise = op(GreedyPromise).catch(() => null);
            return promise.then(() => {
              let cbRan = false;
              promise.then(() => { cbRan = true });
              expect(cbRan).to.be.true;
            });
          });
        });

        describe('when all promises involved are greedy', () => {
          beforeEach(() => {
            makePromise = function(ctor, value, fail = false, delay = 0) {
              // eslint-disable-next-line new-cap
              return new ctor((resolve, reject) => {
                const run = () => fail ? reject(value) : resolve(value);
                delay === 0 ? run() : setTimeout(run, delay);
              })
            };
            pendingSuccess = makePromise(GreedyPromise, 'pending result');
            pendingFailure = makePromise(GreedyPromise, 'pending failure', true);
          });

          it('resolves immediately', () => {
            let cbRan = false;
            op(GreedyPromise).catch(() => null).then(() => { cbRan = true });
            expect(cbRan).to.be.true;
          });
        });
      });
    });
  });

  describe('.timeout', () => {
    const timeout = GreedyPromise.timeout;

    it('should resolve immediately when ms is 0', () => {
      let cbRan = false;
      timeout(0.0).then(() => { cbRan = true });
      expect(cbRan).to.be.true;
    });

    it('should schedule timeout on ms > 0', (done) => {
      let cbRan = false;
      timeout(5).then(() => { cbRan = true });
      expect(cbRan).to.be.false;
      setTimeout(() => {
        expect(cbRan).to.be.true;
        done();
      }, 10)
    });
  });
});

describe('promiseControls', () => {
  Object.entries({
    'resolve': (p) => p,
    'reject': (p) => p.then(() => 'wrong', (v) => v)
  }).forEach(([method, transform]) => {
    describe(method, () => {
      it(`should ${method} the promise`, () => {
        const ctl = defer();
        ctl[method]('result');
        return transform(ctl.promise).then((res) => expect(res).to.equal('result'));
      });

      it('should ignore calls after the first', () => {
        const ctl = defer();
        ctl[method]('result');
        ctl[method]('other');
        return transform(ctl.promise).then((res) => expect(res).to.equal('result'));
      });
    });
  });
});
