const { config } = require('./newscorp.conf.js');
const { execSync } = require('child_process');
const fs = require('fs');

const buildPath = 'dist';
const sites = Object.keys(config);

function buildBuildString(site) {
  const modules = config[site].modules.join(',');
  return `./node_modules/.bin/gulp build --website ${site} --modules=${modules}`;
}

function buildPrebid() {
  while (sites.length) {
    const site = sites.shift();
    console.log(`building prebid for: ${site}`);
    execSync(buildBuildString(site));
    fs.mkdirSync(`${buildPath}/${site}/`, { recursive: true });
    fs.renameSync(
      `build/${buildPath}/prebid.js`,
      `${buildPath}/${site}/prebid.js`
    );
  }
}

buildPrebid();
