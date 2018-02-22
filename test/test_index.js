require('test/helpers/prebidGlobal.js');
require('test/helpers/karma-init.js');

var testsContext = require.context('.', true, /_spec$/);
testsContext.keys().forEach(testsContext);
