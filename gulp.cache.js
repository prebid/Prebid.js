/**
 * How the build is keyed on disk, and the on-disk cache for gulp pipelines whose transform is a
 * pure function of each file.
 *
 * The cache exists so that repeat builds are cheap; nothing else in the build - and nobody
 * running it - needs to know it is there. There are no flags, and no hygiene rules: see
 * `cachedPipeline` for the one precondition a wrapped transform has to meet.
 *
 * This module owns `precompilationKey`, the answer to "what, other than a source file's own
 * contents, does the output depend on". Everything that caches anything derived from the sources
 * keys on it - `cachedPipeline` here, and the webpack configurations, which cache on disk too.
 * Define it once, here, rather than reconstructing it wherever a cache is configured.
 */
const {createHash} = require('crypto');
const fs = require('fs');
const path = require('path');
const {Transform, PassThrough} = require('node:stream');
const mergeStream = require('merge-stream');
const helpers = require('./gulpHelpers.js');
const argv = helpers.argv;
const PluginError = require('plugin-error');

const PLUGIN = 'gulp.cache';
const CACHE_ROOT = path.resolve(__dirname, '.cache');
// Bump when the layout or contents of a cache entry change, so that entries written by an
// older version of this file are never read back by a newer one.
const ENTRY_FORMAT = 1;
const SUFFIX = '.pbcache';
// carries the cache location of an in-flight miss across the transform. A transform that
// replaces (rather than mutates) the vinyl file drops it, and `store` then fails loudly.
const PENDING = 'precompileCacheEntry';

/**
 * Directory that holds the cached output for one configuration.
 *
 * The key is hashed rather than used verbatim: it holds URLs and an unsorted feature list,
 * neither of which makes a usable path segment.
 */
function cacheDir(namespace, key) {
  const digest = createHash('sha256').update(`${ENTRY_FORMAT} ${key}`).digest('hex').slice(0, 16);
  return path.join(CACHE_ROOT, namespace, digest);
}

function contentHash(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

/**
 * Everything the babel plugins read that is not the file being transformed.
 *
 * `plugins/pbjsGlobals.js` substitutes `package.json`'s version into the output, and
 * `plugins/callerContext.js` and `plugins/gvlPurposes.js` read `metadata/modules/*.json`. A change
 * to either changes what is emitted while leaving every source file's own content hash untouched,
 * so both belong in the key - without them a release build on a warm cache emits the previous
 * version number.
 *
 * Digested whole, and deliberately bluntly. Keying on just the fields in use today would
 * invalidate less often, but it would also quietly stop covering a plugin that starts reading
 * something else, and that failure is silent. Most changes touch neither of these, so
 * over-invalidating costs little and under-invalidating costs a wrong build.
 */
const EXTERNAL_INPUTS = {
  manifest: path.resolve(__dirname, 'package.json'),
  metadataDir: path.resolve(__dirname, 'metadata/modules')
};

function externalInputsDigest({manifest, metadataDir} = EXTERNAL_INPUTS) {
  const digest = createHash('sha256');
  digest.update(fs.readFileSync(manifest));
  let names;
  try {
    names = fs.readdirSync(metadataDir).filter(name => name.endsWith('.json')).sort();
  } catch {
    names = [];
  }
  for (const name of names) {
    // the name as well as the contents, so that a rename is a change
    digest.update(name);
    digest.update(fs.readFileSync(path.join(metadataDir, name)));
  }
  return digest.digest('hex').slice(0, 16);
}

function getDefaults({distUrlBase = null, disableFeatures = null, dev = false} = {}) {
  if (dev && distUrlBase == null) {
    distUrlBase = argv.distUrlBase || '/build/dev/'
  }
  return {
    disableFeatures: disableFeatures ?? helpers.getDisabledFeatures(),
    distUrlBase: distUrlBase ?? argv.distUrlBase,
    dev,
    polyfills: argv.polyfills
  }
}

/**
 * Everything other than a source file's own contents that the precompiled output depends on.
 *
 * This is what `babelPrecomp` memoizes on, what names its cache directory, and what the webpack
 * caches are versioned by, so that none of those can drift apart. It resolves the options first -
 * `disableFeatures`, `distUrlBase` and `polyfills` all default from `argv`, so unresolved options
 * tell you nothing about the output - and it takes whatever `getDefaults` returns rather than a
 * fixed list of fields, so that a field added there is picked up here. On top of the options it
 * folds in what the babel plugins read without being handed it - the environment they consult, and
 * `externalInputsDigest` for the files.
 *
 * Feature lists arrive from `argv` in whatever order they were typed; sort so that the key is
 * stable across orderings that mean the same thing.
 */
function precompilationKey(options = {}) {
  const resolved = {
    ...getDefaults(options),
    // read by plugins/pbjsGlobals.js, and so part of the output
    liveConnectMode: process.env.LiveConnectMode ?? null,
    externalInputs: externalInputsDigest()
  };
  resolved.disableFeatures = [...(resolved.disableFeatures ?? [])].sort();
  return JSON.stringify(Object.fromEntries(
    Object.entries(resolved).sort(([a], [b]) => a < b ? -1 : 1)
  ));
}

const STAMP = '.precompilation-key';

/**
 * Record, in the precompiled tree, which configuration produced it.
 *
 * The webpack configurations that compile that tree cache on disk, and the tree itself gives them
 * nothing to tell one configuration from another: the paths are the same, and `gulp.dest` carries
 * each source file's mtime over, so the timestamps are the same too. Left unkeyed, webpack serves
 * modules cached from a build of a different feature set.
 *
 * Asking the tree what it is beats reconstructing the key from `argv`, which does not see the
 * options that `test-all-features-disabled` and `serve-and-test` pass directly.
 */
function writePrecompilationKey(key) {
  const file = helpers.getPrecompiledPath(STAMP);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, key);
}

/** What the precompiled tree was built with, or null if it is absent or predates the stamp. */
function readPrecompilationKey() {
  try {
    return fs.readFileSync(helpers.getPrecompiledPath(STAMP), 'utf8');
  } catch {
    return null;
  }
}

const created = new Set();

function mkdirOnce(dir) {
  if (!created.has(dir)) {
    fs.mkdirSync(dir, {recursive: true});
    created.add(dir);
  }
}

/**
 * Cache entries are keyed on the *source* path, which is what the source glob gives us at
 * lookup time. The transform's output path is recorded in the entry instead, so that this
 * file never has to replicate a transform's renaming rules.
 */
function entryFor(dir, relative) {
  const file = `${path.join(dir, relative)}${SUFFIX}`;
  if (path.relative(dir, file).startsWith('..')) {
    // a source outside the pipeline's base cannot be given a stable location under `dir`
    return null;
  }
  return file;
}

/**
 * An entry is one file: a single line of JSON describing what was transformed, then the
 * transform's output verbatim. One file rather than two so that the description and the output
 * it describes cannot be written, or read, out of step with one another - and the output is
 * stored as-is rather than encoded into the JSON, so that reading a hit costs no more than
 * reading the file.
 */
function load(entry, hash) {
  let raw;
  try {
    raw = fs.readFileSync(entry);
  } catch {
    return null;
  }
  const split = raw.indexOf(0x0a);
  if (split < 0) {
    return null;
  }
  let meta;
  try {
    meta = JSON.parse(raw.subarray(0, split).toString());
  } catch {
    return null;
  }
  if (meta == null || meta.hash !== hash || typeof meta.path !== 'string') {
    return null;
  }
  return {contents: raw.subarray(split + 1), meta};
}

/**
 * Written to a temporary name and renamed into place, so that an interrupted or concurrent
 * build can leave an entry missing but never leave one half-written.
 */
function save(entry, hash, file) {
  mkdirOnce(path.dirname(entry));
  const header = JSON.stringify({
    hash,
    path: file.relative,
    sourceMap: file.sourceMap ?? null
  });
  // JSON.stringify escapes newlines, so the header is always exactly one line
  const tmp = `${entry}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, Buffer.concat([Buffer.from(`${header}\n`), file.contents]));
  fs.renameSync(tmp, entry);
}

/**
 * Split the incoming files into cache hits - which are filled in from disk and sent straight
 * on to `dest` - and misses, which are passed downstream to the transform.
 */
function lookup(dir, hits) {
  return new Transform({
    objectMode: true,
    transform(file, enc, cb) {
      const entry = file.isBuffer() ? entryFor(dir, file.relative) : null;
      if (entry == null) {
        // nothing to look up and nothing to store; `null` marks it as intentional, so that
        // `store` can tell it apart from a file it has never seen
        file[PENDING] = null;
        cb(null, file);
        return;
      }
      const hash = contentHash(file.contents);
      let cached;
      try {
        cached = load(entry, hash);
      } catch (e) {
        cb(new PluginError(PLUGIN, e, {fileName: file.path}));
        return;
      }
      if (cached == null) {
        file[PENDING] = {entry, hash};
        cb(null, file);
        return;
      }
      file.contents = cached.contents;
      file.path = path.resolve(file.base, cached.meta.path);
      if (cached.meta.sourceMap == null) {
        delete file.sourceMap;
      } else {
        file.sourceMap = cached.meta.sourceMap;
      }
      if (hits.write(file)) {
        cb();
      } else {
        hits.once('drain', cb);
      }
    },
    flush(cb) {
      hits.end();
      cb();
    }
  });
}

/** Write what the transform produced into the cache, on the way to `dest`. */
function store() {
  return new Transform({
    objectMode: true,
    transform(file, enc, cb) {
      const pending = file[PENDING];
      if (pending === undefined) {
        cb(new PluginError(PLUGIN, new Error(
          `'${file.relative}' did not come out of the file it went in as. A cached transform must ` +
          `map each file to exactly one file, and must mutate it rather than replace it.`
        ), {fileName: file.path}));
        return;
      }
      delete file[PENDING];
      if (pending == null) {
        cb(null, file);
        return;
      }
      try {
        save(pending.entry, pending.hash, file);
      } catch (e) {
        cb(new PluginError(PLUGIN, e, {fileName: file.path}));
        return;
      }
      cb(null, file);
    }
  });
}

function forwardErrors(out, streams) {
  let failed = false;
  streams.forEach(stream => stream.on('error', err => {
    if (!failed) {
      failed = true;
      out.emit('error', err);
    }
  }));
}

/**
 * Run `src` through `transform` into `dest`, transpiling only the files whose output is not
 * already on disk from a previous run.
 *
 * The transform must be a pure function of each file's contents and path - those two are all
 * the cache keys on, together with `key`. No filesystem reads, no global state, one file out
 * for each file in. A transform that breaks this serves stale output silently - which is why
 * `babelPrecomp` does not use this helper for `--polyfills` builds, where the babel plugin
 * aggregates across every file it sees.
 *
 * `key` identifies the configuration the transform was built with; output from different
 * configurations is stored separately and never mixes.
 *
 * @param {string} namespace subdirectory of `.cache` to store output under
 * @param {NodeJS.ReadableStream} src the source files
 * @param {string} key everything other than a file's own contents that the transform's
 *   output depends on
 * @param {function(): NodeJS.ReadWriteStream|NodeJS.ReadWriteStream[]} transform thunk
 *   returning the transform to run on cache misses (or the stages of it, to be piped in
 *   order). A thunk both because each run needs a fresh stream, and because the helper - not
 *   the caller - decides which files reach it
 * @param {NodeJS.WritableStream} dest where both cached and freshly transformed files go
 * @returns {NodeJS.ReadWriteStream} the pipeline, to be returned from a gulp task
 */
function cachedPipeline({namespace, src, key, transform, dest}) {
  const dir = cacheDir(namespace, key);
  const hits = new PassThrough({objectMode: true});
  const stages = [lookup(dir, hits)].concat(transform(), store());
  const misses = stages.reduce((from, to) => from.pipe(to));
  const merged = mergeStream(misses, hits);
  const out = merged.pipe(dest);
  // `pipe` does not carry errors downstream, so a failure in any stage would otherwise go
  // unhandled instead of failing the task
  forwardErrors(out, [src, ...stages, merged]);
  src.pipe(stages[0]);
  return out;
}

module.exports = {
  cachedPipeline,
  externalInputsDigest,
  getDefaults,
  precompilationKey,
  writePrecompilationKey,
  readPrecompilationKey,
  CACHE_ROOT
};
