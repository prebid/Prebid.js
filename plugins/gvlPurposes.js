const {
  relPath,
  getFreeName,
  getModuleName,
  getMetadata
} = require('./utils.js');
const { types: t } = require('@babel/core');

function getPurposes(filename) {
  const metadata = getMetadata(getModuleName(filename));
  return Object.keys(metadata?.purposes ?? {}).length > 0 ? metadata.purposes : null;
}

module.exports = function (api, options) {
  return {
    visitor: {
      Program(path, state) {
        // register purposes, legIntPurposes, and flexiblePurposes from the GVL into consentHandler/GVL_PURPOSES
        const purposes = getPurposes(state.filename);
        if (purposes != null) {
          const gvlPurposes = getFreeName(path, '__gvl_purposes');
          path.node.body.unshift(...api.parse(`import {GVL_PURPOSES as ${gvlPurposes}} from '${relPath(state.filename, 'src/consentHandler.js')}';`, { filename: state.filename }).program.body);
          path.node.body.push(...api.parse(`Object.assign(${gvlPurposes}, ${JSON.stringify(getPurposes(state.filename))});`, { filename: state.filename }).program.body);
        }
      }
    }
  };
};

