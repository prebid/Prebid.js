// this will have all of a copy of the normal fs methods as well
const fs = require('fs.extra');
const path = require('path');
const argv = require('yargs').argv;
const MANIFEST = 'package.json';
const through = require('through2');
const _ = require('lodash');
const gutil = require('gulp-util');
const submodules = require('./modules/.submodules.json');

const MODULE_PATH = './modules';
const BUILD_PATH = './build/dist';
const DEV_PATH = './build/dev';
const ANALYTICS_PATH = '../analytics';

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
  parseBrowserArgs: function (argv) {
    return (argv.browsers) ? argv.browsers.split(',') : [];
  },

  toCapitalCase: function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  jsonifyHTML: function (str) {
    console.log(arguments);
    return str.replace(/\n/g, '')
      .replace(/<\//g, '<\\/')
      .replace(/\/>/g, '\\/>');
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
      throw new gutil.PluginError({
        plugin: 'modules',
        message: 'failed reading: ' + argv.modules
      });
    }

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
        .filter(file => (/^[^\.]+(\.js)?$/).test(file))
        .reduce((memo, file) => {
          var moduleName = file.split(new RegExp('[.\\' + path.sep + ']'))[0];
          var modulePath = path.join(absoluteModulePath, file);
          if (fs.lstatSync(modulePath).isDirectory()) {
            modulePath = path.join(modulePath, 'index.js')
          }
          memo[modulePath] = moduleName;
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

  getBuiltModules: function(dev, externalModules) {
    var modules = this.getModuleNames(externalModules);
    if (Array.isArray(externalModules)) {
      modules = _.intersection(modules, externalModules);
    }
    return modules.map(name => path.join(__dirname, dev ? DEV_PATH : BUILD_PATH, name + '.js'));
  },

  getBuiltPrebidCoreFile: function(dev) {
    return path.join(__dirname, dev ? DEV_PATH : BUILD_PATH, 'prebid-core' + '.js');
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
  }
};
