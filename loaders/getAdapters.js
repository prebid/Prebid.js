'use strict';

const fs = require('fs');
const path = require('path');
const argv = require('yargs').argv;

const jsonPath = argv['adapters'] || '';

module.exports = function getAdapters(all) {
  const json = path.resolve(process.cwd(), jsonPath);

  let adapters;
  try {
    fs.statSync(json);
    adapters = require(json);
  } catch (e) {
    if (jsonPath) {
      console.log(`Prebid Warning: custom adapters config cannot be loaded from ${json}, ` +
        'using default adapters.json');
    }
    adapters = require(all);
  }

  return adapters;
};
