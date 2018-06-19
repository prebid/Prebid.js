require('test/helpers/prebidGlobal.js');
/* eslint-disable */
// this is a hack, but it allows chrome to catch issues with some IE undefined values.
Array.prototype.includes = undefined;
//Array.prototype.find = undefined;
/* eslint-enable */
var testsContext = require.context('.', true, /_spec$/);
testsContext.keys().forEach(testsContext);
