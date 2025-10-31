import {defer} from '../../../../src/utils/promise.js';

describe('defer', () => {
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
