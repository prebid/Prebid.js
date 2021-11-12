#!/usr/bin/env node

/* eslint-disable */

const {AdapterTranslator} = require('./adapterTranslator');
const process = require('process');
const fs = require('fs');

const fname = process.argv[2];

const source = fs.readFileSync(fname).toString();

new AdapterTranslator().translate(fname, source)
  .then((res) => console.log(res[0]));
