/**
 * Precompilation: everything that turns the sources into `dist/src`.
 *
 * `dist/src` is emptied once per process, before the first precompile, and built up from there.
 * The wipe is for orphans - output whose source is gone - and only a tree left behind by an
 * earlier run can hold any: within one process no source disappears. Several steps here derive
 * from other files in `dist/src` rather than from sources, so there is no provenance rule that
 * would let orphans be pruned individually instead.
 *
 * Later precompiles in the same process therefore build on what is already there, which is what
 * one invocation precompiling two configurations needs - `gulp test` does exactly that. Wiping per
 * configuration instead empties the tree after the steps carrying `since:` filters have already
 * run, so they skip and never put their output back. See `cleanPrecompiled`.
 *
 * The expensive step - babel - is cached on disk, per file and per build configuration, so that
 * rebuilding is cheap. Nothing needs to be done to keep the cache correct: it is keyed on each
 * file's contents and on `precompilationKey`, and the source glob, not the cache, decides which
 * files exist. The key also covers the files the babel plugins read without being handed -
 * `package.json` and `metadata/modules/*.json` - so a version bump or a metadata edit invalidates
 * what it should.
 *
 * What the cache does *not* notice is a change to the build system itself - `babelConfig.js`, the
 * plugins under `plugins/`, or a `@babel/*` version bump. None of those touch a source file or the
 * configuration key, so cached output survives them. This is deliberate; build work and feature
 * work rarely land together. What forgetting it looks like: source you just edited behaves as
 * expected, but code you did *not* touch behaves as it did before your build-system change - a
 * plugin's transform appears not to apply, or applies with its old semantics. It presents as a
 * bug in the plugin or in unrelated source, and no amount of reading either explains it. Run
 * `gulp clean-cache` and build again before believing it - `gulp clean` will not help, it leaves
 * the caches alone by design. CI is never exposed to this: it builds fresh and never reuses a
 * cache.
 */
const webpackStream = require('webpack-stream');
const gulp = require('gulp');
const helpers = require('./gulpHelpers.js');
const babel = require('gulp-babel');
const {glob} = require('glob');
const log = require('gulplog');
const path = require('path');
const tap = require('gulp-tap');
const _ = require('lodash');
const fs = require('fs');
const filter = import('gulp-filter');
const {buildOptions} = require('./plugins/buildOptions.js');
const { toModulePath }  = require('./plugins/utils.js');
const {
  cachedPipeline,
  getDefaults,
  precompilationKey,
  writePrecompilationKey
} = require('./gulp.cache.js');


const babelPrecomp = _.memoize(
  function ({distUrlBase = null, disableFeatures = null, dev = false} = {}) {
    const options = getDefaults({distUrlBase, disableFeatures, dev});
    const babelConfig = require('./babelConfig.js')(options);
    const key = precompilationKey({distUrlBase, disableFeatures, dev});
    return function () {
      const sourceRoot = path.resolve('.');
      const relativeSourceRoot = path.relative(helpers.getPrecompiledPath(), sourceRoot);
      const src = gulp.src(helpers.getSourcePatterns(), {
        base: '.',
        since: gulp.lastRun(babelPrecomp({distUrlBase, disableFeatures, dev})),
        sourcemaps: true
      });
      // the source root is relative to the precompiled path, not to wherever the cache lives,
      // so that it is the same whether a file was transpiled now or on a previous run
      const transform = () => [
        babel(babelConfig),
        tap(file => {
          file.sourceMap.file = file.basename;
          file.sourceMap.sourceRoot = path.join(relativeSourceRoot, path.relative(file.dirname, sourceRoot))
        })
      ];
      const dest = gulp.dest(helpers.getPrecompiledPath(), {
        sourcemaps: '.'
      });
      if (options.polyfills) {
        // No cache for a polyfill report. `plugins/polyfills.js` accumulates across every file it
        // visits and writes a summary of the lot, so it is not the pure per-file transform
        // `cachedPipeline` requires: only misses would reach babel, and the summary would come out
        // covering just those - or missing entirely, when every file hits.
        return transform().reduce((stream, stage) => stream.pipe(stage), src).pipe(dest);
      }
      return cachedPipeline({namespace: 'precompile', key, src, transform, dest});
    }
  },
  precompilationKey
)

/**
 * Empty `dist/src`, once per process and no more.
 *
 * The wipe exists to remove orphans - output whose source is gone - which is only possible in a
 * tree left behind by an earlier run. Once this process has precompiled anything, the tree is its
 * own and there is nothing to sweep.
 *
 * Wiping per *configuration* rather than per process breaks `gulp test`, which precompiles two
 * feature variants back to back: the second wipe empties the tree while `copyVerbatim`,
 * `generateMetadataModules`, `generatePublicModules` and `generateCreativeRenderers` are all
 * holding `gulp.lastRun(...)` timestamps from the first, so they see unchanged inputs and skip,
 * and the tree never gets its `.json` files, metadata modules or public modules back.
 *
 * A variant switch does not need a wipe. Everything that depends on the configuration is rebuilt
 * regardless - `babelPrecomp` is memoized per configuration, so the new one has no `lastRun` and
 * re-emits every file, and `generateBuildOptions` and `generateGlobalDef` have no `since` filter -
 * while everything that does not depend on it is already correct on disk.
 */
let wiped = false;

function cleanPrecompiled(options = {}) {
  return function wipePrecompiled(done) {
    if (wiped || gulp.lastRun(babelPrecomp(options)) != null) {
      done();
      return;
    }
    wiped = true;
    fs.rm(helpers.getPrecompiledPath(), {recursive: true, force: true}, done);
  }
}

/**
 * Record in the tree which configuration produced it, for the webpack caches downstream - see
 * `writePrecompilationKey`. Runs straight after the wipe, so that it is in place for every later
 * step, and so that a tree left behind by a failed build still says what it is.
 */
function stampPrecompiled(options = {}) {
  return function stampPrecompilationKey(done) {
    try {
      writePrecompilationKey(precompilationKey(options));
      done();
    } catch (e) {
      done(e);
    }
  }
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
    delete data.purposes; // directly included in adapter source
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

const TS_OUT = path.resolve('.cache/ts/out');

/**
 * Copy the declarations tsc emitted into the precompiled tree.
 *
 * Driven by the sources rather than by what is in `TS_OUT`: tsc never deletes an output whose input
 * is gone - there is no `--build --clean` here - so a removed or renamed `.ts` leaves its `.d.ts`
 * behind indefinitely. Copying wholesale would put those orphans back into `dist/src`, where
 * `check-declarations` type-checks every declaration it finds and `generateTypeSummary` emits an
 * import for each, so a deleted module would keep appearing in the published type surface. Skipping
 * them here leaves them inert: they cost disk and nothing else.
 *
 * The test is "does `<name>.ts` exist on disk right now", which assumes every input is a checked-in
 * file. A `.ts` generated during the build would fail it and lose its declaration - so what is
 * skipped is logged rather than dropped quietly. Anything in that list you did not just delete or
 * rename is a bug, not housekeeping.
 */
function copyDeclarations() {
  const skipped = [];
  return glob(`${TS_OUT}/**/*.d.ts`).then(files => {
    files.forEach(file => {
      const relative = path.relative(TS_OUT, file);
      if (!fs.existsSync(path.resolve(relative.replace(/\.d\.ts$/, '.ts')))) {
        skipped.push(relative);
        return;
      }
      const dest = helpers.getPrecompiledPath(relative);
      fs.mkdirSync(path.dirname(dest), {recursive: true});
      fs.copyFileSync(file, dest);
    });
    if (skipped.length > 0) {
      const shown = skipped.slice(0, 10);
      log.info(
        `${skipped.length} cached declaration(s) had no source and were left out of ` +
        `'${path.relative('.', helpers.getPrecompiledPath())}': ${shown.join(', ')}` +
        `${skipped.length > shown.length ? `, +${skipped.length - shown.length} more` : ''}. ` +
        `Expected after deleting or renaming a .ts - tsc keeps its old output. ` +
        `'gulp clean-cache' clears them. Anything else listed here is missing from the build.`
      );
    }
  });
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
            file.contents = Buffer.from(template({modulePath: toModulePath(modulePath)}));
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
      // glob returns directory order, which varies between builds; sort so that the same sources
      // always produce the same summary
      files = files.map(file => path.relative(destDir, file)).sort()
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, {recursive: true});
      }
      fs.writeFile(dest, template({files: files.map(toModulePath)}), done);
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


/**
 * Apply the `prebid/augmentation-reachable` policy to the generated declarations.
 *
 * The same check runs on the sources as a lint rule, but only the generated declarations show
 * which imports survived declaration emit - and it is those that decide whether an augmentation
 * reaches a consumer.
 */
function checkDeclarations(done) {
  const {checkFiles, listFiles} = require('./plugins/augmentationReachable.js');
  const root = helpers.getPrecompiledPath();
  // compiled test code is not part of the types consumers see, and includes fixtures that
  // deliberately violate this policy
  const ignore = [helpers.getPrecompiledPath('test')];
  const declarations = listFiles(root, ['.d.ts'], ignore);
  if (declarations.length === 0) {
    done(new Error(`no declaration files under '${root}', run 'gulp build' first`));
    return;
  }
  const problems = checkFiles(declarations, {
    coreEntry: helpers.getPrecompiledPath('src/prebid.public.d.ts'),
    ignore,
    project: 'tsconfig-strict.json'
  });
  if (problems.length > 0) {
    done(new Error(['', ...problems.map(
      ({file, line, column, message}) => `${path.relative(__dirname, file)}(${line},${column}): ${message}`
    )].join('\n')));
    return;
  }
  done();
}

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
      devtool: dev ? 'inline-source-map': false
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
  const tpl = _.template('// this file is autogenerated, see creative/README.md\nexport const RENDERER = <%= JSON.stringify(contents.toString()) %>');
  return gulp.src(['build/creative/renderers/**/*.js'], {since: gulp.lastRun(generateCreativeRenderers)})
    .pipe(tap((file) => {
      file.contents = Buffer.from(tpl({contents: file.contents}));
    }))
    .pipe(gulp.dest(helpers.getCreativeRendererPath()))
}


function precompile(options = {}) {
  return gulp.series([
    cleanPrecompiled(options),
    stampPrecompiled(options),
    gulp.parallel(['ts', generateMetadataModules, generateBuildOptions(options)]),
    gulp.parallel([copyVerbatim, copyDeclarations, babelPrecomp(options)]),
    gulp.parallel([
      gulp.series([buildCreative(options), generateCreativeRenderers]),
      publicModules,
      generateCoreSummary,
      generateModuleSummary,
      generateGlobalDef(options),
    ]),
  ].concat(options.dev ? [] : [
    gulp.parallel(['ts-strict', 'check-declarations'])
  ]));
}


// Always incremental: tsc emits into `.cache/ts/out` and keeps its buildinfo beside it, so the two
// agree across runs and there is nothing for a non-incremental variant to protect against. CI sees
// no benefit - it starts from a fresh checkout with no cache - but a local build that has run
// before does.
gulp.task('ts', helpers.execaTask('tsc --incremental'));
gulp.task('ts-strict', helpers.execaTask('tsc -p tsconfig-strict.json'));
gulp.task('check-declarations', checkDeclarations);
gulp.task('transpile', babelPrecomp());
gulp.task('precompile-dev', precompile({dev: true}));
gulp.task('precompile', precompile());
gulp.task('precompile-all-features-disabled', precompile({disableFeatures: helpers.getTestDisableFeatures()}));
gulp.task('verbatim', copyVerbatim)


module.exports = {
  precompile,
  babelPrecomp,
  copyDeclarations
}
