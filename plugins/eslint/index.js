const _ = require('lodash');
const path = require('path');
const { flagErrors } = require('./validateImports.js');
const APPROVED_LOAD_EXTERNAL_SCRIPT_PATHS = require('./approvedLoadExternalScriptPaths.js');

function isFileAllowed(filePath, approvedPaths) {
  // Normalize the file path to use forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Check if the file path matches any of the approved paths
  return approvedPaths.some(approvedPath => {
    const normalizedApprovedPath = approvedPath.replace(/\\/g, '/');
    
    // If approved path doesn't end with .js/.ts/.mjs, treat it as a folder
    // Check if file path starts with folder path + '/'
    if (!normalizedApprovedPath.match(/\.(js|ts|mjs)$/)) {
      return normalizedPath === normalizedApprovedPath || 
             normalizedPath.startsWith(normalizedApprovedPath + '/');
    }
    
    // Otherwise, treat as exact file match
    return normalizedPath.endsWith(normalizedApprovedPath);
  });
}

module.exports = {
  rules: {
    'validate-imports': {
      meta: {
        docs: {
          description: 'validates module imports can be found without custom webpack resolvers, are in module whitelist, and not module entry points'
        },
        schema: {
          type: 'array'
        }
      },
      create: function (context) {
        return {
          "CallExpression[callee.name='require']"(node) {
            let importPath = _.get(node, ['arguments', 0, 'value']);
            if (importPath) {
              flagErrors(context, node, importPath);
            }
          },
          ImportDeclaration(node) {
            let importPath = node.source.value.trim();
            if (node.importKind !== 'type') {
              flagErrors(context, node, importPath);
            }
          },
          'ExportNamedDeclaration[source]'(node) {
            let importPath = node.source.value.trim();
            flagErrors(context, node, importPath);
          }
        };
      }
    },
    'no-restricted-load-external-script': {
      meta: {
        docs: {
          description: 'disallows use of loadExternalScript except in approved files'
        },
        schema: []
      },
      create: function (context) {
        const filename = context.getFilename();
        const projectRoot = path.resolve(__dirname, '../..');
        const relativePath = path.relative(projectRoot, filename).replace(/\\/g, '/');
        
        // Skip checking test files (spec files)
        const isTestFile = relativePath.includes('test/') || relativePath.includes('/spec/') || relativePath.endsWith('_spec.js');
        
        return {
          "CallExpression[callee.name='loadExternalScript']"(node) {
            if (isTestFile) {
              return; // Skip test files
            }
            if (!isFileAllowed(relativePath, APPROVED_LOAD_EXTERNAL_SCRIPT_PATHS)) {
              context.report({
                node,
                message: `loadExternalScript can only be used in approved files. Current file: ${relativePath}`
              });
            }
          },
          "CallExpression[callee.type='MemberExpression'][callee.property.name='loadExternalScript']"(node) {
            if (isTestFile) {
              return; // Skip test files
            }
            if (!isFileAllowed(relativePath, APPROVED_LOAD_EXTERNAL_SCRIPT_PATHS)) {
              context.report({
                node,
                message: `loadExternalScript can only be used in approved files. Current file: ${relativePath}`
              });
            }
          }
        };
      }
    },
  }
};
