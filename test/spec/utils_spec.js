import {getAdServerTargeting} from 'test/fixtures/fixtures.js';
import {expect} from 'chai';
import {TARGETING_KEYS} from 'src/constants.js';
import * as utils from 'src/utils.js';
import {binarySearch, deepEqual, encodeMacroURI, memoize, sizesToSizeTuples, waitForElementToLoad} from 'src/utils.js';
import {convertCamelToUnderscore} from '../../libraries/appnexusUtils/anUtils.js';

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

  describe('canAccessWindowTop', function () {
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
      sandbox.restore();
    });
    it('should return true if window.top is accessible', function () {
      assert.equal(utils.canAccessWindowTop(), true);
    });

    it('should return false if window.top is not accessible', function () {
      sandbox.stub(utils.internal, 'getWindowTop').returns(false);
      assert.equal(utils.canAccessWindowTop(), false);
    });
  });

  describe('isSafeFrameWindow', function () {
    // SafeFrames implementation
    // https://iabtechlab.com/wp-content/uploads/2016/03/SafeFrames_v1.1_final.pdf
    const $sf = {
      ext: {
        geom: function() {}
      }
    };

    afterEach(function() {
      delete window.$sf;
    })

    it('should return true if window.$sf is accessible', function () {
      window.$sf = $sf;
      assert.equal(utils.isSafeFrameWindow(), true);
    });

    it('should return false if window.$sf is missimplemented', function () {
      window.$sf = {};
      assert.equal(utils.isSafeFrameWindow(), false);
    });

    it('should return false if window.$sf is missing', function () {
      assert.equal(utils.isSafeFrameWindow(), false);
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

  describe('parseQueryStringParameters', function () {
    it('should append query string to existing using the input obj', function () {
      var obj = {
        a: 'http://example.com/?foo=bar&bar=foo',
        b: 'abc["def"]'
      };

      var output = utils.parseQueryStringParameters(obj);
      var expectedResult = 'a=' + encodeURIComponent('http://example.com/?foo=bar&bar=foo') + '&b=' + encodeURIComponent('abc["def"]');
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
      var expected = 'foobar=0x0%2C300x250%2C300x600&' + TARGETING_KEYS.SIZE + '=300x250&' + TARGETING_KEYS.PRICE_BUCKET + '=10.00&' + TARGETING_KEYS.AD_ID + '=233bcbee889d46d&' + TARGETING_KEYS.BIDDER + '=appnexus&' + TARGETING_KEYS.SIZE + '_triplelift=0x0&' + TARGETING_KEYS.PRICE_BUCKET + '_triplelift=10.00&' + TARGETING_KEYS.AD_ID + '_triplelift=222bb26f9e8bd&' + TARGETING_KEYS.BIDDER + '_triplelift=triplelift&' + TARGETING_KEYS.SIZE + '_appnexus=300x250&' + TARGETING_KEYS.PRICE_BUCKET + '_appnexus=10.00&' + TARGETING_KEYS.AD_ID + '_appnexus=233bcbee889d46d&' + TARGETING_KEYS.BIDDER + '_appnexus=appnexus&' + TARGETING_KEYS.SIZE + '_pagescience=300x250&' + TARGETING_KEYS.PRICE_BUCKET + '_pagescience=10.00&' + TARGETING_KEYS.AD_ID + '_pagescience=25bedd4813632d7&' + TARGETING_KEYS.BIDDER + '_pagescienc=pagescience&' + TARGETING_KEYS.SIZE + '_brightcom=300x250&' + TARGETING_KEYS.PRICE_BUCKET + '_brightcom=10.00&' + TARGETING_KEYS.AD_ID + '_brightcom=26e0795ab963896&' + TARGETING_KEYS.BIDDER + '_brightcom=brightcom&' + TARGETING_KEYS.SIZE + '_brealtime=300x250&' + TARGETING_KEYS.PRICE_BUCKET + '_brealtime=10.00&' + TARGETING_KEYS.AD_ID + '_brealtime=275bd666f5a5a5d&' + TARGETING_KEYS.BIDDER + '_brealtime=brealtime&' + TARGETING_KEYS.SIZE + '_pubmatic=300x250&' + TARGETING_KEYS.PRICE_BUCKET + '_pubmatic=10.00&' + TARGETING_KEYS.AD_ID + '_pubmatic=28f4039c636b6a7&' + TARGETING_KEYS.BIDDER + '_pubmatic=pubmatic&' + TARGETING_KEYS.SIZE + '_rubicon=300x600&' + TARGETING_KEYS.PRICE_BUCKET + '_rubicon=10.00&' + TARGETING_KEYS.AD_ID + '_rubicon=29019e2ab586a5a&' + TARGETING_KEYS.BIDDER + '_rubicon=rubicon';
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

  describe('sizesToSizeTuples', () => {
    Object.entries({
      'single size, numerical': {
        in: [1, 2],
        out: [[1, 2]]
      },
      'single size, numerical, nested': {
        in: [[1, 2]],
        out: [[1, 2]]
      },
      'multiple sizes, numerical': {
        in: [[1, 2], [3, 4]],
        out: [[1, 2], [3, 4]]
      },
      'single size, string': {
        in: '1x2',
        out: [[1, 2]]
      },
      'multiple sizes, string': {
        in: '1x2, 4x3',
        out: [[1, 2], [4, 3]]
      },
      'incorrect size, numerical': {
        in: [1],
        out: []
      },
      'incorrect size, string': {
        in: '1x',
        out: []
      }
    }).forEach(([t, {in: input, out}]) => {
      it(`can parse ${t}`, () => {
        expect(sizesToSizeTuples(input)).to.eql(out);
      })
    })
  })

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
      let test1 = convertCamelToUnderscore(var1);
      expect(test1).to.equal('placement_id_test');

      let var2 = 'my_test_value';
      let test2 = convertCamelToUnderscore(var2);
      expect(test2).to.equal(var2);
    });
  });

  describe('URL helpers', function () {
    describe('parseUrl()', function () {
      let parsed;

      beforeEach(function () {
        parsed = utils.parseUrl('http://example.com:3000/pathname/?search=test&foo=bar&bar=foo%26foo%3Dxxx#hash');
      });

      it('extracts the protocol', function () {
        expect(parsed).to.have.property('protocol', 'http');
      });

      it('extracts the hostname', function () {
        expect(parsed).to.have.property('hostname', 'example.com');
      });

      it('extracts the port', function () {
        expect(parsed).to.have.property('port', 3000);
      });

      it('extracts the pathname', function () {
        expect(parsed).to.have.property('pathname', '/pathname/');
      });

      it('extracts the search query', function () {
        expect(parsed).to.have.property('search');
        expect(parsed.search).to.eql({
          foo: 'xxx',
          search: 'test',
          bar: 'foo',
        });
      });

      it('extracts the hash', function () {
        expect(parsed).to.have.property('hash', 'hash');
      });

      it('extracts the host', function () {
        expect(parsed).to.have.property('host', 'example.com:3000');
      });
    });

    describe('parseUrl(url, {noDecodeWholeURL: true})', function () {
      let parsed;

      beforeEach(function () {
        parsed = utils.parseUrl('http://example.com:3000/pathname/?search=test&foo=bar&bar=foo%26foo%3Dxxx#hash', {noDecodeWholeURL: true});
      });

      it('extracts the search query', function () {
        expect(parsed).to.have.property('search');
        expect(parsed.search).to.eql({
          foo: 'bar',
          search: 'test',
          bar: 'foo%26foo%3Dxxx',
        });
      });
    });

    describe('buildUrl()', function () {
      it('formats an object in to a URL', function () {
        expect(utils.buildUrl({
          protocol: 'http',
          hostname: 'example.com',
          port: 3000,
          pathname: '/pathname/',
          search: {foo: 'bar', search: 'test', bar: 'foo%26foo%3Dxxx'},
          hash: 'hash'
        })).to.equal('http://example.com:3000/pathname/?foo=bar&search=test&bar=foo%26foo%3Dxxx#hash');
      });

      it('will use defaults for missing properties', function () {
        expect(utils.buildUrl({
          hostname: 'example.com'
        })).to.equal('http://example.com');
      });
    });

    describe('parseUrl(url, {decodeSearchAsString: true})', function () {
      let parsed;

      beforeEach(function () {
        parsed = utils.parseUrl('http://example.com:3000/pathname/?search=test&foo=bar&bar=foo%26foo%3Dxxx#hash', {decodeSearchAsString: true});
      });

      it('extracts the search query', function () {
        expect(parsed).to.have.property('search');
        expect(parsed.search).to.equal('?search=test&foo=bar&bar=foo&foo=xxx');
      });
    });

    describe('encodeMacroURI', () => {
      [
        ['https://www.example.com', 'https://www.example.com'],
        ['https://www.example/${MACRO}', 'https://www.example/${MACRO}'],
        ['http://www.example/è', `http://www.example/${encodeURIComponent('è')}`],
        ['https://www.${MACRO_1}/${MACRO_1}/${MACRO_2}è', 'https://www.${MACRO_1}/${MACRO_1}/${MACRO_2}' + encodeURIComponent('è')],
        ['http://${MACRO}${MACRO}/${MACRO}', 'http://${MACRO}${MACRO}/${MACRO}'],
        ['{MACRO}${MACRO}', `${encodeURIComponent('{MACRO}')}\${MACRO}`],
        ['https://www.example.com?p=${AUCTION_PRICE}', 'https://www.example.com?p=${AUCTION_PRICE}']
      ].forEach(([input, expected]) => {
        it(`can encode ${input} -> ${expected}`, () => {
          expect(encodeMacroURI(input)).to.eql(expected);
        })
      })
    })
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

  describe('isSafariBrowser', function () {
    let userAgentStub;
    let userAgent;

    before(function () {
      userAgentStub = sinon.stub(navigator, 'userAgent').get(function () {
        return userAgent;
      });
    });

    after(function () {
      userAgentStub.restore();
    });

    it('properly detects safari', function () {
      userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25';
      expect(utils.isSafariBrowser()).to.equal(true);
    });
    it('does not flag Chrome on MacOS', function () {
      userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36';
      expect(utils.isSafariBrowser()).to.equal(false);
    });
    it('does not flag Chrome iOS', function () {
      userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/80.0.3987.95 Mobile/15E148 Safari/604.1';
      expect(utils.isSafariBrowser()).to.equal(false);
    });
    it('does not flag Firefox iOS', function () {
      userAgent = 'Mozilla/5.0 (iPhone; CPU OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/23.0  Mobile/15E148 Safari/605.1.15';
      expect(utils.isSafariBrowser()).to.equal(false);
    });
    it('does not flag Windows Edge', function () {
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.74 Safari/537.36 Edg/79.0.309.43';
      expect(utils.isSafariBrowser()).to.equal(false);
    });
  });

  describe('mergeDeep', function() {
    it('properly merge objects that share same property names', function() {
      const object1 = {
        propA: {
          subPropA: 'abc'
        }
      };
      const object2 = {
        propA: {
          subPropB: 'def'
        }
      };

      const resultWithoutMergeDeep = Object.assign({}, object1, object2);
      expect(resultWithoutMergeDeep).to.deep.equal({
        propA: {
          subPropB: 'def'
        }
      });

      const resultWithMergeDeep = utils.mergeDeep({}, object1, object2);
      expect(resultWithMergeDeep).to.deep.equal({
        propA: {
          subPropA: 'abc',
          subPropB: 'def'
        }
      });
    });

    it('properly merge objects that have different depths', function() {
      const object1 = {
        depth0_A: {
          depth1_A: {
            depth2_A: 123
          }
        }
      };
      const object2 = {
        depth0_A: {
          depth1_A: {
            depth2_B: {
              depth3_A: {
                depth4_A: 'def'
              }
            }
          },
          depth1_B: 'abc'
        }
      };
      const object3 = {
        depth0_B: 456
      };

      const result = utils.mergeDeep({}, object1, object2, object3);
      expect(result).to.deep.equal({
        depth0_A: {
          depth1_A: {
            depth2_A: 123,
            depth2_B: {
              depth3_A: {
                depth4_A: 'def'
              }
            }
          },
          depth1_B: 'abc'
        },
        depth0_B: 456
      });
    });

    it('properly merge objects with various property types', function() {
      const object1 = {
        depth0_A: {
          depth1_A: ['a', 'b', 'c'],
          depth1_B: 'abc',
          depth1_C: 123
        }
      };
      const object2 = {
        depth0_A: {
          depth1_A: ['d', 'e', 'f'],
          depth1_D: true,
        }
      };

      const result = utils.mergeDeep({}, object1, object2);
      expect(result).to.deep.equal({
        depth0_A: {
          depth1_A: ['a', 'b', 'c', 'd', 'e', 'f'],
          depth1_B: 'abc',
          depth1_C: 123,
          depth1_D: true,
        }
      });
    });
  });

  describe('deepEqual', function() {
    it('should return "true" if comparing the same object', function() {
      const obj1 = {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [1000, 0], sizes: [[1000, 300], [1000, 90], [970, 250], [970, 90], [728, 90]] },
          ],
        },
      };
      const obj2 = obj1;
      expect(utils.deepEqual(obj1, obj2)).to.equal(true);
    });
    it('should return "true" if two deeply nested objects are equal', function() {
      const obj1 = {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [1000, 0], sizes: [[1000, 300], [1000, 90], [970, 250], [970, 90], [728, 90]] },
          ],
        },
      };
      const obj2 = {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [1000, 0], sizes: [[1000, 300], [1000, 90], [970, 250], [970, 90], [728, 90]] },
          ],
        },
      };
      expect(utils.deepEqual(obj1, obj2)).to.equal(true);
    });
    it('should return "true" if comparting the same primitive values', function() {
      const primitive1 = 'Prebid.js';
      const primitive2 = 'Prebid.js';
      expect(utils.deepEqual(primitive1, primitive2)).to.equal(true);
    });
    it('should return "false" if comparing two different primitive values', function() {
      const primitive1 = 12;
      const primitive2 = 123;
      expect(utils.deepEqual(primitive1, primitive2)).to.equal(false);
    });
    it('should return "false" if comparing two different deeply nested objects', function() {
      const obj1 = {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [1000, 0], sizes: [[1000, 300], [1000, 90], [970, 250], [970, 90], [728, 90]] },
          ],
        },
      };
      const obj2 = {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [1000, 0], sizes: [[1000, 300], [728, 90]] },
          ],
        },
      }
      expect(utils.deepEqual(obj1, obj2)).to.equal(false);
    });
    it('should check types if {matchTypes: true}', () => {
      function Typed(obj) {
        Object.assign(this, obj);
      }
      const obj = {key: 'value'};
      expect(deepEqual({outer: obj}, {outer: new Typed(obj)}, {checkTypes: true})).to.be.false;
    });
    it('should work when adding properties to the prototype of Array', () => {
      after(function () {
        // eslint-disable-next-line no-extend-native
        delete Array.prototype.unitTestTempProp;
      });
      // eslint-disable-next-line no-extend-native
      Array.prototype.unitTestTempProp = 'testing';
      expect(deepEqual([], [])).to.be.true;
    });

    describe('cyrb53Hash', function() {
      it('should return the same hash for the same string', function() {
        const stringOne = 'string1';
        expect(utils.cyrb53Hash(stringOne)).to.equal(utils.cyrb53Hash(stringOne));
      });
      it('should return a different hash for the same string with different seeds', function() {
        const stringOne = 'string1';
        expect(utils.cyrb53Hash(stringOne, 1)).to.not.equal(utils.cyrb53Hash(stringOne, 2));
      });
      it('should return a different hash for different strings with the same seed', function() {
        const stringOne = 'string1';
        const stringTwo = 'string2';
        expect(utils.cyrb53Hash(stringOne)).to.not.equal(utils.cyrb53Hash(stringTwo));
      });
      it('should return a string value, not a number', function() {
        const stringOne = 'string1';
        expect(typeof utils.cyrb53Hash(stringOne)).to.equal('string');
      });
    });
  });

  describe('waitForElementToLoad', () => {
    let element;
    let callbacks;

    function callback() {
      callbacks++;
    }

    function delay(delay = 0) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, delay);
      })
    }

    beforeEach(() => {
      callbacks = 0;
      element = window.document.createElement('div');
    });

    it('should respect timeout if set', () => {
      waitForElementToLoad(element, 50).then(callback);
      return delay(60).then(() => {
        expect(callbacks).to.equal(1);
      });
    });

    ['load', 'error'].forEach((event) => {
      it(`should complete on '${event} event'`, () => {
        waitForElementToLoad(element).then(callback);
        element.dispatchEvent(new Event(event));
        return delay().then(() => {
          expect(callbacks).to.equal(1);
        })
      });
    });
  });

  describe('setScriptAttributes', () => {
    it('correctly adds attributes from an object', () => {
      const script = document.createElement('script'),
        attrs = {
          'data-first_prop': '1',
          'data-second_prop': 'b',
          'id': 'newId'
        };
      script.id = 'oldId';
      utils.setScriptAttributes(script, attrs);
      expect(script.dataset['first_prop']).to.equal('1');
      expect(script.dataset.second_prop).to.equal('b');
      expect(script.id).to.equal('newId');
    });
  });
});

describe('memoize', () => {
  let fn;

  beforeEach(() => {
    fn = sinon.stub().callsFake(function() {
      return Array.from(arguments);
    });
  });

  it('delegates to fn', () => {
    expect(memoize(fn)('one', 'two')).to.eql(['one', 'two']);
  });

  it('caches result after first call, if first argument is the same', () => {
    const mem = memoize(fn);
    mem('one', 'two');
    expect(mem('one', 'three')).to.eql(['one', 'two']);
    expect(fn.callCount).to.equal(1);
  });

  it('delegates again when the first argument changes', () => {
    const mem = memoize(fn);
    mem('one', 'two');
    expect(mem('two', 'one')).to.eql(['two', 'one']);
    expect(fn.callCount).to.eql(2);
  });

  it('can clear cache with .clear', () => {
    const mem = memoize(fn);
    mem('arg');
    mem.clear();
    expect(mem('arg')).to.eql(['arg']);
    expect(fn.callCount).to.equal(2);
  });

  it('allows setting cache keys', () => {
    const mem = memoize(fn, (...args) => args.join(','))
    mem('one', 'two');
    mem('one', 'three');
    expect(mem('one', 'three')).to.eql(['one', 'three']);
    expect(fn.callCount).to.eql(2);
  });

  describe('binarySearch', () => {
    [
      {
        arr: [],
        tests: [
          ['any', 0]
        ]
      },
      {
        arr: [10],
        tests: [
          [5, 0],
          [10, 0],
          [20, 1],
        ],
      },
      {
        arr: [10, 20, 30, 30, 40],
        tests: [
          [5, 0],
          [15, 1],
          [10, 0],
          [30, 2],
          [35, 4],
          [40, 4],
          [100, 5]
        ]
      }
    ].forEach(({arr, tests}) => {
      describe(`on ${arr}`, () => {
        tests.forEach(([el, pos]) => {
          it(`finds index for ${el} => ${pos}`, () => {
            expect(binarySearch(arr, el)).to.equal(pos);
          });
        });
      });
    })
  });
})
