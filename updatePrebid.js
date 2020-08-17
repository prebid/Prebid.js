// Node script for doing the following:
// 1. git checkout stable branch
// 2. git pull
// 3. npm install
// 4. gulp build modules=(provide to this script)
// 5. copy prebid.js file to out path (provided to this script)

// == args ==
// --modules=<path to modules>
// --out=<path to copy file to>
// OR
// --tempest=<path to tempest repo> (automatically does the standard tempest process)
// --hubpages=<path to hubpages repo> (automatically does the standard hubpages process)
// --salish=<path to salish repo> (automatically does the standard salish process)

/**
 * Examples
 * Update tempest prebid.js (both next and reg) with repo at ../tempest-phoenix
 * $ node updatePrebid.js --tempest (uses default repo name)
 * Update hubpages prebid.js (both next and reg) with repo at ../hubpages-repo
 * $ node updatePrebid.js --hubpages=../hubpages-repo (non-default name)
 * Update prebid.js with some modules and output it somewhere
 * $ node updatePrebid.js --modules=modules.json --out=../my/lovely/path/prebid.js
 */
const { execSync, spawnSync } = require('child_process');
const fs = require("fs");

const argv = require('minimist')(process.argv.slice(2)); // cmd line args
const validArgs = ['modules', 'out', 'tempest', 'hubpages', 'salish'];

const tempestRepo = typeof argv.tempest === 'string' ? argv.tempest : '../tempest-phoenix';
const salishRepo = typeof argv.salish === 'string' ? argv.salish : '../salish-sea/web-skagit';
const hubpagesRepo = typeof argv.hubpages === 'string' ? argv.hubpages : '../hubpages';

const checkArgs = argv => {
  let ok = false;
  for (let i = 0; i < validArgs.length; ++i) {
    if (validArgs[i] in argv) {
      ok = true;
    }
  }
  return ok;
}

const checkOutPath = out => {
  if (!fs.existsSync(out)) {
    console.error('output path does not exist:', out);
    process.exit(1);
  }
}

/**
 * Copy current prebid.js build file to various repo paths
 * args:
 * out - An array of paths. Also accepts string.
 * */
const copyPrebidToRepos = out => {
  if (!Array.isArray(out)) {
    out = [out];
  }
  out.forEach(path => {
    console.log('==Copying prebid.js to', path);
    execSync(`cp build/dist/prebid.js ${path}`);
  });
}

const buildPrebid = modules => {
  console.log('==Building prebid.js with', modules);

  const gulp = spawnSync('gulp', ['build', `--modules=${modules}`], { encoding: 'utf-8' });
  console.log(gulp.stdout);
}

const main = () => {
  if (!checkArgs(argv)) {
    console.error('Please provide one or more valid args:', validArgs);
    process.exit(1);
  }

  console.log('==Checking out stable branch...');
  execSync('git checkout stable');
  console.log('==Pulling latest code...');
  execSync('git pull');
  console.log('==Installing npm packages...');
  execSync('npm install');

  /** Build Prebid.js and copy it to somewhere */

  if (argv.modules || argv.out) {
    if (argv.out) {
      checkOutPath(argv.out);
    }
    if (argv.modules) {
      buildPrebid(argv.modules);
    }
    if (argv.out) {
      copyPrebidToRepos(argv.out);
    }
  } else {
    if (argv.tempest) {
      checkOutPath(tempestRepo);
  
      buildPrebid(`${tempestRepo}/htdocs/js/prebid/modules.json`);
      copyPrebidToRepos(`${tempestRepo}/htdocs/js/prebid/prebid.min.js`);
      buildPrebid(`${tempestRepo}/htdocs/js/prebid/modules-next.json`);
      copyPrebidToRepos(`${tempestRepo}/htdocs/js/prebid/prebid-next.min.js`);
    }
    if (argv.salish) {
      checkOutPath(salishRepo);
      buildPrebid('modules.json');

      const date = new Date();
      const dateFileStr = date.toJSON().split('T')[0];
      out = `${salishRepo}/static/cdn/js/prebid-${dateFileStr}.js`;
      copyPrebidToRepos(out);
    }
    if (argv.hubpages) {
      checkOutPath(hubpagesRepo);

      buildPrebid('hpmodules.json');
      copyPrebidToRepos([
        `${hubpagesRepo}/www/s/prebid.js`,
        `${hubpagesRepo}/www/s/pn-prebid-next.js`
      ])
    }
  }
}

main();
