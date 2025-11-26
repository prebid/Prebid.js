import {
  objectTransformer,
  ORTB_EIDS_PATHS, ORTB_GEO_PATHS,
  ORTB_IPV4_PATHS,
  ORTB_IPV6_PATHS,
  ORTB_UFPD_PATHS,
  redactorFactory, redactRule
} from '../../../src/activities/redactor.js';
import {ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE} from '../../../src/activities/params.js';
import {
  ACTIVITY_TRANSMIT_EIDS,
  ACTIVITY_TRANSMIT_PRECISE_GEO, ACTIVITY_TRANSMIT_TID,
  ACTIVITY_TRANSMIT_UFPD
} from '../../../src/activities/activities.js';
import {deepAccess, deepSetValue} from '../../../src/utils.js';
import {activityParams} from '../../../src/activities/activityParams.js';

describe('objectTransformer', () => {
  describe('using dummy rules', () => {
    let rule, applies, run;
    beforeEach(() => {
      run = sinon.stub();
      applies = sinon.stub().callsFake(() => true)
      rule = {
        name: 'mockRule',
        paths: ['foo', 'bar.baz'],
        applies,
        run,
      }
    });

    it('runs rule for each path', () => {
      const obj = {foo: 'val'};
      objectTransformer([rule])({}, obj);
      sinon.assert.calledWith(run, obj, null, obj, 'foo');
      sinon.assert.calledWith(run, obj, 'bar', undefined, 'baz');
    });

    it('does not run rule once it is known that it does not apply', () => {
      applies.resetHistory();
      applies.resetBehavior();
      applies.callsFake(() => false);
      run.callsFake((_1, _2, _3, _4, applies) => applies());
      objectTransformer([rule])({}, {});
      expect(applies.callCount).to.equal(1);
      expect(run.callCount).to.equal(1);
    });

    it('does not call apply more than once', () => {
      run.callsFake((_1, _2, _3, _4, applies) => {
        applies();
        applies();
      });
      objectTransformer([rule])({}, {});
      expect(applies.callCount).to.equal(1);
    });

    it('does not call apply if session already contains a result for the rule', () => {
      objectTransformer([rule])({[rule.name]: false}, {});
      expect(applies.callCount).to.equal(0);
      expect(run.callCount).to.equal(0);
    })

    it('passes arguments to applies', () => {
      run.callsFake((_1, _2, _3, _4, applies) => applies());
      const arg1 = {n: 0};
      const arg2 = {n: 1};
      objectTransformer([rule])({}, {}, arg1, arg2);
      sinon.assert.calledWith(applies, arg1, arg2);
    });

    it('collects rule results', () => {
      let i = 0;
      run.callsFake(() => i++);
      const result = objectTransformer([rule])({}, {});
      expect(result).to.eql([0, 1]);
    })
  });

  describe('using redact rules', () => {
    Object.entries({
      replacement: {
        get(path, val) {
          return `repl${val}`
        },
        expectation(parent, prop, val) {
          sinon.assert.match(parent, {
            [prop]: val
          })
        }
      },
      removal: {
        get(path, val) {},
        expectation(parent, prop, val) {
          expect(Object.keys(parent)).to.not.include.members([prop]);
        }
      }
    }).forEach(([t, {get, expectation}]) => {
      describe(`property ${t}`, () => {
        it('should work on top level properties', () => {
          const obj = {foo: 1, bar: 2};
          objectTransformer([
            redactRule({
              name: 'test',
              get,
              paths: ['foo'],
              applies() { return true }
            })
          ])({}, obj);
          sinon.assert.match(obj, {
            bar: 2
          });
          expectation(obj, 'foo', get(1));
        });
        it('should work on nested properties', () => {
          const obj = {outer: {inner: {foo: 'bar'}, baz: 0}};
          objectTransformer([
            redactRule({
              name: 'test',
              get,
              paths: ['outer.inner.foo'],
              applies() { return true; }
            })
          ])({}, obj);
          sinon.assert.match(obj, {
            outer: {
              baz: 0
            }
          });
          expectation(obj.outer.inner, 'foo', get('bar'))
        })
      });
    });
    describe('should not run rule if property is', () => {
      Object.entries({
        'missing': {},
        'empty array': {foo: []},
        'empty object': {foo: {}},
        'null': {foo: null},
        'undefined': {foo: undefined}
      }).forEach(([t, obj]) => {
        it(t, () => {
          const get = sinon.stub();
          const applies = sinon.stub()
          objectTransformer([redactRule({
            name: 'test',
            paths: ['foo'],
            applies,
            get,
          })])({}, obj);
          expect(get.called).to.be.false;
          expect(applies.called).to.be.false;
        })
      })
    });

    describe('should run rule on falsy, but non-empty, value', () => {
      Object.entries({
        zero: 0,
        false: false
      }).forEach(([t, val]) => {
        it(t, () => {
          const obj = {foo: val};
          objectTransformer([redactRule({
            name: 'test',
            paths: ['foo'],
            applies() { return true },
            get(val) { return 'repl' },
          })])({}, obj);
          expect(obj).to.eql({foo: 'repl'});
        })
      })
    });

    it('should not run applies twice for the same name/session combination', () => {
      const applies = sinon.stub().callsFake(() => true);
      const notApplies = sinon.stub().callsFake(() => false);
      const t1 = objectTransformer([
        {
          name: 'applies',
          paths: ['foo'],
          applies,
          get(val) { return `repl_r1_${val}`; },
        },
        {
          name: 'notApplies',
          paths: ['notFoo'],
          applies: notApplies,
        }
      ].map(redactRule));
      const t2 = objectTransformer([
        {
          name: 'applies',
          paths: ['bar'],
          applies,
          get(val) { return `repl_r2_${val}` }
        },
        {
          name: 'notApplies',
          paths: ['notBar'],
          applies: notApplies,
        }
      ].map(redactRule));
      const obj = {
        foo: '1',
        notFoo: '2',
        bar: '3',
        notBar: '4'
      }
      const session = {};
      t1(session, obj);
      t2(session, obj);
      expect(obj).to.eql({
        foo: 'repl_r1_1',
        notFoo: '2',
        bar: 'repl_r2_3',
        notBar: '4'
      });
      expect(applies.callCount).to.equal(1);
      expect(notApplies.callCount).to.equal(1);
    })
  });
});

describe('redactor', () => {
  const MODULE_TYPE = 'mockType';
  const MODULE_NAME = 'mockModule';

  let isAllowed, redactor;

  beforeEach(() => {
    isAllowed = sinon.stub();
    redactor = redactorFactory((activity, params) => {
      if (params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE && params[ACTIVITY_PARAM_COMPONENT_NAME] === MODULE_NAME) {
        return isAllowed(activity)
      } else {
        throw new Error('wrong component')
      }
    })(activityParams(MODULE_TYPE, MODULE_NAME));
  });

  function testAllowDeny(activity, fn) {
    Object.entries({
      allowed: true,
      denied: false
    }).forEach(([t, allowed]) => {
      describe(`when '${activity}' is ${t}`, () => {
        beforeEach(() => {
          isAllowed.callsFake((act) => {
            if (act === activity) {
              return allowed;
            } else {
              throw new Error('wrong activity');
            }
          });
        });
        fn(allowed);
      });
    });
  }

  function testPropertiesAreRemoved(method, properties, allowed) {
    properties.forEach(prop => {
      it(`should ${allowed ? 'NOT ' : ''}remove ${prop}`, () => {
        const obj = {};
        deepSetValue(obj, prop, 'mockVal');
        method()(obj);
        expect(deepAccess(obj, prop)).to.eql(allowed ? 'mockVal' : undefined);
      })
    })
  }

  describe('.bidRequest', () => {
    testAllowDeny(ACTIVITY_TRANSMIT_EIDS, (allowed) => {
      testPropertiesAreRemoved(() => redactor.bidRequest, ['userId', 'userIdAsEids'], allowed);
    });

    testAllowDeny(ACTIVITY_TRANSMIT_TID, (allowed) => {
      testPropertiesAreRemoved(() => redactor.bidRequest, ['ortb2Imp.ext.tid', 'ortb2Imp.ext.tidSource'], allowed);
    })
  });

  describe('.ortb2', () => {
    testAllowDeny(ACTIVITY_TRANSMIT_EIDS, (allowed) => {
      testPropertiesAreRemoved(() => redactor.ortb2, ORTB_EIDS_PATHS, allowed)
    });

    testAllowDeny(ACTIVITY_TRANSMIT_UFPD, (allowed) => {
      testPropertiesAreRemoved(() => redactor.ortb2, ORTB_UFPD_PATHS, allowed)
    });

    testAllowDeny(ACTIVITY_TRANSMIT_TID, (allowed) => {
      testPropertiesAreRemoved(() => redactor.ortb2, ['source.tid', 'source.ext.tidSource'], allowed);
    });

    testAllowDeny(ACTIVITY_TRANSMIT_PRECISE_GEO, (allowed) => {
      ORTB_GEO_PATHS.forEach(path => {
        it(`should ${allowed ? 'NOT ' : ''} round down ${path}`, () => {
          const ortb2 = {};
          deepSetValue(ortb2, path, 1.2345);
          redactor.ortb2(ortb2);
          expect(deepAccess(ortb2, path)).to.eql(allowed ? 1.2345 : 1.23);
        })
      })
      ORTB_IPV4_PATHS.forEach(path => {
        it(`should ${allowed ? 'NOT ' : ''} round down ${path}`, () => {
          const ortb2 = {};
          deepSetValue(ortb2, path, '192.168.1.1');
          redactor.ortb2(ortb2);
          expect(deepAccess(ortb2, path)).to.eql(allowed ? '192.168.1.1' : '192.168.1.0');
        })
      })
      ORTB_IPV6_PATHS.forEach(path => {
        it(`should ${allowed ? 'NOT ' : ''} round down ${path}`, () => {
          const ortb2 = {};
          deepSetValue(ortb2, path, '2001:0000:130F:0000:0000:09C0:876A:130B');
          redactor.ortb2(ortb2);
          expect(deepAccess(ortb2, path)).to.eql(allowed ? '2001:0000:130F:0000:0000:09C0:876A:130B' : '2001:0:130f:0:0:0:0:0');
        })
      })
    });
  });
})
