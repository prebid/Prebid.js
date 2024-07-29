window.process = {
  env: {
    NODE_ENV: 'production'
  }
};

window.addEventListener('error', function (ev) {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception:', ev.error, ev.error?.stack);
})

window.addEventListener('unhandledrejection', function (ev) {
  // eslint-disable-next-line no-console
  console.error('Unhandled rejection:', ev.reason);
})

require('test/helpers/consentData.js');
require('test/helpers/prebidGlobal.js');
require('test/mocks/adloaderStub.js');
require('test/mocks/xhr.js');
require('test/mocks/analyticsStub.js');
require('test/mocks/ortbConverter.js')
