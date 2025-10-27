require('./pipeline_setup.js');
require('./test_deps.js');
const {getGlobalVarName} = require('../src/buildOptions.js');

var testsContext = require.context('.', true, /_spec$/);
testsContext.keys().forEach(testsContext);

window[getGlobalVarName()].processQueue();
