/* eslint-disable no-console */

const path = require('path');
const fs = require('fs');

const REQ_RES_PAIRS = {};

/**
 * @param {String} dirname - Path of the fixture directory
 * @returns {object} reqResPair - An object containing 'request' - 'response' segregated by ad unit media type.
 */
function getReqResPairs (dirname) {
  try {
    const filenames = fs.readdirSync(dirname, { withFileTypes: true });
    filenames.forEach(filename => {
      if (filename.isDirectory()) {
        getReqResPairs(`${dirname}/${filename.name}`);
      } else {
        if (filename.name === 'request.json' || filename.name === 'response.json') {
          const parentDir = path.basename(dirname);
          if (!REQ_RES_PAIRS[parentDir]) {
            REQ_RES_PAIRS[parentDir] = {
              request: {},
              response: {}
            }
          }
          if (filename.name === 'request.json') {
            REQ_RES_PAIRS[parentDir]['request'] = JSON.parse(fs.readFileSync(`${dirname}/${filename.name}`, { encoding: 'utf-8' }));
          } else {
            REQ_RES_PAIRS[parentDir]['response'] = JSON.parse(fs.readFileSync(`${dirname}/${filename.name}`, { encoding: 'utf-8' }));
          }
        }
      }
    });
    return REQ_RES_PAIRS;
  } catch (e) {
    console.error(`Error:: ${e.message}`);
  }
}

module.exports = getReqResPairs;
