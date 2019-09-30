**Table of Contents**
- [Release Schedule](#release-schedule)
- [Release Process](#release-process)
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

1. Make Sure all browserstack tests are passing. On PR merge to master CircleCI will run unit tests on browserstack. Checking the last CircleCI build [here](https://circleci.com/gh/prebid/Prebid.js) for master branch will show you detailed results. 
  
   In case of failure do following, 
     - Try to fix the failing tests.
     - If you are not able to fix tests in time. Skip the test, create issue and tag contributor.

   #### How to run tests in browserstack
   
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


2. Prepare Prebid Code

   Update the package.json version to become the current release. Then commit your changes.

   ```
   git commit -m "Prebid 1.x.x Release"
   git push
   ```

3. Verify Release

   Make sure your there are no more merges to master branch. Prebid code is clean and up to date.

4. Create a GitHub release

   Edit the most recent [release notes](https://github.com/prebid/Prebid.js/releases) draft and make sure the correct tag is in the dropdown. Click `Publish`. GitHub will create release tag. 
   
   Pull these changes locally by running command 
   ```
   git pull
   git fetch --tags
   ``` 
   
   and verify the tag.

5. Update coveralls _(skip for legacy)_

   We use https://coveralls.io/ to show parts of code covered by unit tests.

   Set the environment variables. You may want to add these to your `~/.bashrc` for convenience.
   ```
   export COVERALLS_SERVICE_NAME="travis-ci"
   export COVERALLS_REPO_TOKEN="talk to Matt Kendall"
   ```

   Run `gulp coveralls` to update code coverage history.

6. Distribute the code 

   _Note: do not go to step 7 until step 6 has been verified completed._

   Reach out to any of the Appnexus folks to trigger the jenkins job.

   // TODO 
   Jenkins job is moving files to appnexus cdn, pushing prebid.js to npm, purging cache and sending notification to slack.
   Move all the files from Appnexus CDN to jsDelivr and create bash script to do above tasks.

7. Post Release Version
   
   Update the version
   Manually edit Prebid's package.json to become "1.x.x-pre" (using the values for the next release). Then commit your changes.
   ```
   git commit -m "Increment pre version"
   git push
   ```
   
8. Create new release draft

   Go to [github releases](https://github.com/prebid/Prebid.js/releases) and add a new draft for the next version of Prebid.js with the following template:
```
## 🚀New Features
 
## 🛠Maintenance
 
## 🐛Bug Fixes
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

If a major bug is found in the current release, a maintenance patch will be done as soon as possible.

It is unlikely that we will put out a maintenance patch at the request of a given bid adapter or module owner.

**2. What Pull Requests make it into a release?**

Every PR that's merged into master will be part of a release. Here are the [PR review guidelines](https://github.com/prebid/Prebid.js/blob/master/PR_REVIEW.md).
