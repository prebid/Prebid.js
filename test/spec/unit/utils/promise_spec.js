import {promiseControls} from '../../../../src/utils/promise.js';

describe('promiseControls', () => {
  Object.entries({
    'resolve': (p) => p,
    'reject': (p) => p.then(() => 'incorrect', (v) => v)
  }).forEach(([method, transform]) => {
    describe(method, () => {
      it(`should ${method} the promise when called after its resolver runs`, (done) => {
        const ctl = promiseControls();
        setTimeout(() => {
          ctl[method]('result');
          transform(ctl.promise).then((result) => {
            expect(result).to.equal('result');
            done();
          });
        });
      });

      it(`should ${method} the promise when called before its resolver runs`, () => {
        const ctl = promiseControls();
        ctl[method]('result');
        return transform(ctl.promise).then((result) => {
          expect(result).to.equal('result');
        });
      });
    });
  });
});
