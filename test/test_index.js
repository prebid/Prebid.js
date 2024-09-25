require('./pipeline_setup.js');
require('./test_deps.js');

var testsContext = require.context('.', true, /_spec$/);
testsContext.keys().forEach(testsContext);

window.$$PREBID_GLOBAL$$.processQueue();
