var assert = require("assert");

describe('Utils', function () {

    window = { console: console };

    var utils = require('../src/utils.js');

    describe('#replaceTokenInString', function () {

        it('should replace all given tokens in a String', function () {
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
    })
});