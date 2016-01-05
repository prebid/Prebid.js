var assert = require("assert");

/* use this method to test individual files instead of the whole prebid.js project */

//TODO refactor to use the spec files
var utils = require('../src/utils');

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