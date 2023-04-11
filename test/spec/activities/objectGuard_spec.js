import {guardObject, objectGuard} from '../../../src/activities/objectGuard.js';

describe('objectGuard', () => {
  describe('read rule', () => {
    let rule, allow;
    beforeEach(() => {
      allow = false;
      rule = {
        read(getVal) { if (allow) return getVal() }
      }
    })
    it('can prevent top level read access', () => {
      const obj = objectGuard({'foo': rule})({'foo': 1, 'bar': 2});
      expect(obj).to.eql({
        foo: undefined,
        bar: 2
      });
      allow = true;
      expect(obj).to.eql({
        foo: 1,
        bar: 2
      })
    });

    it('does not choke if a guarded property is missing', () => {
      const obj = objectGuard({foo: rule})({});
      expect(obj.foo).to.not.exist;
      allow = true;
      expect(obj.foo).to.not.exist;
    });

    it('can prevent nested property access', () => {
      const obj = objectGuard({'outer.inner.foo': rule})({
        foo: 0,
        outer: {
          foo: 1,
          inner: {
            foo: 2
          },
          bar: {
            foo: 3
          }
        }
      });
      expect(obj).to.eql({
        foo: 0,
        outer: {
          foo: 1,
          inner: {
            foo: undefined,
          },
          bar: {
            foo: 3
          }
        }
      })
    })
  });
});
