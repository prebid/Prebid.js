window.process = {
  env: {
    NODE_ENV: 'production'
  }
};

require('test/helpers/prebidGlobal.js');
require('test/mocks/adloaderStub.js');
require('test/mocks/xhr.js');
require('test/mocks/analyticsStub.js');
