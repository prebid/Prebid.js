const ghRequester = require('./ghRequest.js');
const AWS = require("@aws-sdk/client-s3");
const fs = require('fs');

const MODULE_PATTERNS = [
  /^modules\/([^\/]+)BidAdapter(\.(\w+)|\/)/,
  /^modules\/([^\/]+)AnalyticsAdapter(\.(\w+)|\/)/,
  /^modules\/([^\/]+)RtdProvider(\.(\w+)|\/)/,
  /^modules\/([^\/]+)IdSystem(\.(\w+)|\/)/
]

const EXCLUDE_PATTERNS = [
  /^test\//,
  /^integrationExamples\//
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
  const deps = JSON.parse(fs.readFileSync(process.env.DEPENDENCIES_JSON).toString());
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
  if (EXCLUDE_PATTERNS.find(pat => pat.test(path))) {
    return false;
  }
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

async function isPrebidMember(ghHandle) {
  const client = new AWS.S3({region: 'us-east-2'});
  const res = await client.getObject({
    Bucket: 'repo-dashboard-files-891377123989',
    Key: 'memberMapping.json'
  });
  const members = JSON.parse(await res.Body.transformToString());
  return members.includes(ghHandle);
}


async function getPRProperties({github, context, prNo, reviewerTeam, engTeam, authReviewTeam}) {
  const request = ghRequester(github);
  let [files, pr, prReviews, prebidReviewers, prebidEngineers, authorizedReviewers] = await Promise.all([
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
    request('GET /repos/{owner}/{repo}/pulls/{prNo}/reviews', {
      owner: context.repo.owner,
      repo: context.repo.repo,
      prNo,
    }),
    ...[reviewerTeam, engTeam, authReviewTeam].map(team => request('GET /orgs/{org}/teams/{team}/members', {
      org: context.repo.owner,
      team,
    }))
  ]);
  prebidReviewers = prebidReviewers.data.map(datum => datum.login);
  prebidEngineers = prebidEngineers.data.map(datum=> datum.login);
  authorizedReviewers = authorizedReviewers.data.map(datum=> datum.login);
  let isCoreChange = false;
  files = files.data.map(datum => datum.filename).map(file => {
    const core = isCoreFile(file);
    if (core) isCoreChange = true;
    return {
      file,
      core
    }
  });
  const review = {
    prebidEngineers: 0,
    prebidReviewers: 0,
    reviewers: [],
    requestedReviewers: []
  };
  const author = pr.data.user.login;
  const allReviewers = new Set();
  pr.data.requested_reviewers
    .forEach(rv => {
      allReviewers.add(rv.login);
      review.requestedReviewers.push(rv.login);
    });
  prReviews.data.forEach(datum => allReviewers.add(datum.user.login));

  allReviewers
    .forEach(reviewer => {
      if (reviewer === author) return;
      const isPrebidEngineer = prebidEngineers.includes(reviewer);
      const isPrebidReviewer = isPrebidEngineer || prebidReviewers.includes(reviewer) || authorizedReviewers.includes(reviewer);
      if (isPrebidEngineer) {
        review.prebidEngineers += 1;
      }
      if (isPrebidReviewer) {
        review.prebidReviewers += 1
      }
      review.reviewers.push({
        login: reviewer,
        isPrebidEngineer,
        isPrebidReviewer,
      })
    });
  const data = {
    pr: prNo,
    author: {
      login: author,
      isPrebidMember: await isPrebidMember(author)
    },
    isCoreChange,
    files,
    prebidReviewers,
    prebidEngineers,
    review,
  }
  data.review.requires = reviewRequirements(data);
  data.review.ok = satisfiesReviewRequirements(data.review);
  return data;
}

function reviewRequirements(prData) {
  return {
    prebidEngineers: prData.author.isPrebidMember ? 1 : 0,
    prebidReviewers: prData.isCoreChange ? 2 : 1
  }
}

function satisfiesReviewRequirements({requires, prebidEngineers, prebidReviewers}) {
  return prebidEngineers >= requires.prebidEngineers && prebidReviewers >= requires.prebidReviewers
}


module.exports = getPRProperties;
