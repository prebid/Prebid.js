[![Build Status](https://travis-ci.org/prebid/Prebid.js.svg?branch=master)](https://travis-ci.org/prebid/Prebid.js)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Percentage of issues still open")
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Average time to resolve an issue")
[![Code Climate](https://codeclimate.com/github/prebid/Prebid.js/badges/gpa.svg)](https://codeclimate.com/github/prebid/Prebid.js)
[![Coverage Status](https://coveralls.io/repos/github/prebid/Prebid.js/badge.svg)](https://coveralls.io/github/prebid/Prebid.js)

# Prebid.js

> A free and open source library for publishers to quickly implement header bidding.

This README is for developers who want to contribute to Prebid.js.  For user-facing documentation, see [Prebid.org](http://prebid.org).

**Table of Contents**

- [Install](#Install)
- [Build](#Build)
- [Run](#Run)
- [Contribute](#Contribute)

<a name="Install"></a>

## Install

    $ npm install

If you experience errors after a version update, try a fresh install:

    $ rm -rf ./node_modules && npm cache clean && npm install

<a name="Build"></a>

## Build

To build the project on your local machine, run:

    $ gulp build

This runs some code quality checks and generates the following files:

+ `./build/dev/prebid.js` - Full source code for dev and debug
+ `./build/dev/prebid.js.map` - Source map for dev and debug
+ `./build/dist/prebid.js` - Minified production code
+ `./prebid.js_<version>.zip` - Distributable zip archive

*Note:* You need to have `node.js` 4.x or greater installed to be able to run the `gulp build` commands.

### Build Optimization

The standard build output contains all the available bidder adapters listed in `adapters.json`.

You might want to exclude some/most of them from the final bundle.  To make sure the build only includes the adapters you want, you can make your own adapters file.

For example, in `path/to/your/list-of-adapters.json`, write:

        [
            "openx",
            "rubicon",
            "sovrn"
        ]

Building with just these adapters will result in a smaller bundle which should allow your pages to load faster.

**Build standalone prebid.js**

- Clone the repo, run `npm install`
- Duplicate `adapters.json` to e.g. `list-of-adapters.json`
- Remove the unnecessary adapters from `list-of-adapters.json`
- Then run the build:

        $ gulp build --adapters path/to/your/list-of-adapters.json

**Build prebid.js using NPM for bundling**

In case you'd like to explicitly show that your project uses `prebid.js` and want a reproducible build, consider adding it as an `npm` dependency.

- Install `prebid.js` as an `npm` dependency of your project
- Duplicate `node_modules/prebid.js/adapters.json` to under your project path, e.g. `path/to/your/list-of-adapters.json`
- Remove the unnecessary adapters
- Run the `prebid.js` build under the `node_modules/prebid.js/` folder

        $ gulp build --adapters path/to/your/list-of-adapters.json

Most likely your custom `prebid.js` will only change when there's:

- A change in your list of adapters
- A new release of `prebid.js`

Having said that, you are probably safe to check your custom bundle into your project.  You can also generate it in your build process.

<a name="Run"></a>

## Run

To configure Prebid.js to run locally, edit the example file `./integrationExamples/gpt/pbjs_example_gpt.html`:

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

To run the project locally, use:

    $ gulp serve

This runs code quality checks, generates all the necessary files and starts a web server at `http://localhost:9999` serving from the project root. Navigate to your example implementation to test, and if your `prebid.js` file is sourced from the `./build/dev` directory you will have sourcemaps available in your browser's developer tools.

To run the example file, go to:

+ `http://localhost:9999/integrationExamples/gpt/pbjs_example_gpt.html` 

To view a test coverage report, go to:

+ `http://localhost:9999/build/coverage/karma_html/report`

A watch is also in place that will run continuous tests in the terminal as you edit code and tests.

<a name="Contribute"></a>

## Contribute

Many SSPs, bidders, and publishers have contributed to this project. [20+ Bidders](https://github.com/prebid/Prebid.js/tree/master/src/adapters) are supported by Prebid.js.

### Add a Bidder Adapter

To add a bidder adapter, see the instructions in [How to add a bidder adaptor](http://prebid.org/dev-docs/bidder-adaptor.html).

### Code Quality

Code quality is defined by `.jscs` and `.jshint` files and errors are reported in the terminal.

If you are contributing code, you should configure your editor with the provided `.jscs` and `.jshint` settings.

### Unit Testing with Karma

        $ gulp test --watch

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

Prebid.js is supported on IE9+ and modern browsers.
