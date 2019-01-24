require('test/helpers/prebidGlobal.js');
require('test/mocks/adloaderStub.js');

var testsContext = require.context('.', true, /_spec$/);
testsContext.keys().forEach(testsContext);
