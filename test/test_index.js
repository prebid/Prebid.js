require('test/helpers/prebidGlobal.js');

var testsContext = require.context('.', true, /_spec$/);
testsContext.keys().forEach(testsContext);
