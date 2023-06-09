import {objectGuard, writeProtectRule} from '../../../libraries/objectGuard/objectGuard.js';

describe('objectGuard', () => {
  describe('read rule', () => {
    let rule, applies;
    beforeEach(() => {
      applies = true;
      rule = {
        paths: ['foo', 'outer.inner.foo'],
        name: 'testRule',
        applies: sinon.stub().callsFake(() => applies),
        get(val) { return `repl${val}` },
      }
    })
    it('can prevent top level read access', () => {
      const {obj} = objectGuard([rule])({'foo': 1, 'other': 2});
      expect(obj).to.eql({
        foo: 'repl1',
        other: 2
      });
    });

    it('does not choke if a guarded property is missing', () => {
      const {obj} = objectGuard([rule])({});
      expect(obj.foo).to.not.exist;
    });

    it('does not prevent access if applies returns false', () => {
      applies = false;
      const {obj} = objectGuard([rule])({foo: 1});
      expect(obj).to.eql({
        foo: 1
      });
    })

    it('can prevent nested property access', () => {
      const {obj} = objectGuard([rule])({
        other: 0,
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
        other: 0,
        outer: {
          foo: 1,
          inner: {
            foo: 'repl2',
          },
          bar: {
            foo: 3
          }
        }
      })
    });

    it('does not call applies more than once', () => {
      JSON.stringify(objectGuard([rule])({
        foo: 0,
        outer: {
          inner: {
            foo: 1
          }
        }
      }).obj);
      expect(rule.applies.callCount).to.equal(1);
    })
  });

  describe('write protection', () => {
    let applies, rule;

    beforeEach(() => {
      applies = true;
      rule = writeProtectRule({
        paths: ['foo', 'bar', 'outer.inner.foo', 'outer.inner.bar'],
        applies: sinon.stub().callsFake(() => applies)
      });
    });

    it('should undo top-level writes', () => {
      const obj = {bar: {nested: 'val'}, other: 'val'};
      const guard = objectGuard([rule])(obj);
      guard.obj.foo = 'denied';
      guard.obj.bar.nested = 'denied';
      guard.obj.bar.other = 'denied';
      guard.obj.other = 'allowed';
      guard.verify();
      expect(obj).to.eql({bar: {nested: 'val'}, other: 'allowed'});
    });

    it('should undo top-level deletes', () => {
      const obj = {foo: {nested: 'val'}, bar: 'val'};
      const guard = objectGuard([rule])(obj);
      delete guard.obj.foo.nested;
      delete guard.obj.bar;
      guard.verify();
      expect(obj).to.eql({foo: {nested: 'val'}, bar: 'val'});
    })

    it('should undo nested writes', () => {
      const obj = {outer: {inner: {bar: {nested: 'val'}, other: 'val'}}};
      const guard = objectGuard([rule])(obj);
      guard.obj.outer.inner.bar.other = 'denied';
      guard.obj.outer.inner.bar.nested = 'denied';
      guard.obj.outer.inner.foo = 'denied';
      guard.obj.outer.inner.other = 'allowed';
      guard.verify();
      expect(obj).to.eql({
        outer: {
          inner: {
            bar: {
              nested: 'val'
            },
            other: 'allowed'
          }
        }
      })
    });

    it('should undo nested deletes', () => {
      const obj = {outer: {inner: {foo: {nested: 'val'}, bar: 'val'}}};
      const guard = objectGuard([rule])(obj);
      delete guard.obj.outer.inner.foo.nested;
      delete guard.obj.outer.inner.bar;
      guard.verify();
      expect(obj).to.eql({outer: {inner: {foo: {nested: 'val'}, bar: 'val'}}})
    });

    it('should work on null properties', () => {
      const obj = {foo: null};
      const guard = objectGuard([rule])(obj);
      guard.obj.foo = 'denied';
      guard.verify();
      expect(obj).to.eql({foo: null});
    });
  });
});
