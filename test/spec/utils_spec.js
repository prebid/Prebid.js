var assert = require('assert');
var utils = require('../../src/utils');

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

  describe('getBidIdParamater', function () {
    it('should return value of the key in input object', function () {
      var obj = {
        a: 'valueA',
        b: 'valueB'
      };
      var output = utils.getBidIdParamater('a', obj);
      assert.equal(output, 'valueA');
    });

    it('should return empty string, if the key is not existsed in the object', function () {
      var obj = {
        a: 'valueA',
        b: 'valueB'
      };
      var output = utils.getBidIdParamater('c', obj);
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
        a:'1',
        b:'2'
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
      var obj = {
        a:'1',
        b:'2'
      };

      var output = utils.transformAdServerTargetingObj(obj);
      var expectedResult = 'a=' + encodeURIComponent('1') + '&b=' + encodeURIComponent('2') + '&';
      assert.equal(output, expectedResult);
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
        a:'1',
        b:'2'
      };

      var source = {
        c:'3'
      };

      var expectedResult = {
        a:'1',
        b:'2',
        c:'3'
      };

      var output = utils.extend(target, source);
      assert.deepEqual(output, expectedResult);
    });

    it('should merge two input object even though target object is empty', function () {
      var target = {};
      var source = {
        c:'3'
      };

      var output = utils.extend(target, source);
      assert.deepEqual(output, source);
    });

    it('just return target object, if the source object is empty', function () {
      var target = {
        a:'1',
        b:'2'
      };
      var source = {};

      var output = utils.extend(target, source);
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

  describe('isEmpty', function () {
    it('should return true with empty object', function () {
      var output = utils.isEmpty(obj_object);
      assert.deepEqual(output, true);
    });

    it('should return false with non-empty object', function () {
      var obj = { a:'b' };
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
      var input = { a:'A', b:'B' };
      var callback = function (v) {return v;};

      var output = utils._map(input, callback);
      assert.deepEqual(output, ['A', 'B']);
    	});

    	it('return value array with vaild input object_callback func changed 1', function () {
      var input = { a:'A', b:'B' };
      var callback = function (v, k) {return v + k;};

      var output = utils._map(input, callback);
      assert.deepEqual(output, ['Aa', 'Bb']);
    	});

    	it('return value array with vaild input object_callback func changed 2', function () {
      var input = { a:'A', b:'B' };
      var callback = function (v, k, o) {return o;};

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

    it('return iframe - border', function () {
      assert.deepEqual(output.border, '0px');
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

    //it('return iframe - style.border',function(){
    //	assert.deepEqual(output.style.border,'0px');
    //});
    it('return iframe - scrolling', function () {
      assert.deepEqual(output.scrolling, 'no');
    });

    it('return iframe - frameBorder', function () {
      assert.deepEqual(output.frameBorder, '0');
    });

    it('return iframe - src', function () {
      assert.deepEqual(output.src, 'about:self');
    });

    it('return iframe - style', function () {
      assert.ok(output.style);
    });
  });

});
