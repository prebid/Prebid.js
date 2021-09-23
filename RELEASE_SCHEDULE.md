**Table of Contents**
- [Release Schedule](#release-schedule)
- [Release Process](#release-process)
  - [1. Make sure that all PRs have been named and labeled properly per the PR Process](#1-make-sure-that-all-prs-have-been-named-and-labeled-properly-per-the-pr-process)
  - [2. Make sure all browserstack tests are passing](#2-make-sure-all-browserstack-tests-are-passing)
  - [3. Prepare Prebid Code](#3-prepare-prebid-code)
  - [4. Verify the Release](#4-verify-the-release)
  - [5. Create a GitHub release](#5-create-a-github-release)
  - [6. Update coveralls _(skip for legacy)_](#6-update-coveralls-skip-for-legacy)
  - [7. Distribute the code](#7-distribute-the-code)
  - [8. Increment Version for Next Release](#8-increment-version-for-next-release)
- [Beta Releases](#beta-releases)
- [FAQs](#faqs)

## Release Schedule

We aim to push a new release of Prebid.js every week on Tuesday.

While the releases will be available immediately for those using direct Git access,
it will be about a week before the Prebid Org [Download Page](http://prebid.org/download.html) will be updated.

You can determine what is in a given build using the [releases page](https://github.com/prebid/Prebid.js/releases)

Announcements regarding releases will be made to the #headerbidding-dev channel in subredditadops.slack.com.

## Release Process

_Note: If `github.com/prebid/Prebid.js` is not configured as the git origin for your repo, all of the following git commands will have to be modified to reference the proper remote (e.g. `upstream`)_

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


### 3. Prepare Prebid Code

   Update the package.json version to become the current release. Then commit your changes.

   ```
   git commit -m "Prebid 4.x.x Release"
   git push
   ```

### 4. Verify the Release

   Make sure your there are no more merges to master branch. Prebid code is clean and up to date.

### 5. Create a GitHub release

   Edit the most recent [release notes](https://github.com/prebid/Prebid.js/releases) draft and make sure the correct version is set and the master branch is selected in the dropdown. Click `Publish release`. GitHub will create release tag.

   Pull these changes locally by running command
   ```
   git pull
   git fetch --tags
   ```

   and verify the tag.

### 6. Update coveralls _(skip for legacy)_

   We use https://coveralls.io/ to show parts of code covered by unit tests.

   Set the environment variables. You may want to add these to your `~/.bashrc` for convenience.
   ```
   export COVERALLS_SERVICE_NAME="travis-ci"
   export COVERALLS_REPO_TOKEN="talk to Matt Kendall"
   ```

   Run `gulp coveralls` to update code coverage history.

### 7. Distribute the code

   _Note: do not go to step 8 until step 7 has been verified completed._

   Reach out to any of the Appnexus folks to trigger the jenkins job.

   // TODO:
   Jenkins job is moving files to appnexus cdn, pushing prebid.js to npm, purging cache and sending notification to slack.
   Move all the files from Appnexus CDN to jsDelivr and create bash script to do above tasks.

### 8. Increment Version for Next Release

   Update the version by manually editing Prebid's `package.json` to become "4.x.x-pre" (using the values for the next release). Then commit your changes.
   ```
   git commit -m "Increment pre version"
   git push
   ```

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
