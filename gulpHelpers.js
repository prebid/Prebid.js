const fs = require('fs');
const path = require('path');
const argv = require('yargs').argv;
const MANIFEST = 'package.json';

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

  /*
   * Get source files for analytics subdirectories in top-level `analytics`
   * directory adjacent to Prebid.js.
   * Invoke with gulp <task> --analytics
   * Returns an array of source files for inclusion in build process
   */
  getAnalyticsSources: function(directory) {
    if (!argv.analytics) {return [];} // empty arrays won't affect a standard build

    const directoryContents = fs.readdirSync(directory);
    return directoryContents
      .filter(file => isModuleDirectory(path.join(directory, file)))
      .map(moduleDirectory => {
        const module = require(path.join(directory, moduleDirectory, MANIFEST));
        return path.join(directory, moduleDirectory, module.main);
      });

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
  }
};
