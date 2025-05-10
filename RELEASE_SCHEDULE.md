**Table of Contents**
- [Release Schedule](#release-schedule)
- [Release Process](#release-process)
  - [1. Make sure that all PRs have been named and labeled properly per the PR Process](#1-make-sure-that-all-prs-have-been-named-and-labeled-properly-per-the-pr-process)
  - [2. Make sure all browserstack tests are passing](#2-make-sure-all-browserstack-tests-are-passing)
  - [3. Start the release](#3-start-the-release)
- [Beta Releases](#beta-releases)
- [FAQs](#faqs)

## Release Schedule

We aim to push a new release of Prebid.js each week barring any unforseen circumstances or in observance of holidays.

While the releases will be available immediately for those using direct Git access,
it will be about a week before the Prebid Org [Download Page](https://docs.prebid.org/download.html) will be updated.

You can determine what is in a given build using the [releases page](https://github.com/prebid/Prebid.js/releases)

Announcements regarding releases will be made to the #prebid-js channel in prebid.slack.com.

## Release Process

### 1. Make sure that all PRs have been named and labeled properly per the [PR Process](https://github.com/prebid/Prebid.js/blob/master/PR_REVIEW.md#general-pr-review-process)
   * Do this by checking the latest draft release from the [releases page](https://github.com/prebid/Prebid.js/releases) and make sure nothing appears in the first section called "In This Release". If they do, please open the PRs and add the appropriate labels.
   * Do a quick check that all the titles/descriptions look ok, and if not, adjust the PR title.

### 2. Make sure all browserstack tests are passing

   On PR merge to master, CircleCI will run unit tests on browserstack. Checking the last CircleCI build [here](https://circleci.com/gh/prebid/Prebid.js) for master branch will show you detailed results.**

   In case of failure do following,
     - Try to fix the failing tests.
     - If you are not able to fix tests in time. Skip the test, create issue and tag contributor.

   **How to run tests in browserstack**

   _Note: the following browserstack information is only relevant for debugging purposes, if you will not be debugging then it can be skipped._

   Set the environment variables. You may want to add these to your `~/.bashrc` for convenience.

   ```
   export BROWSERSTACK_USERNAME="my browserstack username"
   export BROWSERSTACK_ACCESS_KEY="my browserstack access key"
   ```

   ```
   gulp test --browserstack >> prebid_test.log

   vim prebid_test.log // Will show the test results
   ```


### 3. Start the release

Follow the instructions at https://github.com/prebid/prebidjs-releaser. Note that you will need to be a member of the [https://github.com/orgs/prebid/teams/prebidjs-release](prebidjs-release) GitHub team.
    
## Beta Releases

Prebid.js features may be released as Beta or as Generally Available (GA).

Characteristics of a `Beta` release:
- May be a partial implementation (e.g. more work needed to flesh out the feature)
- May not be fully tested with other features
- Limited documentation, focused on technical aspects
- Few users

Characteristics of a `GA` release:
- Complete set of functionality
- Significant user base with no major issues for at least a month
- Decent documentation that includes business need, use cases, and examples


## FAQs

**1. Is there flexibility in the schedule?**
* If a major bug is found in the current release, a maintenance patch will be done as soon as possible.
* It is unlikely that we will put out a maintenance patch at the request of a given bid adapter or module owner.

**2. What Pull Requests make it into a release?**
* Every PR that's merged into master will be part of a release. Here are the [PR review guidelines](https://github.com/prebid/Prebid.js/blob/master/PR_REVIEW.md).
