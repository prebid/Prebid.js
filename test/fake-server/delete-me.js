/* eslint no-console: 0 */
const generateFixtures = require('./fixtures');
const path = require('path');

console.log(generateFixtures(path.join(__dirname, './fixtures')));
