
let t = require('@babel/core').types;
let prebid = require('../package.json');

module.exports = function(api, options) {
  let replace = {
    '$prebid.version$': prebid.version,
    '$$PREBID_GLOBAL$$': options.globalVarName || prebid.globalVarName,
    '$$REPO_AND_VERSION$$': `${prebid.repository.url.split('/')[3]}_prebid_${prebid.version}`
  };

  let identifierToStringLiteral = [
    '$$REPO_AND_VERSION$$'
  ];

  return {
    visitor: {
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
