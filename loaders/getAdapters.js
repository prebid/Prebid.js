'use strict';

const fs = require('fs');
const path = require('path');
const argv = require('yargs').argv;

function load(file) {
  try {
    const buffer = fs.readFileSync(file);
    return JSON.parse(buffer.toString());
  } catch (e) {
    return [];
  }
}

module.exports = function getAdapters(defaultAdapters, argName) {
  let customAdapters = argv[argName];

  if (!customAdapters) {
    return load(defaultAdapters);
  }

  customAdapters = path.resolve(process.cwd(), customAdapters);

  try {
    fs.statSync(customAdapters);
    return load(customAdapters);
  } catch (e) {
    console.log(`Prebid Warning: custom adapters config cannot be loaded from ${customAdapters}, ` +
      `using default ${defaultAdapters}`);
    return load(defaultAdapters);
  }
};
