'use strict';

const fs = require('fs');
const path = require('path');
const argv = require('yargs').argv;

const defaultAdapters = 'adapters.json';

function load(file) {
  try {
    const buffer = fs.readFileSync(file);
    return JSON.parse(buffer.toString());
  } catch (e) {
    return [];
  }
}

module.exports = function getAdapters() {
  let customAdapters = argv.adapters;

  if (!customAdapters) {
    return load(defaultAdapters);
  }

  customAdapters = path.resolve(process.cwd(), customAdapters);

  try {
    fs.statSync(customAdapters);
    return load(customAdapters);
  } catch (e) {
    console.log(`Prebid Warning: custom adapters config cannot be loaded from ${customAdapters}, ` +
      'using default adapters.json');
    return load(defaultAdapters);
  }
};
