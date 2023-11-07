import {tryAppendQueryString} from '../../../libraries/urlUtils/urlUtils.js';
import assert from 'assert';

describe('tryAppendQueryString', function () {
  it('should append query string to existing url', function () {
    var url = 'www.a.com?';
    var key = 'b';
    var value = 'c';

    var output = tryAppendQueryString(url, key, value);

    var expectedResult = url + key + '=' + encodeURIComponent(value) + '&';
    assert.equal(output, expectedResult);
  });

  it('should return existing url, if the value is empty', function () {
    var url = 'www.a.com?';
    var key = 'b';
    var value = '';

    var output = tryAppendQueryString(url, key, value);
    assert.equal(output, url);
  });
});
