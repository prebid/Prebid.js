'use strict';

const fs = require('fs');
const blockLoader = require('block-loader');
let analyticsAdapters = require('../package.json').analytics;

var options = {
  start: '/** INSERT ANALYTICS - DO NOT EDIT OR REMOVE */',
  end: '/** END INSERT ANALYTICS */',
  process: function insertAnalytics() {
    // read directory for analytics adapter file names, map the file names to String.replace,
    // use a regex to remove file extensions, then return the array of adapter names
    const files = fs.readdirSync('src/adapters/analytics')
      .map(file => file.replace(/\.[^/.]+$/, ''));

    let adapters = analyticsAdapters.map(adapter => adapter.length ? adapter : Object.keys(adapter)[0]);

    let inserts = adapters.filter(adapter => {
      if (files.includes(adapter)) {
        return adapter;
      } else {
        console.log(`Prebid Warning: no adapter found for ${adapter}, continuing.`);
      }
    });

    // if no matching adapters and no adapter files found, exit
    if (!inserts || !inserts.length) {
      return null;
    }

    // return the javascript strings to insert into adaptermanager.js
    return inserts.map((adapter) => {
      return `var ${adapter} = require('./adapters/analytics/${adapter}.js').default
                || require('./adapters/analytics/${adapter}.js');
        exports.registerAnalyticsAdapter({ adapter: ${adapter}, code: '${adapter}' });\n`;
    }).join('');
  }
};

module.exports = blockLoader(options);
