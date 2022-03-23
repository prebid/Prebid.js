const fs = require('fs');
const path = require('path');
const prebid = require('../../package.json');
const argv = require('yargs').argv;

const host = argv.host || 'localhost';
const port = argv.port || 4444;
const dev = argv.dev || false;

const REPLACE = {
  'https://ib.adnxs.com/ut/v3/prebid': `http://${host}:${port}/appnexus`
};

function readAndReplace(fn) {
  const contents = fs.readFileSync(fn);
  return Object.entries(REPLACE).reduce((text, [orig, repl]) => {
    return text.replace(new RegExp(orig, 'g'), repl)
  }, contents.toString());
}

function writeBundle(response, {modules = [], dev = false}) {
  const root = `./build/${dev ? 'dev' : 'dist'}`;
  modules = Array.isArray(modules) ? modules : [modules];
  const files = ['prebid-core.js'].concat((modules).map((m) => `${m}.js`));
  files.forEach((fn) => {
    response.write(readAndReplace(path.join(root, fn)));
  })
  response.write(`\n${prebid.globalVarName}.processQueue();`);
}

module.exports = function (req, res, next) {
  res.type('text/javascript');
  writeBundle(res, {modules: req.query.modules, dev});
  next();
}
