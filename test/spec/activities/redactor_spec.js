import {
  objectTransformer,
  ORTB_EIDS_PATHS, ORTB_GEO_PATHS,
  ORTB_UFPD_PATHS,
  redactorFactory
} from '../../../src/activities/redactor.js';
import {ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE} from '../../../src/activities/params.js';
import {
  ACTIVITY_TRANSMIT_EIDS,
  ACTIVITY_TRANSMIT_PRECISE_GEO,
  ACTIVITY_TRANSMIT_UFPD
} from '../../../src/activities/activities.js';
import {deepAccess, deepSetValue} from '../../../src/utils.js';
import {activityParams} from '../../../src/activities/activityParams.js';

describe('objectTransformer', () => {
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
        const actual = objectTransformer([
          {
            name: 'test',
            get,
            paths: ['foo'],
            applies() { return true }
          }
        ])({}, {foo: 1, bar: 2});
        sinon.assert.match(actual, {
          bar: 2
        });
        expectation(actual, 'foo', get(1));
      });
      it('should work on nested properties', () => {
        const actual = objectTransformer([
          {
            name: 'test',
            get,
            paths: ['outer.inner.foo'],
            applies() { return true; }
          }
        ])({}, {outer: {inner: {foo: 'bar'}, baz: 0}});
        sinon.assert.match(actual, {
          outer: {
            baz: 0
          }
        });
        expectation(actual.outer.inner, 'foo', get('bar'))
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
        objectTransformer([{
          name: 'test',
          paths: ['foo'],
          applies,
          get,
        }])({}, obj);
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
        const actual = objectTransformer([{
          name: 'test',
          paths: ['foo'],
          applies() { return true },
          get(val) { return 'repl' },
        }])({}, {foo: val});
        expect(actual).to.eql({foo: 'repl'});
      })
    })
  });

  it('should pass arguments to applies', () => {
    const applies = sinon.stub();
    const transform = objectTransformer([
      {
        name: 'test',
        paths: ['foo'],
        applies,
        get() {}
      },
    ]);
    const arg1 = {n: 1};
    const arg2 = {n: 2};
    transform({}, {foo: 'bar'}, arg1, arg2);
    sinon.assert.calledWith(applies, arg1, arg2);
  });

  describe('when multiple paths match for the same rule', () => {
    it('should run applies only once', () => {
      const applies = sinon.stub().callsFake(() => true);
      const actual = objectTransformer([
        {
          name: 'test',
          paths: ['foo.bar', 'foo.baz'],
          applies,
          get(val) { return `repl${val}` }
        }
      ])({}, {
        foo: {
          bar: 1,
          baz: 2
        }
      });
      expect(actual).to.eql({
        foo: {
          bar: 'repl1',
          baz: 'repl2'
        }
      });
      expect(applies.callCount).to.equal(1);
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
    ]);
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
    ]);
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
  });

  describe('.ortb2', () => {
    testAllowDeny(ACTIVITY_TRANSMIT_EIDS, (allowed) => {
      testPropertiesAreRemoved(() => redactor.ortb2, ORTB_EIDS_PATHS, allowed)
    });

    testAllowDeny(ACTIVITY_TRANSMIT_UFPD, (allowed) => {
      testPropertiesAreRemoved(() => redactor.ortb2, ORTB_UFPD_PATHS, allowed)
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
    })
  });
})
