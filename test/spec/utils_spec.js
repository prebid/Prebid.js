describe("Utils", function() {
  var assert = chai.assert;

    describe('replaceTokenInString', function(){

	    it('should replace all given tokens in a String', function() {
	    	var tokensToReplace = {
                'foo': 'bar',
                'zap': 'quux'
            };

            var output = pbjs_testonly.utils_replaceTokenInString("hello %FOO%, I am %ZAP%", tokensToReplace, "%");
            assert.equal(output, "hello bar, I am quux");
	    });

	    it('should ignore tokens it does not see', function() {
            var output = pbjs_testonly.utils_replaceTokenInString("hello %FOO%", {}, "%");

            assert.equal(output, "hello %FOO%");
        });
	});

	describe('getBidIdParamater',function(){
		it('should return value of the key in input object',function(){
			var obj = {
				'a' : 'valueA',
				'b' : 'valueB'
			}
			var output = pbjs_testonly.utils_getBidIdParamater('a',obj);
			assert.equal(output,'valueA');
		});

		it('should return empty string if the key is not existsed in the object',function(){
			var obj = {
				'a' : 'valueA',
				'b' : 'valueB'
			}
			var output = pbjs_testonly.utils_getBidIdParamater('c',obj);
			assert.equal(output,'');
		});
	});

	describe('tryAppendQueryString',function(){
		
	});
});
