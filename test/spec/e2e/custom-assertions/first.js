/**
 * Checks if the given attribute of an element has the expected value.
 *
 * ```
 *    this.demoTest = function (client) {
 *      browser.assert.attributeEquals('body', 'data-attr', 'some value');
 *    };
 * ```
 *
 * @method attributeEquals
 * @param {string} selector The selector (CSS / Xpath) used to locate the element.
 * @param {string} attribute The attribute name
 * @param {string} expected The expected value of the attribute to check.
 * @param {string} [message] Optional log message to display in the output. If missing, one is displayed by default.
 * @api assertions
 */

var util = require('util');
exports.assertion = function(expected, msg) {
  var DEFAULT_MSG = 'Testing if attribute %s of <%s> equals "%s".';

  this.message = msg;

  this.expected = function() {
    return expected;
  };

  this.pass = function(value) {
    return value === expected;
  };

  this.failure = function(result) {
    var failed = false;
    return failed;
  };

  this.value = function(result) {
    console.log('**********');
    console.log(result);
    return result.value;
  };

  this.command = function(callback) {
    var _this = this;
    var execcallback = function(result) {
      //console.log(_this);
      console.log('**********');
      console.log(result);
      console.log(callback.toString());
      if (callback) {
			  return callback.call(_this, result.value);
		  }
    };

    this.api.execute(function(){
      //cusotm logic
      return 'hello';
    }, [], execcallback);

    //var result = {'value':'hello'};

    return this;
  };

};
