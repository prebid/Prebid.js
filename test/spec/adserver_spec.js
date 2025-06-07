import { expect } from 'chai';
import { hook } from 'src/hook.js';
import { getPPID } from 'src/adserver.js';

describe('adserver', function() {
  before(function() {
    hook.ready();
  });

  it('returns undefined by default', function() {
    expect(getPPID()).to.be.undefined;
  });

  it('returns hooked value when hook provided', function() {
    function hookFn(next) {
      next.bail('hooked');
    }
    getPPID.before(hookFn);
    try {
      expect(getPPID()).to.equal('hooked');
    } finally {
      getPPID.getHooks({hook: hookFn}).remove();
    }
  });
});
