import {Arr, ERR_ENUM, ERR_TYPE, ERR_UNKNOWN_FIELD, IntEnum, Obj} from '../../../libraries/ortb2.5StrictTranslator/dsl.js';
import {deepClone} from '../../../src/utils.js';

describe('DSL', () => {
  const spec = (() => {
    const inner = Obj(['p21', 'p22'], {
      enum: IntEnum(10, 20),
      enumArray: Arr(IntEnum(10, 20))
    });
    return Obj(['p11', 'p12'], {
      inner,
      innerArray: Arr(inner)
    });
  })();

  let onError;

  function scan(obj) {
    spec(null, null, null, obj, onError);
  }

  beforeEach(() => {
    onError = sinon.stub();
  });

  it('checks object type', () => {
    scan(null);
    sinon.assert.calledWith(onError, ERR_TYPE, null, null, null, null);
  });
  it('ignores known fields and ext', () => {
    scan({p11: 1, p12: 2, ext: {e1: 1, e2: 2}});
    sinon.assert.notCalled(onError);
  });
  it('detects unknown fields', () => {
    const obj = {p11: 1, unk: 2};
    scan(obj);
    sinon.assert.calledOnce(onError);
    sinon.assert.calledWith(onError, ERR_UNKNOWN_FIELD, 'unk', obj, 'unk', 2);
  });
  describe('when nested', () => {
    describe('directly', () => {
      it('detects unknown fields', () => {
        const obj = {inner: {p21: 1, unk: 2}};
        scan(obj);
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWith(onError, ERR_UNKNOWN_FIELD, 'inner.unk', obj.inner, 'unk', 2);
      });
      it('accepts enum values in range', () => {
        scan({inner: {enum: 12}});
        sinon.assert.notCalled(onError);
      });
      [Infinity, NaN, -Infinity].forEach(val => {
        it(`does not accept ${val} in enum`, () => {
          const obj = {inner: {enum: val}};
          scan(obj);
          sinon.assert.calledOnce(onError);
          sinon.assert.calledWith(onError, ERR_ENUM, 'inner.enum', obj.inner, 'enum', val);
        });
      });
      it('accepts arrays of enums that are in range', () => {
        scan({inner: {enumArray: [12, 13]}});
        sinon.assert.notCalled(onError);
      })
      it('detects enum values out of range', () => {
        const obj = {inner: {enum: -1}};
        scan(obj);
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWith(onError, ERR_ENUM, 'inner.enum', obj.inner, 'enum', -1);
      });
      it('detects enum values that are not numbers', () => {
        const obj = {inner: {enum: 'err'}};
        scan(obj);
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWith(onError, ERR_TYPE, 'inner.enum', obj.inner, 'enum', 'err');
      })
      it('detects arrays of enums that are out of range', () => {
        const obj = {inner: {enumArray: [12, 13, -1, 14]}};
        scan(obj);
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWith(onError, ERR_ENUM, 'inner.enumArray.2', obj.inner.enumArray, 2, -1);
      });
      it('detects when enum arrays are not arrays', () => {
        const obj = {inner: {enumArray: 'err'}};
        scan(obj);
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWith(onError, ERR_TYPE, 'inner.enumArray', obj.inner, 'enumArray', 'err');
      });
      it('detects items within enum arrays that are not numbers', () => {
        const obj = {inner: {enumArray: [12, 'err', 13]}};
        scan(obj);
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWith(onError, ERR_TYPE, 'inner.enumArray.1', obj.inner.enumArray, 1, 'err');
      })
    });
    describe('into arrays', () => {
      it('detects if inner array is not an array', () => {
        const obj = {innerArray: 'err', inner: {p21: 1}};
        scan(obj);
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWith(onError, ERR_TYPE, 'innerArray', obj, 'innerArray', 'err');
      });
      it('detects when elements of inner array are not objects', () => {
        const obj = {innerArray: [{p21: 1}, 'err', {ext: {r: 1}}]};
        scan(obj);
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWith(onError, ERR_TYPE, 'innerArray.1', obj.innerArray, 1, 'err');
      });
      const oos = {
        innerArray: [
          {p22: 2, unk: 3, enumArray: [-1, 12, 'err']},
          {p21: 1, enum: -1, ext: {e: 1}},
        ]
      };
      it('detects invalid properties within inner array', () => {
        const obj = deepClone(oos);
        scan(obj);
        sinon.assert.calledWith(onError, ERR_UNKNOWN_FIELD, 'innerArray.0.unk', obj.innerArray[0], 'unk', 3);
        sinon.assert.calledWith(onError, ERR_ENUM, 'innerArray.0.enumArray.0', obj.innerArray[0].enumArray, 0, -1);
        sinon.assert.calledWith(onError, ERR_TYPE, 'innerArray.0.enumArray.2', obj.innerArray[0].enumArray, 2, 'err');
        sinon.assert.calledWith(onError, ERR_ENUM, 'innerArray.1.enum', obj.innerArray[1], 'enum', -1);
      });
      it('can remove all invalid properties during scan', () => {
        onError.callsFake((errno, path, obj, field) => {
          Array.isArray(obj) ? obj.splice(field, 1) : delete obj[field];
        });
        const obj = deepClone(oos);
        scan(obj);
        expect(obj).to.eql({
          innerArray: [
            {p22: 2, enumArray: [12]},
            {p21: 1, ext: {e: 1}}
          ]
        });
      })
    })
  })
});
