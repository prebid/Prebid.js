import {ortb2FragmentsGuardFactory, ortb2GuardFactory} from '../../../libraries/objectGuard/ortbGuard.js';
import {ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE} from '../../../src/activities/params.js';
import {
  ACTIVITY_ENRICH_EIDS, ACTIVITY_ENRICH_UFPD,
  ACTIVITY_TRANSMIT_EIDS,
  ACTIVITY_TRANSMIT_UFPD
} from '../../../src/activities/activities.js';
import {activityParams} from '../../../src/activities/activityParams.js';
import {deepAccess, deepClone, deepSetValue, mergeDeep} from '../../../src/utils.js';
import {ORTB_EIDS_PATHS, ORTB_UFPD_PATHS} from '../../../src/activities/redactor.js';
import {objectGuard, writeProtectRule} from '../../../libraries/objectGuard/objectGuard.js';

describe('ortb2Guard', () => {
  const MOD_TYPE = 'test';
  const MOD_NAME = 'mock';
  let isAllowed, ortb2Guard;
  beforeEach(() => {
    isAllowed = sinon.stub();
    ortb2Guard = ortb2GuardFactory(function (activity, params) {
      if (params[ACTIVITY_PARAM_COMPONENT_TYPE] === MOD_TYPE && params[ACTIVITY_PARAM_COMPONENT_NAME] === MOD_NAME) {
        return isAllowed(activity)
      } else {
        throw new Error('wrong component')
      }
    })
  });

  function testAllowDeny(transmitActivity, enrichActivity, fn) {
    Object.entries({
      allowed: true,
      denied: false
    }).forEach(([t, allowed]) => {
      describe(`when '${enrichActivity}' is ${t}`, () => {
        beforeEach(() => {
          isAllowed.callsFake((activity) => {
            if (activity === transmitActivity) return true;
            if (activity === enrichActivity) return allowed;
            throw new Error('wrong activity');
          })
        });
        fn(allowed);
      })
    })
  }

  function testPropertiesAreProtected(properties, allowed) {
    properties.forEach(prop => {
      it(`should ${allowed ? 'keep' : 'undo'} additions to ${prop}`, () => {
        const orig = [{n: 'orig'}];
        const ortb2 = {};
        deepSetValue(ortb2, prop, deepClone(orig));
        const guard = ortb2Guard(ortb2, activityParams(MOD_TYPE, MOD_NAME));
        const mod = {};
        const insert = [{n: 'new'}];
        deepSetValue(mod, prop, insert);
        mergeDeep(guard.obj, mod);
        guard.verify();
        const actual = deepAccess(ortb2, prop);
        if (allowed) {
          expect(actual).to.eql(orig.concat(insert))
        } else {
          expect(actual).to.eql(orig);
        }
      });

      it(`should ${allowed ? 'keep' : 'undo'} modifications to ${prop}`, () => {
        const orig = [{n: 'orig'}];
        const ortb2 = {};
        deepSetValue(ortb2, prop, orig);
        const guard = ortb2Guard(ortb2, activityParams(MOD_TYPE, MOD_NAME));
        deepSetValue(guard.obj, `${prop}.0.n`, 'new');
        guard.verify();
        const actual = deepAccess(ortb2, prop);
        if (allowed) {
          expect(actual).to.eql([{n: 'new'}]);
        } else {
          expect(actual).to.eql([{n: 'orig'}]);
        }
      });
    })
  }

  testAllowDeny(ACTIVITY_TRANSMIT_EIDS, ACTIVITY_ENRICH_EIDS, (allowed) => {
    testPropertiesAreProtected(ORTB_EIDS_PATHS, allowed);
  });

  testAllowDeny(ACTIVITY_TRANSMIT_UFPD, ACTIVITY_ENRICH_UFPD, (allowed) => {
    testPropertiesAreProtected(ORTB_UFPD_PATHS, allowed);
  });
});

describe('ortb2FragmentsGuard', () => {
  let guardFragments
  beforeEach(() => {
    const testGuard = objectGuard([
      writeProtectRule({
        paths: ['foo'],
        applies: () => true,
        name: 'testRule'
      })
    ])
    guardFragments = ortb2FragmentsGuardFactory(testGuard);
  });

  it('should undo changes to global FPD', () => {
    const fragments = {
      global: {
        foo: {inner: 'val'}
      }
    }
    const guard = guardFragments(fragments);
    guard.obj.global.foo = 'other';
    guard.verify();
    expect(fragments.global.foo).to.eql({inner: 'val'});
  });

  it('should undo changes to bidder FPD', () => {
    const fragments = {
      bidder: {
        A: {
          foo: 'val'
        }
      }
    };
    const guard = guardFragments(fragments);
    guard.obj.bidder.A.foo = 'denied';
    guard.verify();
    expect(fragments.bidder.A).to.eql({foo: 'val'});
  });

  it('should undo changes to bidder FPD that was not initially there', () => {
    const fragments = {
      bidder: {}
    };
    const guard = guardFragments(fragments);
    guard.obj.bidder.A = {foo: 'denied', other: 'allowed'};
    guard.verify();
    expect(fragments.bidder.A).to.eql({other: 'allowed'});
  });
})
