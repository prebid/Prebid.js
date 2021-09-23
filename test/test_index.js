require('test/helpers/prebidGlobal.js');
require('test/mocks/adloaderStub.js');
require('test/mocks/xhr.js');

var testsContext = require.context('.', true, /_spec$/);
testsContext.keys().forEach(testsContext);

window.$$PREBID_GLOBAL$$.processQueue();
