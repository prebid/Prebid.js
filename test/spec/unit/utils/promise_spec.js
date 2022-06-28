import {GreedyPromise, promiseControls} from '../../../../src/utils/promise.js';

describe('GreedyPromise', () => {
  describe('.timeout', () => {
    it('should resolve immediately when ms is 0', () => {
      let cbRan = false;
      GreedyPromise.timeout(0.0).then(() => { cbRan = true });
      expect(cbRan).to.be.true;
    });
    it('should schedule timeout on ms > 0', (done) => {
      let cbRan = false;
      GreedyPromise.timeout(5).then(() => { cbRan = true });
      expect(cbRan).to.be.false;
      setTimeout(() => {
        expect(cbRan).to.be.true;
        done();
      }, 10)
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
            pendingSuccess = makePromise(Promise, 'pending result');
            pendingFailure = makePromise(Promise, 'pending failure', true);
          });

          it(`behaves like vanilla promises`, () => {
            const vanilla = op(Promise);
            const greedy = op(GreedyPromise);
            return Promise.allSettled([vanilla, greedy]).then(([expected, actual]) => {
              expect(actual).to.eql(expected);
            })
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
  })
});

describe('promiseControls', () => {
  function lazyControls() {
    // NOTE: here we are testing that calling resolve / reject works correctly regardless of whether the
    // browser runs promise resolvers before / after returning control to the code; e.g. with the following:
    //
    // new Promise(() => console.log('1')); console.log('2')
    //
    // it seems that the browser will output '1', then '2' - but is it always guaranteed to do so?
    // it's not clear from MDN (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise)
    // so here we make sure it works in both cases.

    return promiseControls({
      promiseFactory: (r) => ({
        then: function () {
          const p = new Promise(r);
          return p.then.apply(p, arguments);
        }
      })
    })
  }
  Object.entries({
    'resolve': (p) => p,
    'reject': (p) => p.then(() => 'wrong', (v) => v)
  }).forEach(([method, transform]) => {
    describe(method, () => {
      Object.entries({
        'before the resolver': lazyControls,
        'after the resolver': promiseControls,
      }).forEach(([t, controls]) => {
        describe(`when called ${t}`, () => {
          it(`should ${method} the promise`, () => {
            const ctl = controls();
            ctl[method]('result');
            return transform(ctl.promise).then((res) => expect(res).to.equal('result'));
          });

          it('should ignore calls after the first', () => {
            const ctl = controls();
            ctl[method]('result');
            ctl[method]('other');
            return transform(ctl.promise).then((res) => expect(res).to.equal('result'));
          });
        })
      })
    })
  });
});
