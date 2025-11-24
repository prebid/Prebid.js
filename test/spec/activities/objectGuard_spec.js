import {objectGuard, writeProtectRule} from '../../../libraries/objectGuard/objectGuard.js';
import {redactRule} from '../../../src/activities/redactor.js';

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
    it('should preserve object identity', () => {
      const guard = objectGuard([rule])({outer: {inner: {foo: 'bar'}}});
      expect(guard.outer).to.equal(guard.outer);
      expect(guard.outer.inner).to.equal(guard.outer.inner);
    })
    it('can prevent top level read access', () => {
      const obj = objectGuard([rule])({'foo': 1, 'other': 2});
      expect(obj).to.eql({
        foo: 'repl1',
        other: 2
      });
    });

    it('does not choke if a guarded property is missing', () => {
      const obj = objectGuard([rule])({});
      expect(obj.foo).to.not.exist;
    });

    it('allows concurrent reads', () => {
      const obj = {'foo': 'bar'};
      const guarded = objectGuard([rule])(obj);
      obj.foo = 'baz';
      expect(guarded.foo).to.eql('replbaz');
    })

    it('does not prevent access if applies returns false', () => {
      applies = false;
      const obj = objectGuard([rule])({foo: 1});
      expect(obj).to.eql({
        foo: 1
      });
    })

    it('can prevent nested property access', () => {
      const obj = objectGuard([rule])({
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

    it('prevents nested property access when a parent property is protected', () => {
      const guard = objectGuard([rule])({foo: {inner: 'value'}});
      expect(guard.inner?.value).to.not.exist;
    })

    it('does not call applies more than once', () => {
      JSON.stringify(objectGuard([rule])({
        foo: 0,
        outer: {
          inner: {
            foo: 1
          }
        }
      }));
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

    it('should preserve object identity', () => {
      const guard = objectGuard([rule])({outer: {inner: {foo: 'bar'}}});
      expect(guard.outer).to.equal(guard.outer);
      expect(guard.outer.inner).to.equal(guard.outer.inner);
    })

    it('does not mess up array reads', () => {
      const guard = objectGuard([rule])({foo: [{bar: 'baz'}]});
      expect(guard.foo).to.eql([{bar: 'baz'}]);
    })

    it('prevents array modification', () => {
      const obj = {foo: ['value']};
      const guard = objectGuard([rule])(obj);
      guard.foo.pop();
      guard.foo.push('test');
      expect(obj.foo).to.eql(['value']);
    })

    it('allows array modification when not applicable', () => {
      applies = false;
      const obj = {foo: ['value']};
      const guard = objectGuard([rule])(obj);
      guard.foo.pop();
      guard.foo.push('test');
      expect(obj.foo).to.eql(['test']);
    })

    it('should prevent top-level writes', () => {
      const obj = {bar: {nested: 'val'}, other: 'val'};
      const guard = objectGuard([rule])(obj);
      guard.foo = 'denied';
      guard.bar.nested = 'denied';
      guard.bar.other = 'denied';
      guard.other = 'allowed';
      expect(guard).to.eql({bar: {nested: 'val'}, other: 'allowed'});
    });

    it('should not prevent no-op writes', () => {
      const guard = objectGuard([rule])({foo: {some: 'value'}});
      guard.foo = {some: 'value'};
      sinon.assert.notCalled(rule.applies);
    })

    it('should prevent top-level deletes', () => {
      const obj = {foo: {nested: 'val'}, bar: 'val'};
      const guard = objectGuard([rule])(obj);
      delete guard.foo.nested;
      delete guard.bar;
      expect(guard).to.eql({foo: {nested: 'val'}, bar: 'val'});
    })

    it('should prevent nested writes', () => {
      const obj = {outer: {inner: {bar: {nested: 'val'}, other: 'val'}}};
      const guard = objectGuard([rule])(obj);
      guard.outer.inner.bar.other = 'denied';
      guard.outer.inner.bar.nested = 'denied';
      guard.outer.inner.foo = 'denied';
      guard.outer.inner.other = 'allowed';
      expect(guard).to.eql({
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

    it('should prevent writes if upper levels are protected', () => {
      const obj = {foo: {inner: {}}};
      const guard = objectGuard([rule])(obj);
      guard.foo.inner.prop = 'value';
      expect(obj).to.eql({foo: {inner: {}}});
    })

    it('should prevent deletes if a higher level property is protected', () => {
      const obj = {foo: {inner: {prop: 'value'}}};
      const guard = objectGuard([rule])(obj);
      delete guard.foo.inner.prop;
      expect(obj).to.eql({foo: {inner: {prop: 'value'}}});
    })

    it('should clean up top-level writes that would result in inner properties changing', () => {
      const guard = objectGuard([rule])({outer: {inner: {bar: 'baz'}}});
      guard.outer = {inner: {bar: 'baz', foo: 'baz', prop: 'allowed'}};
      expect(guard).to.eql({outer: {inner: {bar: 'baz', prop: 'allowed'}}});
    })

    it('should not prevent writes that are not protected', () => {
      const obj = {};
      const guard = objectGuard([rule])(obj);
      guard.outer = {
        test: 'value'
      }
      expect(obj.outer.test).to.eql('value');
    })

    it('should not choke on type mismatch: overwrite object with scalar', () => {
      const obj = {outer: {inner: {}}};
      const guard = objectGuard([rule])(obj);
      guard.outer = null;
      expect(obj).to.eql({outer: {inner: {}}});
    });

    it('should not choke on type mismatch: overwrite scalar with object', () => {
      const obj = {outer: null};
      const guard = objectGuard([rule])(obj);
      guard.outer = {inner: {bar: 'denied', other: 'allowed'}};
      expect(obj).to.eql({outer: {inner: {other: 'allowed'}}});
    })

    it('should prevent nested deletes', () => {
      const obj = {outer: {inner: {foo: {nested: 'val'}, bar: 'val'}}};
      const guard = objectGuard([rule])(obj);
      delete guard.outer.inner.foo.nested;
      delete guard.outer.inner.bar;
      expect(guard).to.eql({outer: {inner: {foo: {nested: 'val'}, bar: 'val'}}})
    });

    it('should prevent higher level deletes that would result in inner properties changing', () => {
      const guard = objectGuard([rule])({outer: {inner: {bar: 'baz'}}});
      delete guard.outer.inner;
      expect(guard).to.eql({outer: {inner: {bar: 'baz'}}});
    })

    it('should work on null properties', () => {
      const obj = {foo: null};
      const guard = objectGuard([rule])(obj);
      guard.foo = 'denied';
      expect(guard).to.eql({foo: null});
    });
  });
  describe('multiple rules on the same path', () => {
    it('should each be checked for redacts', () => {
      const obj = objectGuard([
        redactRule({
          paths: ['foo'],
          applies: () => true,
          get(val) {
            return '1' + val;
          }
        }),
        redactRule({
          paths: ['foo'],
          applies: () => true,
          get(val) {
            return '2' + val;
          }
        })
      ])({foo: 'bar'});
      expect(obj.foo).to.eql('21bar');
    });

    it('can apply both redact and write protect', () => {
      const obj = objectGuard([
        redactRule({
          paths: ['foo'],
          applies: () => true,
          get(val) {
            return 'redact' + val;
          },
        }),
        writeProtectRule({
          paths: ['foo'],
          applies: () => true,
        })
      ])({foo: 'bar'});
      obj.foo = 'baz';
      expect(obj.foo).to.eql('redactbar');
    });
  })
});
