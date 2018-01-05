[![Build Status](https://travis-ci.org/prebid/Prebid.js.svg?branch=master)](https://travis-ci.org/prebid/Prebid.js)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Percentage of issues still open")
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Average time to resolve an issue")
[![Code Climate](https://codeclimate.com/github/prebid/Prebid.js/badges/gpa.svg)](https://codeclimate.com/github/prebid/Prebid.js)
[![Coverage Status](https://coveralls.io/repos/github/prebid/Prebid.js/badge.svg)](https://coveralls.io/github/prebid/Prebid.js)
[![devDependencies Status](https://david-dm.org/prebid/Prebid.js/dev-status.svg)](https://david-dm.org/prebid/Prebid.js?type=dev)

# Prebid.js

> A free and open source library for publishers to quickly implement header bidding.

This README is for developers who want to contribute to Prebid.js.
Additional documentation can be found at [the Prebid homepage](http://prebid.org).
Working examples can be found in [the developer docs](http://prebid.org/dev-docs/getting-started.html).

**Table of Contents**

- [Install](#Install)
- [Build](#Build)
- [Run](#Run)
- [Contribute](#Contribute)

<a name="Install"></a>

## Install

    $ git clone https://github.com/prebid/Prebid.js.git
    $ cd Prebid.js
    $ yarn install

Prebid supports the `yarn` npm client. This is an alternative to using `npm` for package management, though `npm install` will continue to work as before.

For more info, see [the Yarn documentation](https://yarnpkg.com).

*Note:* You need to have `NodeJS` 4.x or greater installed.

<a name="Build"></a>

## Build for Development

To build the project on your local machine, run:

    $ gulp serve

This runs some code quality checks, starts a web server at `http://localhost:9999` serving from the project root and generates the following files:

+ `./build/dev/prebid.js` - Full source code for dev and debug
+ `./build/dev/prebid.js.map` - Source map for dev and debug
+ `./build/dist/prebid.js` - Minified production code
+ `./prebid.js_<version>.zip` - Distributable zip archive

### Build Optimization

The standard build output contains all the available modules from within the `modules` folder.

You might want to exclude some/most of them from the final bundle.  To make sure the build only includes the modules you want, you can specify the modules to be included with the `--modules` CLI argument.

For example, when running the serve command: `gulp serve --modules=openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter`

Building with just these adapters will result in a smaller bundle which should allow your pages to load faster.

**Build standalone prebid.js**
Prebid now supports the `yarn` npm client. This is an alternative to using `npm` for package management, though `npm` will continue to work as before.

For more info about yarn see https://yarnpkg.com

- Clone the repo, run `yarn install`
- Then run the build:

        $ gulp build --modules=openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter
        
Alternatively, a `.json` file can be specified that contains a list of modules you would like to include.

    $ gulp build --modules=modules.json
        
With `modules.json` containing the following
```json modules.json
[
  "openxBidAdapter",
  "rubiconBidAdapter",
  "sovrnBidAdapter"
]
```

**Build prebid.js using Yarn for bundling**

In case you'd like to explicitly show that your project uses `prebid.js` and want a reproducible build, consider adding it as an `yarn` dependency.

- Add `prebid.js` as a `yarn` dependency of your project: `yarn add prebid.js`
- Run the `prebid.js` build under the `node_modules/prebid.js/` folder

        $ gulp build --modules=path/to/your/list-of-modules.json

Most likely your custom `prebid.js` will only change when there's:

- A change in your list of modules
- A new release of `prebid.js`

Having said that, you are probably safe to check your custom bundle into your project.  You can also generate it in your build process.

<a name="Run"></a>

## Test locally

To lint the code:

```bash
gulp lint
```

To run the unit tests:

```bash
gulp test
```
To run tests for a single file:

```bash
gulp test --file "path/to/spec/file.js"
```

To generate and view the code coverage reports:

```bash
gulp test-coverage
gulp view-coverage
```

For end-to-end testing, edit the example file `./integrationExamples/gpt/pbjs_example_gpt.html`:

1. Change `{id}` values appropriately to set up ad units and bidders
2. Set the path to Prebid.js in your example file as shown below (see `pbs.src`).

For development:

```javascript
(function() {
    var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
    pbs.type = 'text/javascript';
    pbs.src = ((pro === 'https:') ? 'https' : 'http') + './build/dev/prebid.js';
    var target = document.getElementsByTagName('head')[0];
    target.insertBefore(pbs, target.firstChild);
})();
```

For deployment:

```javascript
(function() {
    var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
    pbs.type = 'text/javascript';
    pbs.src = ((pro === 'https:') ? 'https' : 'http') + './build/dist/prebid.js';
    var target = document.getElementsByTagName('head')[0];
    target.insertBefore(pbs, target.firstChild);
})();
```

Build and run the project locally with:

```bash
gulp serve
```

This runs `lint` and `test`, then starts a web server at `http://localhost:9999` serving from the project root.
Navigate to your example implementation to test, and if your `prebid.js` file is sourced from the `./build/dev`
directory you will have sourcemaps available in your browser's developer tools.

To run the example file, go to:

+ `http://localhost:9999/integrationExamples/gpt/pbjs_example_gpt.html`

As you make code changes, the bundles will be rebuilt and the page reloaded automatically.

<a name="Contribute"></a>

## Contribute

Many SSPs, bidders, and publishers have contributed to this project. [60+ Bidders](https://github.com/prebid/Prebid.js/tree/master/src/adapters) are supported by Prebid.js.

For guidelines, see [Contributing](./CONTRIBUTING.md).

Our PR review process can be found [here](https://github.com/prebid/Prebid.js/tree/master/pr_review.md).

### Add a Bidder Adapter

To add a bidder adapter module, see the instructions in [How to add a bidder adaptor](http://prebid.org/dev-docs/bidder-adaptor.html).

Please **do NOT load Prebid.js inside your adapter**. If you do this, we will reject or remove your adapter as appropriate.

### Code Quality

Code quality is defined by `.eslintrc` and errors are reported in the terminal.

If you are contributing code, you should [configure your editor](http://eslint.org/docs/user-guide/integrations#editors) with the provided `.eslintrc` settings.

### Unit Testing with Karma

        $ gulp test --watch --browsers=chrome

This will run tests and keep the Karma test browser open. If your `prebid.js` file is sourced from the `./build/dev` directory you will also have sourcemaps available when using your browser's developer tools.

+ To access the Karma debug page, go to `http://localhost:9876/debug.html`

+ For test results, see the console

+ To set breakpoints in source code, see the developer tools

Detailed code coverage reporting can be generated explicitly with

        $ gulp test --coverage

The results will be in

        ./build/coverage

*Note*: Starting in June 2016, all pull requests to Prebid.js need to include tests with greater than 80% code coverage before they can be merged.  For more information, see [#421](https://github.com/prebid/Prebid.js/issues/421).

For instructions on writing tests for Prebid.js, see [Testing Prebid.js](http://prebid.org/dev-docs/testing-prebid.html).

### Supported Browsers

Prebid.js is supported on IE10+ and modern browsers.

### Governance
Review our governance model [here](https://github.com/prebid/Prebid.js/tree/master/governance.md).
