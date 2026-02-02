import {
  addExt,
  EXT_PROMOTIONS,
  moveRule,
  splitPath,
  toOrtb25, toOrtb26
} from '../../../libraries/ortb2.5Translator/translator.js';
import {deepAccess, deepClone, deepSetValue} from '../../../src/utils.js';

describe('ORTB 2.5 translation', () => {
  describe('moveRule', () => {
    const rule = moveRule('f1.f2.f3', (prefix, field) => `${prefix}.m1.m2.${field}`);

    function applyRule(rule, obj, del = true) {
      obj = deepClone(obj);
      const deleter = rule(obj);
      if (typeof deleter === 'function' && del) {
        deleter();
      }
      return obj;
    }

    it('returns undef when field is not present', () => {
      expect(rule({})).to.eql(undefined);
    });
    it('can copy field', () => {
      expect(applyRule(rule, {f1: {f2: {f3: 'value'}}}, false)).to.eql({
        f1: {
          f2: {
            f3: 'value',
            m1: {m2: {f3: 'value'}}
          }
        }
      });
    });
    it('can move field', () => {
      expect(applyRule(rule, {f1: {f2: {f3: 'value'}}}, true)).to.eql({f1: {f2: {m1: {m2: {f3: 'value'}}}}});
    });
  });
  describe('toOrtb25', () => {
    EXT_PROMOTIONS.forEach(path => {
      const newPath = addExt(...splitPath(path));

      it(`moves ${path} to ${newPath}`, () => {
        const obj = {};
        deepSetValue(obj, path, 'val');
        toOrtb25(obj);
        expect(deepAccess(obj, path)).to.eql(undefined);
        expect(deepAccess(obj, newPath)).to.eql('val');
      });
    });
    it('moves kwarray into keywords', () => {
      expect(toOrtb25({app: {keywords: 'k1,k2', kwarray: ['ka1', 'ka2']}})).to.eql({app: {keywords: 'k1,k2,ka1,ka2'}});
    });
    it('does not choke if kwarray is not an array', () => {
      expect(toOrtb25({site: {keywords: 'k1,k2', kwarray: 'err'}})).to.eql({site: {keywords: 'k1,k2'}});
    });
    it('does not choke if keywords is not a string', () => {
      expect(toOrtb25({user: {keywords: {}, kwarray: ['ka1', 'ka2']}})).to.eql({
        user: {
          keywords: {},
          kwarray: ['ka1', 'ka2']
        }
      });
    });
  });
  describe('toOrtb26', () => {
    EXT_PROMOTIONS.forEach(path => {
      const oldPath = addExt(...splitPath(path));

      it(`moves ${oldPath} to ${path}`, () => {
        const obj = {};
        deepSetValue(obj, oldPath, 'val');
        toOrtb26(obj);
        expect(deepAccess(obj, oldPath)).to.eql(undefined);
        expect(deepAccess(obj, path)).to.eql('val');
      });
    });
  })
});
