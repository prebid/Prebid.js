# Insticator Fork of Prebid.js

## What is different in this fork from the official Prebid.js repository?

Insticator uses `instBid` instead of `pbjs` as the global prebid.js object.
There is also a [modules.json](./modules.json) that should be used when building the project.
In this fork, master branch is not the same as the upstream master branch.
It points to the latest version used by Insticator.
That is, master branch always should be used to building the project.

## How do I figure out which Prebid.js release master branch is based on?

Update your local repository and run `git describe --tags master`.

## How do I update master branch to get a new version of Prebid.js?

*REMINDER: Do NOT forget to push tags in the last step!!*

* Make sure your local master branch is up to date;
* Check if you have added upstream by `git remote -v`. If not, run `git remote add upstream https://github.com/prebid/Prebid.js.git`;
* Update remotes to the latest by `git fetch upstream`;
* Check out master branch and merge the target version to it by, e.g., `git merge 2.44.1`;
* Push master branch with `--tags`, e.g. `git push --tags`, if everything is good. Check out the last step of CircleCI build to find out where the output is uploaded.

## How do I build?

Follow Prebid.js instructions but add `--modules=modules.json` to the build command.

## Why does testing fail when running `gulp serve`?

Some tests have hardcoded `pbjs`, which is changed to `instBid` for this fork.
It is OK to skip testing by `gulp serve --notest`.

## What should I do if I know that Insticator adds or removes SSP partners?

Update [modules.json](./modules.json) accordingly.
