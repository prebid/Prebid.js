
let t = require('@babel/core').types;
let prebid = require('../package.json');
const path = require('path');

module.exports = function(api, options) {
  const pbGlobal = options.globalVarName || prebid.globalVarName;
  let replace = {
    '$prebid.version$': prebid.version,
    '$$PREBID_GLOBAL$$': pbGlobal,
    '$$REPO_AND_VERSION$$': `${prebid.repository.url.split('/')[3]}_prebid_${prebid.version}`
  };

  let identifierToStringLiteral = [
    '$$REPO_AND_VERSION$$'
  ];

  const PREBID_ROOT = path.resolve(__dirname, '..');

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
          // append "registration" of module file to $$PREBID_GLOBAL$$.installedModules
          path.node.body.push(...api.parse(`window.${pbGlobal}.installedModules.push('${modName}');`, {filename: state.filename}).program.body);
        }
      },
      StringLiteral(path) {
        Object.keys(replace).forEach(name => {
          if (path.node.value.includes(name)) {
            path.node.value = path.node.value.replace(
              new RegExp(escapeRegExp(name), 'g'),
              replace[name]
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
                t.Identifier(replace[name])
              );
            }
          }
        });
      }
    }
  };
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
