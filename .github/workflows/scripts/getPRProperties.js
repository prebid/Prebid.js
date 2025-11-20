const fs = require('node:fs/promises');
const ghRequester = require('./ghRequest.js');
const {glob} = require('glob');

const MODULE_PATTERNS = [
  /^modules\/([^\/]+)BidAdapter(\.(\w+)|\/)/,
  /^modules\/([^\/]+)AnalyticsAdapter(\.(\w+)|\/)/,
  /^modules\/([^\/]+)RtdProvider(\.(\w+)|\/)/,
  /^modules\/([^\/]+)IdSystem(\.(\w+)|\/)/
]

const LIBRARY_PATTERN = /^libraries\/([^\/]+)\//;

function extractVendor(chunkName) {
  for (const pat of MODULE_PATTERNS) {
    const match = pat.exec(`modules/${chunkName}`);
    if (match != null) {
      return match[1];
    }
  }
  return chunkName;
}

const getLibraryRefs = (() => {
  const deps = require('../../../build/dist/dependencies.json');
  const refs = {};
  return function (libraryName) {
    if (!refs.hasOwnProperty(libraryName)) {
      refs[libraryName] = new Set();
      Object.entries(deps)
        .filter(([name, deps]) => deps.includes(`${libraryName}.js`))
        .forEach(([name]) => refs[libraryName].add(extractVendor(name)))
    }
    return refs[libraryName];
  }
})();

function isCoreFile(path) {
  if (MODULE_PATTERNS.find(pat => pat.test(path)) ) {
    return false;
  }
  const lib = LIBRARY_PATTERN.exec(path);
  if (lib != null) {
    // a library is "core" if it's used by more than one vendor
    return getLibraryRefs(lib[1]).size > 1;
  }
  return true;
}

function testAllFiles() {
  const {glob} = require('glob')
  return glob(['./**/*']).then(res => {
    res
      .filter(file => !file.startsWith('node_modules') && !file.startsWith('codeql.db'))
      .filter(file => file.startsWith('libraries'))
      .forEach(file => {
      console.log(`file ${file}, core: ${isCoreFile(file)}`)
    })
  })
}

async function getPRProperties({github, context, prNo, reviewerTeam, engTeam}) {
  const request = ghRequester(github);
  let [files, pr, reviewers, pbEng] = await Promise.all([
    request('GET /repos/{owner}/{repo}/pulls/{prNo}/files', {
      owner: context.repo.owner,
      repo: context.repo.repo,
      prNo,
    }),
    request('GET /repos/{owner}/{repo}/pulls/{prNo}', {
      owner: context.repo.owner,
      repo: context.repo.repo,
      prNo,
    }),
    ...[reviewerTeam, engTeam].map(team => request('GET /orgs/{org}/teams/{team}/members', {
      org: context.repo.owner,
      team,
    }))
  ]);
  reviewers = reviewers.data.map(datum => datum.login);
  pbEng = pbEng.data.map(datum=> datum.login);
  let isCoreChange = false;
  files = files.data.map(datum => datum.filename).map(file => {
    const core = isCoreFile(file);
    if (core) isCoreChange = true;
    return {
      file,
      core
    }
  });
  const assignedReviewers = pr.data.requested_reviewers.map(rv => rv.login);
  await testAllFiles();
  return {
    isCoreChange,
    files,
    reviewers,
    pbEng,
    assignedReviewers
  }
}

module.exports = getPRProperties;
