/* eslint-disable no-console */

const path = require('path');
const fs = require('fs');

/**
 * @param {String} dirname - Path of the fixture directory
 * @returns {object} reqResPair - An object containing 'request' - 'response' segregated by ad unit media type.
 */
function getReqResPairs(dirname, pairs = {}) {
  try {
    const filenames = fs.readdirSync(dirname, { withFileTypes: true });
    filenames.forEach(filename => {
      if (filename.isDirectory()) {
        getReqResPairs(`${dirname}/${filename.name}`, pairs);
      } else {
        if (filename.name === 'request.json' || filename.name === 'response.json') {
          const parentDir = path.relative(path.join(__dirname), dirname);
          if (!pairs[parentDir]) {
            pairs[parentDir] = {
              request: {},
              response: {}
            };
          }
          if (filename.name === 'request.json') {
            pairs[parentDir]['request'] = JSON.parse(fs.readFileSync(`${dirname}/${filename.name}`, { encoding: 'utf-8' }));
          } else {
            pairs[parentDir]['response'] = JSON.parse(fs.readFileSync(`${dirname}/${filename.name}`, { encoding: 'utf-8' }));
          }
        }
      }
    });
    return pairs;
  } catch (e) {
    console.error(`Error:: ${e.message}`);
  }
}

module.exports = getReqResPairs;
