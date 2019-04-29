// this will have all of a copy of the normal fs methods as well
const fs = require('fs.extra');
const path = require('path');
const argv = require('yargs').argv;
const MANIFEST = 'package.json';
const exec = require('child_process').exec;
const through = require('through2');
const _ = require('lodash');
const gutil = require('gulp-util');

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
  }
  catch (error) {}
}

// Do not include any files of common directory in the build
// common folder is designed to keep files shared by multiple modules
function removeCommonDir(file) {
  return !!(file !== 'common');
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
    var modules = (argv.modules || '').split(',').filter(module => !!module);

    try {
      if (modules.length === 1 && path.extname(modules[0]).toLowerCase() === '.json') {
        var moduleFile = modules[0];

        modules = JSON.parse(
          fs.readFileSync(moduleFile, 'utf8')
        );
      }
    } catch(e) {
      throw new gutil.PluginError({
        plugin: 'modules',
        message: 'failed reading: ' + argv.modules
      });
    }

    return modules;
  },
  getModules: _.memoize(function(externalModules) {
    externalModules = externalModules || [];
    var internalModules;
    try {
      var absoluteModulePath = path.join(__dirname, MODULE_PATH);
      internalModules = fs.readdirSync(absoluteModulePath)
        .filter(file => (/^[^\.]+(\.js)?$/).test(file))
        .filter(removeCommonDir)
        .reduce((memo, file) => {
          var moduleName = file.split(new RegExp('[.\\' + path.sep + ']'))[0];
          var modulePath = path.join(absoluteModulePath, file);
          if (fs.lstatSync(modulePath).isDirectory()) {
            modulePath = path.join(modulePath, "index.js")
          }
          memo[modulePath] = moduleName;
          return memo;
        }, {});
    } catch(err) {
      internalModules = {};
    }
    return Object.assign(externalModules.reduce((memo, module) => {
      try {
        var modulePath = require.resolve(module);
        memo[modulePath] = module;
      } catch(err) {
        // do something
      }
      return memo;
    }, internalModules));
  }),

  getBuiltModules: function(dev, externalModules) {
    var modules = this.getModuleNames(externalModules);
    if(Array.isArray(externalModules)) {
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
    if (!argv.analytics) {return [];} // empty arrays won't affect a standard build

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

  createEnd2EndTestReport : function(targetDestinationDir) {
    var browsers = require('./browsers.json');
    var env = [];
    var input = 'bs';
    for(var key in browsers) {
      if(key.substring(0, input.length) === input && browsers[key].browser !== 'iphone') {
        env.push(key);
      }
    }

    //create new directory structure
    fs.rmrfSync(targetDestinationDir);
    env.forEach(item => {
      fs.mkdirpSync(targetDestinationDir + '/' + item);
    });

    //move xml files to newly created directory
    var walker = fs.walk('./build/coverage/e2e/reports');
    walker.on("file", function (root, stat, next) {
      env.forEach(item => {
        if(stat.name.search(item) !== -1) {
          var src = root + '/' + stat.name;
          var dest = targetDestinationDir + '/' + item + '/' + stat.name;
          fs.copy(src, dest, {replace: true}, function(err) {
            if(err) {
              throw err;
            }
          });
        }
      });
      next();
    });

    //run junit-viewer to read xml and create html
    env.forEach(item => {
      //junit-viewer --results="./custom-reports/chrome51" --save="./chrome.html"
      var cmd = 'junit-viewer --results="' + targetDestinationDir + '/' + item + '" --save="' + targetDestinationDir + '/' + item +'.html"';
      exec(cmd);
    });

    //create e2e-results.html
    var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>End to End Testing Result</title><link rel="stylesheet" href="//code.jquery.com/ui/1.12.0/themes/base/jquery-ui.css"><script src="https://code.jquery.com/jquery-1.12.4.js"></script><script src="https://code.jquery.com/ui/1.12.0/jquery-ui.js"></script><script>$( function() {$( "#tabs" ).tabs({heightStyle: "fill"});});</script></head><body><div style="font-weight: bold;">Note: Refresh in 2-3 seconds if it says "Cannot get ....."</div><div id="tabs" style="height:2000px;">';
    var li = '';
    var tabs = '';
    env.forEach(function(item,i) {
      i++;
      li = li + '<li><a href="#tabs-'+i+'">'+item+'</a></li>';
      tabs = tabs + '<div id="tabs-'+i+'"><iframe name="'+item+'" src="/' + targetDestinationDir.slice(2) + '/'+item+'.html" frameborder="0" style="overflow:hidden;overflow-x:hidden;overflow-y:hidden;height:100%;width:100%;top:50px;left:0px;right:0px;bottom:0px" height="100%" width="100%"></iframe></div>';
    });
    html = html + '<ul>' + li + '</ul>' + tabs;
    html = html + '</div></body></html>';

    var filepath = targetDestinationDir + '/results.html';
    fs.openSync(filepath, 'w+');
    fs.writeFileSync(filepath, html);
  }
};
