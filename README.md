[![Build Status](https://circleci.com/gh/prebid/Prebid.js.svg?style=svg)](https://circleci.com/gh/prebid/Prebid.js)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Percentage of issues still open")
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Average time to resolve an issue")
[![Code Climate](https://codeclimate.com/github/prebid/Prebid.js/badges/gpa.svg)](https://codeclimate.com/github/prebid/Prebid.js)
[![Coverage Status](https://coveralls.io/repos/github/prebid/Prebid.js/badge.svg)](https://coveralls.io/github/prebid/Prebid.js)
[![devDependencies Status](https://david-dm.org/prebid/Prebid.js/dev-status.svg)](https://david-dm.org/prebid/Prebid.js?type=dev)
[![Total Alerts](https://img.shields.io/lgtm/alerts/g/prebid/Prebid.js.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/prebid/Prebid.js/alerts/)

# Prebid.js

> A free and open source library for publishers to quickly implement header bidding.

This README is for developers who want to contribute to Prebid.js.
Additional documentation can be found at [the Prebid homepage](http://prebid.org).
Working examples can be found in [the developer docs](http://prebid.org/dev-docs/getting-started.html).

**Table of Contents**

- [Usage](#Usage)
- [Install](#Install)
- [Build](#Build)
- [Run](#Run)
- [Contribute](#Contribute)

<a name="Usage"></a>

## Usage (as a npm dependency)

*Note:* Requires Prebid.js v1.38.0+

Prebid.js depends on Babel and some Babel Plugins in order to run correctly in the browser.  Here are some examples for 
configuring webpack to work with Prebid.js.

With Babel 7:
```javascript
// webpack.conf.js
let path = require('path');
module.exports = {
  mode: 'production',
  module: {
    rules: [
      
      // this rule can be excluded if you don't require babel-loader for your other application files
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        }
      },
      
      // this separate rule is required to make sure that the Prebid.js files are babel-ified.  this rule will
      // override the regular exclusion from above (for being inside node_modules).
      {
        test: /.js$/,
        include: new RegExp(`\\${path.sep}prebid\.js`),
        use: {
          loader: 'babel-loader',
          // presets and plugins for Prebid.js must be manually specified separate from your other babel rule.
          // this can be accomplished by requiring prebid's .babelrc.js file (requires Babel 7 and Node v8.9.0+)
          options: require('prebid.js/.babelrc.js')
        }
      }
    ]
  }
}
```

Or for Babel 6:
```javascript
            // you must manually install and specify the presets and plugins yourself
            options: {
              plugins: [
                "transform-object-assign", // required (for IE support) and "babel-plugin-transform-object-assign" 
                                           // must be installed as part of your package.
                require('prebid.js/plugins/pbjsGlobals.js') // required!
              ],
              presets: [
                ["env", {                 // you can use other presets if you wish.
                  "targets": {            // this example is using "babel-presets-env", which must be installed if you
                    "browsers": [         // follow this example.
                      ... // your browser targets. they should probably match the targets you're using for the rest 
                          // of your application
                    ]
                  }
                }]
              ]
            }
```

Then you can use Prebid.js as any other npm depedendency

```javascript
import prebid from 'prebid.js';
import 'prebid.js/modules/rubiconBidAdapter'; // imported modules will register themselves automatically with prebid
import 'prebid.js/modules/appnexusBidAdapter';
prebid.processQueue();  // required to process existing pbjs.queue blocks and setup any further pbjs.queue execution

prebid.requestBids({
  ...
})

```



<a name="Install"></a>

## Install

    $ git clone https://github.com/prebid/Prebid.js.git
    $ cd Prebid.js
    $ npm install

*Note:* You need to have `NodeJS` 8.9.x or greater installed.

*Note:* In the 1.24.0 release of Prebid.js we have transitioned to using gulp 4.0 from using gulp 3.9.1.  To comply with gulp's recommended setup for 4.0, you'll need to have `gulp-cli` installed globally prior to running the general `npm install`.  This shouldn't impact any other projects you may work on that use an earlier version of gulp in its setup.

If you have a previous version of `gulp` installed globally, you'll need to remove it before installing `gulp-cli`.  You can check if this is installed by running `gulp -v` and seeing the version that's listed in the `CLI` field of the output.  If you have the `gulp` package installed globally, it's likely the same version that you'll see in the `Local` field.  If you already have `gulp-cli` installed, it should be a lower major version (it's at version `2.0.1` at the time of the transition).

To remove the old package, you can use the command: `npm rm gulp -g`

Once setup, run the following command to globally install the `gulp-cli` package: `npm install gulp-cli -g`


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

- Clone the repo, run `npm install`
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

**Build prebid.js using npm for bundling**

In case you'd like to explicitly show that your project uses `prebid.js` and want a reproducible build, consider adding it as an `npm` dependency.

- Add `prebid.js` as a `npm` dependency of your project: `npm install prebid.js`
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

To generate and view the code coverage reports:

```bash
gulp test-coverage
gulp view-coverage
```

For Prebid.org members with access to BrowserStack, additional end-to-end testing can be done with:

```bash
gulp e2e-test --host=test.localhost
```

To run these tests, the following items are required:
- setup an alias of localhost in your `hosts` file (eg `127.0.0.1  test.localhost`); note - you can use any alias.  Use this alias in the command-line argument above.
- access to [BrowserStack](https://www.browserstack.com/) account.  Assign the following variables in your bash_profile:
```bash
export BROWSERSTACK_USERNAME='YourUserNameHere'
export BROWSERSTACK_ACCESS_KEY='YourAccessKeyHere'
```
You can get these BrowserStack values from your profile page.

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

Our PR review process can be found [here](https://github.com/prebid/Prebid.js/tree/master/PR_REVIEW.md).

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

Prebid.js is supported on IE11 and modern browsers.

### Governance
Review our governance model [here](https://github.com/prebid/Prebid.js/tree/master/governance.md).
