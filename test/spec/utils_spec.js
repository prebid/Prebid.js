import { getAdServerTargeting } from 'test/fixtures/fixtures';
import { expect } from 'chai';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';

var assert = require('assert');

describe('Utils', function () {
  var obj_string = 's',
    obj_number = 1,
    obj_object = {},
    obj_array = [],
    obj_function = function () {};

  var type_string = 'String',
    type_number = 'Number',
    type_object = 'Object',
    type_array = 'Array',
    type_function = 'Function';

  describe('replaceTokenInString', function () {
    it('should replace all given tokens in a String', function () {
      var tokensToReplace = {
        foo: 'bar',
        zap: 'quux'
      };

      var output = utils.replaceTokenInString('hello %FOO%, I am %ZAP%', tokensToReplace, '%');
      assert.equal(output, 'hello bar, I am quux');
    });

    it('should ignore tokens it does not see', function () {
      var output = utils.replaceTokenInString('hello %FOO%', {}, '%');

      assert.equal(output, 'hello %FOO%');
    });
  });

  describe('getBidIdParameter', function () {
    it('should return value of the key in input object', function () {
      var obj = {
        a: 'valueA',
        b: 'valueB'
      };
      var output = utils.getBidIdParameter('a', obj);
      assert.equal(output, 'valueA');
    });

    it('should return empty string, if the key is not existsed in the object', function () {
      var obj = {
        a: 'valueA',
        b: 'valueB'
      };
      var output = utils.getBidIdParameter('c', obj);
      assert.equal(output, '');
    });
  });

  describe('tryAppendQueryString', function () {
    it('should append query string to existing url', function () {
      var url = 'www.a.com?';
      var key = 'b';
      var value = 'c';

      var output = utils.tryAppendQueryString(url, key, value);

      var expectedResult = url + key + '=' + encodeURIComponent(value) + '&';
      assert.equal(output, expectedResult);
    });

    it('should return existing url, if the value is empty', function () {
      var url = 'www.a.com?';
      var key = 'b';
      var value = '';

      var output = utils.tryAppendQueryString(url, key, value);
      assert.equal(output, url);
    });
  });

  describe('parseQueryStringParameters', function () {
    it('should append query string to existing using the input obj', function () {
      var obj = {
        a: '1',
        b: '2'
      };

      var output = utils.parseQueryStringParameters(obj);
      var expectedResult = 'a=' + encodeURIComponent('1') + '&b=' + encodeURIComponent('2') + '&';
      assert.equal(output, expectedResult);
    });

    it('should return an empty string, if input obj is empty', function () {
      var obj = {};
      var output = utils.parseQueryStringParameters(obj);
      assert.equal(output, '');
    });
  });

  describe('transformAdServerTargetingObj', function () {
    it('should append query string to existing using the input obj', function () {
      var obj = getAdServerTargeting();

      var output = utils.transformAdServerTargetingObj(obj[Object.keys(obj)[0]]);
      var expected = 'foobar=0x0%2C300x250%2C300x600&' + CONSTANTS.TARGETING_KEYS.SIZE + '=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '=233bcbee889d46d&' + CONSTANTS.TARGETING_KEYS.BIDDER + '=appnexus&' + CONSTANTS.TARGETING_KEYS.SIZE + '_triplelift=0x0&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_triplelift=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_triplelift=222bb26f9e8bd&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_triplelift=triplelift&' + CONSTANTS.TARGETING_KEYS.SIZE + '_appnexus=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_appnexus=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_appnexus=233bcbee889d46d&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_appnexus=appnexus&' + CONSTANTS.TARGETING_KEYS.SIZE + '_pagescience=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_pagescience=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_pagescience=25bedd4813632d7&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_pagescienc=pagescience&' + CONSTANTS.TARGETING_KEYS.SIZE + '_brightcom=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_brightcom=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_brightcom=26e0795ab963896&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_brightcom=brightcom&' + CONSTANTS.TARGETING_KEYS.SIZE + '_brealtime=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_brealtime=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_brealtime=275bd666f5a5a5d&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_brealtime=brealtime&' + CONSTANTS.TARGETING_KEYS.SIZE + '_pubmatic=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_pubmatic=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_pubmatic=28f4039c636b6a7&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_pubmatic=pubmatic&' + CONSTANTS.TARGETING_KEYS.SIZE + '_rubicon=300x600&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_rubicon=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_rubicon=29019e2ab586a5a&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_rubicon=rubicon';
      assert.equal(output, expected);
    });

    it('should return an empty string, if input obj is empty', function () {
      var obj = {};
      var output = utils.transformAdServerTargetingObj(obj);
      assert.equal(output, '');
    });
  });

  describe('extend', function () {
    it('should merge two input object', function () {
      var target = {
        a: '1',
        b: '2'
      };

      var source = {
        c: '3'
      };

      var expectedResult = {
        a: '1',
        b: '2',
        c: '3'
      };

      var output = Object.assign(target, source);
      assert.deepEqual(output, expectedResult);
    });

    it('should merge two input object even though target object is empty', function () {
      var target = {};
      var source = {
        c: '3'
      };

      var output = Object.assign(target, source);
      assert.deepEqual(output, source);
    });

    it('just return target object, if the source object is empty', function () {
      var target = {
        a: '1',
        b: '2'
      };
      var source = {};

      var output = Object.assign(target, source);
      assert.deepEqual(output, target);
    });
  });

  describe('parseSizesInput', function () {
    it('should return query string using multi size array', function () {
      var sizes = [[728, 90], [970, 90]];
      var output = utils.parseSizesInput(sizes);
      assert.deepEqual(output, ['728x90', '970x90']);
    });

    it('should return query string using single size array', function () {
      var sizes = [728, 90];
      var output = utils.parseSizesInput(sizes);
      assert.deepEqual(output, ['728x90']);
    });

    it('should return query string using string input', function () {
      var sizes = '300x250,970x90';
      var output = utils.parseSizesInput(sizes);
      assert.deepEqual(output, ['300x250', '970x90']);
    });

    it('return undefined if input array is empty', function () {
      var sizes = [];
      var output = utils.parseSizesInput(sizes);
      assert.deepEqual(output, []);
    });
  });

  describe('parseGPTSingleSizeArray', function () {
    it('should return size string with input single size array', function () {
      var size = [300, 250];
      var output = utils.parseGPTSingleSizeArray(size);
      assert.equal(output, '300x250');
    });

    it('should return size string with input single size array', function () {
      var size = ['300', '250'];
      var output = utils.parseGPTSingleSizeArray(size);
      assert.equal(output, '300x250');
    });

    it('return undefined using string input', function () {
      var size = '1';
      var output = utils.parseGPTSingleSizeArray(size);
      assert.equal(output, undefined);
    });

    it('return undefined using number input', function () {
      var size = 1;
      var output = utils.parseGPTSingleSizeArray(size);
      assert.equal(output, undefined);
    });

    it('return undefined using one length single array', function () {
      var size = [300];
      var output = utils.parseGPTSingleSizeArray(size);
      assert.equal(output, undefined);
    });

    it('return undefined if the input is empty', function () {
      var size = '';
      var output = utils.parseGPTSingleSizeArray(size);
      assert.equal(output, undefined);
    });

    it('return undefined if the input is not a number', function () {
      var size = ['foo', 'bar'];
      var output = utils.parseGPTSingleSizeArray(size);
      assert.equal(output, undefined);
    });

    it('return undefined if the input is not a number 2', function () {
      var size = ['foo', 300];
      var output = utils.parseGPTSingleSizeArray(size);
      assert.equal(output, undefined);
    });
  });

  describe('parseGPTSingleSizeArrayToRtbSize', function () {
    it('should return size string with input single size array', function () {
      var size = [300, 250];
      var output = utils.parseGPTSingleSizeArrayToRtbSize(size);
      assert.deepEqual(output, {w: 300, h: 250});
    });

    it('should return size string with input single size array', function () {
      var size = ['300', '250'];
      var output = utils.parseGPTSingleSizeArrayToRtbSize(size);
      assert.deepEqual(output, {w: 300, h: 250});
    });

    it('return undefined using string input', function () {
      var size = '1';
      var output = utils.parseGPTSingleSizeArrayToRtbSize(size);
      assert.equal(output, undefined);
    });

    it('return undefined using number input', function () {
      var size = 1;
      var output = utils.parseGPTSingleSizeArrayToRtbSize(size);
      assert.equal(output, undefined);
    });

    it('return undefined using one length single array', function () {
      var size = [300];
      var output = utils.parseGPTSingleSizeArrayToRtbSize(size);
      assert.equal(output, undefined);
    });

    it('return undefined if the input is empty', function () {
      var size = '';
      var output = utils.parseGPTSingleSizeArrayToRtbSize(size);
      assert.equal(output, undefined);
    });

    it('return undefined if the input is not a number', function () {
      var size = ['foo', 'bar'];
      var output = utils.parseGPTSingleSizeArrayToRtbSize(size);
      assert.equal(output, undefined);
    });

    it('return undefined if the input is not a number 2', function () {
      var size = [300, 'foo'];
      var output = utils.parseGPTSingleSizeArrayToRtbSize(size);
      assert.equal(output, undefined);
    });
  });

  describe('isA', function () {
    it('should return true with string object', function () {
      var output = utils.isA(obj_string, type_string);
      assert.deepEqual(output, true);
    });

    it('should return false with object', function () {
      var output = utils.isA(obj_object, type_string);
      assert.deepEqual(output, false);
    });

    it('should return true with object', function () {
      var output = utils.isA(obj_object, type_object);
      assert.deepEqual(output, true);
    });

    it('should return false with array object', function () {
      var output = utils.isA(obj_array, type_object);
      assert.deepEqual(output, false);
    });

    it('should return true with array object', function () {
      var output = utils.isA(obj_array, type_array);
      assert.deepEqual(output, true);
    });

    it('should return false with array object', function () {
      var output = utils.isA(obj_array, type_function);
      assert.deepEqual(output, false);
    });

    it('should return true with function', function () {
      var output = utils.isA(obj_function, type_function);
      assert.deepEqual(output, true);
    });

    it('should return false with number', function () {
      var output = utils.isA(obj_function, type_number);
      assert.deepEqual(output, false);
    });

    it('should return true with number', function () {
      var output = utils.isA(obj_number, type_number);
      assert.deepEqual(output, true);
    });
  });

  describe('isFn', function () {
    it('should return true with input function', function () {
      var output = utils.isFn(obj_function);
      assert.deepEqual(output, true);
    });

    it('should return false with input string', function () {
      var output = utils.isFn(obj_string);
      assert.deepEqual(output, false);
    });

    it('should return false with input number', function () {
      var output = utils.isFn(obj_number);
      assert.deepEqual(output, false);
    });

    it('should return false with input Array', function () {
      var output = utils.isFn(obj_array);
      assert.deepEqual(output, false);
    });

    it('should return false with input object', function () {
      var output = utils.isFn(obj_object);
      assert.deepEqual(output, false);
    });
  });

  describe('isStr', function () {
    it('should return true with input string', function () {
      var output = utils.isStr(obj_string);
      assert.deepEqual(output, true);
    });

    it('should return false with input number', function () {
      var output = utils.isStr(obj_number);
      assert.deepEqual(output, false);
    });

    it('should return false with input object', function () {
      var output = utils.isStr(obj_object);
      assert.deepEqual(output, false);
    });

    it('should return false with input array', function () {
      var output = utils.isStr(obj_array);
      assert.deepEqual(output, false);
    });

    it('should return false with input function', function () {
      var output = utils.isStr(obj_function);
      assert.deepEqual(output, false);
    });
  });

  describe('isArray', function () {
    it('should return false with input string', function () {
      var output = utils.isArray(obj_string);
      assert.deepEqual(output, false);
    });

    it('should return false with input number', function () {
      var output = utils.isArray(obj_number);
      assert.deepEqual(output, false);
    });

    it('should return false with input object', function () {
      var output = utils.isArray(obj_object);
      assert.deepEqual(output, false);
    });

    it('should return true with input array', function () {
      var output = utils.isArray(obj_array);
      assert.deepEqual(output, true);
    });

    it('should return false with input function', function () {
      var output = utils.isArray(obj_function);
      assert.deepEqual(output, false);
    });
  });

  describe('isPlainObject', function () {
    it('should return false with input string', function () {
      var output = utils.isPlainObject(obj_string);
      assert.deepEqual(output, false);
    });

    it('should return false with input number', function () {
      var output = utils.isPlainObject(obj_number);
      assert.deepEqual(output, false);
    });

    it('should return true with input object', function () {
      var output = utils.isPlainObject(obj_object);
      assert.deepEqual(output, true);
    });

    it('should return false with input array', function () {
      var output = utils.isPlainObject(obj_array);
      assert.deepEqual(output, false);
    });

    it('should return false with input function', function () {
      var output = utils.isPlainObject(obj_function);
      assert.deepEqual(output, false);
    });
  });

  describe('isEmpty', function () {
    it('should return true with empty object', function () {
      var output = utils.isEmpty(obj_object);
      assert.deepEqual(output, true);
    });

    it('should return false with non-empty object', function () {
      var obj = { a: 'b' };
      var output = utils.isEmpty(obj);
      assert.deepEqual(output, false);
    });

    it('should return false with null', function () {
      var obj = null;
      var output = utils.isEmpty(obj);
      assert.deepEqual(output, true);
    });
  });

  describe('contains', function () {
    	it('should return true if the input string contains in the input obj', function () {
      var output = utils.contains('123', '1');
      assert.deepEqual(output, true);
    	});

    	it('should return false if the input string do not contain in the input obj', function () {
      var output = utils.contains('234', '1');
      assert.deepEqual(output, false);
    	});

    it('should return false if the input string is empty', function () {
      var output = utils.contains();
      assert.ok(!output, 'an empty string returns false');
    });
  });

  describe('_map', function () {
    	it('return empty array when input object is empty', function () {
      var input = {};
      var callback = function () {};

      var output = utils._map(input, callback);
      assert.deepEqual(output, []);
    	});

    	it('return value array with vaild input object', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v) { return v; };

      var output = utils._map(input, callback);
      assert.deepEqual(output, ['A', 'B']);
    	});

    	it('return value array with vaild input object_callback func changed 1', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v, k) { return v + k; };

      var output = utils._map(input, callback);
      assert.deepEqual(output, ['Aa', 'Bb']);
    	});

    	it('return value array with vaild input object_callback func changed 2', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v, k, o) { return o; };

      var output = utils._map(input, callback);
      assert.deepEqual(output, [input, input]);
    	});
  });

  describe('createInvisibleIframe', function () {
    var output = utils.createInvisibleIframe();

    it('return iframe - id', function () {
      assert.ok(output.id);
    });

    it('return iframe - height', function () {
      assert.deepEqual(output.height, 0);
    });

    it('return iframe - width', function () {
      assert.deepEqual(output.width, 0);
    });

    it('return iframe - hspace', function () {
      assert.deepEqual(output.hspace, '0');
    });

    it('return iframe - vspace', function () {
      assert.deepEqual(output.vspace, '0');
    });

    it('return iframe - marginWidth', function () {
      assert.deepEqual(output.marginWidth, '0');
    });

    it('return iframe - marginHeight', function () {
      assert.deepEqual(output.marginHeight, '0');
    });

    it('return iframe - scrolling', function () {
      assert.deepEqual(output.scrolling, 'no');
    });

    it('return iframe - frameBorder', function () {
      assert.deepEqual(output.frameBorder, '0');
    });

    it('return iframe - src', function () {
      assert.deepEqual(output.src, 'about:blank');
    });

    it('return iframe - style', function () {
      assert.ok(output.style);
    });
  });

  describe('getHighestCpm', function () {
    it('should pick the existing highest cpm', function () {
      let previous = {
        cpm: 2,
        timeToRespond: 100
      };
      let current = {
        cpm: 1,
        timeToRespond: 100
      };
      assert.equal(utils.getHighestCpm(previous, current), previous);
    });

    it('should pick the new highest cpm', function () {
      let previous = {
        cpm: 1,
        timeToRespond: 100
      };
      let current = {
        cpm: 2,
        timeToRespond: 100
      };
      assert.equal(utils.getHighestCpm(previous, current), current);
    });

    it('should pick the fastest cpm in case of tie', function () {
      let previous = {
        cpm: 1,
        timeToRespond: 100
      };
      let current = {
        cpm: 1,
        timeToRespond: 50
      };
      assert.equal(utils.getHighestCpm(previous, current), current);
    });

    it('should pick the oldest in case of tie using responseTimeStamp', function () {
      let previous = {
        cpm: 1,
        timeToRespond: 100,
        responseTimestamp: 1000
      };
      let current = {
        cpm: 1,
        timeToRespond: 50,
        responseTimestamp: 2000
      };
      assert.equal(utils.getOldestHighestCpmBid(previous, current), previous);
    });

    it('should pick the latest in case of tie using responseTimeStamp', function () {
      let previous = {
        cpm: 1,
        timeToRespond: 100,
        responseTimestamp: 1000
      };
      let current = {
        cpm: 1,
        timeToRespond: 50,
        responseTimestamp: 2000
      };
      assert.equal(utils.getLatestHighestCpmBid(previous, current), current);
    });
  });

  describe('polyfill test', function () {
    it('should not add polyfill to array', function() {
      var arr = ['hello', 'world'];
      var count = 0;
      for (var key in arr) {
        count++;
      }
      assert.equal(arr.length, count, 'Polyfill test fails');
    });
  });

  describe('delayExecution', function () {
    it('should execute the core function after the correct number of calls', function () {
      const callback = sinon.spy();
      const delayed = utils.delayExecution(callback, 5);
      for (let i = 0; i < 4; i++) {
        delayed();
      }
      assert(callback.notCalled);
      delayed(3);
      assert(callback.called)
      assert.equal(callback.firstCall.args[0], 3);
    });
  });

  describe('deepAccess', function() {
    var obj = {
      1: 2,
      test: {
        first: 11
      }
    };

    it('should allow deep access of object properties', function() {
      var value1 = utils.deepAccess(obj, 'test');
      assert.deepEqual(value1, obj.test);

      var value2 = utils.deepAccess(obj, 'test.first');
      assert.equal(value2, 11);

      var value3 = utils.deepAccess(obj, '1');
      assert.equal(value3, 2);
    });

    it('should allow safe access (returning undefined for missing properties and not throwing exceptions)', function() {
      var value;

      assert.doesNotThrow(function() {
        value = utils.deepAccess(obj, 'test.second.third');
      });

      assert.equal(value, undefined);
    });
  });

  describe('deepSetValue', function() {
    it('should set existing properties at various depths', function() {
      const testObj = {
        prop: 'value',
        nestedObj: {
          nestedProp: 'nestedValue'
        }
      };
      utils.deepSetValue(testObj, 'prop', 'newValue');
      assert.equal(testObj.prop, 'newValue');
      utils.deepSetValue(testObj, 'nestedObj.nestedProp', 'newNestedValue');
      assert.equal(testObj.nestedObj.nestedProp, 'newNestedValue');
    });

    it('should create object levels between top and bottom of given path if they do not exist', function() {
      const testObj = {};
      utils.deepSetValue(testObj, 'level1.level2', 'value');
      assert.notEqual(testObj.level1, undefined);
      assert.notEqual(testObj.level1.level2, undefined);
      assert.equal(testObj.level1.level2, 'value');
    });
  });

  describe('createContentToExecuteExtScriptInFriendlyFrame', function () {
    it('should return empty string if url is not passed', function () {
      var output = utils.createContentToExecuteExtScriptInFriendlyFrame();
      assert.equal(output, '');
    });

    it('should have URL in returned value if url is passed', function () {
      var url = 'https://abcd.com/service?a=1&b=2&c=3';
      var output = utils.createContentToExecuteExtScriptInFriendlyFrame(url);
      var expected = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html><head><base target="_top" /><script>inDapIF=true;</script></head><body><!--PRE_SCRIPT_TAG_MACRO--><script src="${url}"></script><!--POST_SCRIPT_TAG_MACRO--></body></html>`;
      assert.equal(output, expected);
    });
  });

  describe('getDefinedParams', function () {
    it('builds an object consisting of defined params', function () {
      const adUnit = {
        mediaType: 'video',
        comeWithMe: 'ifuwant2live',
        notNeeded: 'do not include',
      };

      const builtObject = utils.getDefinedParams(adUnit, [
        'mediaType', 'comeWithMe'
      ]);

      assert.deepEqual(builtObject, {
        mediaType: 'video',
        comeWithMe: 'ifuwant2live',
      });
    });
  });

  describe('deepClone', function () {
    it('deep copies objects', function () {
      const adUnit = [{
        code: 'swan',
        mediaTypes: {video: {context: 'outstream'}},
        renderer: {
          render: bid => player.render(bid),
          url: '/video/renderer.js'
        },
        bids: [{
          bidder: 'dharmaInitiative',
          params: { placementId: '481516', }
        }],
      }];

      const adUnitCopy = utils.deepClone(adUnit);
      expect(adUnitCopy[0].renderer.url).to.be.a('string');
      expect(adUnitCopy[0].renderer.render).to.be.a('function');
    });
  });

  describe('getUserConfiguredParams', function () {
    const adUnits = [{
      code: 'adUnit1',
      bids: [{
        bidder: 'bidder1',
        params: {
          key1: 'value1'
        }
      }, {
        bidder: 'bidder2'
      }]
    }];

    it('should return params configured', function () {
      const output = utils.getUserConfiguredParams(adUnits, 'adUnit1', 'bidder1');
      const expected = [{
        key1: 'value1'
      }];
      assert.deepEqual(output, expected);
    });

    it('should return array containting empty object, if bidder present and no params are configured', function () {
      const output = utils.getUserConfiguredParams(adUnits, 'adUnit1', 'bidder2');
      const expected = [{}];
      assert.deepEqual(output, expected);
    });

    it('should return empty array, if bidder is not present', function () {
      const output = utils.getUserConfiguredParams(adUnits, 'adUnit1', 'bidder3');
      const expected = [];
      assert.deepEqual(output, expected);
    });

    it('should return empty array, if adUnit is not present', function () {
      const output = utils.getUserConfiguredParams(adUnits, 'adUnit2', 'bidder3');
      const expected = [];
      assert.deepEqual(output, expected);
    });
  });

  describe('convertCamelToUnderscore', function () {
    it('returns converted string value using underscore syntax instead of camelCase', function () {
      let var1 = 'placementIdTest';
      let test1 = utils.convertCamelToUnderscore(var1);
      expect(test1).to.equal('placement_id_test');

      let var2 = 'my_test_value';
      let test2 = utils.convertCamelToUnderscore(var2);
      expect(test2).to.equal(var2);
    });
  });

  describe('getAdUnitSizes', function () {
    it('returns an empty response when adUnits is undefined', function () {
      let sizes = utils.getAdUnitSizes();
      expect(sizes).to.be.undefined;
    });

    it('returns an empty array when invalid data is present in adUnit object', function () {
      let sizes = utils.getAdUnitSizes({ sizes: 300 });
      expect(sizes).to.deep.equal([]);
    });

    it('retuns an array of arrays when reading from adUnit.sizes', function () {
      let sizes = utils.getAdUnitSizes({ sizes: [300, 250] });
      expect(sizes).to.deep.equal([[300, 250]]);

      sizes = utils.getAdUnitSizes({ sizes: [[300, 250], [300, 600]] });
      expect(sizes).to.deep.equal([[300, 250], [300, 600]]);
    });

    it('returns an array of arrays when reading from adUnit.mediaTypes.banner.sizes', function () {
      let sizes = utils.getAdUnitSizes({ mediaTypes: { banner: { sizes: [300, 250] } } });
      expect(sizes).to.deep.equal([[300, 250]]);

      sizes = utils.getAdUnitSizes({ mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } } });
      expect(sizes).to.deep.equal([[300, 250], [300, 600]]);
    });
  });

  describe('transformBidderParamKeywords', function () {
    it('returns an array of objects when keyvalue is an array', function () {
      let keywords = {
        genre: ['rock', 'pop']
      };
      let result = utils.transformBidderParamKeywords(keywords);
      expect(result).to.deep.equal([{
        key: 'genre',
        value: ['rock', 'pop']
      }]);
    });

    it('returns an array of objects when keyvalue is a string', function () {
      let keywords = {
        genre: 'opera'
      };
      let result = utils.transformBidderParamKeywords(keywords);
      expect(result).to.deep.equal([{
        key: 'genre',
        value: ['opera']
      }]);
    });

    it('returns an array of objects when keyvalue is a number', function () {
      let keywords = {
        age: 15
      };
      let result = utils.transformBidderParamKeywords(keywords);
      expect(result).to.deep.equal([{
        key: 'age',
        value: ['15']
      }]);
    });

    it('returns an array of objects when using multiple keys with values of differing types', function () {
      let keywords = {
        genre: 'classical',
        mix: ['1', 2, '3', 4],
        age: 10
      };
      let result = utils.transformBidderParamKeywords(keywords);
      expect(result).to.deep.equal([{
        key: 'genre',
        value: ['classical']
      }, {
        key: 'mix',
        value: ['1', '2', '3', '4']
      }, {
        key: 'age',
        value: ['10']
      }]);
    });

    it('returns an array of objects when the keyvalue uses an empty string', function() {
      let keywords = {
        test: [''],
        test2: ''
      };
      let result = utils.transformBidderParamKeywords(keywords);
      expect(result).to.deep.equal([{
        key: 'test',
        value: ['']
      }, {
        key: 'test2',
        value: ['']
      }]);
    });

    describe('insertElement', function () {
      it('returns a node at the top of the target by default', function () {
        const toInsert = document.createElement('div');
        const target = document.getElementsByTagName('body')[0];
        const inserted = utils.insertElement(toInsert, document, 'body');
        expect(inserted).to.equal(target.firstChild);
      });
      it('returns a node at bottom of target if 4th argument is true', function () {
        const toInsert = document.createElement('div');
        const target = document.getElementsByTagName('html')[0];
        const inserted = utils.insertElement(toInsert, document, 'html', true);
        expect(inserted).to.equal(target.lastChild);
      });
      it('returns a node at top of the head if no target is given', function () {
        const toInsert = document.createElement('div');
        const target = document.getElementsByTagName('head')[0];
        const inserted = utils.insertElement(toInsert);
        expect(inserted).to.equal(target.firstChild);
      });
    });
  });
});
