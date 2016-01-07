var assert = require("assert");
var utils = require('../../src/utils');

describe("Utils", function() {

    describe('replaceTokenInString', function(){

	    it('should replace all given tokens in a String', function() {
	    	var tokensToReplace = {
                'foo': 'bar',
                'zap': 'quux'
            };

            var output = utils.replaceTokenInString("hello %FOO%, I am %ZAP%", tokensToReplace, "%");
            assert.equal(output, "hello bar, I am quux");
	    });

	    it('should ignore tokens it does not see', function() {
            var output = utils.replaceTokenInString("hello %FOO%", {}, "%");

            assert.equal(output, "hello %FOO%");
        });
	});

	describe('getBidIdParamater',function(){
		it('should return value of the key in input object',function(){
			var obj = {
				'a' : 'valueA',
				'b' : 'valueB'
			}
			var output = utils.getBidIdParamater('a',obj);
			assert.equal(output,'valueA');
		});

		it('should return empty string, if the key is not existsed in the object',function(){
			var obj = {
				'a' : 'valueA',
				'b' : 'valueB'
			}
			var output = utils.getBidIdParamater('c',obj);
			assert.equal(output,'');
		});
	});

	describe('tryAppendQueryString',function(){
		it('should append query string to existing url',function(){
			var url = 'www.a.com?';
			var key = 'b';
			var value = 'c';

			var output = utils.tryAppendQueryString(url, key, value);

			var expectedResult = url + key + "=" + encodeURIComponent(value) + '&';
			assert.equal(output,expectedResult);
		});

		it('should return existing url, if the value is empty',function(){
			var url = 'www.a.com?';
			var key = 'b';
			var value = '';

			var output = utils.tryAppendQueryString(url, key, value);
			assert.equal(output,url);
		});
	});

	describe('parseQueryStringParameters',function(){
		it('should append query string to existing using the input obj',function(){
			var obj={
				'a':'1',
				'b':'2'
			};

			var output = utils.parseQueryStringParameters(obj);
			var expectedResult = "a=" + encodeURIComponent('1') + "&b=" + encodeURIComponent('2') + "&";
			assert.equal(output,expectedResult);
		});

		it('should return an empty string, if input obj is empty',function(){
			var obj ={};
			var output = utils.parseQueryStringParameters(obj);
			assert.equal(output,'');
		});
	});

	describe('transformAdServerTargetingObj',function(){
		it('should append query string to existing using the input obj',function(){
			var obj = {
				'a':'1',
				'b':'2'
			};

			var output = utils.transformAdServerTargetingObj(obj);
			var expectedResult = "a=" + encodeURIComponent('1') + "&b=" + encodeURIComponent('2') + "&";
			assert.equal(output,expectedResult);
		});

		it('should return an empty string, if input obj is empty',function(){
			var obj ={};
			var output = utils.transformAdServerTargetingObj(obj);
			assert.equal(output,'');
		});
	});

	describe('extend',function(){
		it('should merge two input object',function(){
			var target = {
				'a':'1',
				'b':'2'
			};

			var source = {
				'c':'3'
			};

			var expectedResult = {
				'a':'1',
				'b':'2',
				'c':'3'
			};

			var output = utils.extend(target, source);
			assert.deepEqual(output,expectedResult);
		});

		it('should merge two input object even though target object is empty',function(){
			var target = {};
			var source = {
				'c':'3'
			};

			var output = utils.extend(target, source);
			assert.deepEqual(output,source);
		});

		it('just return target object, if the source object is empty',function(){
			var target = {
				'a':'1',
				'b':'2'
			};			
			var source = {};

			var output = utils.extend(target, source);
			assert.deepEqual(output,target);
		});
	});

	describe('parseSizesInput',function(){

		it('should return query string using multi size array',function(){
			var sizes = [[728, 90], [970, 90]];
			var output = utils.parseSizesInput(sizes);
			assert.equal(output,'size=728x90&promo_sizes=970x90');
		});

		it('should return query string using single size array',function(){
			var sizes = [728, 90];
			var output = utils.parseSizesInput(sizes);
			assert.equal(output,'size=728x90');
		});

		it('should return query string using string input',function(){
			var sizes = '300x250,970x90';
			var output = utils.parseSizesInput(sizes);
			assert.equal(output,'size=300x250&promo_sizes=970x90');
		});

		it('return undefined if input array is empty',function(){
			var sizes =[];
			var output = utils.parseSizesInput(sizes);
			assert.equal(output,undefined);
		});
	});

	describe('parseGPTSingleSizeArray',function(){

		it('should return size string with input single size array',function(){
			var size = [300,250];
			var output = utils.parseGPTSingleSizeArray(size);
			assert.equal(output,'300x250');
		});

		it('should return size string with input single size array',function(){
			var size =['300','250'];
			var output = utils.parseGPTSingleSizeArray(size);
			assert.equal(output,'300x250');
		});

		it('return undefined using string input',function(){
			var size ='1';
			var output = utils.parseGPTSingleSizeArray(size);
			assert.equal(output,undefined);
		});

		it('return undefined using number input',function(){
			var size =1;
			var output = utils.parseGPTSingleSizeArray(size);
			assert.equal(output,undefined);
		});

		it('return undefined using one length single array',function(){
			var size =[300];
			var output = utils.parseGPTSingleSizeArray(size);
			assert.equal(output,undefined);
		});

		it('return undefined if the input is empty',function(){
			var size ='';
			var output = utils.parseGPTSingleSizeArray(size);
			assert.equal(output,undefined);
		});

		it('return undefined if the input is not a number',function(){
			var size =['foo','bar'];
			var output = utils.parseGPTSingleSizeArray(size);
			assert.equal(output,undefined);
		});

		it('return undefined if the input is not a number 2',function(){
			var size =['foo',300];
			var output = utils.parseGPTSingleSizeArray(size);
			assert.equal(output,undefined);
		});
	});
});
