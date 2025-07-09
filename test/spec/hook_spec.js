import {hook as makeHook, ignoreCallbackArg} from '../../src/hook.js';

describe('hooks', () => {
  describe('ignoreCallbackArg', () => {
    it('allows async hooks to treat last argument as a normal argument', () => {
      let hk = ignoreCallbackArg(makeHook('async', () => null));
      hk.before((next, arg, fn) => {
        fn(arg);
      })
      hk('arg', (arg) => {
        expect(arg).to.eql('arg');
      })
    })
  })
})
