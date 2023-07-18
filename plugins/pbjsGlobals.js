let t = require('@babel/core').types;
let prebid = require('../package.json');
const path = require('path');
const allFeatures = new Set(require('../features.json'));

const FEATURES_GLOBAL = 'FEATURES';

function featureMap(disable = []) {
  disable = disable.map((s) => s.toUpperCase());
  disable.forEach((f) => {
    if (!allFeatures.has(f)) {
      throw new Error(`Unrecognized feature: ${f}`)
    }
  });
  disable = new Set(disable);
  return Object.fromEntries([...allFeatures.keys()].map((f) => [f, !disable.has(f)]));
}

function getNpmVersion(version) {
  try {
    // only use "real" versions (that is, not the -pre ones, they won't be on jsDelivr)
    return /^([\d.]+)$/.exec(version)[1];
  } catch (e) {
    return 'latest';
  }
}

module.exports = function(api, options) {
  const pbGlobal = options.globalVarName || prebid.globalVarName;
  const defineGlobal = typeof (options.defineGlobal) !== 'undefined' ? options.defineGlobal : prebid.defineGlobal;
  const features = featureMap(options.disableFeatures);
  let replace = {
    '$prebid.version$': prebid.version,
    '$$PREBID_GLOBAL$$': pbGlobal,
    '$$DEFINE_PREBID_GLOBAL$$': defineGlobal,
    '$$REPO_AND_VERSION$$': `${prebid.repository.url.split('/')[3]}_prebid_${prebid.version}`,
    '$$PREBID_DIST_URL_BASE$$': options.prebidDistUrlBase || `https://cdn.jsdelivr.net/npm/prebid.js@${getNpmVersion(prebid.version)}/dist/`
  };

  let identifierToStringLiteral = [
    '$$REPO_AND_VERSION$$'
  ];

  const PREBID_ROOT = path.resolve(__dirname, '..');
  // on Windows, require paths are not filesystem paths
  const SEP_PAT = new RegExp(path.sep.replace(/\\/g, '\\\\'), 'g')

  function relPath(from, toRelToProjectRoot) {
    return path.relative(path.dirname(from), path.join(PREBID_ROOT, toRelToProjectRoot)).replace(SEP_PAT, '/');
  }

  function getModuleName(filename) {
    const modPath = path.parse(path.relative(PREBID_ROOT, filename));
    if (modPath.ext.toLowerCase() !== '.js') {
      return null;
    }
    if (modPath.dir === 'modules') {
      // modules/moduleName.js -> moduleName
      return modPath.name;
    }
    if (modPath.name.toLowerCase() === 'index' && path.dirname(modPath.dir) === 'modules') {
      // modules/moduleName/index.js -> moduleName
      return path.basename(modPath.dir);
    }
    return null;
  }

  return {
    visitor: {
      Program(path, state) {
        const modName = getModuleName(state.filename);
        if (modName != null) {
          // append "registration" of module file to getGlobal().installedModules
          let i = 0;
          let registerName;
          do {
            registerName = `__r${i++}`
          } while (path.scope.hasBinding(registerName))
          path.node.body.unshift(...api.parse(`import {registerModule as ${registerName}} from '${relPath(state.filename, 'src/prebidGlobal.js')}';`, {filename: state.filename}).program.body);
          path.node.body.push(...api.parse(`${registerName}('${modName}');`, {filename: state.filename}).program.body);
        }
      },
      StringLiteral(path) {
        Object.keys(replace).forEach(name => {
          if (path.node.value.includes(name)) {
            path.node.value = path.node.value.replace(
              new RegExp(escapeRegExp(name), 'g'),
              replace[name].toString()
            );
          }
        });
      },
      TemplateLiteral(path) {
        path.traverse({
          TemplateElement(path) {
            Object.keys(replace).forEach(name => {
              ['raw', 'cooked'].forEach(type => {
                if (path.node.value[type].includes(name)) {
                  path.node.value[type] = path.node.value[type].replace(
                    new RegExp(escapeRegExp(name), 'g'),
                    replace[name]
                  );
                }
              });
            });
          }
        });
      },
      Identifier(path) {
        Object.keys(replace).forEach(name => {
          if (path.node.name === name) {
            if (identifierToStringLiteral.includes(name)) {
              path.replaceWith(
                t.StringLiteral(replace[name])
              );
            } else {
              path.replaceWith(
                t.Identifier(replace[name].toString())
              );
            }
          }
        });
      },
      MemberExpression(path) {
        if (
          t.isIdentifier(path.node.object) &&
          path.node.object.name === FEATURES_GLOBAL &&
          !path.scope.hasBinding(FEATURES_GLOBAL) &&
          t.isIdentifier(path.node.property) &&
          features.hasOwnProperty(path.node.property.name)
        ) {
          path.replaceWith(t.booleanLiteral(features[path.node.property.name]));
        }
      }
    }
  };
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
