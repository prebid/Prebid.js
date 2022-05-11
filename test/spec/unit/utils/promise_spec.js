import {promiseControls} from '../../../../src/utils/promise.js';

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
