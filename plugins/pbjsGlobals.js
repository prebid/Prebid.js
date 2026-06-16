let t = require('@babel/core').types;
let prebid = require('../package.json');
const path = require('path');
const {buildOptions} = require('./buildOptions.js');
const FEATURES_GLOBAL = 'FEATURES';
const {getModuleName, relPath, getFreeName} = require('./utils.js');

module.exports = function(api, options) {
  const {features, distUrlBase, skipCalls} = buildOptions(options);

  let replace = {
    '$prebid.version$': prebid.version,
    '$$PREBID_GLOBAL$$': false,
    '$$DEFINE_PREBID_GLOBAL$$': false,
    '$$REPO_AND_VERSION$$': `${prebid.repository.url.split('/')[3]}_prebid_${prebid.version}`,
    '$$PREBID_DIST_URL_BASE$$': false,
    '$$LIVE_INTENT_MODULE_MODE$$': (process && process.env && process.env.LiveConnectMode) || 'standard'
  };

  let identifierToStringLiteral = [
    '$$REPO_AND_VERSION$$'
  ];

  function translateToJs(path, state) {
    const source = path.node.source?.value;
    if (source) {
      if (source.endsWith('.d.ts')) {
        // assuming .d.ts files are just definitions, they are not relevant at runtime
        path.remove();
      } else if (source.endsWith('.ts')) {
        path.node.source.value = path.node.source.value.replace(/\.ts$/, '.js');
      }
    }
  }

  function checkMacroAllowed(name) {
    if (replace[name] === false) {
      throw new Error(`The macro ${name} should no longer be used; look for a replacement in src/buildOptions.ts`)
    }
  }

  return {
    visitor: {
      Program(path, state) {
        const modName = getModuleName(state.filename);
        if (modName != null) {
          // append "registration" of module file to getGlobal().installedModules
          const registerName = getFreeName(path, '__r');
          path.node.body.unshift(...api.parse(`import {registerModule as ${registerName}} from '${relPath(state.filename, 'src/prebidGlobal.js')}';`, {filename: state.filename}).program.body);
          path.node.body.push(...api.parse(`${registerName}('${modName}');`, {filename: state.filename}).program.body);
        }
      },
      ImportDeclaration: translateToJs,
      ExportDeclaration: translateToJs,
      StringLiteral(path, state) {
        Object.keys(replace).forEach(name => {
          if (path.node.value.includes(name)) {
            checkMacroAllowed(name);
            path.node.value = path.node.value.replace(
              new RegExp(escapeRegExp(name), 'g'),
              replace[name].toString()
            );
          }
        });
      },
      TemplateLiteral(path, state) {
        path.traverse({
          TemplateElement(path) {
            Object.keys(replace).forEach(name => {
              ['raw', 'cooked'].forEach(type => {
                if (path.node.value[type].includes(name)) {
                  checkMacroAllowed(name);
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
      Identifier(path, state) {
        Object.keys(replace).forEach(name => {
          if (path.node.name === name) {
            checkMacroAllowed(name);
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
          Object.prototype.hasOwnProperty.call(features, path.node.property.name)
        ) {
          path.replaceWith(t.booleanLiteral(features[path.node.property.name]));
        }
      },
      CallExpression(path) {
        if (
              // direct calls, e.g. logMessage()
              t.isIdentifier(path.node.callee) &&
              skipCalls.has(path.node.callee.name) ||

              // Member expression calls, e.g. utils.logMessage()
              t.isMemberExpression(path.node.callee) &&
              t.isIdentifier(path.node.callee.property) &&
              skipCalls.has(path.node.callee.property.name)
        ) {
          if (t.isExpressionStatement(path.parent)) {
            path.parentPath.remove();
          } else {
            // Fallback to undefined if it's used as part of a larger expression
            path.replaceWith(t.identifier('undefined'));
          }
          path.skip(); // Prevent further traversal
        }
      }
    }
  };
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
