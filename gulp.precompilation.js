const gulp = require('gulp');
const helpers = require('./gulpHelpers.js');
const {argv} = require('yargs');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const {glob} = require('glob');
const path = require('path');
const tap = require('gulp-tap');
const _ = require('lodash');
const fs = require('fs');
const filter = import('gulp-filter');
const {buildOptions} = require('./plugins/buildOptions.js');


// do not generate more than one task for a given build config - so that `gulp.lastRun` can work properly
const PRECOMP_TASKS = new Map();

function babelPrecomp({distUrlBase = null, disableFeatures = null, dev = false} = {}) {
  if (dev && distUrlBase == null) {
    distUrlBase = argv.distUrlBase || '/build/dev/'
  }
  const key = `${distUrlBase}::${disableFeatures}`;
  if (!PRECOMP_TASKS.has(key)) {
    const babelConfig = require('./babelConfig.js')({
      disableFeatures: disableFeatures ?? helpers.getDisabledFeatures(),
      prebidDistUrlBase: distUrlBase ?? argv.distUrlBase,
      ES5: argv.ES5
    });
    const precompile = function () {
      // `since: gulp.lastRun(task)` selects files that have been modified since the last time this gulp process ran `task`
      return gulp.src(helpers.getSourcePatterns(), {base: '.', since: gulp.lastRun(precompile)})
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write('.', {
          sourceRoot: path.relative(helpers.getPrecompiledPath(), path.resolve('.'))
        }))
        .pipe(gulp.dest(helpers.getPrecompiledPath()));
    }
    PRECOMP_TASKS.set(key, precompile)
  }
  return PRECOMP_TASKS.get(key);
}

/**
 * Generate a "metadata module" for each json file in metadata/modules
 * These are wrappers around the JSON that register themselves with the `metadata` library
 */
function generateMetadataModules() {
  const tpl = _.template(`import {metadata} from '../../libraries/metadata/metadata.js';\nmetadata.register(<%= moduleName %>, <%= data %>)`);
  function cleanMetadata(file) {
    const data = JSON.parse(file.contents.toString())
    delete data.NOTICE;
    data.components.forEach(component => {
      delete component.gvlid;
      if (component.aliasOf == null) {
        delete component.aliasOf;
      }
    })
    return JSON.stringify(data);
  }
  return  gulp.src('./metadata/modules/*.json')
    .pipe(tap(file => {
      const {dir, name} = path.parse(file.path);
      file.contents = Buffer.from(tpl({
        moduleName: JSON.stringify(name),
        data: cleanMetadata(file)
      }));
      file.path = path.join(dir, `${name}.js`);
    }))
    .pipe(gulp.dest(helpers.getPrecompiledPath('metadata/modules')));
}

/**
 * .json and .d.ts files are used at runtime, so make them part of the precompilation output
 */
function copyVerbatim() {
  return gulp.src(helpers.getSourceFolders().flatMap(name => [
    `${name}/**/*.json`,
    `${name}/**/*.d.ts`,
  ]).concat([
    './package.json',
    '!./src/types/local/**/*' // exclude "local", type definitions that should not be visible to consumers
  ]), {base: '.'})
    .pipe(gulp.dest(helpers.getPrecompiledPath()))
}

/**
 * Generate "public" versions of module files (used in  package.json "exports") that
 * just import the "real" module
 *
 * This achieves two things:
 *
 *   - removes the need for awkward "index" imports, e.g. userId/index
 *   - hides their exports from NPM consumers
 */
function generatePublicModules(ext, template) {
  const publicDir = helpers.getPrecompiledPath('public');

  function getNames(file) {
    const filePath = path.parse(file.path);
    const fileName = filePath.name.replace(/\.d$/gi, '');
    const moduleName = fileName === 'index' ? path.basename(filePath.dir) : fileName;
    const publicName = `${moduleName}.${ext}`;
    const modulePath = path.relative(publicDir, file.path);
    const publicPath = path.join(publicDir, publicName);
    return {modulePath, publicPath}
  }

  function publicVersionDoesNotExist(file) {
    // allow manual definition of a module's public version by leaving it
    // alone if it exists under `public`
    return !fs.existsSync(getNames(file).publicPath)
  }

  return function (done) {
    filter.then(({default: filter}) => {
      gulp.src([
        helpers.getPrecompiledPath(`modules/*.${ext}`),
        helpers.getPrecompiledPath(`modules/**/index.${ext}`),
        `!${publicDir}/**/*`
      ])
        .pipe(filter(publicVersionDoesNotExist))
        .pipe(tap((file) => {
          const {modulePath, publicPath} = getNames(file);
          file.contents = Buffer.from(template({modulePath}));
          file.path = publicPath;
        }))
        .pipe(gulp.dest(publicDir))
        .on('end', done);
    })
  }
}

function generateTypeSummary(folder, dest, ignore = dest) {
  const template = _.template(`<% _.forEach(files, (file) => { %>import '<%= file %>';
<% }) %>`);
  const destDir = path.parse(dest).dir;
  return function (done) {
    glob([`${folder}/**/*.d.ts`], {ignore}).then(files => {
      files = files.map(file => path.relative(destDir, file))
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, {recursive: true});
      }
      fs.writeFile(dest, template({files}), done);
    })
  }
}

const generateCoreSummary = generateTypeSummary(
  helpers.getPrecompiledPath('src'),
  helpers.getPrecompiledPath('src/types/summary/core.d.ts'),
  helpers.getPrecompiledPath('src/types/summary/**/*')
);
const generateModuleSummary = generateTypeSummary(helpers.getPrecompiledPath('modules'), helpers.getPrecompiledPath('src/types/summary/modules.d.ts'))
const publicModules = gulp.parallel(Object.entries({
  'js':  _.template(`import '<%= modulePath %>';`),
  'd.ts': _.template(`export type * from '<%= modulePath %>'`)
}).map(args => generatePublicModules.apply(null, args)));


const globalTemplate = _.template(`<% if (defineGlobal) {%>
import type {PrebidJS} from "../../prebidGlobal.ts";
declare global {
  let <%= pbGlobal %>: PrebidJS;
  interface Window {
    <%= pbGlobal %>: PrebidJS;
  }
}<% } %>`);

function generateGlobalDef(options) {
  return function (done) {
    fs.writeFile(helpers.getPrecompiledPath('src/types/summary/global.d.ts'), globalTemplate(buildOptions(options)), done);
  }
}

function precompile(options = {}) {
  return gulp.series([
    gulp.parallel(['ts', generateMetadataModules]),
    gulp.parallel([copyVerbatim, babelPrecomp(options)]),
    gulp.parallel([publicModules, generateCoreSummary, generateModuleSummary, generateGlobalDef(options)])
  ]);
}


gulp.task('ts', helpers.execaTask('tsc'));
gulp.task('transpile', babelPrecomp());
gulp.task('precompile-dev', precompile({dev: true}));
gulp.task('precompile', precompile());
gulp.task('precompile-all-features-disabled', precompile({disableFeatures: helpers.getTestDisableFeatures()}));
gulp.task('verbatim', copyVerbatim)


module.exports = {
  precompile,
  babelPrecomp
}
