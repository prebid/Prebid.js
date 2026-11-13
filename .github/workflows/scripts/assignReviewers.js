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
  const allReviewers = prData.review.reviewers.map(rv => rv.login);
  const requestedReviewers = prData.review.requestedReviewers;
  const missingPrebidEng = prData.review.requires.prebidEngineers - prData.review.prebidEngineers;
  const missingPrebidReviewers = prData.review.requires.prebidReviewers - prData.review.prebidReviewers - (missingPrebidEng > 0 ? missingPrebidEng : 0);

  if (missingPrebidEng > 0) {
    requestedReviewers.push(...pickFrom(prData.prebidEngineers, [...allReviewers, prData.author.login], missingPrebidEng))
  }
  if (missingPrebidReviewers > 0) {
    requestedReviewers.push(...pickFrom(prData.prebidReviewers, [...allReviewers, prData.author.login], missingPrebidReviewers))
  }

  const request = ghRequester(github);
  await request('POST /repos/{owner}/{repo}/pulls/{prNo}/requested_reviewers', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    prNo: prData.pr,
    reviewers: requestedReviewers
  })
  return requestedReviewers;
}

module.exports = assignReviewers;
