const makeBundle = require('../../gulpfile.js');
const { parseArgs } = require('node:util');

const { values: argv } = parseArgs({
  strict: false,
  allowPositionals: true,
  options: {
    host: { type: 'string' },
    port: { type: 'string' },
    dev: { type: 'boolean' },
  },
});
const host = argv.host || 'localhost';
const port = argv.port || 4444;
const dev = argv.dev || false;

const REPLACE = {
  // msft sends to the -simple host when there is no purpose 1 consent
  'https://ib.adnxs.com/openrtb2/prebidjs': `http://${host}:${port}/msft`,
  'https://ib.adnxs-simple.com/openrtb2/prebidjs': `http://${host}:${port}/msft`,
  'https://tlx.3lift.com/header/auction': `http://${host}:${port}/triplelift`,
};

const replaceStrings = (() => {
  const rules = Object.entries(REPLACE).map(([orig, repl]) => {
    return [new RegExp(orig, 'g'), repl];
  });
  return function(text) {
    return rules.reduce((text, [pat, repl]) => text.replace(pat, repl), text);
  };
})();

const getBundle = (() => {
  const cache = {};
  return function (modules = []) {
    modules = Array.isArray(modules) ? [...modules] : [modules];
    modules.sort();
    const key = modules.join(',');
    if (!cache.hasOwnProperty(key)) {
      cache[key] = makeBundle(modules, dev).then(replaceStrings);
    }
    return cache[key];
  };
})();

module.exports = function (req, res, next) {
  res.type('text/javascript');
  getBundle(req.query.modules).then((bundle) => {
    res.write(bundle);
    next();
  }).catch(next);
};
