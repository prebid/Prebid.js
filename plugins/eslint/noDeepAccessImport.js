const DEEP_ACCESS_IMPORT_MESSAGE = 'Prefer optional chaining over deepAccess when the property path is statically known.';

module.exports = {
  meta: {
    docs: {
      description: 'suggests optional chaining instead of deepAccess for statically known property paths'
    },
    type: 'suggestion',
    schema: []
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (/test[\\/]spec[\\/].*_spec\.(js|mjs|ts|mts)$/.test(context.getFilename())) return;
        const source = node.source?.value;
        if (typeof source !== 'string' || (source !== 'src/utils.js' && !source.endsWith('/src/utils.js'))) return;
        const deepAccessImport = node.specifiers.find(specifier =>
          specifier.type === 'ImportSpecifier' && specifier.imported?.type === 'Identifier' && specifier.imported.name === 'deepAccess'
        );
        if (deepAccessImport) context.report({node: deepAccessImport, message: DEEP_ACCESS_IMPORT_MESSAGE});
      }
    };
  }
};
