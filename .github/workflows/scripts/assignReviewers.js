const ghRequester = require('./ghRequest.js');

function pickFrom(candidates, exclude, no) {
  exclude = exclude.slice();
  const winners = [];
  while (winners.length < no) {
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    if (!exclude.includes(candidate)) {
      winners.push(candidate);
      exclude.push(candidate);
    }
  }
  return winners;
}

async function assignReviewers({github, context, prData}) {
  const reviewers = prData.review.reviewers.map(rv => rv.login);
  const missingPrebidEng = prData.review.requires.prebidEngineers - prData.review.prebidEngineers;
  const missingPrebidReviewers = prData.review.requires.prebidReviewers - prData.review.prebidReviewers - (missingPrebidEng > 0 ? missingPrebidEng : 0);

  if (missingPrebidEng > 0) {
    reviewers.push(...pickFrom(prData.prebidEngineers, [...reviewers, prData.author.login], missingPrebidEng))
  }
  if (missingPrebidReviewers > 0) {
    reviewers.push(...pickFrom(prData.prebidReviewers, [...reviewers, prData.author.login], missingPrebidReviewers))
  }

  const request = ghRequester(github);
  await request('POST /repos/{owner}/{repo}/pulls/{prNo}/requested_reviewers', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    prNo: prData.pr,
    reviewers
  })
  return reviewers;
}

module.exports = assignReviewers;
