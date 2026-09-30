/**
 * Decides whether a given repository file counts as a "core" change.
 *
 * A "core" PR needs more scrutiny than a module PR (see `reviewRequirements` in getPRProperties.js),
 * so the goal is to classify as core only the files that are not owned by an outside vendor: a module
 * is core when it declares no component of its own (or only `prebid` ones), and a library is core when
 * a core module pulls it in.
 *
 * This file doubles as a CLI - see `usage` at the bottom - so that the classification can be run over
 * an arbitrary list of files.
 *
 * This file was written by a bot (Claude Code).
 */

const fs = require('fs');
const path = require('path');

const MODULE_PATTERNS = [
  /^modules\/([^\/]+)BidAdapter(\.(\w+)|\/)/,
  /^modules\/([^\/]+)AnalyticsAdapter(\.(\w+)|\/)/,
  /^modules\/([^\/]+)RtdProvider(\.(\w+)|\/)/,
  /^modules\/([^\/]+)IdSystem(\.(\w+)|\/)/,
  // a video provider is an integration with a particular player, so it always belongs to its vendor
  /^modules\/([^\/]+)VideoProvider(\.(\w+)|\/)/
];

const EXCLUDE_PATTERNS = [
  /^test\//,
  /^integrationExamples\//,
  /^[^\/]+$/,
  /^.github\//,
  // registries and per-module data that every new module has to touch; a change here is about the
  // module being registered, not about the file itself
  /^metadata\/modules\.json$/,
  /^metadata\/disclosures\/modules\//,
  /^modules\/\.submodules\.json$/,
];

const LIBRARY_PATTERN = /^libraries\/([^\/]+)\//;
const MODULE_FILE_PATTERN = /^modules\/([^\/.]+)/;
const MODULE_METADATA_PATTERN = /^metadata\/modules\/([^\/.]+)\.json$/;

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const DEFAULT_DEPENDENCIES_JSON = path.join(REPO_ROOT, 'build', 'dist', 'dependencies.json');
const DEFAULT_METADATA_DIR = path.join(REPO_ROOT, 'metadata', 'modules');
const DEFAULT_COMPONENTS_JSON = path.join(REPO_ROOT, 'metadata', 'modules.json');

// shortest name that is distinctive enough to identify a vendor by itself
const MIN_VENDOR_NAME_LENGTH = 3;

// Modules that belong to a vendor but carry no sign of it: they declare no component, their name follows
// none of the module naming conventions, and no component is registered under their vendor's name.
// Giving them metadata is the way to take them off this list.
const VENDOR_MODULES = [
  'seenthisBrandStories'
];

// Libraries that belong to a vendor - typically a white label serving several brands - but whose name
// does not begin with any registered component name, either because the vendor's own brand is not a
// component (`teqblaze`, `vizionik`) or because its components are registered under a longer name
// (`intentIqId`, `advangelists`). Everything else under libraries/ is taken to be shared code.
const VENDOR_LIBRARIES = [
  'advangUtils',
  'agenticxUtils',
  'audUtils',
  'dxUtils',
  'intentIqConstants',
  'intentIqUtils',
  'pageInfosUtils',
  'teqblazeUtils',
  'utiqUtils',
  'vizionikUtils',
  'xeUtils'
];

/**
 * Loads the dependency graph (entry point -> chunk files) built by webpack's manifest plugin.
 *
 * @param {string} [file] path to dependencies.json; defaults to $DEPENDENCIES_JSON, then to the local build output.
 */
function loadDependencies(file = process.env.DEPENDENCIES_JSON || DEFAULT_DEPENDENCIES_JSON) {
  if (!fs.existsSync(file)) {
    throw new Error(`Cannot find dependency graph '${file}'; run 'gulp build' or set DEPENDENCIES_JSON`);
  }
  return JSON.parse(fs.readFileSync(file).toString());
}

/**
 * The name of the module a repository file belongs to - the first path element under `modules/`,
 * without its extension (`modules/foo.js` and `modules/foo/bar/baz.js` both belong to module `foo`),
 * or the module a metadata file describes (`metadata/modules/foo.json` -> `foo`).
 *
 * @returns {string|null} module name, or null if the file does not belong to a module.
 */
function moduleName(path) {
  for (const pat of [MODULE_FILE_PATTERN, MODULE_METADATA_PATTERN]) {
    const match = pat.exec(path);
    if (match != null) {
      return match[1];
    }
  }
  return null;
}

/**
 * @param {string} entry name of a dependencies.json entry point (e.g. `appnexusBidAdapter.js` or
 * `appnexusBidAdapter.metadata.js`)
 * @returns {string} the module it builds (e.g. `appnexusBidAdapter`).
 */
function entryModule(entry) {
  return entry.replace(/\.js$/, '').replace(/\.metadata$/, '');
}

/**
 * Reads the components a module declares in its metadata.
 *
 * @param {object} [options]
 * @param {string} [options.metadataDir] directory containing the per-module metadata JSON.
 * @returns {function(string): Array<object>|null} module name -> its components, or null if it has no metadata.
 */
function moduleComponents({metadataDir = DEFAULT_METADATA_DIR} = {}) {
  const cache = {};
  return function (module) {
    if (!cache.hasOwnProperty(module)) {
      const file = path.join(metadataDir, `${module}.json`);
      cache[module] = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file).toString()).components || []) : null;
    }
    return cache[module];
  };
}

/**
 * Tells whether a module name begins with the name of a component registered anywhere in the repo -
 * `adlooxAdServerVideo` starts with `adloox`, which is registered as an rtd and an analytics component,
 * so the module belongs to that vendor. The remainder has to start on a camelCase boundary, so that a
 * component named e.g. `currency` does not make `modules/currency.js` look vendor-owned.
 *
 * @param {object} [options]
 * @param {Array<object>} [options.components] the component registry, as found in metadata/modules.json.
 * @returns {function(string): boolean} module name -> whether a registered vendor owns it.
 */
function vendorNamePrefix({components} = {}) {
  let names;
  return function (module) {
    if (names == null) {
      const registry = components ?? JSON.parse(fs.readFileSync(DEFAULT_COMPONENTS_JSON).toString()).components;
      names = Array.from(new Set(
        registry
          .filter(component => component.componentType !== 'prebid')
          .flatMap(component => [component.componentName, component.aliasOf])
          .filter(name => name != null && name.length >= MIN_VENDOR_NAME_LENGTH)
          .map(name => name.toLowerCase())
      ));
    }
    return names.some(name => module.toLowerCase().startsWith(name) && /^[A-Z]/.test(module.charAt(name.length)));
  };
}

/**
 * Core is what is not owned by an outside component: a module is core if it declares no component
 * (or has no metadata at all), or if every component it declares is a `prebid` one; a library is core
 * if a core module pulls it in - prebid-core included - or, failing that, if it does not belong to a
 * vendor. Libraries default to core because most of them are shared code that happens to be used only
 * by vendor modules, and because a library extracted tomorrow should be reviewed until someone says
 * otherwise; the vendor ones are recognizable by name.
 *
 * @param {object} [options]
 * @param {object} [options.dependencies] dependency graph, as loaded from dependencies.json.
 * @param {string} [options.metadataDir] directory containing the per-module metadata JSON.
 * @param {Array<object>} [options.components] the component registry, as found in metadata/modules.json.
 * @param {Array<string>} [options.vendorModules] modules known to belong to a vendor, for the ones no
 * naming convention can pick out.
 * @param {Array<string>} [options.vendorLibraries] libraries known to belong to a vendor, likewise.
 * @param {string} [options.missingMetadata] how to classify a module that has no metadata file at all.
 * Metadata is generated separately from the module it describes, so a newly added module does not have
 * any yet; `by-name` (the default) falls back to the naming conventions - a module named `<vendor>BidAdapter`
 * & co, or one whose name starts with a registered component name, belongs to a vendor, anything else is
 * core - while `core` treats them all like a module with no components, and `not-core` keeps them all out.
 * @returns {function(string): boolean} true if the given path should count as a core change.
 */
function coreFileMatcher({
  dependencies,
  metadataDir,
  components,
  vendorModules = VENDOR_MODULES,
  vendorLibraries = VENDOR_LIBRARIES,
  missingMetadata = 'by-name'
} = {}) {
  const componentsOf = moduleComponents({metadataDir});
  const belongsToVendor = vendorNamePrefix({components});
  let deps = dependencies;
  const libraryUsers = {};

  function isCoreModule(module) {
    const declared = componentsOf(module);
    if (declared == null) {
      switch (missingMetadata) {
        case 'core': return true;
        case 'not-core': return false;
        default: return !vendorModules.includes(module) &&
          !MODULE_PATTERNS.find(pat => pat.test(`modules/${module}.js`)) &&
          !belongsToVendor(module);
      }
    }
    return declared.length === 0 ||
      declared.every(component => component.componentType === 'prebid');
  }

  function usersOf(library) {
    if (!libraryUsers.hasOwnProperty(library)) {
      if (deps == null) deps = loadDependencies();
      libraryUsers[library] = Object.entries(deps)
        .filter(([entry, chunks]) => chunks.includes(`${library}.js`))
        .map(([entry]) => entryModule(entry));
    }
    return libraryUsers[library];
  }

  function isCoreLibrary(library) {
    const users = usersOf(library);
    // a library a core module depends on is core whatever its name suggests - `timeoutQueue` reads as
    // an extension of the `timeout` rtd component, but core modules use it
    if (users.some(isCoreModule)) {
      return true;
    }
    // a single consumer owns the library outright; this is how a vendor library added together with
    // its adapter is recognized, before any component of that vendor is registered. It becomes core
    // as soon as a second module picks it up.
    if (users.length === 1) {
      return false;
    }
    return !vendorLibraries.includes(library) && !belongsToVendor(library);
  }

  return function isCoreFile(path) {
    if (EXCLUDE_PATTERNS.find(pat => pat.test(path))) {
      return false;
    }
    const module = moduleName(path);
    if (module != null) {
      return isCoreModule(module);
    }
    const lib = LIBRARY_PATTERN.exec(path);
    if (lib != null) {
      return isCoreLibrary(lib[1]);
    }
    return true;
  };
}

module.exports = {
  coreFileMatcher,
  MODULE_PATTERNS,
  EXCLUDE_PATTERNS,
  LIBRARY_PATTERN,
  VENDOR_MODULES,
  VENDOR_LIBRARIES,
  loadDependencies,
  moduleName,
  entryModule,
  moduleComponents,
  vendorNamePrefix,
};

function usage() {
  return [
    'Classify repository files as "core" or not, the way PR assignment does.',
    '',
    'Usage: node .github/workflows/scripts/coreFiles.js [options] [file...]',
    '',
    'Files may also be piped in, one per line, e.g.:',
    '  gh pr diff --name-only 1234 | node .github/workflows/scripts/coreFiles.js',
    '',
    'Options:',
    '  -d, --deps <file>   path to dependencies.json (default: $DEPENDENCIES_JSON, then build/dist)',
    '  -o, --option <k=v>  pass an option to the matcher (repeatable; values are JSON when parseable)',
    '  -c, --core-only     print only the files classified as core',
    '  -j, --json          print results as JSON',
    '  -h, --help          show this message',
    '',
    'Exit code is 0 if any file is core, 1 otherwise - matching `isCoreChange` in getPRProperties.js.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {files: [], options: {}};
  while (argv.length) {
    const arg = argv.shift();
    switch (arg) {
      case '-d': case '--deps': opts.deps = argv.shift(); break;
      case '-c': case '--core-only': opts.coreOnly = true; break;
      case '-j': case '--json': opts.json = true; break;
      case '-h': case '--help': opts.help = true; break;
      case '-o': case '--option': {
        const [key, ...rest] = argv.shift().split('=');
        const value = rest.join('=');
        try {
          opts.options[key] = JSON.parse(value);
        } catch (e) {
          opts.options[key] = value;
        }
        break;
      }
      default: opts.files.push(arg);
    }
  }
  return opts;
}

function readStdin() {
  try {
    return fs.readFileSync(0).toString();
  } catch (e) {
    return '';
  }
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(usage());
    return 0;
  }
  let files = opts.files;
  if (!files.length && !process.stdin.isTTY) {
    files = readStdin().split('\n').map(line => line.trim()).filter(Boolean);
  }
  if (!files.length) {
    console.error(usage());
    return 2;
  }
  const isCore = coreFileMatcher(Object.assign(
    opts.deps ? {dependencies: loadDependencies(opts.deps)} : {},
    opts.options
  ));
  const results = files.map(file => ({file, core: isCore(file)}));
  if (opts.json) {
    console.log(JSON.stringify(opts.coreOnly ? results.filter(({core}) => core) : results, null, 2));
  } else {
    results
      .filter(({core}) => core || !opts.coreOnly)
      .forEach(({file, core}) => console.log(opts.coreOnly ? file : `${core ? 'CORE' : '    '} ${file}`));
  }
  return results.some(({core}) => core) ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
  }
}
