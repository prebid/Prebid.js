'use strict';

const fs = require('fs');
const blockLoader = require('block-loader');
let rendererAdapters = require('../package.json').renderers;

var options = {
  start: '/** INSERT RENDERERS - DO NOT EDIT OR REMOVE */',
  end: '/** END INSERT RENDERERS */',
  process: function insertRenderers() {
    // read directory for renderer adapter file names, map the file names to String.replace,
    // use a regex to remove file extensions, then return the array of adapter names
    const files = fs.readdirSync('src/adapters/renderers')
      .map(file => file.replace(/\.[^/.]+$/, ''));

    let adapters = rendererAdapters.map(adapter => adapter.length ? adapter : Object.keys(adapter)[0]);

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
      return `var ${adapter} = require('./adapters/renderers/${adapter}.js').default
                || require('./adapters/renderers/${adapter}.js');
        exports.registerRendererAdapter({ adapter: ${adapter}, code: '${adapter}' });\n`;
    }).join('');
  }
};

module.exports = blockLoader(options);
