import {getBidIdParameter} from '../../../libraries/bidderUtils/bidderUtils.js';
import assert from 'assert';

describe('getBidIdParameter', function () {
  it('should return value of the key in input object', function () {
    var obj = {
      a: 'valueA',
      b: 'valueB'
    };
    var output = getBidIdParameter('a', obj);
    assert.equal(output, 'valueA');
  });

  it('should return empty string, if the key is not existsed in the object', function () {
    var obj = {
      a: 'valueA',
      b: 'valueB'
    };
    var output = getBidIdParameter('c', obj);
    assert.equal(output, '');
  });
});
