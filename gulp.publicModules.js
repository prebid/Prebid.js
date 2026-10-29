/**
 * "Public" versions of module files (used in package.json "exports"), which just import the "real" module.
 *
 * This achieves three things:
 *
 *   - removes the need for awkward "index" imports, e.g. userId/index
 *   - hides their exports from NPM consumers
 *   - pulls in parent modules (from .submodules.json), so that e.g. importing 'prebid.js/modules/sharedIdSystem'
 *     also includes userId, as `gulp build --modules=sharedIdSystem` does - along with its types
 */
const fs = require('fs');
const path = require('path');
const helpers = require('./gulpHelpers.js');

const PUBLIC_MODULE_TEMPLATES = {
  'js': (modulePath, parent) => [
    parent && `import './${parent}.js';`,
    `import '${modulePath}';`,
  ],
  // `export type {}` adds no exports, but brings in the parent's declarations, which include its augmentations of
  // the public API (e.g. `getUserIds` from userId)
  'd.ts': (modulePath, parent) => [
    parent && `export type {} from './${parent}.d.ts';`,
    modulePath && `export type * from '${modulePath}'`,
  ],
};

function renderPublicModule(ext, modulePath, parent) {
  return PUBLIC_MODULE_TEMPLATES[ext](modulePath, parent).filter(Boolean).join('\n');
}

/**
 * Parent of `moduleName` to import from its public version, if the parent has one for `ext` -
 * JS-only parents (e.g. fpdModule) have no declarations.
 */
function getPublicParent(moduleName, ext, precompiledDir, getParentModule = helpers.getParentModule) {
  const parent = getParentModule(moduleName);
  if (parent != null && [
    `modules/${parent}.${ext}`,
    `modules/${parent}/index.${ext}`,
    `public/${parent}.${ext}`,
  ].some(file => fs.existsSync(path.join(precompiledDir, file)))) {
    return parent;
  }
  return null;
}

/**
 * Contents of the public `ext` version of `moduleName`, given one of its precompiled files - null if it should have none.
 */
function getPublicModule(ext, file, moduleName, modulePath, precompiledDir, getParentModule = helpers.getParentModule) {
  const parent = getPublicParent(moduleName, ext, precompiledDir, getParentModule);
  if (file.endsWith(`.${ext}`)) {
    return renderPublicModule(ext, modulePath, parent);
  }
  if (parent != null && !fs.existsSync(file.replace(/\.js$/, `.${ext}`))) {
    return renderPublicModule(ext, null, parent);
  }
  return null;
}

const OVERRIDE_SOURCES = {
  'js': ['js', 'ts'],
  'd.ts': ['d.ts', 'ts'],
};

/**
 * Whether `moduleName` has a hand-written public `ext` version in the source `public` folder, to use instead of the generated one.
 */
function isOverridden(moduleName, ext, overrideDir = path.join(__dirname, 'public')) {
  return OVERRIDE_SOURCES[ext].some(srcExt => fs.existsSync(path.join(overrideDir, `${moduleName}.${srcExt}`)));
}

module.exports = {
  PUBLIC_MODULE_EXTENSIONS: Object.keys(PUBLIC_MODULE_TEMPLATES),
  renderPublicModule,
  getPublicParent,
  getPublicModule,
  isOverridden,
};
