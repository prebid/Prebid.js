import {tryAppendQueryString} from '../../../libraries/urlUtils/urlUtils.js';
import assert from 'assert';

describe('tryAppendQueryString', function () {
  it('should append query string to existing url', function () {
    let url = 'www.a.com?';
    let key = 'b';
    let value = 'c';

    let output = tryAppendQueryString(url, key, value);

    let expectedResult = url + key + '=' + encodeURIComponent(value) + '&';
    assert.equal(output, expectedResult);
  });

  it('should return existing url, if the value is empty', function () {
    let url = 'www.a.com?';
    let key = 'b';
    let value = '';

    let output = tryAppendQueryString(url, key, value);
    assert.equal(output, url);
  });
});
