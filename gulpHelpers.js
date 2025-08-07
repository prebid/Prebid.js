// this will have all of a copy of the normal fs methods as well
const fs = require('fs-extra');
const path = require('path');
const argv = require('yargs').argv;
const MANIFEST = 'package.json';
const through = require('through2');
const _ = require('lodash');
const PluginError = require('plugin-error');
const execaCmd = require('execa');
const submodules = require('./modules/.submodules.json').parentModules;

const PRECOMPILED_PATH = './dist/src'
const MODULE_PATH = './modules';
const BUILD_PATH = './build/dist';
const DEV_PATH = './build/dev';
const ANALYTICS_PATH = '../analytics';
const SOURCE_FOLDERS = [
  'src',
  'creative',
  'libraries',
  'modules',
  'test',
  'public'
]
const IGNORE_SOURCES = [
  'libraries/creative-renderer-*/**/*',
]

// get only subdirectories that contain package.json with 'main' property
function isModuleDirectory(filePath) {
  try {
    const manifestPath = path.join(filePath, MANIFEST);
    if (fs.statSync(manifestPath).isFile()) {
      const module = require(manifestPath);
      return module && module.main;
    }
  } catch (error) {}
}

module.exports = {
  getSourceFolders() {
    return SOURCE_FOLDERS
  },
  getSourcePatterns() {
    return SOURCE_FOLDERS.flatMap(dir => [`./${dir}/**/*.js`, `./${dir}/**/*.mjs`, `./${dir}/**/*.ts`])
  },
  getIgnoreSources() {
    return IGNORE_SOURCES
  },
  parseBrowserArgs: function (argv) {
    return (argv.browsers) ? argv.browsers.split(',') : [];
  },

  getArgModules() {
    var modules = (argv.modules || '')
      .split(',')
      .filter(module => !!module);

    try {
      if (modules.length === 1 && path.extname(modules[0]).toLowerCase() === '.json') {
        var moduleFile = modules[0];

        modules = JSON.parse(
          fs.readFileSync(moduleFile, 'utf8')
        );
      }
    } catch (e) {
      throw new PluginError('modules', 'failed reading: ' + argv.modules + '. Ensure the file exists and contains valid JSON.');
    }

    try {
      const moduleAliases = JSON.parse(
        fs.readFileSync('module-alias.json', 'utf8')
      );

      modules = modules.map(module => moduleAliases[module] || module);
    } catch (_e) {}

    // we need to forcefuly include the parentModule if the subModule is present in modules list and parentModule is not present in modules list
    Object.keys(submodules).forEach(parentModule => {
      if (
        !modules.includes(parentModule) &&
        modules.some(module => submodules[parentModule].includes(module))
      ) {
        modules.unshift(parentModule);
      }
    });

    return modules;
  },
  getModules: _.memoize(function(externalModules) {
    externalModules = externalModules || [];
    var internalModules;
    try {
      var absoluteModulePath = path.join(__dirname, MODULE_PATH);
      internalModules = fs.readdirSync(absoluteModulePath)
        .filter(file => (/^[^\.]+(\.js|\.tsx?)?$/).test(file))
        .reduce((memo, file) => {
          let moduleName = file.split(new RegExp('[.\\' + path.sep + ']'))[0];
          var modulePath = path.join(absoluteModulePath, file);
          let candidates;
          if (fs.lstatSync(modulePath).isDirectory()) {
            candidates = [
              path.join(modulePath, 'index.js'),
              path.join(modulePath, 'index.ts')
            ]
          } else {
            candidates = [modulePath]
          }
          const target = candidates.find(name => fs.existsSync(name));
          if (target) {
            modulePath = this.getPrecompiledPath(path.relative(__dirname, path.format({
              ...path.parse(target),
              base: null,
              ext: '.js'
            })));
            memo[modulePath] = moduleName;
          }
          return memo;
        }, {});
    } catch (err) {
      internalModules = {};
    }
    return Object.assign(externalModules.reduce((memo, module) => {
      try {
        // prefer internal project modules before looking at project dependencies
        var modulePath = require.resolve(module, {paths: ['./modules']});
        if (modulePath === '') modulePath = require.resolve(module);

        memo[modulePath] = module;
      } catch (err) {
        // do something
      }
      return memo;
    }, internalModules));
  }),
  getMetadataEntry(moduleName) {
    if (fs.pathExistsSync(`./metadata/modules/${moduleName}.json`)) {
      return `${moduleName}.metadata`;
    } else {
      return null;
    }
  },
  getBuiltPath(dev, assetPath) {
    return path.join(__dirname, dev ? DEV_PATH : BUILD_PATH, assetPath)
  },

  getPrecompiledPath(filePath) {
    return path.resolve(filePath ? path.join(PRECOMPILED_PATH, filePath) : PRECOMPILED_PATH)
  },

  getBuiltModules: function(dev, externalModules) {
    var modules = this.getModuleNames(externalModules);
    if (Array.isArray(externalModules)) {
      modules = _.intersection(modules, externalModules);
    }
    return modules.map(name => this.getBuiltPath(dev, name + '.js'));
  },

  getBuiltPrebidCoreFile: function(dev) {
    return this.getBuiltPath(dev, 'prebid-core.js')
  },

  getModulePaths: function(externalModules) {
    var modules = this.getModules(externalModules);
    return Object.keys(modules);
  },

  getModuleNames: function(externalModules) {
    return _.values(this.getModules(externalModules));
  },

  nameModules: function(externalModules) {
    var modules = this.getModules(externalModules);
    return through.obj(function(file, enc, done) {
      file.named = modules[file.path] ? modules[file.path] : 'prebid';
      this.push(file);
      done();
    })
  },

  /*
   * Get source files for analytics subdirectories in top-level `analytics`
   * directory adjacent to Prebid.js.
   * Invoke with gulp <task> --analytics
   * Returns an array of source files for inclusion in build process
   */
  getAnalyticsSources: function() {
    if (!argv.analytics) { return []; } // empty arrays won't affect a standard build

    const directoryContents = fs.readdirSync(ANALYTICS_PATH);
    return directoryContents
      .filter(file => isModuleDirectory(path.join(ANALYTICS_PATH, file)))
      .map(moduleDirectory => {
        const module = require(path.join(ANALYTICS_PATH, moduleDirectory, MANIFEST));
        return path.join(ANALYTICS_PATH, moduleDirectory, module.main);
      });
  },

  /*
   * Returns the babel options object necessary for allowing analytics packages
   * to have their own configs. Gets added to prebid's webpack config with the
   * flag --analytics
   */
  getAnalyticsOptions: function() {
    let options;

    if (argv.analytics) {
      // https://babeljs.io/docs/en/options#babelrcroots
      options = {
        babelrcRoots: ['.', ANALYTICS_PATH],
      }
    }

    return options;
  },
  getDisabledFeatures() {
    function parseFlags(input) {
      return input
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);
    }
    const disabled = parseFlags(argv.disable || '');
    const enabled = parseFlags(argv.enable || '');
    if (!argv.disable) {
      disabled.push('GREEDY');
    }
    return disabled.filter(feature => !enabled.includes(feature));
  },
  getTestDisableFeatures() {
    // test with all features disabled with exceptions for logging, as tests often assert logs
    return require('./features.json').filter(f => f !== 'LOG_ERROR' && f !== 'LOG_NON_ERROR')
  },
  execaTask(cmd) {
    return () => execaCmd.shell(cmd, {stdio: 'inherit'});
  }
};
