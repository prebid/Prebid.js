const makeBundle = require('../../gulpfile.js');
const argv = require('yargs').argv;
const host = argv.host || 'localhost';
const port = argv.port || 4444;
const dev = argv.dev || false;

// Use direct TLX endpoint if USE_DIRECT_TLX is set, otherwise use fake-server
const tlxEndpoint = process.env.USE_DIRECT_TLX === 'true'
  ? 'http://localhost:8076/header/auction'
  : `http://${host}:${port}/triplelift`;

const REPLACE = {
  'https://ib.adnxs.com/ut/v3/prebid': `http://${host}:${port}/appnexus`,
  'https://tlx.3lift.com/header/auction': tlxEndpoint,
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
