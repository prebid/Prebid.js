const webpackStream = require('webpack-stream');
const gulp = require('gulp');
const helpers = require('./gulpHelpers.js');
const {argv} = require('yargs');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const {glob} = require('glob');
const path = require('path');
const tap = require('gulp-tap');
const wrap = require('gulp-wrap')
const _ = require('lodash');
const fs = require('fs');
const filter = import('gulp-filter');
const {buildOptions} = require('./plugins/buildOptions.js');

function getDefaults({distUrlBase = null, disableFeatures = null, dev = false}) {
  if (dev && distUrlBase == null) {
    distUrlBase = argv.distUrlBase || '/build/dev/'
  }
  return {
    disableFeatures: disableFeatures ?? helpers.getDisabledFeatures(),
    distUrlBase: distUrlBase ?? argv.distUrlBase,
    ES5: argv.ES5
  }
}

const babelPrecomp = _.memoize(
  function ({distUrlBase = null, disableFeatures = null, dev = false} = {}) {
    const babelConfig = require('./babelConfig.js')(getDefaults({distUrlBase, disableFeatures, dev}));
    return function () {
      return gulp.src(helpers.getSourcePatterns(), {base: '.', since: gulp.lastRun(babelPrecomp({distUrlBase, disableFeatures, dev}))})
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write('.', {
          sourceRoot: path.relative(helpers.getPrecompiledPath(), path.resolve('.'))
        }))
        .pipe(gulp.dest(helpers.getPrecompiledPath()));
    }
  },
  ({dev, distUrlBase, disableFeatures} = {}) => `${dev}::${distUrlBase ?? ''}::${(disableFeatures ?? []).join(':')}`
)

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
  return  gulp.src('./metadata/modules/*.json', {since: gulp.lastRun(generateMetadataModules)})
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
    '!./src/types/local/**/*' // exclude "local", type definitions that should not be visible to consumers
  ]), {base: '.', since: gulp.lastRun(copyVerbatim)})
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
const generatePublicModules = _.memoize(
  function (ext, template) {
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
        ], {since: gulp.lastRun(generatePublicModules(ext, template))})
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
  },
)

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

function generateBuildOptions(options = {}) {
  return function mkBuildOptions(done) {
    options = buildOptions(getDefaults(options));
    import('./customize/buildOptions.mjs').then(({getBuildOptionsModule}) => {
      const dest = getBuildOptionsModule();
      if (!fs.existsSync(path.dirname(dest))) {
        fs.mkdirSync(path.dirname(dest), {recursive: true});
      }
      fs.writeFile(dest, `export default ${JSON.stringify(options, null, 2)}`, done);
    })
  }

}


const buildCreative = _.memoize(
  function buildCreative({dev = false} = {}) {
    const opts = {
      mode: dev ? 'development' : 'production',
      devtool: false
    };
    return function() {
      return gulp.src(['creative/**/*'], {since: gulp.lastRun(buildCreative({dev}))})
        .pipe(webpackStream(Object.assign(require('./webpack.creative.js'), opts)))
        .pipe(gulp.dest('build/creative'))
    }
  },
  ({dev}) => dev
)

function generateCreativeRenderers() {
  return gulp.src(['build/creative/renderers/**/*.js'], {since: gulp.lastRun(generateCreativeRenderers)})
    .pipe(wrap('// this file is autogenerated, see creative/README.md\nexport const RENDERER = <%= JSON.stringify(contents.toString()) %>'))
    .pipe(gulp.dest(helpers.getCreativeRendererPath()))
}


function precompile(options = {}) {
  return gulp.series([
    gulp.parallel([options.dev ? 'ts-dev' : 'ts', generateMetadataModules, generateBuildOptions(options)]),
    gulp.parallel([copyVerbatim, babelPrecomp(options)]),
    gulp.parallel([
      gulp.series([buildCreative(options), generateCreativeRenderers]),
      publicModules,
      generateCoreSummary,
      generateModuleSummary,
      generateGlobalDef(options),
    ])
  ]);
}


gulp.task('ts', helpers.execaTask('tsc'));
gulp.task('ts-dev', helpers.execaTask('tsc --incremental'))
gulp.task('transpile', babelPrecomp());
gulp.task('precompile-dev', precompile({dev: true}));
gulp.task('precompile', precompile());
gulp.task('precompile-all-features-disabled', precompile({disableFeatures: helpers.getTestDisableFeatures()}));
gulp.task('verbatim', copyVerbatim)


module.exports = {
  precompile,
  babelPrecomp
}
