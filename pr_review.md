## Summary
We take PR review seriously. Please read https://medium.com/@mrjoelkemp/giving-better-code-reviews-16109e0fdd36#.xa8lc4i23 to understand how a PR review should be conducted. Be rational and strict in your review, make sure you understand exactly what the submitter's intent is. Overall 1 person should take ownership of a particular PR. When they are satisfied it's in good condition to merge, they should request 1 additional team member to review as a sanity check. Only when the PR has 2 `LGTM` from the core team should it be merged.

### General PR review Process
- Checkout the branch (these instructions are available on the github PR page as well).
- Verify PR is a single change type. Example, refactor OR bugfix. If more than 1 type, ask submitter to break out requests.
- Verify code under review has at least 80% unit test coverage. If legacy code has no unit test coverage, ask for unit tests to be included in the PR.
- Verify tests are green in Travis-ci + local build by running `gulp serve` | `gulp test`
- Verify no code quality violations are present from jscs (should be reported in terminal)
- Review for obvious errors or bad coding practice / use best judgement here.
- If the change is a new feature / change to core prebid.js - review the change with a Tech Lead on the project and make sure they agree with the nature of change.
- If all above is good, add a `LGTM` comment and request 1 additional core member to review.
- Once there is 2 `LGTM` on the PR, merge to master
- Ask the submitter to add a PR for documentation if applicable.
- Add a line into the `draft release` notes for this submission. If no draft release is available, create one using this template https://gist.github.com/mkendall07/c3af6f4691bed8a46738b3675cb5a479

### New Adapter or updates to adapter process
- Follow steps above for general review process. In addition, please verify the following:
- Verify that bidder has submitted valid bid params and that bids are being received.
- Verify that bidder is not manipulating the prebid.js auction in any way or doing things that go against the principles of the project. If unsure check with the Tech Lead.
- Verify that  the bidder is being as efficient as possible, ideally not loading an external library, however if they do load a library it should be cached.
- Verify that code re-use is being done properly and that changes introduced by a bidder don't impact other bidders.
- If the adapter being submitted is an alias type, check with the bidder contact that is being aliased to make sure it's allowed.
