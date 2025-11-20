const fs = require('node:fs/promises');

async function getCoreLibraries() {
  const deps = require('./build/dist/dependencies.json');
}

async function getPRProperties({github, context, prNo}) {
  const files = (await github.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNo,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })).data.map(datum => datum.filename);
  console.log(files);
}

module.exports = getPRProperties;
